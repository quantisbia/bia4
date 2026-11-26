/**
 * BIA OS · Página inicial — cenas esquemáticas animadas (R47).
 * SVG + CSS puros: componente de servidor, sem JS no navegador. As animações ficam em
 * src/app/globals.css, bloco R47, prefixo lp-. O estado-base de cada elemento é o quadro
 * final, usado quando o visitante pede menos movimento (prefers-reduced-motion).
 * São ilustrações: não reproduzem telas reais nem dados medidos.
 */
import type { CSSProperties } from "react"

const V = "#a78bfa", L = "#c4b5fd", C = "#67e8f9", E = "#6ee7b7", F = "#f0abfc", A = "#fcd34d"
const TXT = "#ede9fe", MUTED = "#a8a3b8"
const css = (v: Record<string, string | number>) => v as CSSProperties
const r1 = (n: number) => Math.round(n * 10) / 10
type SceneProps = { className?: string }

/* ── 1 · Células migrando dentro de um scaffold (vista superior) ───────── */
const CELLS: Array<{ x: number; y: number; c: string; t: number; o: number; w: number[] }> = [
  { x: 40, y: 60, c: E, t: 19, o: -2, w: [40, 0, 40, 30, 92, 30] },
  { x: 200, y: 30, c: C, t: 23, o: -9, w: [-40, 0, -40, 30, -80, 30] },
  { x: 20, y: 120, c: F, t: 21, o: -14, w: [60, 0, 60, 30, 100, 30] },
  { x: 160, y: 150, c: E, t: 17, o: -5, w: [0, -30, 40, -30, 40, -60] },
  { x: 120, y: 14, c: A, t: 25, o: -11, w: [0, 46, -40, 46, -40, 76] },
  { x: 220, y: 90, c: C, t: 20, o: -16, w: [-60, 0, -60, 30, -100, 30] },
  { x: 40, y: 166, c: A, t: 22, o: -7, w: [0, -46, 40, -46, 40, -76] },
]

export function ScaffoldCellsScene({ className = "" }: SceneProps) {
  return (
    <svg viewBox="0 0 240 180" className={`lp-scene ${className}`} fill="none" aria-hidden="true">
      {[30, 60, 90, 120, 150].map((y) => <path key={y} d={`M16 ${y}H224`} stroke={V} strokeOpacity=".38" strokeWidth="5" strokeLinecap="round" />)}
      {[40, 80, 120, 160, 200].map((x) => <path key={x} d={`M${x} 14V166`} stroke={L} strokeOpacity=".26" strokeWidth="4" strokeLinecap="round" />)}
      {CELLS.map((c, i) => (
        <g key={i} className="lp-migrate" style={css({ "--x1": `${c.w[0]}px`, "--y1": `${c.w[1]}px`, "--x2": `${c.w[2]}px`, "--y2": `${c.w[3]}px`, "--x3": `${c.w[4]}px`, "--y3": `${c.w[5]}px`, animationDuration: `${c.t}s`, animationDelay: `${c.o}s` })}>
          <ellipse className="lp-pseudo" cx={c.x + 8} cy={c.y - 1} rx="3.6" ry="2.1" fill={c.c} fillOpacity=".45" />
          <ellipse cx={c.x} cy={c.y} rx="7.5" ry="5.6" fill={c.c} fillOpacity=".5" stroke={c.c} strokeOpacity=".95" strokeWidth=".8" />
          <circle cx={c.x - 1} cy={c.y} r="2.1" fill="#0b0616" fillOpacity=".55" />
        </g>
      ))}
    </svg>
  )
}

