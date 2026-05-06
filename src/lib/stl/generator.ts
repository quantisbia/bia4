/**
 * BIA v4 — STL/OBJ Generator
 * Geometrias biológicas para bioimpressão 3D
 * Geração client-side via TypeScript puro (sem dependências)
 *
 * Geometrias implementadas:
 * 1.  Retângulo/Membrana       — pele 2D/curativo/membrana
 * 2.  Cilindro Bolacha         — pele 3D, implante dérmico
 * 3.  Bloco Ósseo com Gyroid   — osso trabecular
 * 4.  Cubo Poroso              — tecidos diversos
 * 5.  Tubo Oco                 — vaso sanguíneo grande calibre
 * 6.  Hexágono Prismático      — tecido hepático
 * 7.  Fêmur Simplificado       — osso anatômico educacional
 * 8.  Nariz                    — cartilagem anatômica educacional
 * 9.  Meia-Lua (menisco)       — cartilagem articular
 * 10. Meia-Lua Espessa (córnea)— córnea/lente
 * 11. Cilindro Oval (cristalino)— cristalino/lente
 * 12. Esfera (organóide)       — modelo de organoide esférico
 */

// ═══════════════════════════════════════════
// TIPOS BASE
// ═══════════════════════════════════════════
export type Vec3 = [number, number, number]
export type Triangle = { normal: Vec3; v1: Vec3; v2: Vec3; v3: Vec3 }

export interface GeometryParams {
  // Retângulo / Membrana
  width?: number      // mm
  height?: number     // mm
  depth?: number      // mm espessura
  // Cilindro / Bolacha
  radius?: number     // mm
  thickness?: number  // mm (altura do cilindro/bolacha)
  // Tubo oco
  innerRadius?: number
  outerRadius?: number
  tubeLength?: number
  // Meia-lua / Menisco
  innerR?: number
  outerR?: number
  arcAngle?: number   // graus (180 = semicírculo completo)
  // Cristalino oval
  radiusA?: number    // semi-eixo X
  radiusB?: number    // semi-eixo Y
  // Gyroid/poros
  infillPercent?: number
  // Segmentos (resolução)
  segments?: number
  // Estrutura interna
  wallThickness?: number
  // Anatômicos (rim, fígado anatômico)
  length?: number
  // Mão
  palmWidth?: number
  palmLength?: number
  fingerLength?: number
  // TPMS (Triply Periodic Minimal Surfaces)
  tpmsSize?: number       // mm (cubo)
  tpmsPeriod?: number     // mm (período espacial)
  tpmsPorosity?: number   // % (50-95)
  tpmsResolution?: number // cubos/aresta (24-48)
}

export interface STLGeometry {
  id: string
  label: string
  description: string
  tissue: string
  application: string
  icon: string
  defaultParams: GeometryParams
  paramLabels: Record<string, string>
  creditCost: number
}

