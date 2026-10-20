/**
 * Smoke test R14.4 — valida fluxo prompt → anatomy mesh → STL binário.
 * Reproduz EXATAMENTE o que a API faz, mas sem passar por auth/HTTP.
 *
 * Uso: npx tsx scripts/_smoke-studio-r14-4.ts
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"

import { parseScaffoldPrompt, describeParseResult } from "../src/lib/studio/parser"
import { generateAnatomyMesh, getAnatomyMeta } from "../src/lib/studio/anatomy"
import { meshToSTLBinary, validateSTLBinary } from "../src/lib/studio/stl-exporter"

const OUT_DIR = resolve(__dirname, "../tmp/studio-smoke")
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const CASES = [
  // Formas anatômicas específicas
  "Menisco gyroid 40x20x6 mm 75% porosidade",
  "Calota craniana 60x50x4 mm diamond 65%",
  "Mandíbula 40x12x15 mm",
  "Fêmur 25x25x40 mm",
  "Orelha para microtia",
  "Disco intervertebral lombar 35x25x8 mm",
  "Cilindro 10x10x30 mm",
  "Bloco 20x20x10 mm",
  // Presets clínicos sem forma explícita
  "Scaffold ósseo esponjoso",
  "Scaffold de cartilagem articular",
  "Enxerto alveolar",
  // Teste do bug reportado: mudar infill NÃO altera STL
  "Menisco 40x20x6 mm gyroid 75%",
  "Menisco 40x20x6 mm diamond 75%",
  "Menisco 40x20x6 mm schwarz-p 75%",
]

console.log("═══════════════════════════════════════════════════════════════")
console.log("  R14.4 SMOKE TEST · Studio Scaffold Generator (anatomy mode)")
console.log("═══════════════════════════════════════════════════════════════\n")

interface Result {
  prompt: string
  anatomyKind: string
  anatomyLabel: string
  sizeStr: string
  volumeMm3: number
  triangles: number
  vertices: number
  porosity: number
  infillPattern: string
  infillPorosity: number
  genMs: number
  stlBytes: number
  stlValid: boolean
  filename: string
}

const results: Result[] = []

for (const prompt of CASES) {
  const t0 = Date.now()
  const parsed = parseScaffoldPrompt(prompt)
  const parseMs = Date.now() - t0

  const anatomyMeta = getAnatomyMeta(parsed.anatomy.kind)
  const t1 = Date.now()
  const mesh = generateAnatomyMesh({ ...parsed.anatomy, resolution: 32 })
  const genMs = Date.now() - t1

  const headerText = `BIA v4 Studio | ${anatomyMeta.label} | ${parsed.anatomy.sizeX}x${parsed.anatomy.sizeY}x${parsed.anatomy.sizeZ}mm`
  const stlBuf = meshToSTLBinary(mesh, headerText)
  const validation = validateSTLBinary(stlBuf)

  const filename = `${parsed.anatomy.kind}_${parsed.anatomy.sizeX}x${parsed.anatomy.sizeY}x${parsed.anatomy.sizeZ}_${parsed.infillSuggestion.pattern}.stl`
  const filePath = resolve(OUT_DIR, filename)
  writeFileSync(filePath, Buffer.from(stlBuf))

  const result: Result = {
    prompt,
    anatomyKind: parsed.anatomy.kind,
    anatomyLabel: anatomyMeta.shortLabel,
    sizeStr: `${parsed.anatomy.sizeX}×${parsed.anatomy.sizeY}×${parsed.anatomy.sizeZ}`,
    volumeMm3: mesh.stats.volume_mm3,
    triangles: mesh.stats.triangleCount,
    vertices: mesh.stats.vertexCount,
    porosity: mesh.stats.porosity,
    infillPattern: parsed.infillSuggestion.pattern,
    infillPorosity: parsed.infillSuggestion.porosity,
    genMs,
    stlBytes: stlBuf.byteLength,
    stlValid: validation.ok,
    filename,
  }
  results.push(result)

  console.log(`📝 "${prompt}"`)
  console.log(`   → ${describeParseResult(parsed)}`)
  console.log(`   ✓ ${anatomyMeta.emoji} ${anatomyMeta.shortLabel} · ${result.sizeStr} mm`)
  console.log(`     triangles=${result.triangles}  vertices=${result.vertices}  volume=${result.volumeMm3.toFixed(0)}mm³`)
  console.log(`     porosity (do STL)=${(result.porosity * 100).toFixed(1)}% ${result.porosity === 0 ? "✓ SÓLIDO" : "⚠️ não é sólido!"}`)
  console.log(`     infill (metadata)=${result.infillPattern} @ ${(result.infillPorosity * 100).toFixed(0)}%`)
  console.log(`     STL: ${(result.stlBytes / 1024).toFixed(1)} KB ${result.stlValid ? "✓" : "✗ INVÁLIDO"}`)
  console.log(`     parse=${parseMs}ms  gen=${genMs}ms  → ${result.filename}`)
  console.log()
}

/* ───────────── VALIDAÇÃO: mudar infill NÃO altera o STL ───────────── */
console.log("═══════════════════════════════════════════════════════════════")
console.log("  VALIDAÇÃO CRÍTICA: mudar infill não altera STL anatômico")
console.log("═══════════════════════════════════════════════════════════════\n")

