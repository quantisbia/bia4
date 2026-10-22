/**
 * BIA v4 · R24 · Fase 1 — Modelo de tecido (o QUÊ, sem STL)
 * ─────────────────────────────────────────────────────────────────────
 * Racional Janaina: "muitas ferramentas de STL/modelagem confundem. Precisa
 * existir um racional concreto: 1 modelo de tecido · 2 biotinta · 3
 * fatiamento · 4 bioimpressão · 5 análise · 6 maturação e caracterizações."
 *
 * A Fase 1 define a INTENÇÃO biológica (tecido, aplicação, tamanho,
 * células). A malha (STL/anatômico/primitiva/desenho) vive SÓ na Fase 3.
 * Cada tecido aponta um modelo sugerido da biblioteca da Fase 3 e uma
 * biotinta validada da Fase 2 — a usuária só confirma.
 */

export interface TissueOption {
  id: string
  label: string
  icon: string
  /** aplicações típicas */
  applications: string[]
  /** faixa de dimensão principal (mm) e default */
  size: { min: number; max: number; default: number; label: string }
  /** modelo sugerido na Fase 3: id da biblioteca anatômica (`*_real`), primitiva (`prim:`) ou catálogo (`geo:`) */
  suggestedModel: string
  suggestedModelLabel: string
  /** perfil do BioSlicer sugerido */
  suggestedProfileId: string
  /** biotinta validada sugerida (rótulo da Fase 2) */
  suggestedBioink: string
  /** células usuais */
  cells: string[]
  /** infill honesto sugerido */
  suggestedInfill: string
  /** alvo sugerido */
  suggestedTarget: "petri" | "plate24" | "plate96" | "slide"
  rationale: string
}