// ═══════════════════════════════════════════
// CATÁLOGO DE GEOMETRIAS
// ═══════════════════════════════════════════
export const GEOMETRIES: STLGeometry[] = [
  {
    id: "membrane",
    label: "Membrana / Curativo",
    description: "Retângulo plano para pele 2D, curativos bioativos e membranas de barreira",
    tissue: "Pele / Derme",
    application: "Curativo, membrana peritoneal, patch dérmico",
    icon: "⬜",
    defaultParams: { width: 30, height: 30, depth: 2, segments: 1 },
    paramLabels: { width: "Largura (mm)", height: "Comprimento (mm)", depth: "Espessura (mm)" },
    creditCost: 6,
  },
  {
    id: "disk",
    label: "Cilindro / Bolacha",
    description: "Disco circular para implantes dérmicos, pele 3D e discos cartilaginosos",
    tissue: "Pele / Cartilagem",
    application: "Implante dérmico, enxerto circular, disco de cartilagem",
    icon: "🥏",
    defaultParams: { radius: 10, thickness: 3, segments: 48 },
    paramLabels: { radius: "Raio (mm)", thickness: "Espessura (mm)", segments: "Segmentos (resolução)" },
    creditCost: 6,
  },
  {
    id: "bone_block",
    label: "Bloco Ósseo (Gyroid)",
    description: "Cubo poroso com estrutura giróide interna para osso trabecular",
    tissue: "Osso",
    application: "Implante ósseo, scaffold ósseo, enxerto de volume",
    icon: "🦴",
    defaultParams: { width: 20, height: 20, depth: 10, wallThickness: 1.2, infillPercent: 70, segments: 20 },
    paramLabels: { width: "Largura (mm)", height: "Profundidade (mm)", depth: "Altura (mm)", infillPercent: "Infill Gyroid (%)", wallThickness: "Espessura parede (mm)" },
    creditCost: 6,
  },
  {
    id: "cube_tissue",
    label: "Cubo de Tecido",
    description: "Cubo genérico poroso para tecidos diversos (muscular, adiposo, hepático simples)",
    tissue: "Tecido genérico",
    application: "Modelo de tecido, bloco muscular, patch adiposo",
    icon: "🧊",
    defaultParams: { width: 15, height: 15, depth: 15, wallThickness: 1.0, infillPercent: 65, segments: 1 },
    paramLabels: { width: "Largura (mm)", height: "Profundidade (mm)", depth: "Altura (mm)", infillPercent: "Densidade poros (%)", wallThickness: "Espessura parede (mm)" },
    creditCost: 6,
  },
  {
    id: "vessel",
    label: "Vaso Sanguíneo (Tubo)",
    description: "Tubo oco de parede fina para vaso de grande calibre (aorta, carótida)",
    tissue: "Tecido Vascular",
    application: "Prótese vascular, conduto coronariano, enxerto arterial",
    icon: "🩸",
    defaultParams: { outerRadius: 8, innerRadius: 6.5, tubeLength: 30, segments: 48 },
    paramLabels: { outerRadius: "Raio externo (mm)", innerRadius: "Raio interno (mm)", tubeLength: "Comprimento (mm)", segments: "Segmentos" },
    creditCost: 6,
  },
  {
    id: "hexagonal_liver",
    label: "Hexagonal (Hepático)",
    description: "Prisma hexagonal inspirado no lóbulo hepático para tissue engineering de fígado",
    tissue: "Fígado",
    application: "Modelo hepático, lóbulo artificial, chip-órgão",
    icon: "⬡",
    defaultParams: { radius: 8, thickness: 4, segments: 6 },
    paramLabels: { radius: "Raio (circunferência, mm)", thickness: "Altura (mm)", segments: "Lados (6=hexágono)" },
    creditCost: 6,
  },
  {
    id: "femur",
    label: "Fêmur Educacional",
    description: "Osso anatômico simplificado para educação e impressão demonstrativa",
    tissue: "Osso (Fêmur)",
    application: "Modelo anatômico educacional, biomecânica, ensino cirúrgico",
    icon: "🦴",
    defaultParams: { radius: 8, tubeLength: 60, wallThickness: 2.5, segments: 32 },
    paramLabels: { radius: "Raio da diáfise (mm)", tubeLength: "Comprimento total (mm)", wallThickness: "Espessura cortical (mm)" },
    creditCost: 6,
  },
  {
    id: "nose",
    label: "Nariz (Cartilagem)",
    description: "Estrutura nasal simplificada para reconstrução de cartilagem e educação",
    tissue: "Cartilagem nasal",
    application: "Prótese nasal, reconstrução facial, modelo educacional",
    icon: "👃",
    defaultParams: { width: 24, height: 30, depth: 18, segments: 24 },
    paramLabels: { width: "Largura (mm)", height: "Altura (mm)", depth: "Profundidade (mm)" },
    creditCost: 6,
  },
  {
    id: "meniscus",
    label: "Meia-Lua / Menisco",
    description: "Semicírculo aplanado para cartilagem articular do joelho (menisco)",
    tissue: "Cartilagem (Menisco)",
    application: "Implante de menisco, cartilagem articular, joelho",
    icon: "🌙",
    defaultParams: { outerR: 20, innerR: 10, thickness: 5, arcAngle: 180, segments: 48 },
    paramLabels: { outerR: "Raio externo (mm)", innerR: "Raio interno (mm)", thickness: "Espessura (mm)", arcAngle: "Ângulo do arco (°)" },
    creditCost: 6,
  },
  {
    id: "cornea",
    label: "Córnea (Meia-Lua Espessa)",
    description: "Disco côncavo de baixo perfil para tecido corneano e engenharia ocular",
    tissue: "Córnea / Esclera",
    application: "Transplante de córnea, engenharia ocular, patch corneano",
    icon: "👁️",
    defaultParams: { outerR: 6, innerR: 3, thickness: 1.2, arcAngle: 200, segments: 64 },
    paramLabels: { outerR: "Diâmetro externo (mm)", innerR: "Diâmetro interno (mm)", thickness: "Espessura central (mm)", arcAngle: "Curvatura (°)" },
    creditCost: 6,
  },
  {
    id: "lens",
    label: "Cristalino (Oval)",
    description: "Cilindro oval biconvexo para engenharia de cristalino e modelos oftálmicos",
    tissue: "Cristalino / Humor",
    application: "Lente intraocular bioimprimida, modelo de cristalino",
    icon: "🔵",
    defaultParams: { radiusA: 5, radiusB: 3, thickness: 4, segments: 48 },
    paramLabels: { radiusA: "Semi-eixo maior (mm)", radiusB: "Semi-eixo menor (mm)", thickness: "Altura (mm)" },
    creditCost: 6,
  },
  {
    id: "organoid_sphere",
    label: "Esfera (Organoide)",
    description: "Esfera para modelos de organóides, tumores 3D e esferoide celular",
    tissue: "Organoide / Tumor",
    application: "Organoide esférico, tumor 3D, esferoide de iPSC",
    icon: "🟡",
    defaultParams: { radius: 5, segments: 32 },
    paramLabels: { radius: "Raio (mm)", segments: "Segmentos (resolução)" },
    creditCost: 6,
  },
  {
    id: "ear",
    label: "Orelha (Pavilhão Auricular)",
    description: "Pavilhão auricular simplificado para reconstrução de orelha e educação em otorrinolaringologia",
    tissue: "Cartilagem auricular",
    application: "Microtia, reconstrução auricular, próteses externas",
    icon: "👂",
    defaultParams: { height: 60, width: 35, thickness: 4, segments: 32 },
    paramLabels: { height: "Altura (mm)", width: "Largura (mm)", thickness: "Espessura (mm)", segments: "Resolução" },
    creditCost: 6,
  },
  {
    id: "heart",
    label: "Coração (Forma Anatômica)",
    description: "Coração simplificado (forma de pêra cardíaca) para modelos cardíacos educacionais e patches miocárdicos",
    tissue: "Miocárdio",
    application: "Patch cardíaco, modelo anatômico, educação em cardiologia",
    icon: "❤️",
    defaultParams: { radius: 20, height: 50, segments: 32 },
    paramLabels: { radius: "Raio base (mm)", height: "Altura (mm)", segments: "Resolução" },
    creditCost: 6,
  },
  {
    id: "kidney",
    label: "Rim (Feijão Anatômico)",
    description: "Forma de feijão/rim para engenharia renal e modelos de néfron",
    tissue: "Renal",
    application: "Scaffold renal, organoide de néfron, modelo anatômico",
    icon: "🫘",
    defaultParams: { length: 45, width: 25, thickness: 15, segments: 32 },
    paramLabels: { length: "Comprimento (mm)", width: "Largura (mm)", thickness: "Espessura (mm)", segments: "Resolução" },
    creditCost: 6,
  },
  {
    id: "liver_anatomical",
    label: "Fígado (Anatômico)",
    description: "Fígado com lobos direito/esquerdo para modelos hepáticos 3D e bioreatores",
    tissue: "Hepático",
    application: "Modelo hepático 3D, lóbulo artificial, órgão-em-chip",
    icon: "🫀",
    defaultParams: { length: 60, width: 40, thickness: 18, segments: 32 },
    paramLabels: { length: "Comprimento (mm)", width: "Largura (mm)", thickness: "Espessura (mm)", segments: "Resolução" },
    creditCost: 6,
  },
  {
    id: "hand",
    label: "Mão (Esqueleto Simplificado)",
    description: "Forma simplificada de mão/palma com dedos para educação anatômica e biomecânica",
    tissue: "Osso / Cartilagem (mão)",
    application: "Modelo anatômico, próteses, biomecânica, educação",
    icon: "✋",
    defaultParams: { palmWidth: 80, palmLength: 100, fingerLength: 70, thickness: 15 },
    paramLabels: { palmWidth: "Largura palma (mm)", palmLength: "Compr. palma (mm)", fingerLength: "Compr. dedos (mm)", thickness: "Espessura (mm)" },
    creditCost: 8,
  },
  // ─── TPMS — Scaffolds com Topologia Otimizada ────────────────────────────
  {
    id: "tpms_gyroid",
    label: "Scaffold Gyroid (TPMS)",
    description: "Estrutura giroidal com canais interconectados — padrão-ouro para regeneração óssea (alta razão S/V, isotrópico, vascularizável)",
    tissue: "Osso / Cartilagem / Pesquisa",
    application: "Regeneração óssea trabecular, scaffolds para vascularização, cultura 3D",
    icon: "🌀",
    defaultParams: { tpmsSize: 20, tpmsPeriod: 5, tpmsPorosity: 70, tpmsResolution: 32 },
    paramLabels: {
      tpmsSize: "Tamanho do cubo (mm)",
      tpmsPeriod: "Período espacial (mm)",
      tpmsPorosity: "Porosidade (%)",
      tpmsResolution: "Resolução (24-48)",
    },
    creditCost: 10,
  },
  {
    id: "tpms_schwarz",
    label: "Scaffold Schwarz P (TPMS)",
    description: "TPMS clássico em ângulos retos — mais simples de imprimir e fatiar do que gyroid",
    tissue: "Osso / Pesquisa",
    application: "Scaffolds simples, cultura celular 3D, modelos didáticos",
    icon: "🟦",
    defaultParams: { tpmsSize: 20, tpmsPeriod: 5, tpmsPorosity: 70, tpmsResolution: 32 },
    paramLabels: {
      tpmsSize: "Tamanho do cubo (mm)",
      tpmsPeriod: "Período espacial (mm)",
      tpmsPorosity: "Porosidade (%)",
      tpmsResolution: "Resolução (24-48)",
    },
    creditCost: 10,
  },
  {
    id: "tpms_diamond",
    label: "Scaffold Diamond (TPMS)",
    description: "TPMS em rede tetraédrica — máxima razão superfície/volume para adesão celular",
    tissue: "Pesquisa / Osso complexo",
    application: "Scaffolds avançados, regeneração óssea de alta complexidade celular",
    icon: "💎",
    defaultParams: { tpmsSize: 20, tpmsPeriod: 5, tpmsPorosity: 70, tpmsResolution: 32 },
    paramLabels: {
      tpmsSize: "Tamanho do cubo (mm)",
      tpmsPeriod: "Período espacial (mm)",
      tpmsPorosity: "Porosidade (%)",
      tpmsResolution: "Resolução (24-48)",
    },
    creditCost: 10,
  },
]

