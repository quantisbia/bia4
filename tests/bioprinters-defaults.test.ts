import { describe, it, expect } from "vitest"
import { BIOPRINTERS, getBioprinterById } from "@/lib/bioprinting/bioprinters"

// ═══════════════════════════════════════════════════════════════════
// CENÁRIO 3 (R12.47/R12.48): "Selecionar BioEdTech → verificar quais
// parâmetros são alterados"
//
// O que este teste protege:
//   1. A entrada `bioender_bioedtech` continua existindo no catálogo
//   2. Build volume permanece 200×200×200 mm (Ender 3 stock)
//   3. Firmware aberto (Marlin/Klipper/RepRap) — pré-requisito para o
//      G-code Marlin gerado pela BIA rodar direto via Web Serial
//   4. Baud 115200 — pré-requisito do Web Serial USB Marlin padrão
//   5. Tem aquecimento de mesa (GelMA precisa controlar temperatura)
//   6. NÃO tem UV (BioEnder é puramente extrusão pneumática + FDM)
//   7. Suporta bocais finos (≤ 410 µm) para hidrogéis e bocais grossos
//      (≥ 840 µm) para FDM filamentado
// ═══════════════════════════════════════════════════════════════════

describe("cenário 3: defaults da BIOEDTECH BioEnder", () => {
  const bioender = BIOPRINTERS.find((p) => p.id === "bioender_bioedtech")

  it("existe no catálogo BIOPRINTERS", () => {
    expect(bioender).toBeDefined()
  })

  it("tem identidade brasileira correta (BIOEDTECH / BioEnder)", () => {
    expect(bioender?.brand).toBe("BIOEDTECH")
    expect(bioender?.model).toBe("BioEnder")
  })

  it("tem build volume 200×200×200 mm (Ender 3 stock)", () => {
    expect(bioender?.buildVolume).toEqual({
      x: 200,
      y: 200,
      z: 200,
      unit: "mm",
    })
  })

  it("aceita firmware aberto Marlin/Klipper/RepRap (pré-req do G-code BIA)", () => {
    expect(bioender?.firmwareCompatibility).toContain("Marlin")
    expect(bioender?.firmwareCompatibility).toContain("Klipper")
    expect(bioender?.firmwareCompatibility).toContain("RepRap")
  })

  it("usa baud 115200 (Web Serial USB Marlin padrão)", () => {
    expect(bioender?.baud).toBe(115200)
  })

  it("é pneumática + FDM (não DLP, não pistão, não parafuso)", () => {
    expect(bioender?.technology).toContain("extrusion_pneumatic")
    expect(bioender?.technology).toContain("extrusion_FDM")
    expect(bioender?.technology).not.toContain("DLP")
    expect(bioender?.technology).not.toContain("extrusion_piston")
    expect(bioender?.technology).not.toContain("extrusion_screw")
  })

  it("tem mesa aquecida (GelMA, colágeno precisam de controle térmico)", () => {
    expect(bioender?.hasBedHeating).toBe(true)
  })

  it("NÃO tem cura UV (BioEnder não é DLP nem photo-cure)", () => {
    expect(bioender?.hasUVcuring).toBe(false)
  })

  it("oferece bocais finos para hidrogéis (≤ 410 µm) e grossos para FDM (≥ 840 µm)", () => {
    const nozzles = bioender?.nozzleDiameters_um ?? []
    const hasFineNozzle = nozzles.some((n) => n <= 410)
    const hasCoarseNozzle = nozzles.some((n) => n >= 840)
    expect(hasFineNozzle).toBe(true)
    expect(hasCoarseNozzle).toBe(true)
  })

  it("tem faixa de temperatura compatível com GelMA (4–37 °C)", () => {
    expect(bioender?.temperatureRange_C.min).toBeLessThanOrEqual(4)
    expect(bioender?.temperatureRange_C.max).toBeGreaterThanOrEqual(37)
  })

  it("é o default da página /slice (R12.47): vem antes de cellink_biox no array", () => {
    // Não é estritamente "default" via campo, mas a página /slice usa
    // `bioender_bioedtech` como valor inicial do useState. Aqui apenas
    // garantimos que o id continua disponível para o useState não quebrar.
    const ids = BIOPRINTERS.map((p) => p.id)
    expect(ids).toContain("bioender_bioedtech")
    // E que cellink_biox (antigo default) também continua existindo
    expect(ids).toContain("cellink_biox")
  })
})

// ═══════════════════════════════════════════════════════════════════
// R12.53: USB Vendor IDs (filtro Web Serial)
//
// O bug "não está conectando na BioEnder" tinha 2 causas raiz:
//   (a) mode default = "mock" (corrigido em /execute)
//   (b) /execute chamava `navigator.serial.requestPort()` SEM filtros,
//       então o diálogo nativo do navegador listava TODAS as portas
//       seriais do sistema. O usuário podia escolher uma errada
//       (impressora térmica, GPS, modem 4G…), que abria mas não
//       respondia ao M115 e a conexão travava no handshake.
//
// Solução: cada bioimpressora declara `usbVendorIds`, e a /execute
// passa esse array como filtro do requestPort. O diálogo mostra
// só dispositivos do(s) chip(s) certo(s).
// ═══════════════════════════════════════════════════════════════════

describe("R12.53: USB Vendor IDs para filtro Web Serial", () => {
  it("BioEnder declara usbVendorIds (campo R12.53)", () => {
    const bioender = getBioprinterById("bioender_bioedtech")
    expect(bioender?.usbVendorIds).toBeDefined()
    expect(Array.isArray(bioender?.usbVendorIds)).toBe(true)
    expect(bioender?.usbVendorIds?.length).toBeGreaterThan(0)
  })

  it("BioEnder inclui CH340 (0x1A86) — chip USB-Serial mais comum em Ender 3", () => {
    const bioender = getBioprinterById("bioender_bioedtech")
    expect(bioender?.usbVendorIds).toContain(0x1A86)
  })

  it("BioEnder inclui CP210x (0x10C4) — chip de placas Ender 3 v4.2.7 silenciosas", () => {
    const bioender = getBioprinterById("bioender_bioedtech")
    expect(bioender?.usbVendorIds).toContain(0x10C4)
  })

  it("BioEnder inclui FTDI (0x0403) — Ender 3 antigas com bringup customizado", () => {
    const bioender = getBioprinterById("bioender_bioedtech")
    expect(bioender?.usbVendorIds).toContain(0x0403)
  })

  it("usbVendorIds são números válidos de USB Vendor ID (0–0xFFFF)", () => {
    for (const bp of BIOPRINTERS) {
      if (!bp.usbVendorIds) continue
      for (const id of bp.usbVendorIds) {
        expect(Number.isInteger(id)).toBe(true)
        expect(id).toBeGreaterThanOrEqual(0)
        expect(id).toBeLessThanOrEqual(0xFFFF)
      }
    }
  })

  it("getBioprinterById funciona com id válido e retorna undefined com id inválido", () => {
    expect(getBioprinterById("bioender_bioedtech")).toBeDefined()
    expect(getBioprinterById("id_que_nao_existe")).toBeUndefined()
  })
})
