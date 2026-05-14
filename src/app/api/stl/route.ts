/**
 * BIA v4 — API de Geração de STL/OBJ
 * POST /api/stl — gera e retorna arquivo STL binário
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { z } from "zod"

const stlSchema = z.object({
  geometry: z.string(),
  format: z.string().optional().default("stl_binary"),
  params: z.record(z.string(), z.number()).optional(),
})

// Dynamic import to avoid SSR issues with client-side code
// We use inline generation here for server-side
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = stlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const validFormats = ["stl_binary", "stl_ascii", "obj"]
  const fmt = parsed.data.format && validFormats.includes(parsed.data.format)
    ? parsed.data.format
    : "stl_binary"

  // Return info that client should generate locally (STL is generated client-side)
  return NextResponse.json({
    message: "STL gerado no cliente via /dashboard/bioprint/model",
    geometry: parsed.data.geometry,
    format: fmt,
    params: parsed.data.params,
    instructions: "Use a página /dashboard/bioprint/model (Bioimpressão · Etapa 1) para gerar e baixar arquivos STL/OBJ diretamente no navegador.",
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/stl",
    method: "POST",
    description: "Gerador de geometrias 3D para bioimpressão",
    geometries: [
      "membrane", "disk", "bone_block", "cube_tissue", "vessel",
      "hexagonal_liver", "femur", "nose", "meniscus", "cornea", "lens", "organoid_sphere"
    ],
    formats: ["stl_binary", "stl_ascii", "obj"],
    usage: "POST /api/stl { geometry: 'disk', format: 'stl_binary', params: { radius: 10, thickness: 3 } }",
  })
}