// ═══════════════════════════════════════════
// UTILITÁRIOS MATEMÁTICOS
// ═══════════════════════════════════════════
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])
  if (len < 1e-10) return [0, 0, 1]
  return [v[0]/len, v[1]/len, v[2]/len]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ]
}

function triNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const a: Vec3 = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]]
  const b: Vec3 = [v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]]
  return normalize(cross(a, b))
}

function tri(v1: Vec3, v2: Vec3, v3: Vec3): Triangle {
  return { normal: triNormal(v1, v2, v3), v1, v2, v3 }
}

// ═══════════════════════════════════════════
// GERADORES DE GEOMETRIA
// ═══════════════════════════════════════════

/** Membrana / Retângulo plano */
function genMembrane(p: GeometryParams): Triangle[] {
  const { width = 30, height = 30, depth = 2 } = p
  const tris: Triangle[] = []
  const hw = width/2, hh = height/2
  // Top face
  tris.push(tri([-hw,-hh,depth], [hw,-hh,depth], [hw,hh,depth]))
  tris.push(tri([-hw,-hh,depth], [hw,hh,depth], [-hw,hh,depth]))
  // Bottom face
  tris.push(tri([-hw,-hh,0], [hw,hh,0], [hw,-hh,0]))
  tris.push(tri([-hw,-hh,0], [-hw,hh,0], [hw,hh,0]))
  // Sides
  const pts: Vec3[] = [[-hw,-hh,0], [hw,-hh,0], [hw,hh,0], [-hw,hh,0]]
  for (let i=0; i<4; i++) {
    const a = pts[i], b = pts[(i+1)%4]
    tris.push(tri([a[0],a[1],0], [b[0],b[1],0], [b[0],b[1],depth]))
    tris.push(tri([a[0],a[1],0], [b[0],b[1],depth], [a[0],a[1],depth]))
  }
  return tris
}

/** Cilindro genérico (bolacha ou hexagonal por segmentos) */
function genCylinder(radius: number, height: number, segs: number, centerZ = 0): Triangle[] {
  const tris: Triangle[] = []
  for (let i=0; i<segs; i++) {
    const a0 = (2*Math.PI*i)/segs
    const a1 = (2*Math.PI*(i+1))/segs
    const x0 = radius*Math.cos(a0), y0 = radius*Math.sin(a0)
    const x1 = radius*Math.cos(a1), y1 = radius*Math.sin(a1)
    const bot = centerZ, top = centerZ + height
    // Top
    tris.push(tri([0,0,top], [x0,y0,top], [x1,y1,top]))
    // Bottom
    tris.push(tri([0,0,bot], [x1,y1,bot], [x0,y0,bot]))
    // Side
    tris.push(tri([x0,y0,bot], [x1,y1,bot], [x1,y1,top]))
    tris.push(tri([x0,y0,bot], [x1,y1,top], [x0,y0,top]))
  }
  return tris
}