/* ── 2 · Bioimpressora depositando um scaffold 0°/90° (vista frontal) ──── */
export function PrinterScene({ className = "" }: SceneProps) {
  return (
    <svg viewBox="0 0 240 200" className={`lp-scene ${className}`} fill="none" aria-hidden="true">
      <path d="M30 178V34H210V178" stroke={L} strokeOpacity=".4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="48" y="170" width="144" height="7" rx="3.5" fill={V} fillOpacity=".2" stroke={V} strokeOpacity=".5" />
      {[1, 3, 5].map((n) => <path key={n} className={`lp-pl lp-pl-${n}`} d={`M70 ${173 - n * 7}H170`} pathLength={1} stroke={V} strokeWidth="5" strokeLinecap="round" />)}
      {[2, 4].map((n) => [0, 1, 2, 3, 4, 5].map((i) => <circle key={`${n}-${i}`} className={`lp-pd lp-pd-${n}-${i}`} cx={170 - i * 20} cy={173 - n * 7} r="2.6" fill={C} />))}
      <g className="lp-pr-z"><path d="M30 96H210" stroke={L} strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" /></g>
      <g className="lp-pr-head">
        <rect x="56" y="88" width="28" height="16" rx="4" fill="#1a1033" stroke={L} strokeOpacity=".85" />
        <rect x="64" y="104" width="12" height="36" rx="2" fill={C} fillOpacity=".12" stroke={C} strokeOpacity=".8" />
        <rect x="66" y="118" width="8" height="20" rx="1" fill={C} fillOpacity=".5" />
        <path d="M70 104V118" stroke={L} strokeOpacity=".8" strokeWidth="2" />
        <path d="M70 140V161" stroke="#e9e3ff" strokeWidth="1.6" strokeLinecap="round" />
        <circle className="lp-blink" cx="70" cy="162" r="2.6" fill={C} />
      </g>
    </svg>
  )
}

/* ── 3 · Hidrogel em um béquer sobre agitador magnético ─────────────────── */
export function StirrerScene({ className = "" }: SceneProps) {
  const liquid = "M64 98Q88 100 110 112Q132 100 156 98V160Q156 170 146 170H74Q64 170 64 160Z"
  return (
    <svg viewBox="0 0 220 220" className={`lp-scene ${className}`} fill="none" aria-hidden="true">
      <rect x="42" y="178" width="136" height="30" rx="7" fill="#150d2b" stroke={L} strokeOpacity=".5" />
      <path d="M52 178H168" stroke={L} strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
      <circle cx="152" cy="193" r="6" stroke={L} strokeOpacity=".7" />
      <path d="M152 193l3.5-4" stroke={L} strokeOpacity=".8" strokeLinecap="round" />
      <path d="M78 193h42" stroke={L} strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" />
      <circle className="lp-blink" cx="62" cy="193" r="2.2" fill={E} />
      <path d={liquid} fill={C} fillOpacity=".16" />
      <path className="lp-tint" d={liquid} fill={V} fillOpacity=".24" />
      <path className="lp-sway" d="M103 109Q108 136 110 152Q112 136 117 109Z" fill="#fff" fillOpacity=".1" />
      <path d="M64 98Q88 100 110 112Q132 100 156 98" stroke={C} strokeOpacity=".85" strokeWidth="1.4" strokeLinecap="round" />
      <g transform="translate(110 122) scale(1 .28)">
        <g className="lp-spin" style={css({ animationDuration: "2.6s" })}>
          <circle r="28" /><circle cx="26" cy="0" r="2.4" fill={C} /><circle cx="-12" cy="-23" r="2" fill="#fff" fillOpacity=".7" />
        </g>
      </g>
      <g transform="translate(110 140) scale(1 .3)">
        <g className="lp-spin" style={css({ animationDuration: "3.4s" })}>
          <circle r="36" /><circle cx="32" cy="0" r="2.8" fill={F} /><circle cx="-22" cy="24" r="2.3" fill={C} /><circle cx="-8" cy="-33" r="2" fill="#fff" fillOpacity=".7" />
        </g>
      </g>
      <g transform="translate(110 163) scale(1 .34)">
        <rect className="lp-spin" style={css({ animationDuration: ".7s" })} x="-17" y="-4.5" width="34" height="9" rx="4.5" fill="#f5f3ff" fillOpacity=".92" />
      </g>
      {[[86, 3.6, 0], [128, 4.4, -1.3], [141, 3.9, -2.4], [97, 4.8, -3.1]].map(([x, d, o]) => (
        <circle key={x} className="lp-rise" cx={x} cy="160" r="1.8" stroke="#fff" strokeOpacity=".7" strokeWidth=".8" style={css({ animationDuration: `${d}s`, animationDelay: `${o}s`, "--rise": "-50px" })} />
      ))}
      <path d="M56 52Q62 55 62 62V160Q62 172 74 172H146Q158 172 158 160V62Q158 55 165 51" stroke={L} strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 84h6M150 104h6M150 124h6M150 144h6" stroke={L} strokeOpacity=".45" strokeLinecap="round" />
      <path d="M68 70V150" stroke="#fff" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" />
      <path d="M136 8L124 50" stroke={L} strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" />
      <path d="M124 50L121 62" stroke={L} strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
      {[0, -1.3].map((o) => <circle key={o} className="lp-drop" cx="120.5" cy="66" r="2.4" fill={F} style={css({ animationDelay: `${o}s`, "--fall": "38px" })} />)}
    </svg>
  )
}

