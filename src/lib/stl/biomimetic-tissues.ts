/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BIA v4 — Geometrias Biomiméticas e Testes de Printabilidade
 *  ─────────────────────────────────────────────────────────────────────────
 *  Conjunto de constructos 3D fundamentado na literatura de bioimpressão e
 *  engenharia de tecidos. Cada geometria foi escolhida pela sua adoção em
 *  laboratórios de referência mundial e pela facilidade de fatiamento em
 *  bioimpressoras de extrusão (EBB), DLP, FRESH e inkjet.
 *
 *  Categorias:
 *   A. TECIDOS MULTICAMADAS BIOMIMÉTICOS (pele, osso, cartilagem, córnea, …)
 *   B. PATCHES E SEGMENTOS (cardíaco, muscular, nervoso, esferoide)
 *   C. TESTES PADRÃO DE PRINTABILIDADE (linhas, ponte, estrela, torre, grade)
 *
 *  Referências-chave usadas no design (faixas dimensionais):
 *   - Ng et al. 2018, Biofabrication — pele 3 camadas (epiderme 50–100 µm,
 *     derme 1–2 mm, hipoderme 2–4 mm).
 *   - Bose et al. 2013, Mat. Today — osso cortical (parede densa 1–2 mm) +
 *     trabecular (poros 200–500 µm, porosidade 70–90 %).
 *   - Mouser et al. 2017, Biofabrication — cartilagem zonal
 *     (superficial 10 %, intermediária 60 %, profunda 30 %).
 *   - Isaacson et al. 2018, Exp. Eye Res. — córnea curva (raio 7,8 mm,
 *     espessura 500 µm, calota ~12 mm de diâmetro).
 *   - Bertassoni et al. 2014, Lab Chip — patch cardíaco/muscular com canais
 *     paralelos (Ø 200–400 µm) para vascularização.
 *   - Petcu et al. 2018, Biofabrication — conduítes nervosos com lúmen
 *     multicanal (5–20 µm) alinhado.
 *   - Kolesky et al. 2014, Adv. Mater. — vasos hierárquicos (Y/T-branches).
 *   - Ayan et al. 2020, Sci. Adv. — esferoide com cápsula porosa.
 *   - Therriault et al. 2018, Biofabrication — testes de filamento (linha,
 *     ângulo, fusão, ponte, torre).
 *   - Ouyang et al. 2016, Biofabrication — Pf (printability factor) com
 *     grade quadrada de filamentos.
 *   - Schwab et al. 2020, Chem. Rev. — review consolidado de printability.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Maio 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3, Triangle, GeometryParams, STLGeometry } from "./generator"

// ────────────────────────────────────────────────────────────────────────────
// HELPERS LOCAIS (cópia consciente para evitar dependência circular)
// ────────────────────────────────────────────────────────────────────────────
function norm(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  if (len < 1e-10) return [0, 0, 1]
  return [v[0] / len, v[1] / len, v[2] / len]
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function triNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const a: Vec3 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
  const b: Vec3 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
  return norm(cross(a, b))
}
function tri(v1: Vec3, v2: Vec3, v3: Vec3): Triangle {
  return { normal: triNormal(v1, v2, v3), v1, v2, v3 }
}

/** Caixa retangular fechada (6 faces, 12 triângulos). Posicionada em x∈[x0,x0+w], y∈[y0,y0+h], z∈[z0,z0+d]. */
function box(x0: number, y0: number, z0: number, w: number, h: number, d: number): Triangle[] {
  const x1 = x0 + w, y1 = y0 + h, z1 = z0 + d
  const v = {
    a: [x0, y0, z0] as Vec3, b: [x1, y0, z0] as Vec3, c: [x1, y1, z0] as Vec3, d: [x0, y1, z0] as Vec3,
    e: [x0, y0, z1] as Vec3, f: [x1, y0, z1] as Vec3, g: [x1, y1, z1] as Vec3, h: [x0, y1, z1] as Vec3,
  }
  return [
    // bottom z=z0 (normal -z)
    tri(v.a, v.c, v.b), tri(v.a, v.d, v.c),
    // top z=z1 (normal +z)
    tri(v.e, v.f, v.g), tri(v.e, v.g, v.h),
    // front y=y0
    tri(v.a, v.b, v.f), tri(v.a, v.f, v.e),
    // back y=y1
    tri(v.d, v.g, v.c), tri(v.d, v.h, v.g),
    // left x=x0
    tri(v.a, v.e, v.h), tri(v.a, v.h, v.d),
    // right x=x1
    tri(v.b, v.c, v.g), tri(v.b, v.g, v.f),
  ]
}

/** Cilindro cheio centrado em (cx, cy), altura entre z0 e z0+h. */
function cylinder(cx: number, cy: number, radius: number, z0: number, h: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const z1 = z0 + h
  const cBot: Vec3 = [cx, cy, z0]
  const cTop: Vec3 = [cx, cy, z1]
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const b = ((i + 1) / segs) * Math.PI * 2
    const xa = cx + Math.cos(a) * radius, ya = cy + Math.sin(a) * radius
    const xb = cx + Math.cos(b) * radius, yb = cy + Math.sin(b) * radius
    tris.push(tri(cBot, [xb, yb, z0], [xa, ya, z0])) // bottom (CW para apontar -z)
    tris.push(tri(cTop, [xa, ya, z1], [xb, yb, z1])) // top
    // side (quad → 2 triângulos)
    tris.push(tri([xa, ya, z0], [xb, yb, z0], [xb, yb, z1]))
    tris.push(tri([xa, ya, z0], [xb, yb, z1], [xa, ya, z1]))
  }
  return tris
}

