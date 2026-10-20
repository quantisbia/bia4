/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · API /api/studio/scaffold/generate
 *  ─────────────────────────────────────────────────────────────────────
 *  POST com { prompt: string } OU { params: TPMSParams }
 *
 *  Resposta: STL binário diretamente (Content-Type: model/stl)
 *    + headers x-bia-* com stats da geração.
 *
 *  Autenticação: exige session (user logado).
 *  Quota: respeita o sistema R14.1 — FREE pode gerar 1 STL total.
 *         CLINICO/LAB_PRO/legados ilimitado.
 *
 *  Trilha de auditoria: todas as gerações viram CreditTransaction
 *  (reason="studio_scaffold_stl") para o billing conseguir contar.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { parseScaffoldPrompt } from "@/lib/studio/parser"
import { type TPMSParams, validateTPMSParams } from "@/lib/studio/tpms"
import {
  generateAnatomyMesh,
  validateAnatomyParams,
  type AnatomyParams,
  getAnatomyMeta,
} from "@/lib/studio/anatomy"
import { meshToSTLBinary } from "@/lib/studio/stl-exporter"
import { canUseFeature, buildQuotaExhaustedMessage } from "@/lib/plan/quotas"

export const runtime = "nodejs"
export const maxDuration = 60  // marching cubes pode levar ~5-20s em res=48

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: {
    prompt?: string
    anatomy?: AnatomyParams
    tpms?: TPMSParams
    infill?: { pattern: TPMSParams["kind"]; porosity: number; cellsPerAxis: number }
    filename?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  // ★ R14.4 · Resolve o que vai no STL (SÓLIDO anatômico, não TPMS)
  let anatomyParams: AnatomyParams
  let infillMeta: { pattern: TPMSParams["kind"]; porosity: number; cellsPerAxis: number } | null = null
  let parseInfo: ReturnType<typeof parseScaffoldPrompt> | null = null

  if (body.anatomy) {
    try {
      validateAnatomyParams(body.anatomy)
      anatomyParams = body.anatomy
      if (body.infill) infillMeta = body.infill
    } catch (err) {
      return NextResponse.json(
        { error: "invalid_params", message: err instanceof Error ? err.message : "parâmetros inválidos" },
        { status: 400 },
      )
    }
  } else if (body.tpms) {
    // Compat R14.3: aceita TPMS direto, mas gera BLOCK com dimensões TPMS
    // (o TPMS vira só o metadata do infill, não vai no STL).
    try {
      validateTPMSParams(body.tpms)
      anatomyParams = {
        kind: "block",
        sizeX: body.tpms.sizeX,
        sizeY: body.tpms.sizeY,
        sizeZ: body.tpms.sizeZ,
      }
      infillMeta = {
        pattern: body.tpms.kind,
        porosity: 1 - body.tpms.wallThickness / 1.4,
        cellsPerAxis: body.tpms.cellsPerAxis,
      }
    } catch (err) {
      return NextResponse.json(
        { error: "invalid_params", message: err instanceof Error ? err.message : "parâmetros inválidos" },
        { status: 400 },
      )
    }
  } else if (body.prompt) {
    try {
      parseInfo = parseScaffoldPrompt(body.prompt)
      anatomyParams = parseInfo.anatomy
      infillMeta = parseInfo.infillSuggestion
    } catch (err) {
      return NextResponse.json(
        { error: "parse_error", message: err instanceof Error ? err.message : "não entendi o prompt" },
        { status: 400 },
      )
    }
  } else {
    return NextResponse.json(
      { error: "missing_input", message: "Envie 'prompt' (texto) OU 'anatomy' (forma + dims) OU 'tpms' (compat R14.3)." },
      { status: 400 },
    )
  }

  // ── Verificação de quota (plano FREE: 1 STL total) ──
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: { select: { plan: true, status: true } },
      creditBalance: { select: { balance: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 })
  }

  const plan = user.subscription?.plan ?? "FREE"

  // Conta quantos STL de scaffold já foram gerados pelo usuário.
  // Usamos metadata.feature para o filtro — o CreditTransaction tem
  // `metadata Json?` que suporta busca em Postgres via path operators.
  const alreadyGenerated = await prisma.creditTransaction.count({
    where: {
      userId: session.user.id,
      metadata: { path: ["feature"], equals: "studio_scaffold_stl" },
    },
  })

  if (!canUseFeature(plan, "stl_upload", alreadyGenerated)) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: buildQuotaExhaustedMessage("stl_upload", plan),
        upgradeUrl: "/dashboard/billing",
        alreadyUsed: alreadyGenerated,
      },
      { status: 402 }, // Payment Required
    )
  }

  // ★ R14.4 · Geração do mesh SÓLIDO ANATÔMICO (zero porosidade no STL)
  // Infill é metadado — vai no header pro slicer usar depois.
  const t0 = Date.now()
  let mesh
  try {
    mesh = generateAnatomyMesh(anatomyParams)
  } catch (err) {
    return NextResponse.json(
      { error: "generation_failed", message: err instanceof Error ? err.message : "falha interna" },
      { status: 500 },
    )
  }
  const genMs = Date.now() - t0

  if (mesh.indices.length === 0) {
    return NextResponse.json(
      {
        error: "empty_mesh",
        message: "Mesh anatômica vazia (dimensões degeneradas). Verifique os valores.",
      },
      { status: 422 },
    )
  }

  // ── Export STL binário ──
  const anatomyMeta = getAnatomyMeta(anatomyParams.kind)
  const headerComment = `BIA v4 Studio | ${anatomyMeta.label} | ${anatomyParams.sizeX}x${anatomyParams.sizeY}x${anatomyParams.sizeZ}mm` +
    (infillMeta ? ` | infill ${infillMeta.pattern} ${(infillMeta.porosity * 100).toFixed(0)}%` : "")
  const stlBuf = meshToSTLBinary(mesh, headerComment)

  // ── Audit trail: registra o CreditTransaction (créditos consumidos) ──
  // Lógica: scaffold TPMS custa 50 créditos (CPU-only, sem GPU).
  // Para FREE, custo = 0 mas ainda registra pra contar o uso (quota 1).
  // Para planos pagos, cobra 50 créditos.
  const STUDIO_COST = plan === "FREE" ? 0 : 50
  try {
    // Lê o balance atual pra persistir o saldo pós-débito
    const currentBalance = user.creditBalance?.balance ?? 0
    const newBalance = Math.max(0, currentBalance - STUDIO_COST)

    await prisma.creditTransaction.create({
      data: {
        userId: session.user.id,
        type: "DEBIT",
        amount: STUDIO_COST,
        balance: newBalance,
        description: `BIA Studio · ${anatomyMeta.shortLabel} ${anatomyParams.sizeX}×${anatomyParams.sizeY}×${anatomyParams.sizeZ}mm (${mesh.stats.triangleCount} tri)`,
        metadata: {
          feature: "studio_scaffold_stl",
          anatomyKind: anatomyParams.kind,
          sizeX: anatomyParams.sizeX,
          sizeY: anatomyParams.sizeY,
          sizeZ: anatomyParams.sizeZ,
          infillPattern: infillMeta?.pattern ?? null,
          infillPorosity: infillMeta ? Number(infillMeta.porosity.toFixed(4)) : null,
          triangles: mesh.stats.triangleCount,
          volume_mm3: Number(mesh.stats.volume_mm3.toFixed(2)),
          genMs,
        },
      },
    })

    // Atualiza o CreditBalance (só pra planos pagos — FREE não gasta)
    if (STUDIO_COST > 0 && user.creditBalance) {
      await prisma.creditBalance.update({
        where: { userId: session.user.id },
        data: {
          balance: newBalance,
          totalSpent: { increment: STUDIO_COST },
        },
      })
    }
  } catch {
    /* não bloqueia o download se o log falhar */
  }

  // ── Resposta: STL + metadados em headers ──
  const filename = (body.filename ?? `bia-${anatomyParams.kind}-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_")
  const headers = new Headers()
  headers.set("Content-Type", "model/stl")
  headers.set("Content-Length", String(stlBuf.byteLength))
  headers.set("Content-Disposition", `attachment; filename="${filename}.stl"`)
  headers.set("Cache-Control", "no-store")
  // Metadados para a UI (JS pode ler via Response.headers)
  headers.set("x-bia-triangles", String(mesh.stats.triangleCount))
  headers.set("x-bia-vertices", String(mesh.stats.vertexCount))
  headers.set("x-bia-volume-mm3", mesh.stats.volume_mm3.toFixed(2))
  headers.set("x-bia-gen-ms", String(genMs))
  headers.set("x-bia-anatomy", anatomyParams.kind)
  headers.set("x-bia-anatomy-label", anatomyMeta.shortLabel)
  headers.set("x-bia-size", `${anatomyParams.sizeX}x${anatomyParams.sizeY}x${anatomyParams.sizeZ}`)
  headers.set("x-bia-cost-credits", String(STUDIO_COST))
  // Infill é METADADO (não parte do STL) — o slicer usará isso
  if (infillMeta) {
    headers.set("x-bia-infill-pattern", infillMeta.pattern)
    headers.set("x-bia-infill-porosity", infillMeta.porosity.toFixed(4))
    headers.set("x-bia-infill-cells", String(infillMeta.cellsPerAxis))
  }
  if (parseInfo) {
    headers.set("x-bia-parse-confidence", parseInfo.confidence.toFixed(2))
    headers.set("x-bia-parse-preset", parseInfo.presetId ?? "none")
    if (parseInfo.warnings.length > 0) {
      // headers só aceitam ASCII seguro; encodeURIComponent evita 500 em acentos
      headers.set("x-bia-warnings", encodeURIComponent(parseInfo.warnings.join(" | ")))
    }
  }
  headers.set(
    "Access-Control-Expose-Headers",
    "x-bia-triangles,x-bia-vertices,x-bia-volume-mm3,x-bia-gen-ms,x-bia-anatomy,x-bia-anatomy-label,x-bia-size,x-bia-cost-credits,x-bia-infill-pattern,x-bia-infill-porosity,x-bia-infill-cells,x-bia-parse-confidence,x-bia-parse-preset,x-bia-warnings",
  )

  return new Response(stlBuf, { status: 200, headers })
}