/* ── Moldura de janela usada nas duas ilustrações de ferramenta ─────────── */
function Chrome({ title, tag }: { title: string; tag: string }) {
  return (
    <>
      <rect x="1" y="1" width="518" height="328" rx="14" fill="#0d0820" stroke={L} strokeOpacity=".22" />
      <path d="M1 37H519M1 292H519" stroke={L} strokeOpacity=".13" />
      <circle cx="21" cy="19" r="4" fill="#f87171" fillOpacity=".75" /><circle cx="35" cy="19" r="4" fill={A} fillOpacity=".75" /><circle cx="49" cy="19" r="4" fill={E} fillOpacity=".75" />
      <text x="68" y="23" fill={TXT} fontSize="11.5" fontWeight="600">{title}</text>
      <text x="503" y="23" textAnchor="end" fill={L} fillOpacity=".65" fontSize="9.5">{tag}</text>
    </>
  )
}

/* ── 4 · BIA Print: trajetória de um scaffold 0°/90° sendo fatiada ──────── */
const SERP_H = "M272 98" + Array.from({ length: 12 }, (_, i) => `H${i % 2 === 0 ? 404 : 272}` + (i < 11 ? `V${98 + (i + 1) * 12}` : "")).join("")
const SERP_V = "M272 230" + Array.from({ length: 12 }, (_, i) => `V${i % 2 === 0 ? 98 : 230}` + (i < 11 ? `H${272 + (i + 1) * 12}` : "")).join("")
const PRINT_PARAMS: Array<[string, string, number]> = [["Camada", "0,25 mm", 0.36], ["Velocidade", "8 mm/s", 0.5], ["Fluxo", "120 %", 0.62], ["Agulha", "22G · 0,41 mm", 0.44]]

