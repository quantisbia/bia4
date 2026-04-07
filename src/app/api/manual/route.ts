import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "manual-bia-v4.html")
    const content = readFileSync(filePath, "utf-8")
    return new NextResponse(content, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch {
    return new NextResponse("Manual não encontrado", { status: 404 })
  }
}
