/**
 * R13.15.1 · Gera o PDF do e-book "Biofabricação em Ortopedia" via Puppeteer
 * R13.15.2 · Output movido para /private-library/ (fora de /public)
 *
 * Fluxo:
 *   1. Lê o HTML template em scripts/ebooks/ortopedia.html
 *   2. Abre via Chromium headless (puppeteer-core + chrome via puppeteer bundled)
 *   3. Gera PDF A4 com @page CSS respeitado (margens, quebras, numeração)
 *   4. Salva em /private-library/ebook-biofabricacao-ortopedia-2026.pdf
 *      (NÃO em /public — o Next.js não serve diretamente)
 *   5. Download real passa pela rota autenticada /api/library/download/[id]
 *
 * Dependências: puppeteer (já vem com Chromium headless)
 */
import puppeteer from "puppeteer"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

async function main() {
  const htmlPath = resolve(__dirname, "ortopedia.html")
  // R13.15.4 · PDF vai para /src/content/ebooks/ (dentro de /src, sempre
  // incluído no bundle Vercel por padrão — não depende de outputFileTracingIncludes).
  // Isso impede que o Next.js sirva o arquivo diretamente — só a rota
  // autenticada /api/library/download/[id] consegue acessá-lo.
  const outPath = resolve(__dirname, "../../src/content/ebooks/ebook-biofabricacao-ortopedia-2026.pdf")

  console.log("→ Carregando HTML:", htmlPath)
  statSync(htmlPath) // garante existência

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  try {
    const page = await browser.newPage()

    // Carrega via file:// pra permitir leitura de assets locais
    const fileUrl = pathToFileURL(htmlPath).toString()
    console.log("→ Navegando:", fileUrl)
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 90_000 })

    // Aguarda fontes carregarem
    await page.evaluateHandle("document.fonts.ready")

    console.log("→ Gerando PDF...")
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    })

    const stat = statSync(outPath)
    console.log(`✓ PDF gerado: ${outPath}`)
    console.log(`  Tamanho: ${(stat.size / 1024 / 1024).toFixed(2)} MB`)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