/** Esfera UV (mesma estratégia do generator). */
function uvSphere(cx: number, cy: number, cz: number, radius: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const rings = Math.max(8, Math.floor(segs / 2))
  for (let i = 0; i < rings; i++) {
    const phi1 = (i / rings) * Math.PI - Math.PI / 2
    const phi2 = ((i + 1) / rings) * Math.PI - Math.PI / 2
    for (let j = 0; j < segs; j++) {
      const t1 = (j / segs) * Math.PI * 2
      const t2 = ((j + 1) / segs) * Math.PI * 2
      const p = (t: number, phi: number): Vec3 => [
        cx + Math.cos(phi) * Math.cos(t) * radius,
        cy + Math.cos(phi) * Math.sin(t) * radius,
        cz + Math.sin(phi) * radius,
      ]
      const a = p(t1, phi1), b = p(t2, phi1), c = p(t2, phi2), d = p(t1, phi2)
      tris.push(tri(a, b, c))
      tris.push(tri(a, c, d))
    }
  }
  return tris
}

/** Calota esférica (porção de esfera com altura sag a partir do topo). Útil para córnea. */
function sphericalCap(cx: number, cy: number, baseZ: number, radius: number, sag: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // R_esfera tal que sag = R - sqrt(R² - r²) → r²=2Rs - s² → R = (r²+s²)/(2s); aqui usamos diretamente sag e radius (raio na base)
  const Rs = (radius * radius + sag * sag) / (2 * sag)
  const cz = baseZ + sag - Rs // centro da esfera (abaixo da base se sag<R)
  const rings = Math.max(8, segs / 3)
  // phi vai de 0 (base) a phiMax onde sin(phi)*Rs = sag
  const phiMax = Math.asin(Math.min(1, sag / Rs))
  for (let i = 0; i < rings; i++) {
    const ph1 = (i / rings) * phiMax
    const ph2 = ((i + 1) / rings) * phiMax
    for (let j = 0; j < segs; j++) {
      const t1 = (j / segs) * Math.PI * 2
      const t2 = ((j + 1) / segs) * Math.PI * 2
      const p = (t: number, ph: number): Vec3 => {
        const r = Math.cos(ph) * Rs
        return [cx + Math.cos(t) * r, cy + Math.sin(t) * r, cz + Math.sin(ph) * Rs + 0]
      }
      // base centrada em (cx,cy,baseZ): ph=0 → z = cz + Rs ≠ baseZ. Ajuste: deslocar Z para fazer ph=0 cair em baseZ
      // Truque mais simples: gerar e depois ajustar Z subtraindo (cz+Rs) - baseZ:
      const dz = baseZ - (cz + Rs * Math.cos(0)) // = -Rs + baseZ - cz (vai dar 0 com a expressão acima)
      const a = p(t1, ph1), b = p(t2, ph1), c = p(t2, ph2), d = p(t1, ph2)
      // ajustar dz
      const adj = (v: Vec3): Vec3 => [v[0], v[1], v[2] + dz]
      tris.push(tri(adj(a), adj(b), adj(c)))
      tris.push(tri(adj(a), adj(c), adj(d)))
    }
  }
  return tris
}

/** Filamento (cilindro fino horizontal de comprimento L na direção X, a partir de x0,y0,z0). */
function filamentX(x0: number, y0: number, z0: number, length: number, radius: number, segs = 8): Triangle[] {
  const tris: Triangle[] = []
  const x1 = x0 + length
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const b = ((i + 1) / segs) * Math.PI * 2
    const ya = y0 + Math.cos(a) * radius, za = z0 + Math.sin(a) * radius
    const yb = y0 + Math.cos(b) * radius, zb = z0 + Math.sin(b) * radius
    // tampa esquerda (CW para -x)
    tris.push(tri([x0, y0, z0], [x0, yb, zb], [x0, ya, za]))
    // tampa direita
    tris.push(tri([x1, y0, z0], [x1, ya, za], [x1, yb, zb]))
    // lateral
    tris.push(tri([x0, ya, za], [x0, yb, zb], [x1, yb, zb]))
    tris.push(tri([x0, ya, za], [x1, yb, zb], [x1, ya, za]))
  }
  return tris
}

function filamentY(x0: number, y0: number, z0: number, length: number, radius: number, segs = 8): Triangle[] {
  const tris: Triangle[] = []
  const y1 = y0 + length
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const b = ((i + 1) / segs) * Math.PI * 2
    const xa = x0 + Math.cos(a) * radius, za = z0 + Math.sin(a) * radius
    const xb = x0 + Math.cos(b) * radius, zb = z0 + Math.sin(b) * radius
    tris.push(tri([x0, y0, z0], [xa, y0, za], [xb, y0, zb]))
    tris.push(tri([x0, y1, z0], [xb, y1, zb], [xa, y1, za]))
    tris.push(tri([xa, y0, za], [xb, y1, zb], [xb, y0, zb]))
    tris.push(tri([xa, y0, za], [xa, y1, za], [xb, y1, zb]))
  }
  return tris
}

// ════════════════════════════════════════════════════════════════════════════
//  A. TECIDOS BIOMIMÉTICOS MULTICAMADAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * PELE 3 CAMADAS (epiderme + derme + hipoderme).
 * Disposição empilhada em Z, partindo de z=0 para cima.
 * Cada camada é um cubo retangular fechado independente, permitindo ao slicer
 * tratar cada uma como objeto separado e usar bioinks diferentes por camada
 * (uso clássico em Allevi/CELLINK BIO X com troca de seringas).
 *
 * Espessuras padrão (mm):  epiderme 0.1,  derme 1.5,  hipoderme 3.0
 */
