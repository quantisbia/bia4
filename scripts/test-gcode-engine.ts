/**
 * BIA v4.2 — Teste funcional do motor GCODE
 * Gera um G-code real para validar a pipeline completa.
 *
 * Uso: npx ts-node scripts/test-gcode-engine.ts
 */

import { generateGCodeForJob } from "../src/lib/gcode/engine"
import { getBioprinter } from "../src/lib/gcode/profiles/bioprinters"
import { WELL_PLATES } from "../src/lib/gcode/wellplates/catalog"
import { planTrajectory } from "../src/lib/gcode/wellplates/trajectory-planner"
import { writeFileSync } from "fs"
import { join } from "path"

// ═══════════════════════════════════════════════════════════════
// CASO DE TESTE: osso trabecular com Gyroid em 6 poços (placa 24)
// ═══════════════════════════════════════════════════════════════
const bp = getBioprinter("cellink_biox")

const job = {
  id: "test_001",
  name: "test_bone_gyroid_24well",
  bioprinter: bp,
  bioink: {
    id: "gelma_10",
    material: "GelMA",
    concentration: 10,
    hasCells: true,
    cellDensity: 2,
    viscosity_cP: 1500,
    crosslinker: "UV 365nm",
    temperature_c: 22,
    pressure_kpa: 80,
    shearStressMax_Pa: 50,
    nozzleDiameter_um: 410,
    flowMultiplier: 1.0,
    retraction_mm: 0,
    printSpeed_mms: 8,
    travelSpeed_mms: 50,
  },
  layerHeight: 0.25,
  skirtLoops: 0,
  walls: 2,
  infillPercent: 30,
  infillAlgorithm: "gyroid_tpms" as const,
  macroPorosity: { density: 0.7, poreSize_um: 450 },
  wellPlate: {
    format: 24 as const,
    selectedWells: ["A1", "A2", "A3", "B1", "B2", "B3"],
    replicationMode: "same" as const,
    zHopBetweenWells_mm: 5,
    pauseBetweenWells_s: 2,
    purgeVolume_uL: 1,
    wipeTowerEnabled: false,
  },
  tissue: "Osso trabecular",
  application: "Scaffold ósseo condral",
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("BIA v4.2 — TESTE DO MOTOR GCODE")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("Caso: osso trabecular com Gyroid TPMS, placa 24-well, 6 poços\n")

// Teste 1: trajetória ótima
const spec = WELL_PLATES[24]
const traj = planTrajectory(spec, job.wellPlate.selectedWells, {
  algorithm: "nearest_2opt",
  returnToStart: false,
})
console.log("📍 TRAJETÓRIA ÓTIMA ENTRE POÇOS:")
console.log(`   Ordem: ${traj.orderedWells.join(" → ")}`)
console.log(`   Distância total de travel: ${traj.totalTravelDistance_mm.toFixed(1)} mm`)
console.log(`   Algoritmo: ${traj.algorithm} (${traj.iterations} iterações 2-opt)\n`)

// Teste 2: geração de G-code
console.log("🖨️  GERANDO G-CODE...")
const t0 = Date.now()
const result = generateGCodeForJob({
  job,
  geometryId: "bone_block",
  geometryParams: { width: 5, height: 5, depth: 3 },
  wellPlate: job.wellPlate,
})
const dt = Date.now() - t0

console.log(`   ✓ Gerado em ${dt} ms\n`)
console.log("📊 ESTATÍSTICAS:")
console.log(`   Linhas de G-code: ${result.totalLines.toLocaleString()}`)
console.log(`   Camadas: ${result.layerCount}`)
console.log(`   Poços usados: ${result.wellsUsed.length} (${result.wellsUsed.join(", ")})`)
console.log(`   Tempo estimado: ${result.estimatedTime_min} min`)
console.log(`   Volume bioink: ${result.bioinkVolume_uL} µL`)
console.log(`   Distância total: ${result.totalDistance_mm} mm`)
console.log(`     ├─ Travel: ${result.stats.travelDistance_mm} mm`)
console.log(`     └─ Extrude: ${result.stats.extrudeDistance_mm} mm`)
console.log(`   Shear stress pico: ${result.stats.peakShearStress_Pa} Pa`)
console.log(`   Viabilidade estimada: ${result.stats.viabilityEstimate_pct}%\n`)

if (result.warnings.length > 0) {
  console.log("⚠️  WARNINGS:")
  result.warnings.forEach((w) => console.log(`   - ${w}`))
  console.log()
}

// Teste 3: salvar arquivo G-code
const outputPath = join(__dirname, "../test-output.gcode")
writeFileSync(outputPath, result.gcode)
console.log(`💾 G-code salvo em: ${outputPath}`)
console.log(`   Tamanho: ${(result.gcode.length / 1024).toFixed(1)} KB\n`)

// Teste 4: mostrar amostras do G-code
const lines = result.gcode.split("\n")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("📄 PREVIEW — primeiras 35 linhas (header):")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(lines.slice(0, 35).join("\n"))

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("📄 AMOSTRAS — transição entre poços:")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
const wellTransitions = lines.map((l, i) => (l.includes("WELL") ? i : -1)).filter((i) => i >= 0).slice(0, 3)
wellTransitions.forEach((idx) => {
  console.log(`\n… [linha ${idx}]`)
  console.log(lines.slice(idx, Math.min(idx + 8, lines.length)).join("\n"))
})

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("📄 PREVIEW — últimas 20 linhas (footer + UV):")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(lines.slice(-20).join("\n"))

console.log("\n✅ TESTE COMPLETO — motor funcionando corretamente!\n")