const meniscoGroup = results.filter(r => r.prompt.includes("Menisco 40x20x6"))
if (meniscoGroup.length >= 2) {
  const refTri = meniscoGroup[0].triangles
  const refVol = meniscoGroup[0].volumeMm3
  let allSame = true
  for (const r of meniscoGroup) {
    const triDiff = Math.abs(r.triangles - refTri)
    const volDiff = Math.abs(r.volumeMm3 - refVol)
    const same = triDiff === 0 && volDiff < 0.01
    console.log(`  [${r.infillPattern.padEnd(10)}] triangles=${r.triangles} volume=${r.volumeMm3.toFixed(2)} → ${same ? "✓ IDÊNTICO" : `✗ DIFERENTE (Δtri=${triDiff}, Δvol=${volDiff.toFixed(4)})`}`)
    if (!same) allSame = false
  }
  console.log()
  if (allSame) {
    console.log("  ✅ CONFIRMADO: trocar infill (gyroid/diamond/schwarz-p) produz STL IDÊNTICO.")
    console.log("     O infill é passado como METADATA pro slicer — o STL não muda.")
  } else {
    console.log("  ❌ FALHOU: STLs ficaram diferentes! O conceito ainda está errado.")
    process.exit(1)
  }
}

/* ───────────── RESUMO FINAL ───────────── */
console.log("\n═══════════════════════════════════════════════════════════════")
console.log(`  RESUMO: ${results.length} casos processados`)
console.log("═══════════════════════════════════════════════════════════════")
const allValid = results.every(r => r.stlValid)
const allSolid = results.every(r => r.porosity === 0)
console.log(`  STLs válidos:    ${results.filter(r => r.stlValid).length}/${results.length} ${allValid ? "✅" : "❌"}`)
console.log(`  Todos sólidos:   ${results.filter(r => r.porosity === 0).length}/${results.length} ${allSolid ? "✅" : "❌"}`)
console.log(`  Formas únicas:   ${new Set(results.map(r => r.anatomyKind)).size}`)
console.log(`  STLs salvos em:  ${OUT_DIR}`)
console.log(`  Tamanho total:   ${(results.reduce((s, r) => s + r.stlBytes, 0) / 1024).toFixed(1)} KB`)
console.log()

if (allValid && allSolid) {
  console.log("  ✅ R14.4 SMOKE TEST PASSED")
  process.exit(0)
} else {
  console.log("  ❌ R14.4 SMOKE TEST FAILED")
  process.exit(1)
}