export const TISSUES: TissueOption[] = [
  { id: "cartilagem", label: "Cartilagem (menisco, orelha, nariz)", icon: "🦻", applications: ["Implante / reconstrução", "Modelo de doença (OA)", "Scaffold para cultura"], size: { min: 10, max: 60, default: 35, label: "Comprimento (mm)" }, suggestedModel: "meniscus_real", suggestedModelLabel: "Menisco meia-lua (anatômico real)", suggestedProfileId: "adv_cartilage_concentric", suggestedBioink: "GelMA 10 % + HA", cells: ["Condrócitos", "hMSC"], suggestedInfill: "honeycomb", suggestedTarget: "petri", rationale: "Fibrocartilagem exige paredes contínuas e poros hexagonais ~300–400 µm; menisco real curvo (não facetado)." },
  { id: "pele", label: "Pele (derme + epiderme)", icon: "🩹", applications: ["Modelo dérmico full-thickness", "Screening cosmético", "Cicatrização"], size: { min: 6, max: 30, default: 10, label: "Diâmetro do patch (mm)" }, suggestedModel: "prim:cylinder", suggestedModelLabel: "Disco Ø10 × 1,2 mm (3 camadas)", suggestedProfileId: "adv_cellink_skin_3ph", suggestedBioink: "CELLINK SKIN / fibrina-colágeno", cells: ["Fibroblastos (HDF)", "Queratinócitos (HEK)"], suggestedInfill: "concentric", suggestedTarget: "plate24", rationale: "Protocolo CELLINK SKIN: 3 camadas, 1 cabeçote por camada (reticular/papilar/epiderme), concêntrico 42 %, 24 poços para replicatas." },
  { id: "osso", label: "Osso (trabecular / cortical)", icon: "🦴", applications: ["Scaffold osteogênico", "Defeito crítico", "Fêmur didático"], size: { min: 8, max: 120, default: 15, label: "Maior dimensão (mm)" }, suggestedModel: "prim:box", suggestedModelLabel: "Bloco 15 × 15 × 5 mm (ou fêmur real)", suggestedProfileId: "adv_bone_scaffold", suggestedBioink: "Alginato + HAp / GelMA-nHA", cells: ["Osteoblastos", "hMSC"], suggestedInfill: "triangles", suggestedTarget: "petri", rationale: "Rigidez: triangular ou Schwarz P/Voronoi (Avançado) com poro 400–600 µm; fêmur anatômico real para ensino/planejamento." },
  { id: "vascular", label: "Vascular (canal, ramificação)", icon: "🩸", applications: ["Canal sacrificial", "Rede ramificada", "Perfusão em chip"], size: { min: 5, max: 40, default: 20, label: "Comprimento (mm)" }, suggestedModel: "vessel_segment_real", suggestedModelLabel: "Segmento vascular ramificado (anatômico)", suggestedProfileId: "adv_vascular_channel", suggestedBioink: "Pluronic F127 (sacrificial) + GelMA", cells: ["HUVEC", "Fibroblastos"], suggestedInfill: "none", suggestedTarget: "petri", rationale: "Canal impresso em sacrificial; paredes contínuas, sem infill; FRESH ou banho de suporte para ramificações." },
  { id: "miocardio", label: "Miocárdio / músculo (patch, coração)", icon: "🫀", applications: ["Patch cardíaco", "Modelo de contração", "Coração didático"], size: { min: 8, max: 40, default: 15, label: "Lado do patch (mm)" }, suggestedModel: "prim:box", suggestedModelLabel: "Patch 15 × 20 × 0,5 mm (ou coração real)", suggestedProfileId: "basic_gelma", suggestedBioink: "GelMA 5 % + fibrina", cells: ["Cardiomiócitos (iPSC)", "Fibroblastos"], suggestedInfill: "waves", suggestedTarget: "slide", rationale: "Fibras alinhadas: linhas/ondas em uma direção; patch fino em lâmina para microscopia." },
  { id: "renal", label: "Rim (túbulo, organoide)", icon: "🫘", applications: ["Organoide renal", "Nefrotoxicidade", "Rim didático"], size: { min: 5, max: 60, default: 25, label: "Comprimento (mm)" }, suggestedModel: "kidney_real", suggestedModelLabel: "Rim em feijão (anatômico real)", suggestedProfileId: "adv_organoid_dome", suggestedBioink: "Matrigel-like / GelMA 5 %", cells: ["hiPSC-derivadas", "HK-2"], suggestedInfill: "gyroid", suggestedTarget: "plate24", rationale: "Tecido mole, perfusão interna: gyroid isotrópico; escala reduzida de laboratório." },
  { id: "hepatico", label: "Fígado (ácino, lóbulo)", icon: "🫁", applications: ["Hepatotoxicidade", "Metabolismo de fármacos", "Lóbulo hexagonal"], size: { min: 5, max: 30, default: 12, label: "Diâmetro (mm)" }, suggestedModel: "prim:cylinder", suggestedModelLabel: "Disco Ø12 × 3 mm, infill hexagonal", suggestedProfileId: "adv_organoid_dome", suggestedBioink: "GelMA 7 % + colágeno", cells: ["HepG2 / hepatócitos", "HUVEC", "Estreladas"], suggestedInfill: "honeycomb", suggestedTarget: "plate24", rationale: "Lóbulo hepático = hexágono; favo de mel real reproduz a unidade funcional." },
  { id: "neural", label: "Nervo (conduíte)", icon: "🧠", applications: ["Conduíte de regeneração", "Guia axonal"], size: { min: 5, max: 30, default: 10, label: "Comprimento (mm)" }, suggestedModel: "prim:tube", suggestedModelLabel: "Tubo Ø2,5/1,2 × 10 mm", suggestedProfileId: "adv_vascular_channel", suggestedBioink: "Fibrina / GelMA 5 %", cells: ["Schwann", "Neurônios (iPSC)"], suggestedInfill: "none", suggestedTarget: "slide", rationale: "Tubo de parede fina com canais internos; sem infill." },
  { id: "teste", label: "Teste de imprimibilidade (sem tecido)", icon: "📐", applications: ["Calibrar biotinta", "Pf (grade)", "Fidelidade 15,4 mm"], size: { min: 15.4, max: 15.4, default: 15.4, label: "Grade de fidelidade (fixa)" }, suggestedModel: "fidelity_real", suggestedModelLabel: "Grade de fidelidade 15,4 mm", suggestedProfileId: "adv_printability_grid", suggestedBioink: "A biotinta que você vai qualificar", cells: [], suggestedInfill: "rectilinear", suggestedTarget: "petri", rationale: "Antes de um construto, qualifique a biotinta: Pf, colapso, torre, fidelidade." },
]

export function getTissue(id: string): TissueOption | undefined { return TISSUES.find((t) => t.id === id) }

/** Resolve o modelo sugerido para o query da Fase 3 (`?anat=` ou `?prim=`). */
export function fase3HrefFor(t: TissueOption, size_mm: number): string {
  if (t.suggestedModel.startsWith("prim:")) return `/dashboard/bioprint/slice?prim=${t.suggestedModel.slice(5)}&size=${size_mm}&profile=${t.suggestedProfileId}&infill=${t.suggestedInfill}&target=${t.suggestedTarget}`
  return `/dashboard/bioprint/slice?anat=${t.suggestedModel}&size=${size_mm}&profile=${t.suggestedProfileId}&infill=${t.suggestedInfill}&target=${t.suggestedTarget}`
}