export function PrintTake({ className = "" }: SceneProps) {
  return (
    <svg viewBox="0 0 520 330" className={`lp-scene ${className}`} fill="none" role="img"
      aria-label="Ilustração do BIA Print: a trajetória de um scaffold em grade é traçada camada por camada, com os parâmetros de impressão ao lado">
      <Chrome title="BIA Print · BioSlicer" tag="Caminho avançado · Fase 3" />
      <path d="M156 37V292" stroke={L} strokeOpacity=".13" />
      {PRINT_PARAMS.map(([k, v, f], i) => {
        const y = 62 + i * 44
        return (
          <g key={k}>
            <text x="16" y={y} fill={MUTED} fontSize="9.5">{k}</text>
            <text x="140" y={y} textAnchor="end" fill={TXT} fontSize="10.5" fontWeight="600">{v}</text>
            <rect x="16" y={y + 9} width="124" height="4" rx="2" fill="#fff" fillOpacity=".07" />
            <rect x="16" y={y + 9} width={r1(124 * f)} height="4" rx="2" fill={V} fillOpacity=".8" />
            <circle cx={r1(16 + 124 * f)} cy={y + 11} r="4.5" fill={TXT} />
          </g>
        )
      })}
      <text x="16" y="240" fill={MUTED} fontSize="9.5">Preenchimento</text>
      <rect x="16" y="249" width="56" height="20" rx="10" fill={V} fillOpacity=".22" stroke={V} strokeOpacity=".8" />
      <text x="44" y="262.5" textAnchor="middle" fill={TXT} fontSize="9.5" fontWeight="600">0° / 90°</text>
      <rect x="80" y="249" width="60" height="20" rx="10" stroke={L} strokeOpacity=".3" />
      <text x="110" y="262.5" textAnchor="middle" fill={MUTED} fontSize="9.5">Giroide</text>
      <circle cx="338" cy="164" r="112" stroke={L} strokeOpacity=".22" />
      <circle cx="338" cy="164" r="104" stroke={L} strokeOpacity=".09" />
      <rect x="262" y="88" width="152" height="152" rx="4" stroke={L} strokeOpacity=".16" strokeDasharray="3 5" />
      <path className="lp-pt-l1" d={SERP_H} pathLength={1} stroke={V} strokeOpacity=".9" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
      <path className="lp-pt-l2" d={SERP_V} pathLength={1} stroke={C} strokeOpacity=".8" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
      <g className="lp-pt-nozzle">
        <circle cx="272" cy="98" r="6" stroke="#fff" strokeOpacity=".9" strokeWidth="1.4" />
        <circle cx="272" cy="98" r="2.2" fill="#fff" />
      </g>
      <text x="16" y="315" fill={MUTED} fontSize="10">Camada</text>
      <text className="lp-pt-c1" x="62" y="315" fill={TXT} fontSize="10.5" fontWeight="600">1 / 2</text>
      <text className="lp-pt-c2" x="62" y="315" fill={TXT} fontSize="10.5" fontWeight="600">2 / 2</text>
      <rect x="104" y="308" width="240" height="5" rx="2.5" fill="#fff" fillOpacity=".07" />
      <rect className="lp-pt-prog" x="104" y="308" width="240" height="5" rx="2.5" fill={E} fillOpacity=".85" />
      <text x="503" y="315" textAnchor="end" fill={E} fillOpacity=".85" fontSize="9.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" data-no-translate="">G1 X40.4 Y23.0 E0.0412</text>
    </svg>
  )
}

/* ── 5 · BIA Materials: composição da biotinta e curva de reologia ──────── */
const MAT_ROWS: Array<[string, string, number, string]> = [["Alginato", "3,0 % m/v", 0.42, V], ["Gelatina", "7,0 % m/v", 0.78, C], ["CaCl₂ · reticulação", "100 mM", 0.55, E]]

