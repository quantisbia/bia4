import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      plan: session.user.plan,
      credits: session.user.credits,
      role: session.user.role,
    },
  })
}