/** Tubo oco (vaso sanguíneo) */
function genTube(outerR: number, innerR: number, length: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  for (let i=0; i<segs; i++) {
    const a0 = (2*Math.PI*i)/segs
    const a1 = (2*Math.PI*(i+1))/segs
    const ox0=outerR*Math.cos(a0), oy0=outerR*Math.sin(a0)
    const ox1=outerR*Math.cos(a1), oy1=outerR*Math.sin(a1)
    const ix0=innerR*Math.cos(a0), iy0=innerR*Math.sin(a0)
    const ix1=innerR*Math.cos(a1), iy1=innerR*Math.sin(a1)
    // Outer wall
    tris.push(tri([ox0,oy0,0],[ox1,oy1,0],[ox1,oy1,length]))
    tris.push(tri([ox0,oy0,0],[ox1,oy1,length],[ox0,oy0,length]))
    // Inner wall (reversed normal)
    tris.push(tri([ix0,iy0,0],[ix1,iy1,length],[ix1,iy1,0]))
    tris.push(tri([ix0,iy0,0],[ix0,iy0,length],[ix1,iy1,length]))
    // Top annulus
    tris.push(tri([ox0,oy0,length],[ix0,iy0,length],[ix1,iy1,length]))
    tris.push(tri([ox0,oy0,length],[ix1,iy1,length],[ox1,oy1,length]))
    // Bottom annulus
    tris.push(tri([ox0,oy0,0],[ix1,iy1,0],[ix0,iy0,0]))
    tris.push(tri([ox0,oy0,0],[ox1,oy1,0],[ix1,iy1,0]))
  }
  return tris
}

/** Meia-lua (menisco / córnea) */
function genMeniscus(outerR: number, innerR: number, thickness: number, arcDeg: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const arcRad = (arcDeg * Math.PI) / 180
  const startAng = -arcRad/2
  const steps = Math.max(4, Math.round(segs * arcDeg / 360))

  for (let i=0; i<steps; i++) {
    const a0 = startAng + (arcRad*i)/steps
    const a1 = startAng + (arcRad*(i+1))/steps
    const ox0=outerR*Math.cos(a0), oy0=outerR*Math.sin(a0)
    const ox1=outerR*Math.cos(a1), oy1=outerR*Math.sin(a1)
    const ix0=innerR*Math.cos(a0), iy0=innerR*Math.sin(a0)
    const ix1=innerR*Math.cos(a1), iy1=innerR*Math.sin(a1)

    // Top
    tris.push(tri([ox0,oy0,thickness],[ox1,oy1,thickness],[ix1,iy1,thickness]))
    tris.push(tri([ox0,oy0,thickness],[ix1,iy1,thickness],[ix0,iy0,thickness]))
    // Bottom
    tris.push(tri([ox0,oy0,0],[ix1,iy1,0],[ox1,oy1,0]))
    tris.push(tri([ox0,oy0,0],[ix0,iy0,0],[ix1,iy1,0]))
    // Outer wall
    tris.push(tri([ox0,oy0,0],[ox1,oy1,thickness],[ox0,oy0,thickness]))
    tris.push(tri([ox0,oy0,0],[ox1,oy1,0],[ox1,oy1,thickness]))
    // Inner wall
    tris.push(tri([ix0,iy0,0],[ix0,iy0,thickness],[ix1,iy1,thickness]))
    tris.push(tri([ix0,iy0,0],[ix1,iy1,thickness],[ix1,iy1,0]))
  }

  // End caps
  const a_start = startAng
  const a_end = startAng + arcRad
  const addCap = (ang: number) => {
    const ox=outerR*Math.cos(ang), oy=outerR*Math.sin(ang)
    const ix=innerR*Math.cos(ang), iy=innerR*Math.sin(ang)
    tris.push(tri([ix,iy,0],[ox,oy,0],[ox,oy,thickness]))
    tris.push(tri([ix,iy,0],[ox,oy,thickness],[ix,iy,thickness]))
  }
  addCap(a_start)
  addCap(a_end)

  return tris
}

/** Esfera */
function genSphere(radius: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const stacks = segs, slices = segs*2
  for (let i=0; i<stacks; i++) {
    const phi0 = (Math.PI*i)/stacks - Math.PI/2
    const phi1 = (Math.PI*(i+1))/stacks - Math.PI/2
    for (let j=0; j<slices; j++) {
      const th0 = (2*Math.PI*j)/slices
      const th1 = (2*Math.PI*(j+1))/slices
      const v = (phi: number, th: number): Vec3 => [
        radius*Math.cos(phi)*Math.cos(th),
        radius*Math.cos(phi)*Math.sin(th),
        radius*Math.sin(phi),
      ]
      const a=v(phi0,th0), b=v(phi0,th1), c=v(phi1,th0), d=v(phi1,th1)
      if (i>0) tris.push(tri(a,b,d))
      if (i<stacks-1) tris.push(tri(a,d,c))
    }
  }
  return tris
}

/** Cilindro oval (cristalino) */
function genOvalCylinder(rA: number, rB: number, height: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const pts = (z: number): Vec3[] => Array.from({length: segs}, (_, i) => {
    const a = (2*Math.PI*i)/segs
    return [rA*Math.cos(a), rB*Math.sin(a), z]
  })
  const bot = pts(0), top = pts(height)
  // centroid at 0,0
  for (let i=0; i<segs; i++) {
    const j = (i+1)%segs
    // Top
    tris.push(tri([0,0,height], top[i], top[j]))
    // Bottom
    tris.push(tri([0,0,0], bot[j], bot[i]))
    // Side
    tris.push(tri(bot[i], bot[j], top[j]))
    tris.push(tri(bot[i], top[j], top[i]))
  }
  return tris
}

/** Fêmur simplificado: tubo oco (diáfise) com esferas nas epífises */
function genFemur(radius: number, length: number, wallT: number, segs: number): Triangle[] {
  const innerR = Math.max(1, radius - wallT)
  const tris: Triangle[] = []
  // Diáfise
  tris.push(...genTube(radius, innerR, length, segs))
  // Epífises (esferas maiores)
  const epiphR = radius * 1.5
  const botSphere = genSphere(epiphR, Math.max(8, Math.floor(segs/4)))
  const topSphere = genSphere(epiphR * 1.1, Math.max(8, Math.floor(segs/4)))
  // Translate top sphere
  topSphere.forEach(t => {
    t.v1[2] += length; t.v2[2] += length; t.v3[2] += length
  })
  tris.push(...botSphere, ...topSphere)
  return tris
}