export function MaterialsTake({ className = "" }: SceneProps) {
  return (
    <svg viewBox="0 0 520 330" className={`lp-scene ${className}`} fill="none" role="img"
      aria-label="Ilustração do BIA Materials: composição de uma biotinta de alginato e gelatina e a curva de viscosidade caindo com a taxa de cisalhamento">
      <Chrome title="BIA Materials · Formulador" tag="Biotinta · reologia em tempo real" />
      <path d="M246 37V292" stroke={L} strokeOpacity=".13" />
      <rect x="16" y="50" width="66" height="20" rx="10" fill={V} fillOpacity=".22" stroke={V} strokeOpacity=".8" />
      <text x="49" y="63.5" textAnchor="middle" fill={TXT} fontSize="9.5" fontWeight="600">Validadas</text>
      <rect x="90" y="50" width="46" height="20" rx="10" stroke={L} strokeOpacity=".3" />
      <text x="113" y="63.5" textAnchor="middle" fill={MUTED} fontSize="9.5">Livre</text>
      <rect x="144" y="50" width="58" height="20" rx="10" stroke={L} strokeOpacity=".3" />
      <text x="173" y="63.5" textAnchor="middle" fill={MUTED} fontSize="9.5">Pro · IA</text>
      {MAT_ROWS.map(([k, v, f, color], i) => {
        const y = 102 + i * 42
        return (
          <g key={k}>
            <text x="16" y={y} fill={MUTED} fontSize="9.5">{k}</text>
            <text x="230" y={y} textAnchor="end" fill={TXT} fontSize="10.5" fontWeight="600">{v}</text>
            <rect x="16" y={y + 9} width="214" height="6" rx="3" fill="#fff" fillOpacity=".07" />
            <rect className="lp-bar" x="16" y={y + 9} width={r1(214 * f)} height="6" rx="3" fill={color} fillOpacity=".85" style={css({ animationDelay: `${r1(i * 0.4)}s` })} />
          </g>
        )
      })}
      <text x="16" y="238" fill={MUTED} fontSize="9.5">Janela de biofabricação</text>
      <text x="230" y="238" textAnchor="end" fill={E} fontSize="9.5" fontWeight="600">dentro</text>
      <rect x="16" y="248" width="214" height="6" rx="3" fill="#fff" fillOpacity=".07" />
      <rect x="96" y="248" width="86" height="6" rx="3" fill={E} fillOpacity=".3" />
      <circle className="lp-wob" cx="136" cy="251" r="5" fill={TXT} />
      <text x="262" y="62" fill={MUTED} fontSize="9.5">Viscosidade × taxa de cisalhamento (log–log)</text>
      <path d="M338.5 80V250M391 80V250M443.5 80V250M286 122.5H496M286 165H496M286 207.5H496" stroke="#fff" strokeOpacity=".06" />
      <rect className="lp-band" x="404" y="84" width="62" height="166" fill={E} fillOpacity=".09" />
      <text x="435" y="97" textAnchor="middle" fill={E} fillOpacity=".9" fontSize="9">na agulha</text>
      <path d="M286 80V250H496" stroke={L} strokeOpacity=".45" strokeLinecap="round" strokeLinejoin="round" />
      <text x="272" y="90" fill={MUTED} fontSize="10">η</text>
      <text x="496" y="266" textAnchor="end" fill={MUTED} fontSize="9">taxa de cisalhamento →</text>
      <path className="lp-draw" d="M298 100L484 232" pathLength={1} stroke={V} strokeWidth="2.6" strokeLinecap="round" />
      <circle className="lp-slide" cx="298" cy="100" r="4.5" fill="#fff" style={css({ "--tx": "186px", "--ty": "132px" })} />
      <text x="300" y="232" fill={L} fillOpacity=".8" fontSize="9">pseudoplástico · n &lt; 1</text>
      <circle className="lp-blink" cx="20" cy="311.5" r="3" fill={E} />
      <text x="30" y="315" fill={MUTED} fontSize="10">Reologia recalculada a cada ajuste</text>
      <text x="503" y="315" textAnchor="end" fill={L} fillOpacity=".75" fontSize="9.5">18 formulações validadas</text>
    </svg>
  )
}

/* ── 6 · Esquema da BIA OS: núcleo + oito ambientes ─────────────────────── */
const NODES: Array<[string, string]> = [["Materials", "#5eead4"], ["Design", C], ["Print", V], ["Biology", A], ["Lab", "#fda4af"], ["Regulatory", E], ["Academy", F], ["Copilot", "#a5b4fc"]]

export function BiaOsDiagram({ className = "" }: SceneProps) {
  return (
    <svg viewBox="0 30 360 320" className={`lp-scene ${className}`} fill="none" role="img" data-no-translate=""
      aria-label="Esquema da BIA OS: um núcleo central ligado a oito ambientes — Materials, Design, Print, Biology, Lab, Regulatory, Academy e Copilot">
      <circle className="lp-flow" cx="180" cy="190" r="132" stroke={L} strokeOpacity=".28" strokeWidth="1.2" style={css({ animationDuration: "5s" })} />
      {NODES.map(([name, color], k) => {
        const a = ((-90 + k * 45) * Math.PI) / 180
        const p = (rad: number) => `${r1(180 + rad * Math.cos(a))} ${r1(190 + rad * Math.sin(a))}`
        const x = r1(180 + 132 * Math.cos(a)), y = r1(190 + 132 * Math.sin(a))
        return (
          <g key={name}>
            <path className="lp-flow" d={`M${p(48)}L${p(112)}`} stroke={color} strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" style={css({ animationDelay: `${r1(-k * 0.2)}s` })} />
            <rect x={r1(x - 39)} y={r1(y - 14)} width="78" height="28" rx="14" fill="#140c2a" stroke={color} strokeOpacity=".55" />
            <rect className="lp-node" x={r1(x - 39)} y={r1(y - 14)} width="78" height="28" rx="14" fill={color} fillOpacity=".16" stroke={color} strokeWidth="1.6" style={css({ animationDelay: `${r1(k * 0.6 - 4.8)}s` })} />
            <text x={x} y={r1(y + 3.8)} textAnchor="middle" fill="#f5f3ff" fontSize="10.5" fontWeight="600">{name}</text>
          </g>
        )
      })}
      <circle className="lp-halo" cx="180" cy="190" r="46" stroke={V} strokeWidth="1.5" />
      <circle cx="180" cy="190" r="44" fill="#2d0a6e" stroke={L} strokeOpacity=".7" strokeWidth="1.5" />
      <text x="180" y="188" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="700">BIA <tspan fill={L}>OS</tspan></text>
      <text x="180" y="203" textAnchor="middle" fill={L} fillOpacity=".8" fontSize="6.6" letterSpacing=".5">BIOFABRICATION OS</text>
    </svg>
  )
}

