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
export function estimateFileSize(triangles: Triangle[]): { stlBinary: number; stlAscii: number; obj: number } {
  const n = triangles.length
  return {
    stlBinary: Math.round((84 + n * 50) / 1024),
    stlAscii: Math.round((n * 200) / 1024),
    obj: Math.round((n * 80) / 1024),
  }
}
