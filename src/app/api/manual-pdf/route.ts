import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "Manual_BIA_v4_Quantis.pdf")
    const content = readFileSync(filePath)
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"Manual_BIA_v4_Quantis.pdf\"",
        "Content-Length": content.length.toString(),
      },
    })
  } catch {
    return new NextResponse("PDF não encontrado", { status: 404 })
  }
}