/* ── 7 · Formação de um esferoide em micropoço não aderente (4 estágios) ── */
const spiral = (i: number, s: number) => {
  const rad = s * Math.sqrt(i + 0.5), t = i * 2.39996
  return [r1(rad * Math.cos(t)), r1(rad * Math.sin(t))] as const
}

export function SpheroidStage({ stage, className = "" }: SceneProps & { stage: 1 | 2 | 3 | 4 }) {
  const cell = (key: number, x: number, y: number, extra: { className?: string; style?: CSSProperties } = {}) => (
    <circle key={key} cx={x} cy={y} r="3.4" fill={E} fillOpacity=".5" stroke={E} strokeOpacity=".95" strokeWidth=".7" {...extra} />
  )
  return (
    <svg viewBox="0 0 140 124" className={`lp-scene ${className}`} fill="none" aria-hidden="true">
      <path d="M22 30V78Q22 114 70 114Q118 114 118 78V30Z" fill={C} fillOpacity=".06" />
      <path d="M8 30H22V78Q22 114 70 114Q118 114 118 78V30H132" stroke={L} strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {stage === 1 && Array.from({ length: 16 }, (_, i) => {
        const [dx, dy] = spiral(i, 8.4), x = r1(70 + dx * 1.15), y = r1(58 + dy * 0.62)
        return cell(i, x, y, { className: "lp-fall", style: css({ "--fx": `${r1((70 - x) * 0.2)}px`, "--fy": `${r1(104 - Math.abs(x - 70) * 0.38 - y)}px`, animationDuration: `${r1(5 + (i % 4) * 0.8)}s`, animationDelay: `${r1(-((i * 1.37) % 6))}s` }) })
      })}
      {stage === 2 && Array.from({ length: 16 }, (_, i) => {
        const [dx, dy] = spiral(i, 6.6)
        return cell(i, r1(70 + dx), r1(92 + dy * 0.55), { className: "lp-gather", style: css({ "--dx": `${r1(dx * 0.6)}px`, "--dy": `${r1(dy * 0.33 - 14)}px` }) })
      })}
      {stage === 3 && (
        <>
          <circle className="lp-breathe" cx="70" cy="82" r="29" stroke={E} strokeOpacity=".4" strokeDasharray="2 4" />
          <g className="lp-compact">{Array.from({ length: 18 }, (_, i) => { const [dx, dy] = spiral(i, 5.4); return cell(i, r1(70 + dx), r1(82 + dy)) })}</g>
        </>
      )}
      {stage === 4 && (
        <g className="lp-breathe">
          <circle cx="70" cy="80" r="30" fill={E} fillOpacity=".2" stroke={E} strokeOpacity=".9" strokeWidth="1.4" />
          <circle cx="70" cy="80" r="20" fill={A} fillOpacity=".2" />
          <circle cx="70" cy="80" r="10" fill={F} fillOpacity=".32" />
          <g className="lp-spin" style={css({ animationDuration: "48s" })}>
            <circle cx="70" cy="80" r="34" />
            {Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8; return <circle key={i} cx={r1(70 + 30 * Math.cos(a))} cy={r1(80 + 30 * Math.sin(a))} r="3.2" fill={E} fillOpacity=".55" stroke={E} strokeOpacity=".95" strokeWidth=".7" /> })}
          </g>
        </g>
      )}
    </svg>
  )
}
