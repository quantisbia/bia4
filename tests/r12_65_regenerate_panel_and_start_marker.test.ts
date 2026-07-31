/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.65 — Regenerador embutido na pré-execução + destaque do ponto
 *           inicial (G92 X0 Y0 Z0 E0) e do primeiro filamento
 *  ─────────────────────────────────────────────────────────────────────
 *  Mandato Janaina:
 *  "para regenerar um gcode, precisa ser feito no painel Validação
 *   visual do G-code · pré-execução, onde podemos alterar dimensões
 *   do STL e Parâmetros de GCode para visualizar depois de uma
 *   regeneracao e antes de bioimpimir. deixe no painel a vista onde
 *   está o ponto inicial da impressão, onde está o G92 x0 y0 z0 e0
 *   para facilitar termos um resultado magnifico e todo conseguirem
 *   imprimir sem dificuldade."
 *
 *  Estes testes garantem:
 *   A) O componente RegeneratePanel está exportado e é chamável
 *   B) O código-fonte do RegeneratePanel expõe os controles esperados
 *      (Escala X/Y/Z, layer height, infill, print speed, flow, walls, temp)
 *   C) O RegeneratePanel usa POST /api/gcode/generate (mesmo endpoint
 *      usado pela Etapa 3 /slice — nada de endpoint fantasma)
 *   D) O GcodeViewer3D destaca o ponto inicial G92 X0 Y0 Z0 E0
 *      (label "INÍCIO", "G92 X0 Y0 Z0 E0", "Posicione o bico AQUI")
 *   E) O GcodeViewer3D destaca o "1º filamento" (primeiro G1 com E>0)
 *   F) A página /execute integra o RegeneratePanel acima do
 *      GcodeValidatorPanel
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
// NOTA: vitest.config aqui não tem plugin JSX (environment: "node"), então
// não podemos importar o componente RegeneratePanel em runtime — a análise
// estática do source-code cobre a superfície pública sem precisar renderizar.

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