export function genSkin3Layer(width: number, height: number, p: { epidermis: number; dermis: number; hypodermis: number }): Triangle[] {
  const tris: Triangle[] = []
  let z = 0
  tris.push(...box(0, 0, z, width, height, p.hypodermis)); z += p.hypodermis
  tris.push(...box(0, 0, z, width, height, p.dermis));      z += p.dermis
  tris.push(...box(0, 0, z, width, height, p.epidermis))
  return tris
}

/**
 * OSSO BICAMADA (cortical denso externo + trabecular poroso interno).
 * Externo: paredes laterais (caixa anelar).
 * Interno: caixa interna que será impressa com infill gyroid alto pelo slicer.
 * Aqui geramos apenas as DUAS shells: o usuário liga "infill" no slicer para
 * o interior, ou usa a versão TPMS já existente como segunda peça.
 */
export function genBoneCorticalTrabecular(width: number, height: number, depth: number, corticalWall: number): Triangle[] {
  const tris: Triangle[] = []
  // Shell cortical: caixa externa
  tris.push(...box(0, 0, 0, width, height, depth))
  // Cavidade interna: invertemos normais usando box() com offset (subtração visual feita pelo slicer)
  const wt = corticalWall
  if (wt * 2 < Math.min(width, height, depth) - 1) {
    // Adicionamos caixa interna com normais invertidas
    const innerBox = box(wt, wt, wt, width - 2 * wt, height - 2 * wt, depth - 2 * wt)
    for (const t of innerBox) {
      tris.push({
        normal: [-t.normal[0], -t.normal[1], -t.normal[2]],
        v1: t.v1, v2: t.v3, v3: t.v2, // inverte orientação
      })
    }
  }
  return tris
}

/**
 * CARTILAGEM ZONAL (3 zonas com proporções de Mouser 2017).
 * Disco cilíndrico empilhado: zona profunda (30 % da espessura, mais densa,
 * raio levemente maior), intermediária (60 %), superficial (10 % no topo).
 * Os anéis têm raios iguais — a diferenciação é química (bioink), não geométrica.
 */
export function genCartilageZonal(radius: number, thickness: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  const deepT = thickness * 0.30
  const midT  = thickness * 0.60
  const supT  = thickness * 0.10
  let z = 0
  tris.push(...cylinder(0, 0, radius, z, deepT, segs)); z += deepT
  tris.push(...cylinder(0, 0, radius, z, midT,  segs)); z += midT
  tris.push(...cylinder(0, 0, radius, z, supT,  segs))
  return tris
}

/**
 * CÓRNEA CURVA. Calota esférica fina (espessura constante).
 * Padrão: raio_base 6 mm, sag 1.8 mm, espessura 0.5 mm (Isaacson 2018).
 * Implementação: duas calotas (externa e interna) com tampa anelar na base.
 */
export function genCorneaCurved(baseRadius: number, sag: number, thickness: number, segs: number): Triangle[] {
  // Para simplificar — geramos uma calota externa "espessa" com o método de
  // duplicar a superfície interna deslocada em -z (espessura constante).
  // Fechamos a base com um anel.
  const outer = sphericalCap(0, 0, 0, baseRadius, sag, segs)
  // calota interna deslocada para baixo em "thickness" e raio = baseRadius (mantém footprint)
  const innerCap = sphericalCap(0, 0, -thickness, baseRadius, sag, segs)
  // invertendo normais da interna
  const inner: Triangle[] = innerCap.map(t => ({
    normal: [-t.normal[0], -t.normal[1], -t.normal[2]],
    v1: t.v1, v2: t.v3, v3: t.v2,
  }))
  // anel de base entre raios baseRadius @ z=0 e baseRadius @ z=-thickness
  const ring: Triangle[] = []
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const b = ((i + 1) / segs) * Math.PI * 2
    const xa = Math.cos(a) * baseRadius, ya = Math.sin(a) * baseRadius
    const xb = Math.cos(b) * baseRadius, yb = Math.sin(b) * baseRadius
    ring.push(tri([xa, ya, 0], [xa, ya, -thickness], [xb, yb, -thickness]))
    ring.push(tri([xa, ya, 0], [xb, yb, -thickness], [xb, yb, 0]))
  }
  return [...outer, ...inner, ...ring]
}

/**
 * PATCH CARDÍACO / MUSCULAR ANISOTRÓPICO.
 * Plataforma retangular com sulcos paralelos em X simulando alinhamento de
 * cardiomiócitos/miofibras. Os sulcos são "valas" — cilindros côncavos
 * subtraídos. Aqui modelamos como base plana + barras longitudinais.
 */
export function genCardiacPatch(width: number, length: number, baseThickness: number, ridgeCount: number, ridgeWidth: number, ridgeHeight: number): Triangle[] {
  const tris: Triangle[] = []
  // Base
  tris.push(...box(0, 0, 0, width, length, baseThickness))
  // Cumes (ridges) ao longo de Y
  if (ridgeCount > 0) {
    const gap = (width - ridgeWidth * ridgeCount) / (ridgeCount + 1)
    let x = gap
    for (let i = 0; i < ridgeCount; i++) {
      tris.push(...box(x, 0, baseThickness, ridgeWidth, length, ridgeHeight))
      x += ridgeWidth + gap
    }
  }
  return tris
}

/**
 * CONDUÍTE NERVOSO MULTICANAL.
 * Cilindro externo com N canais cilíndricos paralelos perfurados (paralelos ao
 * eixo Z = direção de regeneração). Canais distribuídos em padrão hexagonal.
 */