/** Nariz simplificado: pirâmide oval arredondada */
function genNose(width: number, height: number, depth: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const hw = width/2, hd = depth/2
  // Base oval
  const base: Vec3[] = Array.from({length: segs}, (_, i) => {
    const a = (2*Math.PI*i)/segs
    return [hw*Math.cos(a)*0.9, hd*Math.sin(a), 0]
  })
  // Ponta do nariz
  const tip: Vec3 = [0, -depth*0.3, height]
  for (let i=0; i<segs; i++) {
    const j = (i+1)%segs
    // Base fill
    tris.push(tri([0,0,0], base[j], base[i]))
    // Side to tip
    tris.push(tri(base[i], base[j], tip))
  }
  return tris
}

/** Bloco ósseo: cubo com furos de gyroid simplificados (cilindros internos) */
function genBoneBlock(width: number, height: number, depth: number, wallT: number, infill: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // Outer shell
  const hw = width/2, hh = height/2
  // 6 faces do cubo externo
  const addRect = (v1: Vec3, v2: Vec3, v3: Vec3, v4: Vec3) => {
    tris.push(tri(v1, v2, v3))
    tris.push(tri(v1, v3, v4))
  }
  // Bottom
  addRect([-hw,-hh,0],[hw,-hh,0],[hw,hh,0],[-hw,hh,0])
  // Top
  addRect([-hw,-hh,depth],[hw,hh,depth],[hw,-hh,depth],[-hw,hh,depth]) // note: inverted for top
  tris.push(tri([-hw,-hh,depth],[hw,hh,depth],[-hw,hh,depth]))
  tris.push(tri([-hw,-hh,depth],[hw,-hh,depth],[hw,hh,depth]))
  // Sides
  addRect([-hw,-hh,0],[-hw,-hh,depth],[hw,-hh,depth],[hw,-hh,0])
  addRect([hw,-hh,0],[hw,-hh,depth],[hw,hh,depth],[hw,hh,0])
  addRect([hw,hh,0],[hw,hh,depth],[-hw,hh,depth],[-hw,hh,0])
  addRect([-hw,hh,0],[-hw,hh,depth],[-hw,-hh,depth],[-hw,-hh,0])

  // Gyroid channels: array of vertical cylinders with radius from infill
  const channelR = (Math.min(width, height) * (1 - infill/100)) / 4
  if (channelR > wallT) {
    const nx = Math.max(2, Math.floor(width / (channelR*4)))
    const ny = Math.max(2, Math.floor(height / (channelR*4)))
    const stepX = width / nx, stepY = height / ny
    for (let ix=0; ix<nx; ix++) {
      for (let iy=0; iy<ny; iy++) {
        const cx = -hw + stepX*(ix+0.5)
        const cy = -hh + stepY*(iy+0.5)
        // Inner channel (inverted normals = hole appearance)
        const cyl = genCylinder(channelR, depth, Math.max(6, Math.floor(segs/4)))
        cyl.forEach(t => {
          t.v1[0]+=cx; t.v1[1]+=cy
          t.v2[0]+=cx; t.v2[1]+=cy
          t.v3[0]+=cx; t.v3[1]+=cy
          // Invert normal for inner channel
          const tmp = t.v2; t.v2 = t.v3; t.v3 = tmp
          t.normal = triNormal(t.v1, t.v2, t.v3)
        })
        tris.push(...cyl)
      }
    }
  }

  return tris
}

/** Orelha: pavilhão auricular como meia-elipse deformada, baseado em meniscus + textura C-scroll */
function genEar(height: number, width: number, thickness: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // Perfil externo de orelha (formato de C invertido + lobo)
  // Usa contorno paramétrico de elipse distorcida, depois extrude
  const outerPts: Vec3[] = []
  const innerPts: Vec3[] = []
  const n = Math.max(24, segs)
  for (let i=0; i<n; i++) {
    const t = i/n
    const ang = t * Math.PI * 2
    // Formato de orelha: elipse alongada + curva C + lobo inferior
    let rx = width/2
    let ry = height/2
    // Achatamento lateral superior
    if (Math.sin(ang) > 0.3) rx *= 0.7
    // Lobo mais arredondado embaixo
    if (Math.sin(ang) < -0.6) ry *= 0.75
    const x = rx * Math.cos(ang)
    const y = ry * Math.sin(ang) * 0.95
    outerPts.push([x, y, 0])
    // Contorno interno (concha): ~55% do tamanho, offset
    const ix = rx * 0.55 * Math.cos(ang)
    const iy = ry * 0.55 * Math.sin(ang) - height*0.08
    innerPts.push([ix, iy, thickness*0.6])
  }
  // Face frontal (extrude outer contour com profundidade)
  const cx: Vec3 = [0, 0, 0]
  const cxBack: Vec3 = [0, 0, thickness]
  for (let i=0; i<n; i++) {
    const j = (i+1) % n
    // Frente
    tris.push(tri(cx, outerPts[j], outerPts[i]))
    // Trás
    const bi: Vec3 = [outerPts[i][0], outerPts[i][1], thickness]
    const bj: Vec3 = [outerPts[j][0], outerPts[j][1], thickness]
    tris.push(tri(cxBack, bi, bj))
    // Laterais (parede)
    tris.push(tri(outerPts[i], outerPts[j], bj))
    tris.push(tri(outerPts[i], bj, bi))
  }
  // Concha interna (depressão simulada como relevo)
  for (let i=0; i<n; i++) {
    const j = (i+1) % n
    tris.push(tri([0,-height*0.08, thickness*0.6], innerPts[j], innerPts[i]))
  }
  return tris
}

