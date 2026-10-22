/**
 * POST /api/auth/change-password (R24)
 * Troca de senha do usuário logado (Configurações → Segurança).
 *   body: { currentPassword, newPassword }
 *   · exige sessão
 *   · confere a senha atual com bcrypt
 *   · nova senha ≥ 8 caracteres, com letra e número
 *   · audit log
 */
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

const schema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z
    .string()
    .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
    .max(200)
    .regex(/[A-Za-z]/, "A nova senha precisa ter ao menos uma letra.")
    .regex(/\d/, "A nova senha precisa ter ao menos um número."),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "Corpo inválido." }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }
  const { currentPassword, newPassword } = parsed.data
  if (currentPassword === newPassword) {
    return NextResponse.json({ ok: false, error: "A nova senha deve ser diferente da atual." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true } })
  if (!user?.password) {
    return NextResponse.json({ ok: false, error: "Esta conta não usa senha. Use 'Esqueci a senha' para definir uma." }, { status: 400 })
  }
  const okCurrent = await bcrypt.compare(currentPassword, user.password)
  if (!okCurrent) return NextResponse.json({ ok: false, error: "Senha atual incorreta." }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  await prisma.auditLog.create({ data: { userId, action: "auth.password.change", entity: "User", entityId: userId } }).catch(() => {})

  return NextResponse.json({ ok: true })
}