export function genNerveConduit(outerR: number, length: number, channelR: number, channelCount: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // Tubo externo (sólido)
  tris.push(...cylinder(0, 0, outerR, 0, length, segs))
  // Canais (cilindros internos com normais invertidas para criar cavidades)
  if (channelCount >= 1) {
    // Distribuição em anel concêntrico
    const rings = channelCount <= 7 ? 1 : 2
    const center = 1 // canal central
    let placed = 0
    if (center) {
      placed += addInvertedCylinder(tris, 0, 0, channelR, length, segs)
    }
    const remaining = channelCount - 1
    if (rings === 1 && remaining > 0) {
      const ringR = outerR * 0.55
      for (let i = 0; i < remaining; i++) {
        const a = (i / remaining) * Math.PI * 2
        placed += addInvertedCylinder(tris, Math.cos(a) * ringR, Math.sin(a) * ringR, channelR, length, segs)
      }
    } else if (rings === 2 && remaining > 0) {
      const ring1 = 6, ring2 = remaining - 6
      for (let i = 0; i < ring1; i++) {
        const a = (i / ring1) * Math.PI * 2
        placed += addInvertedCylinder(tris, Math.cos(a) * outerR * 0.40, Math.sin(a) * outerR * 0.40, channelR, length, segs)
      }
      for (let i = 0; i < ring2; i++) {
        const a = (i / ring2) * Math.PI * 2 + Math.PI / ring2
        placed += addInvertedCylinder(tris, Math.cos(a) * outerR * 0.72, Math.sin(a) * outerR * 0.72, channelR, length, segs)
      }
    }
  }
  return tris
}
function addInvertedCylinder(tris: Triangle[], cx: number, cy: number, r: number, h: number, segs: number): number {
  const cyl = cylinder(cx, cy, r, 0, h, segs)
  for (const t of cyl) tris.push({ normal: [-t.normal[0], -t.normal[1], -t.normal[2]], v1: t.v1, v2: t.v3, v3: t.v2 })
  return 1
}

/**
 * ESFEROIDE COM CÁPSULA POROSA.
 * Esfera central de tamanho do esferoide (~1 mm padrão) envolvida por uma
 * cápsula porosa cilíndrica externa para análise por imagem e captura.
 */
export function genSpheroidCapsule(spheroidR: number, capsuleR: number, capsuleH: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // Cápsula externa (paredes finas)
  tris.push(...cylinder(0, 0, capsuleR, 0, capsuleH, segs))
  // Cavidade interna
  if (capsuleR - 0.4 > 0) {
    const inner = cylinder(0, 0, capsuleR - 0.4, 0.2, capsuleH - 0.4, segs)
    for (const t of inner) tris.push({ normal: [-t.normal[0], -t.normal[1], -t.normal[2]], v1: t.v1, v2: t.v3, v3: t.v2 })
  }
  // Esferoide referencial no centro
  tris.push(...uvSphere(0, 0, capsuleH / 2, spheroidR, segs))
  return tris
}

/**
 * VASO BIFURCADO Y.
 * Trecho reto que se divide em dois ramos (Y-branch).
 * Modelagem por união de três cilindros — slicer fará a interseção.
 */
export function genVesselYBranch(trunkR: number, trunkL: number, branchR: number, branchL: number, branchAngleDeg: number, segs: number): Triangle[] {
  const tris: Triangle[] = []
  // Trunk: ao longo de Z, de z=0 a z=trunkL
  tris.push(...cylinder(0, 0, trunkR, 0, trunkL, segs))
  // Branches: a partir de (0,0,trunkL), inclinados em XZ pelo ângulo
  const ang = (branchAngleDeg * Math.PI) / 180
  // Para cada branch, criamos um cilindro inclinado aproximado por uma série de segmentos curtos
  for (const sign of [-1, 1]) {
    const steps = 12
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps
      const z0 = trunkL + t0 * branchL * Math.cos(ang)
      const x0 = sign * t0 * branchL * Math.sin(ang)
      const z1 = trunkL + t1 * branchL * Math.cos(ang)
      const x1 = sign * t1 * branchL * Math.sin(ang)
      // Aproximamos cada trecho por um cilindro vertical curto centrado em (mid)
      const cx = (x0 + x1) / 2
      const cy = 0
      const dz = z1 - z0
      tris.push(...cylinder(cx, cy, branchR, z0, dz, Math.max(8, segs / 2)))
    }
  }
  return tris
}

// ════════════════════════════════════════════════════════════════════════════
//  B. TESTES DE PRINTABILIDADE (filament-based)
// ════════════════════════════════════════════════════════════════════════════

/**
 * LINE TEST — réguas de 5 espessuras crescentes para calibrar diâmetro real.
 * Cada linha é um filamento horizontal (cilindro fino) em altura Z=h/2.
 * Padrão: 5 linhas, larguras teóricas 0.3 / 0.4 / 0.5 / 0.6 / 0.8 mm,
 * comprimento 20 mm, espaçadas em Y a cada 4 mm.
 */
export function genLineTest(length: number, radii: number[], spacing: number): Triangle[] {
  const tris: Triangle[] = []
  // Base plana fina (para o filamento aderir e ser fotografado)
  const baseH = 0.4
  const totalW = spacing * radii.length
  tris.push(...box(0, 0, 0, length, totalW, baseH))
  for (let i = 0; i < radii.length; i++) {
    const yc = spacing * (i + 0.5)
    tris.push(...filamentX(0, yc, baseH + radii[i], length, radii[i], 12))
  }
  return tris
}

/**
 * FILAMENT FUSION TEST — Pf (printability factor) de Ouyang 2016.
 * Grade quadrada formada por filamentos perpendiculares.
 * Após impressão, fotografa-se o topo: poros devem ser quadrados (Pf=1).
 * Se hidrogel fluir → poros viram círculos (Pf < 1, sub-gel).
 * Se hidrogel for muito viscoso → poros irregulares (Pf > 1, over-gel).
 *
 *   Pf = (perímetro)^2 / (16 × área)
 *
 * Geometria: N×N grade em camada única em Z = baseH + radius.
 */