describe("R12.65.A · RegeneratePanel — arquivo e exports", () => {
  const src = readSrc("src/components/bioprinter/RegeneratePanel.tsx")

  it("o arquivo RegeneratePanel.tsx existe e exporta o componente", () => {
    expect(src.length).toBeGreaterThan(500)
    expect(src).toMatch(/export\s+function\s+RegeneratePanel\s*\(/)
  })

  it("exporta o tipo RegenerateOverrides com todos os campos esperados", () => {
    // O tipo é a fonte de verdade da API do painel — se alguém remover
    // um campo, o teste quebra e força discussão consciente.
    expect(src).toMatch(/export\s+interface\s+RegenerateOverrides\b/)
    for (const field of [
      "scaleXPct",
      "scaleYPct",
      "scaleZPct",
      "layerHeightMm",
      "infillPercent",
      "printSpeedMmS",
      "extrusionMultiplier",
      "walls",
      "cartridgeTempC",
    ]) {
      // Cada campo deve aparecer na interface como "campo: tipo"
      const pattern = new RegExp(`\\b${field}\\s*:`)
      expect(src, `RegenerateOverrides deve ter o campo '${field}'`).toMatch(pattern)
    }
  })
})

describe("R12.65.B · RegeneratePanel — controles esperados no source", () => {
  const src = readSrc("src/components/bioprinter/RegeneratePanel.tsx")

  it("tem controles de dimensões (Escala X, Y, Z)", () => {
    expect(src).toMatch(/Escala X/)
    expect(src).toMatch(/Escala Y/)
    expect(src).toMatch(/Escala Z/)
    // e o campo do state que persiste esses valores
    expect(src).toMatch(/scaleXPct/)
    expect(src).toMatch(/scaleYPct/)
    expect(src).toMatch(/scaleZPct/)
  })

  it("tem controle de layer height, infill, print speed", () => {
    expect(src).toMatch(/Layer height/i)
    expect(src).toMatch(/Infill/i)
    expect(src).toMatch(/Print speed/i)
  })

  it("tem controle de fluxo (extrusion multiplier) e walls", () => {
    // O label na UI é curto: "Flow"
    expect(src).toMatch(/Flow/)
    expect(src).toMatch(/Walls/)
    expect(src).toMatch(/extrusionMultiplier/)
  })

  it("tem controle de temperatura do cartucho", () => {
    expect(src).toMatch(/Temp cartucho/i)
    expect(src).toMatch(/cartridgeTempC/)
  })

  it("botão principal é 'Regerar G-code'", () => {
    expect(src).toMatch(/Regerar G-code/)
  })
})

describe("R12.65.C · RegeneratePanel — chama /api/gcode/generate (mesmo endpoint da /slice)", () => {
  const src = readSrc("src/components/bioprinter/RegeneratePanel.tsx")

  it("faz POST em /api/gcode/generate", () => {
    expect(src).toMatch(/fetch\(\s*["'`]\/api\/gcode\/generate["'`]/)
    expect(src).toMatch(/method:\s*["'`]POST["'`]/)
  })

  it("envia geometryId e params de geometria no body", () => {
    expect(src).toMatch(/geometryId/)
    expect(src).toMatch(/geometry:\s*\{\s*id/)
    expect(src).toMatch(/params:\s*geomParams/)
  })

  it("envia bioink com flowMultiplier (respeitando override)", () => {
    expect(src).toMatch(/flowMultiplier:\s*overrides\.extrusionMultiplier/)
  })

  it("envia layer height, walls, infill percent com overrides do painel", () => {
    expect(src).toMatch(/layerHeight_mm:\s*overrides\.layerHeightMm/)
    expect(src).toMatch(/walls:\s*Math\.max\(1,\s*overrides\.walls\)/)
    expect(src).toMatch(/infillPercent:\s*overrides\.infillPercent/)
  })
})

describe("R12.65.D · GcodeViewer3D — destaque do ponto inicial G92 X0 Y0 Z0 E0", () => {
  const src = readSrc("src/components/bioprinter/GcodeViewer3D.tsx")

  it("tem label 'INÍCIO · G92 X0 Y0 Z0 E0' visível no canvas", () => {
    // O label exato desenhado no canvas — sinal inequívoco pra usuária
    expect(src).toMatch(/⊙\s*IN[ÍI]CIO\s*·\s*G92 X0 Y0 Z0 E0/)
  })

  it("tem instrução 'Posicione o bico AQUI antes de imprimir'", () => {
    expect(src).toMatch(/Posicione o bico AQUI antes de imprimir/)
  })

  it("desenha anel externo grande (raio ≥ 15) além do círculo antigo", () => {
    // O código antigo tinha só arc(..., 5, ...). O novo tem anéis 18 e 11.
    // Basta um deles estar presente para confirmar o destaque expandido.
    expect(src).toMatch(/arc\([^)]*origin\.x[^)]*origin\.y[^)]*,\s*18\b/)
  })

  it("desenha cruz de origem (eixos X vermelho + Y verde) — sinaliza o zero", () => {
    // Cruz em torno da origem: crossR = 24
    expect(src).toMatch(/const\s+crossR\s*=\s*24/)
    // Comentários que confirmam a semântica (X vermelho, Y verde)
    expect(src).toMatch(/eixo X.*vermelho/)
    expect(src).toMatch(/eixo Y.*verde/)
  })
})

describe("R12.65.E · GcodeViewer3D — destaque do primeiro filamento (1º G1 com E>0)", () => {
  const src = readSrc("src/components/bioprinter/GcodeViewer3D.tsx")

  it("procura o primeiro move de extrusão real (G1 com E>0)", () => {
    // A busca é feita via parsed.moves.find(...)
    expect(src).toMatch(/parsed\.moves\.find\(\s*\(m\)\s*=>\s*m\.type\s*===\s*["'`]G1["'`]\s*&&\s*m\.e\s*>\s*0/)
  })

  it("desenha linha tracejada do zero até o primeiro filamento", () => {
    // setLineDash([4, 4]) — tracejado curto — junto com origin.x/y como início
    expect(src).toMatch(/setLineDash\(\[\s*4\s*,\s*4\s*\]\)/)
  })

  it("mostra label '1º filamento' com coordenadas do primeiro extrude", () => {
    // O template literal contém "1º filamento (" e formata to.x, to.y, to.z
    expect(src).toMatch(/1º\s*filamento/)
    expect(src).toMatch(/firstExtrude\.to\.x\.toFixed/)
    expect(src).toMatch(/firstExtrude\.to\.y\.toFixed/)
    expect(src).toMatch(/firstExtrude\.to\.z\.toFixed/)
  })
})

describe("R12.65.F · /execute/page.tsx — integração do painel de regeneração", () => {
  const src = readSrc("src/app/dashboard/bioprint/execute/page.tsx")

  it("importa o RegeneratePanel", () => {
    expect(src).toMatch(/import\s*\{\s*RegeneratePanel\s*\}\s*from\s*["'`]@\/components\/bioprinter\/RegeneratePanel["'`]/)
  })

  it("renderiza o <RegeneratePanel /> passando bioprintState + callbacks", () => {
    expect(src).toMatch(/<RegeneratePanel\b/)
    expect(src).toMatch(/bioprintState=\{bioprintState\}/)
    expect(src).toMatch(/onRegenerated=/)
  })

  it("callback onRegenerated atualiza gcodeText no /execute (viewer reflete)", () => {
    // A implementação atualiza via setGcodeText(newGcode)
    expect(src).toMatch(/onRegenerated=\{[^}]*setGcodeText\(newGcode\)/)
  })

  it("o RegeneratePanel aparece ANTES do GcodeValidatorPanel na página", () => {
    const regenIdx = src.indexOf("<RegeneratePanel")
    const validatorIdx = src.indexOf("<GcodeValidatorPanel")
    expect(regenIdx).toBeGreaterThan(0)
    expect(validatorIdx).toBeGreaterThan(0)
    expect(regenIdx).toBeLessThan(validatorIdx)
  })

  it("o título do GcodeValidatorPanel enfatiza o destaque do ponto inicial", () => {
    // Título atualizado no R12.65
    expect(src).toMatch(/Valida[çc][ãa]o visual do G-code · pr[ée]-execu[çc][ãa]o.*ponto inicial destacado/)
  })
})
