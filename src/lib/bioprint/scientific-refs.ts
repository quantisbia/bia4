/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Scientific References — BIA Knowledge Base (R12.8)
 *
 *  Cinco artigos canônicos que fundamentam o Biofabrication Toolpath
 *  Intelligence Engine (BTIE) da plataforma BIA. As referências são citáveis
 *  inline em qualquer componente UI via <Cite refId="..." />.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface ScientificRef {
  /** ID curto, citável (ex: "valk2025", "naativ3") */
  id: string
  /** DOI canônico */
  doi: string
  /** Título completo */
  title: string
  /** Autores (primeiro autor + et al.) */
  authors: string
  /** Periódico/journal */
  journal: string
  /** Ano de publicação */
  year: number
  /** Categoria temática */
  category:
    | "toolpath"
    | "ml-bioprinting"
    | "vector-field"
    | "low-cost-printer"
    | "perfusable-scaffold"
    | "rheology-printability"
  /** Conceitos-chave que esta referência fundamenta */
  keyConcepts: string[]
  /** Algoritmos/fórmulas/parâmetros extraídos */
  contributions: string[]
  /** Resumo de 1-2 frases para tooltip */
  shortAbstract: string
  /** URL do PDF (genspark file wrapper) */
  pdfUrl: string
  /** Slug para exibir como [autor, ano] */
  citationLabel: string
}