export function genFilamentGrid(side: number, lines: number, filamentRadius: number): Triangle[] {
  const tris: Triangle[] = []
  const baseH = 0.4
  tris.push(...box(0, 0, 0, side, side, baseH))
  const z = baseH + filamentRadius
  const spacing = side / (lines + 1)
  // Linhas em X
  for (let i = 1; i <= lines; i++) {
    tris.push(...filamentX(0, i * spacing, z, side, filamentRadius, 10))
  }
  // Linhas em Y (uma camada acima para simular cruzamento real)
  for (let i = 1; i <= lines; i++) {
    tris.push(...filamentY(i * spacing, 0, z + filamentRadius * 1.8, side, filamentRadius, 10))
  }
  return tris
}

/**
 * COLLAPSE BRIDGE TEST — Therriault 2018.
 * Duas torres laterais e uma série de pontes com vão crescente.
 * Mede vão máximo onde o filamento se mantém sem colapsar.
 */
export function genCollapseBridge(spans: number[], towerSize: number, towerHeight: number, filamentRadius: number): Triangle[] {
  const tris: Triangle[] = []
  // Empilhamos as pontes em Y
  const ySpacing = towerSize + 2
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    const y0 = i * ySpacing
    // Torre esquerda
    tris.push(...box(0, y0, 0, towerSize, towerSize, towerHeight))
    // Torre direita
    tris.push(...box(towerSize + span, y0, 0, towerSize, towerSize, towerHeight))
    // Ponte (filamento horizontal entre topos)
    tris.push(...filamentX(0, y0 + towerSize / 2, towerHeight + filamentRadius, towerSize * 2 + span, filamentRadius, 10))
  }
  return tris
}

/**
 * STAR / ASTERISK TEST — overhang em ângulos diferentes.
 * Pino central + N braços radiais sem suporte. Mede colapso por ângulo.
 */
export function genStarOverhang(pinR: number, pinH: number, armCount: number, armLength: number, armRadius: number): Triangle[] {
  const tris: Triangle[] = []
  // Pino central
  tris.push(...cylinder(0, 0, pinR, 0, pinH, 24))
  // Braços horizontais a partir do topo do pino
  const z = pinH - armRadius
  for (let i = 0; i < armCount; i++) {
    const a = (i / armCount) * Math.PI * 2
    // Aproximamos braço como série de filamentos curtos formando linha
    const steps = 8
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps
      const x0 = Math.cos(a) * (pinR + t0 * armLength)
      const y0 = Math.sin(a) * (pinR + t0 * armLength)
      const x1 = Math.cos(a) * (pinR + t1 * armLength)
      const y1 = Math.sin(a) * (pinR + t1 * armLength)
      tris.push(...filamentX(Math.min(x0, x1), (y0 + y1) / 2, z, Math.abs(x1 - x0) + 0.1, armRadius, 8))
      tris.push(...filamentY((x0 + x1) / 2, Math.min(y0, y1), z, Math.abs(y1 - y0) + 0.1, armRadius, 8))
    }
  }
  return tris
}

/**
 * FILAMENT STACKING TOWER — empilhamento vertical.
 * Cilindro fino "fatiado" mentalmente em N anéis — aqui um cilindro de altura
 * = N × layerHeight × 2 (pois cada camada na bioimpressão é depositada como
 * um filamento). Slicer fatia em N camadas. Quanto maior N sem colapso, melhor.
 */
export function genStackingTower(radius: number, layers: number, layerHeight: number): Triangle[] {
  return cylinder(0, 0, radius, 0, layers * layerHeight, 24)
}

/**
 * Z RESOLUTION STAIRCASE — escada para calibrar Z fino.
 * 5 degraus de espessura decrescente. Mede menor camada visível.
 */
export function genZStaircase(stepWidth: number, stepLength: number, heights: number[]): Triangle[] {
  const tris: Triangle[] = []
  let z = 0
  let w = stepWidth * heights.length
  for (let i = 0; i < heights.length; i++) {
    tris.push(...box(0, 0, z, w, stepLength, heights[i]))
    z += heights[i]
    w -= stepWidth
    if (w <= 0) break
  }
  return tris
}

/**
 * ANGLE FAN — leque de filamentos em ângulos 0°, 15°, 30°, 45°, 60°, 75°, 90°.
 * Cada filamento parte do mesmo ponto base e se eleva em ângulo. Mede ângulo
 * crítico de overhang sem colapso.
 */
export function genAngleFan(length: number, anglesDeg: number[], filamentRadius: number, spacing: number): Triangle[] {
  const tris: Triangle[] = []
  const baseH = 0.4
  tris.push(...box(0, 0, 0, 4, anglesDeg.length * spacing, baseH))
  for (let i = 0; i < anglesDeg.length; i++) {
    const y = spacing * (i + 0.5)
    const a = (anglesDeg[i] * Math.PI) / 180
    // discretizar filamento angular em N segmentos
    const steps = 12
    const dx = length * Math.cos(a) / steps
    const dz = length * Math.sin(a) / steps
    let x = 4, z = baseH + filamentRadius
    for (let s = 0; s < steps; s++) {
      tris.push(...filamentX(x, y, z, dx + 0.05, filamentRadius, 6))
      x += dx
      z += dz
    }
  }
  return tris
}

// ════════════════════════════════════════════════════════════════════════════
//  CATÁLOGO EXPORTÁVEL (mesma interface que GEOMETRIES original)
// ════════════════════════════════════════════════════════════════════════════

export interface BiomimeticGeometry extends STLGeometry {
  category: "biomimetic" | "printability_test"
  rationale: string                  // racional curto exibido na UI
  analysisProtocol?: string          // como analisar pós-impressão
}

