/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.2 · API /api/user/profile — ler + atualizar perfil
 *  ─────────────────────────────────────────────────────────────────────
 *  GET    → retorna { researchArea, name, institution } do usuário logado
 *  PATCH  → body { researchArea?, institution? }
 *           Valida researchArea contra o catálogo de 6 UserProfiles.
 *           Grava User.researchArea (campo existente, não precisa migration).
 *
 *  O researchArea aqui é o UserProfileId do R14.1 (orthopedist, dermatologist,
 *  dentist, postgrad, undergrad, researcher). Mesmo campo que a lib
 *  resolveUserProfile() lê no servidor.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getProfileById, USER_PROFILES } from "@/lib/user/profile"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      researchArea: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    researchArea: user.researchArea ?? null,
    availableProfiles: USER_PROFILES.map(p => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      emoji: p.emoji,
      description: p.description,
      defaultMode: p.defaultMode,
      accentColor: p.accentColor,
    })),
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { researchArea?: string | null; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const dataToUpdate: { researchArea?: string | null; name?: string } = {}

  // ── Validação do researchArea ──
  if (body.researchArea !== undefined) {
    if (body.researchArea === null || body.researchArea === "") {
      // permitir "limpar" o perfil
      dataToUpdate.researchArea = null
    } else {
      const profile = getProfileById(body.researchArea)
      if (!profile) {
        return NextResponse.json(
          {
            error: "invalid_profile",
            message: `Perfil inválido: '${body.researchArea}'. Valores aceitos: ${USER_PROFILES.map(p => p.id).join(", ")}`,
          },
          { status: 400 },
        )
      }
      dataToUpdate.researchArea = profile.id
    }
  }

  // ── Validação do name (opcional) ──
  if (body.name !== undefined) {
    const trimmed = typeof body.name === "string" ? body.name.trim() : ""
    if (trimmed.length < 2) {
      return NextResponse.json(
        { error: "invalid_name", message: "Nome deve ter pelo menos 2 caracteres." },
        { status: 400 },
      )
    }
    if (trimmed.length > 120) {
      return NextResponse.json(
        { error: "invalid_name", message: "Nome deve ter até 120 caracteres." },
        { status: 400 },
      )
    }
    dataToUpdate.name = trimmed
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json(
      { error: "nothing_to_update", message: "Nenhum campo válido enviado." },
      { status: 400 },
    )
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      researchArea: true,
    },
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      researchArea: updated.researchArea,
    },
  })
}