export const SCIENTIFIC_REFS: ScientificRef[] = [
  {
    id: "valk2025",
    doi: "10.1038/s44431-025-00006-5",
    title:
      "Non-planar additive manufacturing with hydrogels: a review of flow control and toolpath strategies",
    authors: "van der Valk P.C.W.M. & Mirzaali M.J.",
    journal: "npj Soft Matter",
    year: 2025,
    category: "toolpath",
    keyConcepts: [
      "T-code (time-based control)",
      "Herschel-Bulkley rheology",
      "Eulerian path optimization (AERO)",
      "Neural Slicer",
      "TPMS Enneper-Weierstrass",
      "Multi-axis non-planar slicing",
      "Embedded printing (FRESH-like)",
    ],
    contributions: [
      "τ = τ₀ + k·γ̇ⁿ (Herschel-Bulkley shear model)",
      "E = ft·wt·lt·sqrt((x₂−x₁)²+(y₂−y₁)²+(z₂−z₁)²)",
      "AERO Eulerian routing minimizes travel",
      "T-code replaces G-code for time-aware deposition",
      "Support condition for embedded: τy ≥ ρ·g·h",
      "Failure taxonomy: sag, over-ext, under-ext, fusion, clog, staircase, anisotropy",
    ],
    shortAbstract:
      "Revisão abrangente de estratégias não-planares para hidrogéis, com T-code (tempo) substituindo G-code para controle síncrono de fluxo.",
    pdfUrl: "https://www.genspark.ai/api/files/s/bJbxNHpp",
    citationLabel: "van der Valk & Mirzaali, 2025",
  },
  {
    id: "shin2022",
    doi: "10.3390/mi13030363",
    title:
      "Optimized 3D Bioprinting Technology Based on Machine Learning: A Review of Recent Trends and Advances",
    authors: "Shin J., Lee Y., Li Z., Hu J., Park S.S. & Kim K.",
    journal: "Micromachines",
    year: 2022,
    category: "ml-bioprinting",
    keyConcepts: [
      "ML em pré/durante/pós bioimpressão",
      "CNN para defect detection",
      "Bayesian optimization de bioink",
      "Reinforcement learning (Markov)",
      "Inductive Logic Programming (ILP)",
      "LSTM para séries temporais",
    ],
    contributions: [
      "Stage 1 (pré): ILP + multiple regression para printability",
      "Stage 2 (printing): CNN para anomaly detection em tempo real",
      "Stage 3 (pós): Bayesian opt para scaffold maturity",
      "Features: D, L, m, v, S, G', cell type, density, pH, T",
      "Outputs: viability, fidelity, roughness, defect class",
      "Modelos: Naive Bayes, DT, SVM, RBF, K-NN, GP, PSO, RL-Markov",
    ],
    shortAbstract:
      "Revisão de ML aplicado a bioimpressão em 3 estágios (pré, durante, pós), com modelos para predição de viabilidade e fidelidade.",
    pdfUrl: "https://www.genspark.ai/api/files/s/HJM8ioXm",
    citationLabel: "Shin et al., 2022",
  },
  {
    id: "naativ3",
    doi: "10.1038/s44172-025-00489-0",
    title: "3D vector field-guided toolpathing for 3D bioprinting",
    authors:
      "Griffin M.R., Bertram S.E., Robison N.P., Panoskaltsis-Mortari A., Janardan R. & McAlpine M.C.",
    journal: "Communications Engineering (Nature)",
    year: 2025,
    category: "vector-field",
    keyConcepts: [
      "NAATIV3 framework",
      "DTMRI → streamlines",
      "Runge-Kutta 4th order integration",
      "EuDX (Euler Delta Crossings) tractography",
      "MDF distance (Minimum Average Direct-Flip)",
      "Dependency graph + cycle removal",
      "Greedy ordering toolpath",
    ],
    contributions: [
      "RK4 streamline integration: x_{n+1} = x_n + Δs·V(x_n)",
      "Seed density: 125 seeds/mm³ (uniform)",
      "Step size Δs: 0.125–0.5 mm",
      "Inter-streamline ws: 0.54–1.0 mm",
      "Procrustes matrix para registração micro-CT vs G-code",
      "Mean surface error: 0.138 ± 0.250 mm",
      "Stochastic iterations: 10⁵ – 10⁸ (depende escala)",
    ],
    shortAbstract:
      "NAATIV3 converte campos vetoriais 3D (DTMRI cardíaca) em toolpaths não-planares via streamlines + dependency graph + greedy ordering.",
    pdfUrl: "https://www.genspark.ai/api/files/s/57b7fjAs",
    citationLabel: "Griffin et al., 2025",
  },
  {
    id: "gusmao2025",
    doi: "10.1016/j.bprint.2025.e00425",
    title:
      "LusoBioMaker: A low-cost 3D bioprinter with multi-extrusion and contour printing capabilities for thermo- and photocurable hydrogels",
    authors:
      "Gusmão A., Marques D.M.C., Almeida D., Schüler K., Ferreira F.C. & Sanjuan-Alberte P.",
    journal: "Bioprinting",
    year: 2025,
    category: "low-cost-printer",
    keyConcepts: [
      "Open-source Marlin dual-extrusion",
      "Ender-3 V2 modificada",
      "Peltier thermal control (2–50°C)",
      "In-situ UV curing (365 nm)",
      "Cura G-code + Python post-processing",
      "Triplo método de slicing",
    ],
    contributions: [
      "Pr = L²/(16A) — printability quadrada",
      "Pr,tri = 36A·√3 / L² — printability triangular",
      "C₀ = π·√3 / 9 — constante normalizadora",
      "GelMA/PEGDA: 27°C, 15 mm/s, 4% flow, UV 2.7 mW/cm²",
      "κ-carrageenan: 25°C, 15 mm/s, 1% flow",
      "F-127 (sacrificial): 4°C, 15 mm/s, 1% flow, 0.1 mm layer",
      "L929 fibroblasts @ 2×10⁶ cells/mL",
      "Cara accuracy: <50 μm posicional, <0.005° angular",
    ],
    shortAbstract:
      "Bioimpressora open-source <$900 baseada em Ender-3 V2 com dupla extrusão, Peltier e UV in-situ; 97% de viabilidade celular.",
    pdfUrl: "https://www.genspark.ai/api/files/s/YLwIfVAR",
    citationLabel: "Gusmão et al., 2025",
  },
  {
    id: "chips2025",
    doi: "10.1126/sciadv.adu5905",
    title:
      "3D bioprinting of collagen-based high-resolution internally perfusable scaffolds for engineering fully biologic tissue systems",
    authors:
      "Shiwarski D.J., Hudson A.R., Tashman J.W., Bakirci E., Moss S., Coffin B.D. & Feinberg A.W.",
    journal: "Science Advances",
    year: 2025,
    category: "perfusable-scaffold",
    keyConcepts: [
      "FRESH v2.0 support bath",
      "CHIPS scaffolds",
      "Collagen self-assembly via pH",
      "VAPOR bioreactor",
      "Multi-syringe Replistruder 5",
      "Optical needle alignment (3μm)",
      "Glucose-responsive pancreatic constructs",
    ],
    contributions: [
      "Filamento mínimo: 20 μm (via needle ID 80–150μm)",
      "Canal perfusável mínimo: ~100 μm",
      "Bath: 3% gelatin B + 0.3% gum arabic + 0.125% F-127",
      "Microparticle ~25 μm (coacervato pode ir a 10μm)",
      "Rehydration collagen: HEPES 100mM pH 7.4 + DMEM (2:1)",
      "Collagen: 12–35 mg/mL; print speed: 23–70 mm/s",
      "Layer height: 32 μm (80μm ID) / 60 μm (150μm ID)",
      "Infill: 35% rectilinear; perimeter: 2; top/bot layers: 4",
      "RMS error <20 μm em todo volume",
    ],
    shortAbstract:
      "FRESH printing de collagen-based CHIPS com canais perfusáveis de 100 μm e filamentos de 20 μm; aplicações vasculares e pancreáticas.",
    pdfUrl: "https://www.genspark.ai/api/files/s/vHwt74zL",
    citationLabel: "Shiwarski et al., 2025",
  },
  {
    id: "nelson2021",
    doi: "10.3390/ijms222413481",
    title: "3D Bio-Printability of Hybrid Pre-Crosslinked Hydrogels",
    authors: "Nelson C., Tuladhar S., Launen L. & Habib A.",
    journal: "Int. J. Mol. Sci.",
    year: 2021,
    category: "rheology-printability",
    keyConcepts: [
      "Pr index = L² / (16·A)",
      "Power-Law fluid: η = K·γ̇^(n−1)",
      "Yield stress via amplitude sweep",
      "3-interval thixotropic test (3iTT)",
      "Filament uniformity vs nozzle Ø",
      "Collapse test pillars 1-20 mm",
      "Pre-crosslinking CaSO4 vs CaCl2",
      "Wall shear stress Power-Law (γ̇_w = ((3+1/n)/4)·8v/D)",
    ],
    contributions: [
      "Janela ótima viscosidade inicial: 200-800 Pa·s @ γ̇=1 s⁻¹",
      "Yield strain ideal > 65% para scaffolds altos",
      "A3C3CS1.5 imprimiu pirâmide 50 mm / 132 camadas",
      "CaSO4 > CaCl2 para extrusão lisa e estruturas grandes",
      "Pr=1 (poro quadrado) é ideal; aceitável 0.80-1.20",
      "Recovery 120s >94% garante shape fidelity entre passes",
      "Wall shear stress 0.8-1.5 kPa em bicos 610 µm @ 50 mm/s",
    ],
    shortAbstract:
      "Mediu quantitativamente reologia (Power-Law), Pr index, filament uniformity e collapse de 5 formulações Alginato/CMC pré-crosslinked; estabelece janelas práticas de imprimibilidade.",
    pdfUrl: "https://www.genspark.ai/api/files/s/DiPYPuuU",
    citationLabel: "Nelson et al., 2021",
  },
]

export function getRef(id: string): ScientificRef | undefined {
  return SCIENTIFIC_REFS.find((r) => r.id === id)
}

export function refsByCategory(
  cat: ScientificRef["category"],
): ScientificRef[] {
  return SCIENTIFIC_REFS.filter((r) => r.category === cat)
}

/** Render compacta para tooltip/inline citation */
export function formatCitation(id: string): string {
  const r = getRef(id)
  if (!r) return `[${id}]`
  return `${r.citationLabel} — ${r.journal}`
}