/** Coração: forma de "pêra cardíaca" — combinação de duas esferas + ápice */
function genHeart(radius: number, height: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const r = radius
  const h = height
  const n = Math.max(16, segs)
  // Gera malha paramétrica: duas "bolhas" em cima + ponta em baixo
  // theta: longitude [0, 2π], phi: latitude [0, π]
  const vertices: Vec3[][] = []
  for (let i=0; i<=n; i++) {
    const row: Vec3[] = []
    const phi = (i/n) * Math.PI // 0 → π
    for (let j=0; j<=n; j++) {
      const theta = (j/n) * Math.PI * 2
      // Raio varia com phi para criar forma de coração:
      // topo (phi<π/3): duas lóbulos (bolinhas)
      // meio: corpo
      // base (phi>2π/3): ponta
      let rad = r
      const zNorm = Math.cos(phi) // 1 no topo, -1 no fundo
      // Lóbulos superiores (quando phi pequeno)
      if (zNorm > 0.3) {
        const lobeFactor = 1 + 0.5 * Math.abs(Math.cos(theta*2)) * zNorm
        rad = r * lobeFactor * 0.8
      } else if (zNorm < -0.5) {
        // Ponta: raio diminui rápido
        rad = r * (1 + zNorm) * 1.5
        if (rad < 0) rad = 0.1
      }
      const x = rad * Math.sin(phi) * Math.cos(theta)
      const y = rad * Math.sin(phi) * Math.sin(theta)
      const z = (h/2) * Math.cos(phi) + h/2 // shift para z>=0
      row.push([x, y, z])
    }
    vertices.push(row)
  }
  // Triangulize mesh
  for (let i=0; i<n; i++) {
    for (let j=0; j<n; j++) {
      const v00 = vertices[i][j]
      const v01 = vertices[i][j+1]
      const v10 = vertices[i+1][j]
      const v11 = vertices[i+1][j+1]
      tris.push(tri(v00, v10, v11))
      tris.push(tri(v00, v11, v01))
    }
  }
  return tris
}

/** Rim: forma de feijão — elipsoide com indentação lateral */
function genKidney(length: number, width: number, thickness: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const n = Math.max(16, segs)
  const vertices: Vec3[][] = []
  for (let i=0; i<=n; i++) {
    const row: Vec3[] = []
    const phi = (i/n) * Math.PI
    for (let j=0; j<=n; j++) {
      const theta = (j/n) * Math.PI * 2
      // Forma de feijão: elipsoide deformado com indent no lado côncavo
      const a = length/2
      const b = width/2
      const c = thickness/2
      // Indentação côncava em um lado (quando theta~π, x~0)
      const indent = 0.3 * Math.sin(phi) * Math.max(0, Math.cos(theta))
      const xFactor = 1 - indent
      const x = a * Math.sin(phi) * Math.cos(theta) * xFactor
      const y = b * Math.sin(phi) * Math.sin(theta)
      const z = c * Math.cos(phi) + c
      row.push([x, y, z])
    }
    vertices.push(row)
  }
  for (let i=0; i<n; i++) {
    for (let j=0; j<n; j++) {
      const v00 = vertices[i][j]
      const v01 = vertices[i][j+1]
      const v10 = vertices[i+1][j]
      const v11 = vertices[i+1][j+1]
      tris.push(tri(v00, v10, v11))
      tris.push(tri(v00, v11, v01))
    }
  }
  return tris
}

/** Fígado anatômico: forma irregular com dois lobos (direito maior, esquerdo menor) */
function genLiverAnatomical(length: number, width: number, thickness: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const n = Math.max(16, segs)
  const vertices: Vec3[][] = []
  for (let i=0; i<=n; i++) {
    const row: Vec3[] = []
    const phi = (i/n) * Math.PI
    for (let j=0; j<=n; j++) {
      const theta = (j/n) * Math.PI * 2
      const a = length/2
      const b = width/2
      const c = thickness/2
      // Assimetria: lobo direito (theta~0) maior, lobo esquerdo (theta~π) menor
      const lobeFactor = theta < Math.PI ? 1.0 : 0.55
      // Sulco entre lobos (theta próximo a π)
      const sulcus = 1 - 0.35 * Math.exp(-Math.pow((theta - Math.PI) * 3, 2)) * Math.sin(phi)
      // Curvatura superior (borda diafragmática)
      const topCurve = 1 + 0.15 * Math.max(0, Math.cos(phi))
      const x = a * Math.sin(phi) * Math.cos(theta) * lobeFactor * sulcus * topCurve
      const y = b * Math.sin(phi) * Math.sin(theta) * sulcus
      const z = c * Math.cos(phi) + c
      row.push([x, y, z])
    }
    vertices.push(row)
  }
  for (let i=0; i<n; i++) {
    for (let j=0; j<n; j++) {
      const v00 = vertices[i][j]
      const v01 = vertices[i][j+1]
      const v10 = vertices[i+1][j]
      const v11 = vertices[i+1][j+1]
      tris.push(tri(v00, v10, v11))
      tris.push(tri(v00, v11, v01))
    }
  }
  return tris
}

