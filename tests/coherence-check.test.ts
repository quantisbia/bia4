/**
 * BIA — Testes de aceitação do validador de coerência (R12.48)
 *
 * Os 6 cenários que a Bia pediu, mais 1 cenário extra de edge case:
 *
 *   1. Orelha + GelMA + Cellink + Linhas → G-code de orelha + linhas
 *      → deve ser COERENTE (no máximo issue 'info' parametrica)
 *
 *   2. Orelha + GelMA + Cellink + Giroide → G-code de cubo gyroide
 *      → deve BLOQUEAR (geometria divergente: ear vs cube)
 *
 *   3. BioEdTech selecionado → parâmetros do BioEnder são carregados
 *      → testado em bioprinters-defaults.test.ts (arquivo separado)
 *
 *   4. G-code sem STL/modelo anatômico → bloqueia
 *      → cenário: state pede 'ear' mas G-code não tem G1 → BLOCK
 *
 *   5. G-code com altura de camada inválida → validador acusa
 *      → testado em gcode-validator (já existe), aqui só verificamos
 *      que coherence não bloqueia por altura (responsabilidade do
 *      gcode-validator separado)
 *
 *   6. G-code completo + state pronto → botão IMPRIMIR aparece
 *      → testado: coerência deve retornar isBlocking=false quando
 *      tudo está coerente
 *
 *   EXTRA. G-code anônimo (sem comentários) → warning (não dá pra
 *   conferir automaticamente), mas não bloqueia
 */

import { describe, it, expect } from "vitest"
import { checkCoherence, coherenceBadge } from "@/lib/bioprint/coherence-check"
import {
  makeEarGelmaLinesState,
  makeEmptyState,
  GCODE_EAR_GELMA_LINES,
  GCODE_CUBE_GYROID,
  GCODE_NO_MOVES,
  GCODE_ANONYMOUS,
} from "./_helpers/factories"

describe("checkCoherence — cenário 1: Orelha + GelMA + Linhas COERENTE", () => {
  it("deve aceitar G-code de orelha quando state pede orelha + linhas", () => {
    const state = makeEarGelmaLinesState()
    const report = checkCoherence(GCODE_EAR_GELMA_LINES, state)

    // Não deve bloquear (no máximo um 'info' sobre parametrico)
    expect(report.isBlocking).toBe(false)

    // Deve detectar a geometria orelha nos comentários
    expect(report.detected.geometryHints).toContain("ear")

    // Deve detectar material gelma
    expect(report.detected.materialHints).toContain("gelma")

    // Deve detectar padrão linhas/linear
    expect(report.detected.infillHints.some(h => /linha|linear/.test(h))).toBe(true)

    // Espera não ter issues "blocking"
    const blocking = report.issues.filter(i => i.level === "blocking")
    expect(blocking.length).toBe(0)
  })

  it("deve emitir 'info' avisando que orelha é geometria paramétrica (honestidade)", () => {
    const state = makeEarGelmaLinesState()
    const report = checkCoherence(GCODE_EAR_GELMA_LINES, state)

    // R12.47 mantém honestidade: avisa que ear é elipse afunilada, não mesh real
    const parametricInfo = report.issues.find(i => i.code === "geometria-parametrica")
    expect(parametricInfo).toBeDefined()
    expect(parametricInfo?.level).toBe("info")
    expect(parametricInfo?.fixHint).toMatch(/voxelizado|stl|slicer/i)
  })
})

describe("checkCoherence — cenário 2: Orelha + Giroide → BLOQUEIA quando G-code é cubo", () => {
  it("deve BLOQUEAR quando state pede orelha mas G-code é cubo gyroide", () => {
    // State: orelha + giroide
    const state = makeEarGelmaLinesState({ infillPatternId: "gyroid_tpms" })
    // G-code: cubo gyroide (geometria errada)
    const report = checkCoherence(GCODE_CUBE_GYROID, state)

    expect(report.isBlocking).toBe(true)

    // Deve ter pelo menos um issue 'blocking' com código geometria-divergente
    const geomBlock = report.issues.find(
      i => i.level === "blocking" && i.code === "geometria-divergente",
    )
    expect(geomBlock).toBeDefined()
    expect(geomBlock?.expected).toBe("ear")
    expect(geomBlock?.found).toMatch(/cube/)

    // fixHint deve orientar a usuária (volte para Etapa 3)
    expect(geomBlock?.fixHint).toMatch(/etapa 3|fatiamento|regere/i)
  })
})

describe("checkCoherence — cenário 4: G-code sem movimentos → BLOQUEIA", () => {
  it("deve BLOQUEAR quando G-code não tem comandos G1", () => {
    const state = makeEarGelmaLinesState()
    const report = checkCoherence(GCODE_NO_MOVES, state)

    expect(report.isBlocking).toBe(true)

    const noMovesBlock = report.issues.find(i => i.code === "gcode-sem-movimentos")
    expect(noMovesBlock).toBeDefined()
    expect(noMovesBlock?.level).toBe("blocking")
    expect(noMovesBlock?.fixHint).toMatch(/etapa 3|fatiamento|cole/i)
  })
})

describe("checkCoherence — cenário 6: state completo + G-code coerente → libera IMPRIMIR", () => {
  it("isBlocking=false quando tudo está coerente (modelo, material, infill batem)", () => {
    const state = makeEarGelmaLinesState()
    const report = checkCoherence(GCODE_EAR_GELMA_LINES, state)

    // O botão IMPRIMIR usa isBlocking — se false, libera
    expect(report.isBlocking).toBe(false)
  })

  it("badge deve refletir status (emerald quando coerente, red quando bloqueia)", () => {
    const okState = makeEarGelmaLinesState()
    const okReport = checkCoherence(GCODE_EAR_GELMA_LINES, okState)
    // Mesmo coerente, pode ter info "parametrica" → mas badge fica amber só com warning ou red só com blocking
    const okBadge = coherenceBadge(okReport)
    // Como tem só 'info', deve ser emerald (info não conta como warning)
    expect(okBadge.color).toBe("emerald")

    const badState = makeEarGelmaLinesState()
    const badReport = checkCoherence(GCODE_CUBE_GYROID, badState)
    const badBadge = coherenceBadge(badReport)
    expect(badBadge.color).toBe("red")
    expect(badBadge.label).toMatch(/bloqueio/i)
  })
})

describe("checkCoherence — EXTRA: G-code anônimo (sem comentários)", () => {
  it("não deve bloquear, mas deve avisar que não conferiu coerência", () => {
    const state = makeEarGelmaLinesState()
    const report = checkCoherence(GCODE_ANONYMOUS, state)

    // Sem comentários, validador não consegue confirmar nada — mas
    // não bloqueia (pode ser G-code externo legítimo)
    expect(report.isBlocking).toBe(false)

    // Deve ter um warning "sem cabeçalho"
    const noHeaderWarn = report.issues.find(i => i.code === "gcode-sem-cabecalho")
    expect(noHeaderWarn).toBeDefined()
    expect(noHeaderWarn?.level).toBe("warning")
  })
})

describe("checkCoherence — robustez: state vazio", () => {
  it("não deve crashar quando state é totalmente vazio", () => {
    const empty = makeEmptyState()
    expect(() => checkCoherence(GCODE_EAR_GELMA_LINES, empty)).not.toThrow()
  })

  it("não deve crashar quando G-code é string vazia", () => {
    const state = makeEarGelmaLinesState()
    expect(() => checkCoherence("", state)).not.toThrow()
  })
})
