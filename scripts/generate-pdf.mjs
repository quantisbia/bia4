/**
 * BIA v4 — Gerador de PDF do Manual
 * Usa Puppeteer para gerar PDF de alta qualidade do manual HTML
 */
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

console.log('🚀 BIA v4 — Iniciando geração de PDF do Manual...')

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
  ],
})

console.log('✅ Browser iniciado')

const page = await browser.newPage()

// Read the HTML file directly
const htmlPath = join(rootDir, 'public', 'manual-bia-v4.html')
const htmlContent = readFileSync(htmlPath, 'utf-8')

// Inject print-specific CSS overrides for better PDF output
const printOverrides = `
  <style>
    /* PDF-specific overrides */
    #sidebar, #sidebar-toggle { display: none !important; }
    #main-content { margin-left: 0 !important; }
    body { font-size: 13px !important; }
    .hero { padding: 40px 40px 30px !important; }
    .section { padding: 30px 40px !important; max-width: 100% !important; }
    h1 { font-size: 36px !important; }
    .section-title { font-size: 20px !important; }
    
    /* Force backgrounds to print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    
    /* Page breaks */
    #cap-intro { page-break-before: avoid; }
    #cap-pipeline { page-break-before: always; }
    #cap-biomateriais { page-break-before: always; }
    #cap-bioimpressao { page-break-before: always; }
    #cap-organoides { page-break-before: always; }
    #cap-protocolos { page-break-before: always; }
    #cap-analises { page-break-before: always; }
    #cap-chat { page-break-before: always; }
    #cap-knowledge { page-break-before: avoid; }
    #cap-admin { page-break-before: avoid; }
    #cap-creditos-ref { page-break-before: always; }
    #cap-fluxo { page-break-before: always; }
    #cap-dicas { page-break-before: always; }
    
    .card { break-inside: avoid; }
    .pipeline-stage { break-inside: avoid; }
    .data-table { break-inside: auto; }
    .data-table tr { break-inside: avoid; }
    
    /* Gradient text fallback for PDF */
    .gradient-text {
      background: none !important;
      -webkit-background-clip: unset !important;
      -webkit-text-fill-color: #a78bfa !important;
      color: #a78bfa !important;
    }
    
    /* Fix tip boxes */
    .tip-box { break-inside: avoid; }
    
    /* Footer */
    footer { page-break-before: always; }
  </style>
`

// Inject the print overrides into the HTML
const modifiedHtml = htmlContent.replace('</head>', printOverrides + '</head>')

console.log('📄 Carregando HTML...')
await page.setContent(modifiedHtml, {
  waitUntil: ['networkidle0', 'domcontentloaded'],
  timeout: 60000,
})

// Wait for fonts and styles to load
await new Promise(r => setTimeout(r, 3000))

console.log('🎨 Gerando PDF...')
const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: {
    top: '15mm',
    bottom: '15mm',
    left: '10mm',
    right: '10mm',
  },
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size:9px;color:#666;width:100%;text-align:right;padding-right:15mm;font-family:Arial,sans-serif;">
      Manual BIA v4 — Biofabrication Intelligence Agent · Quantis Biotechnology
    </div>
  `,
  footerTemplate: `
    <div style="font-size:9px;color:#666;width:100%;display:flex;justify-content:space-between;padding:0 15mm;font-family:Arial,sans-serif;">
      <span>© 2026 Quantis Biotechnology — Janaina Dernowsek</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>
  `,
})

await browser.close()

const outputPath = join(rootDir, 'public', 'Manual_BIA_v4_Quantis.pdf')
writeFileSync(outputPath, pdfBuffer)

const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2)
console.log(`✅ PDF gerado com sucesso!`)
console.log(`📁 Arquivo: ${outputPath}`)
console.log(`📊 Tamanho: ${sizeMB} MB`)
console.log(`\n🌐 Disponível em: http://localhost:3000/Manual_BIA_v4_Quantis.pdf`)