/** Mão simplificada: palma retangular arredondada + 5 dedos (cilindros) */
function genHand(palmWidth: number, palmLength: number, fingerLength: number, thickness: number): Triangle[] {
  const tris: Triangle[] = []
  // Palma: caixa arredondada
  const hw = palmWidth/2
  const pl = palmLength
  const t = thickness
  // Base palm as rounded rectangle (approximated with segments)
  const palmSegs = 20
  const palmPts: Vec3[] = []
  for (let i=0; i<palmSegs; i++) {
    const a = (i/palmSegs) * Math.PI * 2
    const rx = hw, ry = pl/2
    // Rounded rectangle: use p-norm
    const cos = Math.cos(a), sin = Math.sin(a)
    const r = 1 / Math.pow(Math.pow(Math.abs(cos), 8) + Math.pow(Math.abs(sin), 8), 1/8)
    palmPts.push([rx*cos*r, ry*sin*r + pl/2, 0])
  }
  // Top/bottom palm faces
  const palmCenter: Vec3 = [0, pl/2, 0]
  const palmCenterTop: Vec3 = [0, pl/2, t]
  for (let i=0; i<palmSegs; i++) {
    const j = (i+1) % palmSegs
    tris.push(tri(palmCenter, palmPts[j], palmPts[i]))
    const topI: Vec3 = [palmPts[i][0], palmPts[i][1], t]
    const topJ: Vec3 = [palmPts[j][0], palmPts[j][1], t]
    tris.push(tri(palmCenterTop, topI, topJ))
    // Sides
    tris.push(tri(palmPts[i], palmPts[j], topJ))
    tris.push(tri(palmPts[i], topJ, topI))
  }
  // Dedos: 4 dedos paralelos + polegar lateral
  const fingerRadius = palmWidth/12
  const fingerSpacing = palmWidth/4
  for (let f=0; f<4; f++) {
    const fx = -palmWidth/2 + fingerSpacing*(f + 0.5)
    const fy = pl
    // Variação comprimento: indicador>médio>anelar, mínimo o mindinho
    const lenFactor = [0.85, 1.0, 0.95, 0.75][f]
    const fLen = fingerLength * lenFactor
    // Cilindro do dedo
    const fSegs = 16
    for (let i=0; i<fSegs; i++) {
      const a0 = (2*Math.PI*i)/fSegs
      const a1 = (2*Math.PI*(i+1))/fSegs
      const x0 = fingerRadius*Math.cos(a0), y0 = fingerRadius*Math.sin(a0)
      const x1 = fingerRadius*Math.cos(a1), y1 = fingerRadius*Math.sin(a1)
      // Base (cilindro deitado ao longo do eixo Y: dedo sai do topo da palma)
      tris.push(tri([fx+x0, fy, t/2+y0], [fx+x1, fy, t/2+y1], [fx+x1, fy+fLen, t/2+y1]))
      tris.push(tri([fx+x0, fy, t/2+y0], [fx+x1, fy+fLen, t/2+y1], [fx+x0, fy+fLen, t/2+y0]))
      // Ponta arredondada (tampa)
      tris.push(tri([fx, fy+fLen, t/2], [fx+x1, fy+fLen, t/2+y1], [fx+x0, fy+fLen, t/2+y0]))
    }
  }
  // Polegar (lateral, posição angulada)
  const thumbBaseX = -palmWidth/2 - fingerRadius
  const thumbBaseY = pl*0.3
  const thumbLen = fingerLength*0.7
  const thumbSegs = 16
  for (let i=0; i<thumbSegs; i++) {
    const a0 = (2*Math.PI*i)/thumbSegs
    const a1 = (2*Math.PI*(i+1))/thumbSegs
    const y0 = fingerRadius*Math.sin(a0), z0 = fingerRadius*Math.cos(a0)
    const y1 = fingerRadius*Math.sin(a1), z1 = fingerRadius*Math.cos(a1)
    // Polegar inclinado ~45° para fora
    tris.push(tri(
      [thumbBaseX, thumbBaseY+y0, t/2+z0],
      [thumbBaseX, thumbBaseY+y1, t/2+z1],
      [thumbBaseX-thumbLen*0.7, thumbBaseY+y1-thumbLen*0.5, t/2+z1]
    ))
    tris.push(tri(
      [thumbBaseX, thumbBaseY+y0, t/2+z0],
      [thumbBaseX-thumbLen*0.7, thumbBaseY+y1-thumbLen*0.5, t/2+z1],
      [thumbBaseX-thumbLen*0.7, thumbBaseY+y0-thumbLen*0.5, t/2+z0]
    ))
  }
  return tris
}

// ═══════════════════════════════════════════
// DISPATCHER PRINCIPAL
// ═══════════════════════════════════════════
export function generateGeometry(id: string, params: GeometryParams): Triangle[] {
  const p = params
  switch (id) {
    case "membrane":
      return genMembrane(p)
    case "disk":
      return genCylinder(p.radius ?? 10, p.thickness ?? 3, p.segments ?? 48)
    case "bone_block":
      return genBoneBlock(p.width ?? 20, p.height ?? 20, p.depth ?? 10, p.wallThickness ?? 1.2, p.infillPercent ?? 70, p.segments ?? 20)
    case "cube_tissue":
      return genBoneBlock(p.width ?? 15, p.height ?? 15, p.depth ?? 15, p.wallThickness ?? 1.0, p.infillPercent ?? 65, p.segments ?? 10)
    case "vessel":
      return genTube(p.outerRadius ?? 8, p.innerRadius ?? 6.5, p.tubeLength ?? 30, p.segments ?? 48)
    case "hexagonal_liver":
      return genCylinder(p.radius ?? 8, p.thickness ?? 4, 6) // hexagon = 6 segments
    case "femur":
      return genFemur(p.radius ?? 8, p.tubeLength ?? 60, p.wallThickness ?? 2.5, p.segments ?? 32)
    case "nose":
      return genNose(p.width ?? 24, p.height ?? 30, p.depth ?? 18, p.segments ?? 24)
    case "meniscus":
      return genMeniscus(p.outerR ?? 20, p.innerR ?? 10, p.thickness ?? 5, p.arcAngle ?? 180, p.segments ?? 48)
    case "cornea":
      return genMeniscus(p.outerR ?? 6, p.innerR ?? 3, p.thickness ?? 1.2, p.arcAngle ?? 200, p.segments ?? 64)
    case "lens":
      return genOvalCylinder(p.radiusA ?? 5, p.radiusB ?? 3, p.thickness ?? 4, p.segments ?? 48)
    case "organoid_sphere":
      return genSphere(p.radius ?? 5, p.segments ?? 32)
    case "ear":
      return genEar(p.height ?? 60, p.width ?? 35, p.thickness ?? 4, p.segments ?? 32)
    case "heart":
      return genHeart(p.radius ?? 20, p.height ?? 50, p.segments ?? 32)
    case "kidney":
      return genKidney(p.length ?? 45, p.width ?? 25, p.thickness ?? 15, p.segments ?? 32)
    case "liver_anatomical":
      return genLiverAnatomical(p.length ?? 60, p.width ?? 40, p.thickness ?? 18, p.segments ?? 32)
    case "hand":
      return genHand(p.palmWidth ?? 80, p.palmLength ?? 100, p.fingerLength ?? 70, p.thickness ?? 15)
    case "tpms_gyroid":
    case "tpms_schwarz":
    case "tpms_diamond": {
      // Lazy import to avoid circular dep & keep main bundle leaner
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateTPMS, porosityToThreshold } = require("./tpms-generator") as typeof import("./tpms-generator")
      const tpmsType =
        id === "tpms_schwarz" ? "schwarzP" :
        id === "tpms_diamond" ? "diamond" : "gyroid"
      return generateTPMS(tpmsType, {
        size: p.tpmsSize ?? 20,
        period: p.tpmsPeriod ?? 5,
        threshold: porosityToThreshold(p.tpmsPorosity ?? 70),
        resolution: Math.max(16, Math.min(64, p.tpmsResolution ?? 32)),
      })
    }
    default:
      return genCylinder(p.radius ?? 10, p.thickness ?? 5, p.segments ?? 32)
  }
}