export const BIOMIMETIC_GEOMETRIES: BiomimeticGeometry[] = [
  // ── A. Tecidos multicamadas ─────────────────────────────────────────────
  {
    id: "skin_3layer",
    label: "Pele — 3 camadas (Epi+Derme+Hipo)",
    description: "Pele biomimética em 3 camadas empilhadas para imprimir com 3 bioinks distintos (queratinócitos / fibroblastos / adipócitos).",
    tissue: "Pele",
    application: "Modelo dérmico full-thickness, screening cosmético, cicatrização",
    icon: "🟫",
    defaultParams: { width: 20, height: 20 } as GeometryParams,
    paramLabels: { width: "Largura (mm)", height: "Comprimento (mm)" },
    creditCost: 6,
    category: "biomimetic",
    rationale: "Disposição clássica de Ng 2018 / Pourchet 2017: epiderme 0.1 mm (KRT) + derme 1.5 mm (fibro+colágeno) + hipoderme 3 mm (adipo).",
    analysisProtocol: "Fotografar corte transversal após HE. Medir espessura de cada camada com ImageJ → comparar com nominal (desvio < 15%).",
  },
  {
    id: "bone_cortical_trabecular",
    label: "Osso — Cortical + Trabecular",
    description: "Bloco ósseo com shell cortical densa (1.5 mm) e cavidade interna para preenchimento trabecular (use Gyroid no slicer).",
    tissue: "Osso",
    application: "Regeneração óssea, scaffold osteocondutivo, modelo de defeito crítico",
    icon: "🦴",
    defaultParams: { width: 15, height: 15, depth: 10, wallThickness: 1.5 } as GeometryParams,
    paramLabels: { width: "Largura (mm)", height: "Comprimento (mm)", depth: "Altura (mm)", wallThickness: "Espessura cortical (mm)" },
    creditCost: 8,
    category: "biomimetic",
    rationale: "Bose 2013: cortical 1–2 mm + trabecular com poros 200–500 µm. Cavidade interna deve ser fatiada com infill gyroid 70%.",
    analysisProtocol: "µ-CT 8 µm/voxel pós-cura. Medir porosidade, conectividade (Euler) e BV/TV (osso/tecido total).",
  },
  {
    id: "cartilage_zonal",
    label: "Cartilagem — 3 zonas",
    description: "Disco zonal: profunda (30%, alta densidade), intermediária (60%) e superficial (10%). Imprimir cada zona com bioink ajustado.",
    tissue: "Cartilagem",
    application: "Reparo condral, defeito articular, modelo zona-específico",
    icon: "🟢",
    defaultParams: { radius: 8, thickness: 4, segments: 48 } as GeometryParams,
    paramLabels: { radius: "Raio (mm)", thickness: "Espessura total (mm)", segments: "Resolução" },
    creditCost: 7,
    category: "biomimetic",
    rationale: "Mouser 2017: razão clássica 30/60/10 (deep/mid/sup) com diferenciação química por zona (Col II + aggrecan grad).",
    analysisProtocol: "Safranin-O por zona; AFM modulus em cada terço (sup > mid > deep esperado em hidrogel jovem).",
  },
  {
    id: "cornea_curved",
    label: "Córnea — Calota curva",
    description: "Calota esférica fina (raio base 6 mm, sag 1.8 mm, espessura 0.5 mm). Geometria do estroma corneano humano.",
    tissue: "Córnea",
    application: "Regeneração corneana, modelo de transplante, lente de contato bioativa",
    icon: "👁️",
    defaultParams: { outerR: 6, thickness: 0.5, segments: 48 } as GeometryParams,
    paramLabels: { outerR: "Raio base (mm)", thickness: "Espessura (mm)", segments: "Resolução" },
    creditCost: 7,
    category: "biomimetic",
    rationale: "Isaacson 2018: raio anterior 7.8 mm, espessura central 500 µm. Aqui simplificamos para impressão com supporte FRESH/gel-bath.",
    analysisProtocol: "Imagem OCT 5 µm. Transparência (espectrofotômetro 400-700 nm) deve ser > 80% para uso óptico.",
  },
  {
    id: "cardiac_patch",
    label: "Patch cardíaco anisotrópico",
    description: "Patch com sulcos paralelos para alinhar cardiomiócitos/miócitos. Base 0.5 mm + 5 cumes longitudinais.",
    tissue: "Miocárdio / Músculo esquelético",
    application: "Patch pós-infarto, regeneração muscular, modelo contrátil",
    icon: "❤️",
    defaultParams: { width: 15, length: 20, depth: 0.5 } as GeometryParams,
    paramLabels: { width: "Largura (mm)", length: "Comprimento (mm)", depth: "Espessura base (mm)" },
    creditCost: 7,
    category: "biomimetic",
    rationale: "Bertassoni 2014: alinhamento topográfico induz orientação celular >70% sarcômero paralelo aos sulcos.",
    analysisProtocol: "Fluorescência α-actinina; FFT 2D para orientação angular (FWHM < 30° = bom alinhamento).",
  },
  {
    id: "nerve_conduit",
    label: "Conduíte nervoso multicanal",
    description: "Tubo com 7 canais paralelos para regeneração de nervo periférico. Padrão hexagonal (1 central + 6 anel).",
    tissue: "Nervo periférico",
    application: "Reparo de gap nervoso, regeneração axonal direcionada",
    icon: "🟣",
    defaultParams: { outerR: 2.5, tubeLength: 10, innerR: 0.4, segments: 32 } as GeometryParams,
    paramLabels: { outerR: "Raio externo (mm)", tubeLength: "Comprimento (mm)", innerR: "Raio do canal (mm)", segments: "Resolução" },
    creditCost: 7,
    category: "biomimetic",
    rationale: "Petcu 2018: 5–20 µm para axônios; aqui escalamos para impressão (canais 0.4 mm) e bioink degradável por MMPs.",
    analysisProtocol: "Após cultivo: NF-200 IF; medir penetração axonal por canal e taxa de regeneração mm/dia.",
  },
  {
    id: "spheroid_capsule",
    label: "Esferoide + Cápsula porosa",
    description: "Cápsula cilíndrica oca (Ø 3 mm, alt 3 mm) contendo um esferoide central de Ø 1 mm. Permite captura e imagem.",
    tissue: "Organoide / Esferoide",
    application: "Cultura 3D, drug screening, modelo tumoral, organoide capturado",
    icon: "🔮",
    defaultParams: { radius: 0.5, outerR: 1.5, thickness: 3, segments: 32 } as GeometryParams,
    paramLabels: { radius: "Raio esferoide (mm)", outerR: "Raio cápsula (mm)", thickness: "Altura cápsula (mm)", segments: "Resolução" },
    creditCost: 6,
    category: "biomimetic",
    rationale: "Ayan 2020: confinamento aumenta densidade celular e maturação do esferoide. Cápsula porosa permite difusão de meio.",
    analysisProtocol: "Live/Dead em z-stacks; medir diâmetro, esfericidade (4πV/A^(3/2) > 0.85) e necrose central (DAPI/PI).",
  },
  {
    id: "vessel_y_branch",
    label: "Vaso bifurcado Y",
    description: "Trecho vascular com bifurcação em Y. Tronco 8 mm × Ø 2 mm, ramos 6 mm × Ø 1.2 mm a 60°.",
    tissue: "Vaso sanguíneo",
    application: "Modelo de bifurcação, estudo de fluxo, vascularização de scaffold",
    icon: "🟥",
    defaultParams: { outerR: 2, tubeLength: 8, innerR: 1.2, length: 6, arcAngle: 60, segments: 24 } as GeometryParams,
    paramLabels: { outerR: "Raio tronco (mm)", tubeLength: "L tronco (mm)", innerR: "Raio ramo (mm)", length: "L ramo (mm)", arcAngle: "Ângulo (°)", segments: "Resolução" },
    creditCost: 8,
    category: "biomimetic",
    rationale: "Kolesky 2014: Y-branch é a unidade hierárquica básica de vascularização biomimética; permite cultivar com fluxo unidirecional.",
    analysisProtocol: "Perfusão de Dextran-FITC 70 kDa por 24 h; CLSM para integridade do lúmen. Vazamento < 5% indica vaso estanque.",
  },

  // ── B. Testes de printabilidade ─────────────────────────────────────────
  {
    id: "test_line",
    label: "Teste de Linha (Line Test)",
    description: "5 filamentos paralelos de espessuras crescentes (0.3 / 0.4 / 0.5 / 0.6 / 0.8 mm). Calibra diâmetro real do bico + pressão.",
    tissue: "Calibração",
    application: "Calibração inicial de qualquer bioink antes de imprimir constructo",
    icon: "➖",
    defaultParams: { length: 20 } as GeometryParams,
    paramLabels: { length: "Comprimento das linhas (mm)" },
    creditCost: 4,
    category: "printability_test",
    rationale: "Therriault 2018: linha = teste mais simples e informativo. Espessura real medida deve estar dentro de ±20% do nominal.",
    analysisProtocol: "Foto top-down + escala. Em ImageJ: medir largura média de cada linha em 5 pontos. Calcular CV (desvio/média) — bom bioink: CV < 10%.",
  },
  {
    id: "test_grid",
    label: "Grade de Fusão (Pf Test)",
    description: "Grade quadrada com filamentos perpendiculares. Calcula Pf = perímetro²/(16·área) — Pf=1 indica gel ideal.",
    tissue: "Calibração",
    application: "Quantificar printabilidade (Pf), padrão Ouyang 2016 universalmente aceito",
    icon: "▦",
    defaultParams: { width: 20, segments: 5 } as GeometryParams,
    paramLabels: { width: "Lado da grade (mm)", segments: "Nº de linhas" },
    creditCost: 5,
    category: "printability_test",
    rationale: "Ouyang 2016: Pf < 0.9 = sub-gel (espalha); Pf 0.9–1.1 = ótimo; Pf > 1.1 = over-gel (irregular). Métrica universal.",
    analysisProtocol: "Foto top-down + escala (régua de 10 mm). ImageJ: threshold → medir poros internos → Pf = P²/(16A). Reportar média de 16 poros.",
  },
  {
    id: "test_collapse_bridge",
    label: "Ponte de Colapso",
    description: "Série de pontes com vão crescente (3, 5, 7, 10, 15 mm) entre torres. Mede vão máximo sem colapsar.",
    tissue: "Calibração",
    application: "Avaliar self-supporting do bioink, força do gel pós-extrusão",
    icon: "🌉",
    defaultParams: {} as GeometryParams,
    paramLabels: {},
    creditCost: 5,
    category: "printability_test",
    rationale: "Therriault 2018: vão máximo sem colapso correlaciona com módulo de armazenamento (G') do bioink. Bioinks robustos: > 10 mm.",
    analysisProtocol: "Foto lateral perpendicular ao vão. Medir flecha máxima (sag) em mm. Sag < 10% do vão = OK; sag > 20% = colapso parcial.",
  },
  {
    id: "test_star",
    label: "Estrela de Overhang",
    description: "Pino central + 6 braços radiais sem suporte. Avalia colapso de overhangs em todas as direções.",
    tissue: "Calibração",
    application: "Mapear comportamento de overhang em 360°, detectar anisotropia",
    icon: "✱",
    defaultParams: {} as GeometryParams,
    paramLabels: {},
    creditCost: 5,
    category: "printability_test",
    rationale: "Detecta efeitos direcionais (anisotropia do movimento da cabeça, gravidade lateral). Braços devem ficar simétricos.",
    analysisProtocol: "Foto top-down. Medir comprimento de cada braço com ImageJ. Calcular desvio padrão / média (< 8% = isotrópico OK).",
  },
  {
    id: "test_stacking_tower",
    label: "Torre de Empilhamento",
    description: "Cilindro fino impresso em N camadas (default 20). Avalia acúmulo vertical sem colapso lateral.",
    tissue: "Calibração",
    application: "Limite de altura para um bioink — alturas > 10 mm exigem crosslinking ótimo",
    icon: "🗼",
    defaultParams: { radius: 3, segments: 24 } as GeometryParams,
    paramLabels: { radius: "Raio da torre (mm)", segments: "Camadas (Nz)" },
    creditCost: 4,
    category: "printability_test",
    rationale: "Schwab 2020: torres são teste padrão de bioinks self-supporting. Inks como GelMA + LAP 0.25% chegam a 30+ camadas.",
    analysisProtocol: "Foto lateral. Medir altura real / altura nominal. Diâmetro do topo / base (deformação afunilamento < 10%).",
  },
  {
    id: "test_z_staircase",
    label: "Escada Z",
    description: "5 degraus de alturas 0.1 / 0.15 / 0.2 / 0.3 / 0.4 mm. Calibra resolução vertical real.",
    tissue: "Calibração",
    application: "Determinar menor altura de camada usável para o slicer com este bioink",
    icon: "🪜",
    defaultParams: {} as GeometryParams,
    paramLabels: {},
    creditCost: 4,
    category: "printability_test",
    rationale: "Identifica o menor passo Z onde camadas ainda são distinguíveis. Útil para definir layer height ótima no slicer.",
    analysisProtocol: "Foto lateral macro. Medir cada degrau com paquímetro digital ou ImageJ. Reportar menor degrau ainda visível ≥ resolução.",
  },
  {
    id: "test_angle_fan",
    label: "Leque de Ângulos",
    description: "Filamentos partindo do mesmo ponto em ângulos 0°, 15°, 30°, 45°, 60°, 75°, 90°. Determina ângulo crítico de overhang.",
    tissue: "Calibração",
    application: "Ângulo máximo overhang antes do colapso — base para projeto sem suporte",
    icon: "📐",
    defaultParams: { length: 15 } as GeometryParams,
    paramLabels: { length: "Comprimento de cada braço (mm)" },
    creditCost: 5,
    category: "printability_test",
    rationale: "Therriault 2018: cada bioink tem ângulo crítico (geralmente 30–60°). Acima → necessita suporte sacrificial (FRESH, Pluronic).",
    analysisProtocol: "Foto lateral. Determinar maior ângulo sem colapso visual > 1 mm. Reportar como 'overhang_critical = X°'.",
  },
]

