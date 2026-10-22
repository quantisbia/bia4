import puppeteer from 'puppeteer'
import { readFileSync } from 'fs'
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'] })
const page = await browser.newPage()
await page.setContent(readFileSync('/home/user/webapp/scripts/r24-student-guide.html','utf8'), { waitUntil: 'load' })
await page.pdf({ path: '/home/user/webapp/scripts/BIA-Academy-Guia-do-Aluno-2026.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-size:8px;color:#8b7fb5;">BIA Academy · Guia do Aluno · página <span class="pageNumber"></span>/<span class="totalPages"></span></div>', margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } })
await browser.close()
console.log('ok')