// ═══════════════════════════════════════════
// EXPORTADORES STL / OBJ
// ═══════════════════════════════════════════

/** Exporta como STL binário (retorna ArrayBuffer) */
export function trianglesToBinarySTL(triangles: Triangle[]): ArrayBuffer {
  const header = new Uint8Array(80)
  const headerText = "BIA v4 - Quantis Biotechnology - Biofabricated Geometry"
  for (let i=0; i<Math.min(headerText.length, 80); i++) {
    header[i] = headerText.charCodeAt(i)
  }

  const buffer = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buffer)

  // Header
  new Uint8Array(buffer).set(header, 0)
  // Count
  view.setUint32(80, triangles.length, true)

  let offset = 84
  for (const t of triangles) {
    // Normal
    view.setFloat32(offset, t.normal[0], true); offset += 4
    view.setFloat32(offset, t.normal[1], true); offset += 4
    view.setFloat32(offset, t.normal[2], true); offset += 4
    // V1
    view.setFloat32(offset, t.v1[0], true); offset += 4
    view.setFloat32(offset, t.v1[1], true); offset += 4
    view.setFloat32(offset, t.v1[2], true); offset += 4
    // V2
    view.setFloat32(offset, t.v2[0], true); offset += 4
    view.setFloat32(offset, t.v2[1], true); offset += 4
    view.setFloat32(offset, t.v2[2], true); offset += 4
    // V3
    view.setFloat32(offset, t.v3[0], true); offset += 4
    view.setFloat32(offset, t.v3[1], true); offset += 4
    view.setFloat32(offset, t.v3[2], true); offset += 4
    // Attribute
    view.setUint16(offset, 0, true); offset += 2
  }
  return buffer
}

/** Exporta como STL ASCII (retorna string) */
export function trianglesToAsciiSTL(triangles: Triangle[], name = "bia_geometry"): string {
  const lines: string[] = [`solid ${name}`]
  for (const t of triangles) {
    lines.push(`  facet normal ${t.normal[0].toFixed(6)} ${t.normal[1].toFixed(6)} ${t.normal[2].toFixed(6)}`)
    lines.push("    outer loop")
    lines.push(`      vertex ${t.v1[0].toFixed(6)} ${t.v1[1].toFixed(6)} ${t.v1[2].toFixed(6)}`)
    lines.push(`      vertex ${t.v2[0].toFixed(6)} ${t.v2[1].toFixed(6)} ${t.v2[2].toFixed(6)}`)
    lines.push(`      vertex ${t.v3[0].toFixed(6)} ${t.v3[1].toFixed(6)} ${t.v3[2].toFixed(6)}`)
    lines.push("    endloop")
    lines.push("  endfacet")
  }
  lines.push(`endsolid ${name}`)
  return lines.join("\n")
}

/** Exporta como OBJ Wavefront (retorna string) */
export function trianglesToOBJ(triangles: Triangle[], name = "bia_geometry"): string {
  const lines: string[] = [
    `# BIA v4 — Quantis Biotechnology`,
    `# Geometry: ${name}`,
    `# Triangles: ${triangles.length}`,
    `o ${name}`,
  ]
  // Vertices
  let vi = 1
  const vertexMap = new Map<string, number>()
  const getVI = (v: Vec3): number => {
    const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`
    if (vertexMap.has(key)) return vertexMap.get(key)!
    vertexMap.set(key, vi)
    lines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`)
    return vi++
  }
  const faces: number[][] = []
  for (const t of triangles) {
    faces.push([getVI(t.v1), getVI(t.v2), getVI(t.v3)])
  }
  lines.push("# Faces")
  for (const f of faces) {
    lines.push(`f ${f[0]} ${f[1]} ${f[2]}`)
  }
  return lines.join("\n")
}

/** Trigger download in browser */
export function downloadSTL(triangles: Triangle[], filename: string, binary = true): void {
  let blob: Blob
  if (binary) {
    const buffer = trianglesToBinarySTL(triangles)
    blob = new Blob([buffer], { type: "application/octet-stream" })
  } else {
    const text = trianglesToAsciiSTL(triangles, filename.replace(".stl", ""))
    blob = new Blob([text], { type: "text/plain" })
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadOBJ(triangles: Triangle[], filename: string): void {
  const text = trianglesToOBJ(triangles, filename.replace(".obj", ""))
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Returns file size estimate in KB */
export function estimateFileSize(triangles: Triangle[]): { stlBinary: number; stlAscii: number; obj: number; ply: number } {
  const n = triangles.length
  return {
    stlBinary: Math.round((84 + n * 50) / 1024),
    stlAscii: Math.round((n * 200) / 1024),
    obj: Math.round((n * 80) / 1024),
    ply: Math.round((n * 60) / 1024),
  }
}

/**
 * PLY (Polygon File Format) — usado por MeshLab, CloudCompare e pipelines
 * de pesquisa biomédica. Suporta cor por vértice (extensão futura).
 */
export function trianglesToPLY(triangles: Triangle[], name = "bia_geometry"): string {
  // Dedup vertices
  const vertexMap = new Map<string, number>()
  const verts: Vec3[] = []
  const getVI = (v: Vec3): number => {
    const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`
    if (vertexMap.has(key)) return vertexMap.get(key)!
    const idx = verts.length
    vertexMap.set(key, idx)
    verts.push(v)
    return idx
  }
  const faces: number[][] = []
  for (const t of triangles) {
    faces.push([getVI(t.v1), getVI(t.v2), getVI(t.v3)])
  }
  const lines: string[] = [
    "ply",
    "format ascii 1.0",
    `comment BIA v4 - Quantis Biotechnology - ${name}`,
    `element vertex ${verts.length}`,
    "property float x",
    "property float y",
    "property float z",
    `element face ${faces.length}`,
    "property list uchar int vertex_indices",
    "end_header",
  ]
  for (const v of verts) lines.push(`${v[0].toFixed(6)} ${v[1].toFixed(6)} ${v[2].toFixed(6)}`)
  for (const f of faces) lines.push(`3 ${f[0]} ${f[1]} ${f[2]}`)
  return lines.join("\n")
}

/** Trigger PLY download */
export function downloadPLY(triangles: Triangle[], filename: string): void {
  const text = trianglesToPLY(triangles, filename.replace(".ply", ""))
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