// ────────────────────────────────────────────────────────────────────────────
// DISPATCHER — chamado em complemento ao generateGeometry() original
// ────────────────────────────────────────────────────────────────────────────

export function generateBiomimeticGeometry(id: string, p: GeometryParams): Triangle[] | null {
  switch (id) {
    case "skin_3layer":
      return genSkin3Layer(p.width ?? 20, p.height ?? 20, { epidermis: 0.1, dermis: 1.5, hypodermis: 3.0 })
    case "bone_cortical_trabecular":
      return genBoneCorticalTrabecular(p.width ?? 15, p.height ?? 15, p.depth ?? 10, p.wallThickness ?? 1.5)
    case "cartilage_zonal":
      return genCartilageZonal(p.radius ?? 8, p.thickness ?? 4, p.segments ?? 48)
    case "cornea_curved":
      return genCorneaCurved(p.outerR ?? 6, 1.8, p.thickness ?? 0.5, p.segments ?? 48)
    case "cardiac_patch":
      return genCardiacPatch(p.width ?? 15, p.length ?? 20, p.depth ?? 0.5, 5, 0.6, 0.5)
    case "nerve_conduit":
      return genNerveConduit(p.outerR ?? 2.5, p.tubeLength ?? 10, p.innerR ?? 0.4, 7, p.segments ?? 32)
    case "spheroid_capsule":
      return genSpheroidCapsule(p.radius ?? 0.5, p.outerR ?? 1.5, p.thickness ?? 3, p.segments ?? 32)
    case "vessel_y_branch":
      return genVesselYBranch(p.outerR ?? 2, p.tubeLength ?? 8, p.innerR ?? 1.2, p.length ?? 6, p.arcAngle ?? 60, p.segments ?? 24)
    case "test_line":
      return genLineTest(p.length ?? 20, [0.3, 0.4, 0.5, 0.6, 0.8], 4)
    case "test_grid":
      return genFilamentGrid(p.width ?? 20, p.segments ?? 5, 0.4)
    case "test_collapse_bridge":
      return genCollapseBridge([3, 5, 7, 10, 15], 4, 8, 0.4)
    case "test_star":
      return genStarOverhang(1.5, 4, 6, 8, 0.4)
    case "test_stacking_tower":
      return genStackingTower(p.radius ?? 3, p.segments ?? 24, 0.4)
    case "test_z_staircase":
      return genZStaircase(4, 12, [0.4, 0.3, 0.2, 0.15, 0.1])
    case "test_angle_fan":
      return genAngleFan(p.length ?? 15, [0, 15, 30, 45, 60, 75, 90], 0.4, 5)
    default:
      return null
  }
}
