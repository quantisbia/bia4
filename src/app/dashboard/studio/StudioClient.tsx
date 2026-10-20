/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.4 · StudioClient — UI com separação Forma / Infill
 *  ─────────────────────────────────────────────────────────────────────
 *  CORREÇÃO CONCEITUAL (Janaina, 2026-10-19):
 *   STL = sólido anatômico (bloco, menisco, calota, orelha, etc.).
 *   Padrão de preenchimento (gyroid/schwarz-p/diamond) é METADADO que
 *   a BIA passa adiante pro slicer na geração do G-code.
 *
 *  Layout em 3 abas horizontais:
 *   1️⃣ FORMA: escolha visual entre 8 primitivas anatômicas + voz/texto
 *   2️⃣ DIMENSÕES: sliders X/Y/Z com typicalDims pré-carregadas
 *   3️⃣ INFILL: visualização educacional do padrão (NÃO afeta o STL)
 *
 *  Preview 3D corrigido:
 *   - Dimensões fallback (400×400) quando CSS ainda não aplicou
 *   - Retry espera THREE carregar antes de render
 *   - Hint visual se Three.js não disponível
 *   - useLayoutEffect pra garantir medir ANTES do paint
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
"use client"

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import Script from "next/script"
import {
  Mic, MicOff, Loader2, Download, Sparkles, Volume2,
  Box, Zap, FlaskConical, AlertCircle, CheckCircle2, Info,
  RotateCcw, Eye, ChevronRight, ChevronLeft, Settings, Shapes,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

/* ──────────────────────────────────────────────────────────────────────
 * Tipos locais (mirror do backend)
 * ──────────────────────────────────────────────────────────────────── */
type TPMSKind = "gyroid" | "schwarz_p" | "diamond"
type AnatomyKind =
  | "block" | "cylinder" | "crescent" | "cranial_cap"
  | "mandible_seg" | "femur_seg" | "ear_auricle" | "disc"

interface AnatomyParams {
  kind: AnatomyKind
  sizeX: number
  sizeY: number
  sizeZ: number
}

interface InfillMeta {
  pattern: TPMSKind
  porosity: number
  cellsPerAxis: number
}

interface GenerationStats {
  triangles: number
  vertices: number
  volumeMm3: number
  genMs: number
  costCredits: number
  anatomy: string
  anatomyLabel: string
  size: string
  infillPattern?: TPMSKind
  infillPorosity?: number
  infillCells?: number
  parseConfidence?: number
  parsePreset?: string | null
  warnings?: string[]
}

/* ──────────────────────────────────────────────────────────────────────
 * Catálogo de formas anatômicas (mirror do backend anatomy.ts)
 * ──────────────────────────────────────────────────────────────────── */
const ANATOMY_OPTIONS: Array<{
  kind: AnatomyKind
  emoji: string
  label: string
  short: string
  description: string
  typicalDims: { x: number; y: number; z: number }
  examples: string[]
}> = [
  {
    kind: "block", emoji: "🧊", label: "Bloco retangular", short: "Bloco",
    description: "Formato sólido retangular para testes mecânicos e scaffolds genéricos.",
    typicalDims: { x: 20, y: 20, z: 10 },
    examples: ["Teste in vitro", "Scaffold genérico"],
  },
  {
    kind: "cylinder", emoji: "🥫", label: "Cilindro", short: "Cilindro",
    description: "Cilindro sólido vertical — bone plug e teste ISO 604.",
    typicalDims: { x: 10, y: 10, z: 20 },
    examples: ["Bone plug", "Compressão ISO 604"],
  },
  {
    kind: "crescent", emoji: "🌙", label: "Meia-lua (menisco)", short: "Menisco",
    description: "Geometria semi-lunar do menisco medial/lateral do joelho.",
    typicalDims: { x: 40, y: 20, z: 6 },
    examples: ["Menisco medial", "Menisco lateral"],
  },
  {
    kind: "cranial_cap", emoji: "🧠", label: "Calota craniana", short: "Calota",
    description: "Segmento esférico com curvatura craniana realista.",
    typicalDims: { x: 60, y: 50, z: 4 },
    examples: ["Craniotomia", "CBMF"],
  },
  {
    kind: "mandible_seg", emoji: "🦷", label: "Mandíbula", short: "Mandíbula",
    description: "Arco mandibular segmentado — reconstrução pós-ressecção.",
    typicalDims: { x: 40, y: 12, z: 15 },
    examples: ["Mandibulotomia", "Enxerto alveolar"],
  },
  {
    kind: "femur_seg", emoji: "🦴", label: "Fêmur / Osso Longo", short: "Fêmur",
    description: "Segmento diafisário com cortical + canal medular.",
    typicalDims: { x: 25, y: 25, z: 40 },
    examples: ["Fêmur", "Tíbia", "Úmero"],
  },
  {
    kind: "ear_auricle", emoji: "👂", label: "Orelha (cartilagem)", short: "Orelha",
    description: "Pavilhão auricular paramétrico — microtia, reconstrução.",
    typicalDims: { x: 55, y: 35, z: 8 },
    examples: ["Microtia", "Trauma auricular"],
  },
  {
    kind: "disc", emoji: "⚪", label: "Disco intervertebral", short: "Disco",
    description: "Toróide achatado — disco intervertebral, menisco pequeno.",
    typicalDims: { x: 35, y: 25, z: 8 },
    examples: ["Hérnia de disco", "Fusão lombar"],
  },
]

const INFILL_PATTERNS: Array<{ kind: TPMSKind; emoji: string; label: string; hint: string }> = [
  { kind: "gyroid",    emoji: "🌀", label: "Gyroid",    hint: "Melhor para vascularização" },
  { kind: "schwarz_p", emoji: "🔳", label: "Schwarz-P", hint: "Maior porosidade (pele)" },
  { kind: "diamond",   emoji: "💎", label: "Diamond",   hint: "Maior resistência (osso cortical)" },
]

/* ══════════════════════════════════════════════════════════════════════
 *  Componente principal
 * ══════════════════════════════════════════════════════════════════════ */

export function StudioClient({ userName }: { userName: string }) {
  // ── Etapa atual (0 = Forma, 1 = Dimensões, 2 = Infill, 3 = Resultado) ──
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  // ── Estado do fluxo ──
  const [prompt, setPrompt] = useState("")
  const [anatomy, setAnatomy] = useState<AnatomyParams>({
    kind: "block",
    sizeX: 20, sizeY: 20, sizeZ: 10,
  })
  const [infill, setInfill] = useState<InfillMeta>({
    pattern: "gyroid",
    porosity: 0.70,
    cellsPerAxis: 4,
  })

  // ── Voz ──
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState<boolean | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const recognitionRef = useRef<unknown>(null)

  // ── Geração ──
  const [generating, setGenerating] = useState(false)
  const [stlBlob, setStlBlob] = useState<Blob | null>(null)
  const [stats, setStats] = useState<GenerationStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  // ── Preview 3D ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [threeReady, setThreeReady] = useState(false)
  const [threeError, setThreeError] = useState<string | null>(null)

  /* ─────────── Web Speech API (pt-BR) ─────────── */
  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown
      webkitSpeechRecognition?: new () => unknown
    }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) {
      setMicSupported(false)
      return
    }
    setMicSupported(true)
    const rec = new (SR as new () => {
      lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
      onresult: ((e: unknown) => void) | null
      onerror: ((e: unknown) => void) | null
      onend: (() => void) | null
      start: () => void; stop: () => void
    })()
    rec.lang = "pt-BR"
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }
      let t = ""; let isFinal = false
      for (let i = 0; i < ev.results.length; i++) {
        t += ev.results[i][0].transcript
        if (ev.results[i].isFinal) isFinal = true
      }
      setPrompt(t)
      if (isFinal) setIsListening(false)
    }
    rec.onerror = (e: unknown) => {
      const err = (e as { error: string }).error
      setIsListening(false)
      if (err === "no-speech") setMicError("Não escutei nada — tente de novo mais perto do microfone.")
      else if (err === "not-allowed") setMicError("Permissão de microfone negada.")
      else setMicError(`Erro: ${err}`)
    }
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
  }, [])

  function toggleMic() {
    setMicError(null)
    const rec = recognitionRef.current as { start: () => void; stop: () => void } | null
    if (!rec) return
    if (isListening) { rec.stop(); setIsListening(false) }
    else {
      try { rec.start(); setIsListening(true) }
      catch (err) {
        setMicError(err instanceof Error ? err.message : "Falha ao iniciar.")
        setIsListening(false)
      }
    }
  }

  /* ─────────── Three.js: aguarda carregar + reporta erro se falhar ─────────── */
  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as unknown as { THREE?: unknown }

    // Checa a cada 300ms se THREE carregou (até 10s)
    let attempts = 0
    const maxAttempts = 34  // 10.2s
    const interval = setInterval(() => {
      attempts++
      if (w.THREE) {
        setThreeReady(true)
        clearInterval(interval)
      } else if (attempts >= maxAttempts) {
        setThreeError("Preview 3D indisponível — Three.js não carregou. Verifique sua conexão ou use outro navegador.")
        clearInterval(interval)
      }
    }, 300)

    return () => clearInterval(interval)
  }, [])

  /* ─────────── Aplicar dimensões típicas ao escolher forma ─────────── */
  function selectAnatomy(kind: AnatomyKind) {
    const opt = ANATOMY_OPTIONS.find(o => o.kind === kind)!
    setAnatomy({
      kind,
      sizeX: opt.typicalDims.x,
      sizeY: opt.typicalDims.y,
      sizeZ: opt.typicalDims.z,
    })
  }

  /* ─────────── Modo prompt: envia prompt direto pro backend ─────────── */
  async function generateFromPrompt() {
    if (!prompt.trim()) { setError("Diga ou escreva o que você quer gerar."); return }
    await doGenerate({ prompt, filename: `bia-studio-${Date.now()}` })
  }

  /* ─────────── Modo guiado: envia anatomy + infill ─────────── */
  async function generateFromGuided() {
    await doGenerate({ anatomy, infill, filename: `bia-${anatomy.kind}-${Date.now()}` })
  }

  async function doGenerate(body: {
    prompt?: string
    anatomy?: AnatomyParams
    infill?: InfillMeta
    filename: string
  }) {
    setGenerating(true)
    setError(null)
    setQuotaExhausted(false)
    setStlBlob(null)
    setStats(null)
    try {
      const res = await fetch("/api/studio/scaffold/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        if (res.status === 402) {
          setQuotaExhausted(true)
          setError(data.message ?? "Quota do plano FREE atingida.")
        } else {
          setError(data.message ?? `Erro ${res.status}`)
        }
        return
      }
      const blob = await res.blob()
      setStlBlob(blob)
      const h = res.headers
      const warnings = h.get("x-bia-warnings")
      const parsed: GenerationStats = {
        triangles: Number(h.get("x-bia-triangles") ?? 0),
        vertices: Number(h.get("x-bia-vertices") ?? 0),
        volumeMm3: Number(h.get("x-bia-volume-mm3") ?? 0),
        genMs: Number(h.get("x-bia-gen-ms") ?? 0),
        costCredits: Number(h.get("x-bia-cost-credits") ?? 0),
        anatomy: h.get("x-bia-anatomy") ?? "block",
        anatomyLabel: h.get("x-bia-anatomy-label") ?? "Bloco",
        size: h.get("x-bia-size") ?? "",
        infillPattern: (h.get("x-bia-infill-pattern") as TPMSKind | null) ?? undefined,
        infillPorosity: h.get("x-bia-infill-porosity") ? Number(h.get("x-bia-infill-porosity")) : undefined,
        infillCells: h.get("x-bia-infill-cells") ? Number(h.get("x-bia-infill-cells")) : undefined,
        parseConfidence: h.get("x-bia-parse-confidence") ? Number(h.get("x-bia-parse-confidence")) : undefined,
        parsePreset: h.get("x-bia-parse-preset") || null,
        warnings: warnings ? decodeURIComponent(warnings).split(" | ") : undefined,
      }
      setStats(parsed)
      setStep(3)
      renderSTLInViewer(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.")
    } finally {
      setGenerating(false)
    }
  }

  /* ─────────── Preview 3D (retry robusto) ─────────── */
  const renderSTLInViewer = useCallback((blob: Blob) => {
    const w = window as unknown as {
      __biaStudioInitViewer?: (canvas: HTMLCanvasElement, stlBuf: ArrayBuffer) => void
      THREE?: unknown
    }
    if (!canvasRef.current) {
      setTimeout(() => renderSTLInViewer(blob), 300)
      return
    }
    if (!w.THREE || !w.__biaStudioInitViewer) {
      setTimeout(() => renderSTLInViewer(blob), 300)
      return
    }
    blob.arrayBuffer().then(buf => {
      try {
        w.__biaStudioInitViewer!(canvasRef.current!, buf)
      } catch (err) {
        console.error("[BIA Studio] viewer failed:", err)
        setThreeError("Erro ao renderizar: " + (err instanceof Error ? err.message : "desconhecido"))
      }
    })
  }, [])

  // Mede o canvas ANTES do paint pra garantir dimensões não-zero
  useLayoutEffect(() => {
    if (!canvasRef.current || step !== 3) return
    const canvas = canvasRef.current
    // Fallback hardcoded se CSS ainda não aplicou
    if (canvas.clientWidth === 0) {
      canvas.style.width = "100%"
      canvas.style.minWidth = "320px"
    }
    if (canvas.clientHeight === 0) {
      canvas.style.height = "400px"
    }
  }, [step, stlBlob])

  /* ─────────── Download ─────────── */
  function download() {
    if (!stlBlob) return
    const url = URL.createObjectURL(stlBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia-${stats?.anatomy ?? "scaffold"}-${Date.now()}.stl`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function reset() {
    setStep(0)
    setPrompt("")
    setStlBlob(null)
    setStats(null)
    setError(null)
    setQuotaExhausted(false)
    setThreeError(null)
    setAnatomy({ kind: "block", sizeX: 20, sizeY: 20, sizeZ: 10 })
    setInfill({ pattern: "gyroid", porosity: 0.70, cellsPerAxis: 4 })
  }

  const selectedAnatomyMeta = ANATOMY_OPTIONS.find(o => o.kind === anatomy.kind)!

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Three.js via CDN */}
      <Script
        src="https://unpkg.com/three@0.160.0/build/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setThreeReady(true)}
      />
      <Script id="bia-studio-viewer" strategy="afterInteractive">{VIEWER_SCRIPT}</Script>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-transparent p-5 sm:p-6">
          <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-fuchsia-300" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  BIA Studio <span className="text-fuchsia-300">· Scaffold Anatômico</span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 ml-12">
                {userName}, escolha a <strong>forma anatômica</strong>, ajuste dimensões e defina o padrão de preenchimento.
                STL = sólido · infill vem no slicer.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-fuchsia-200/80 ml-12 sm:ml-0">
              <FlaskConical className="w-3.5 h-3.5" />
              8 primitivas anatômicas paramétricas
            </div>
          </div>
        </div>

        {/* ── MODO VOZ/PROMPT (atalho rápido) ── */}
        {step < 3 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <label className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                🎤 Atalho — descreva por voz ou texto
              </span>
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  data-testid="studio-mic-button"
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
                    isListening
                      ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
                      : "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/20",
                  )}
                >
                  {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {isListening ? "Escutando..." : "Falar"}
                </button>
              )}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                data-testid="studio-prompt-input"
                placeholder='Ex: "Menisco 40x20x6 mm com gyroid 75% porosidade"'
                rows={2}
                className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/40 focus:ring-1 focus:ring-fuchsia-500/20 resize-none"
              />
              <button
                type="button"
                onClick={generateFromPrompt}
                disabled={generating || !prompt.trim()}
                data-testid="studio-prompt-generate"
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] sm:min-w-[140px]",
                  generating || !prompt.trim()
                    ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                    : "bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-md shadow-fuchsia-900/40",
                )}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? "Gerando..." : "Gerar direto"}
              </button>
            </div>
            {micError && (
              <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{micError}
              </div>
            )}
          </div>
        )}

        {/* ── BARRA DE PROGRESSO DOS 4 PASSOS ── */}
        <div className="flex items-center gap-2">
          {["Forma", "Dimensões", "Infill", "STL + Preview"].map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                data-testid={`studio-step-${i}`}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                  i === step
                    ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-200"
                    : i < step
                      ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-300"
                      : "bg-white/[0.02] border-white/[0.06] text-gray-500",
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  i === step
                    ? "bg-fuchsia-500 text-white"
                    : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-white/[0.08] text-gray-500",
                )}>
                  {i < step ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-xs font-medium truncate">{label}</span>
              </div>
              {i < 3 && <ChevronRight className="w-3 h-3 text-gray-700 shrink-0 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* ───────────────── STEP 0: FORMA ANATÔMICA ───────────────── */}
        {step === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shapes className="w-4 h-4 text-fuchsia-400" />
              <h2 className="text-sm font-semibold text-white">1. Escolha a forma anatômica</h2>
              <span className="text-[10px] text-gray-500">(esta é a geometria sólida que vai no STL)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {ANATOMY_OPTIONS.map(opt => {
                const isActive = anatomy.kind === opt.kind
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => selectAnatomy(opt.kind)}
                    data-testid={`anatomy-option-${opt.kind}`}
                    data-selected={isActive ? "true" : "false"}
                    className={cn(
                      "relative text-left p-3.5 rounded-xl border transition-all active:scale-[0.98]",
                      isActive
                        ? "bg-gradient-to-br from-fuchsia-500/15 to-violet-500/10 border-fuchsia-500/50 shadow-lg shadow-fuchsia-900/20"
                        : "bg-white/[0.02] border-white/[0.08] hover:border-fuchsia-500/25 hover:bg-fuchsia-500/[0.03]",
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="text-3xl mb-1.5">{opt.emoji}</div>
                    <p className="text-sm font-semibold text-white mb-0.5">{opt.short}</p>
                    <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{opt.description}</p>
                    <p className="text-[9px] text-fuchsia-300/70 mt-1.5 font-medium">
                      {opt.typicalDims.x}×{opt.typicalDims.y}×{opt.typicalDims.z} mm
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                data-testid="studio-next-to-dims"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-sm font-semibold shadow-md shadow-fuchsia-900/40 active:scale-[0.98]"
              >
                Próximo: Dimensões <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 1: DIMENSÕES ───────────────── */}
        {step === 1 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-fuchsia-400" />
              <h2 className="text-sm font-semibold text-white">
                2. Ajuste as dimensões — {selectedAnatomyMeta.emoji} {selectedAnatomyMeta.short}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["sizeX", "sizeY", "sizeZ"] as const).map(axis => {
                const label = axis === "sizeX" ? "X — Largura" : axis === "sizeY" ? "Y — Profundidade" : "Z — Altura/Espessura"
                const value = anatomy[axis]
                return (
                  <div key={axis} className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                    <label className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-2">
                      {label}
                      <span className="text-fuchsia-300 font-mono tabular-nums">{value} mm</span>
                    </label>
                    <input
                      type="range"
                      min="1" max="150" step="0.5"
                      value={value}
                      onChange={e => setAnatomy(a => ({ ...a, [axis]: Number(e.target.value) }))}
                      data-testid={`dim-${axis}`}
                      className="w-full accent-fuchsia-500"
                    />
                    <input
                      type="number"
                      min="1" max="500" step="0.5"
                      value={value}
                      onChange={e => setAnatomy(a => ({ ...a, [axis]: Number(e.target.value) || 1 }))}
                      className="mt-1 w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-[11px] text-sky-200 flex items-start gap-2">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <div>
                <strong>Dimensões típicas de {selectedAnatomyMeta.short}:</strong>
                {" "}{selectedAnatomyMeta.typicalDims.x}×{selectedAnatomyMeta.typicalDims.y}×{selectedAnatomyMeta.typicalDims.z} mm.
                Clique nos sliders ou digite valores manualmente.
              </div>
            </div>
            <div className="flex justify-between mt-5 gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                data-testid="studio-next-to-infill"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-sm font-semibold shadow-md shadow-fuchsia-900/40 active:scale-[0.98]"
              >
                Próximo: Infill <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 2: INFILL (METADADO) ───────────────── */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-fuchsia-400" />
              <h2 className="text-sm font-semibold text-white">3. Padrão de preenchimento (infill)</h2>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <div>
                <strong>Importante:</strong> o infill NÃO vai no arquivo STL. O STL é sempre um
                <strong> sólido fechado</strong>. O padrão escolhido aqui é um metadado que a BIA
                passa adiante quando o slicer gerar o G-code — é lá que a porosidade aparece.
              </div>
            </div>
            {/* Pattern */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                Padrão TPMS
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {INFILL_PATTERNS.map(p => {
                  const isActive = infill.pattern === p.kind
                  return (
                    <button
                      key={p.kind}
                      type="button"
                      onClick={() => setInfill(i => ({ ...i, pattern: p.kind }))}
                      data-testid={`infill-pattern-${p.kind}`}
                      className={cn(
                        "p-3 rounded-xl border transition-all active:scale-[0.98] text-left",
                        isActive
                          ? "bg-fuchsia-500/15 border-fuchsia-500/50"
                          : "bg-white/[0.02] border-white/[0.08] hover:border-fuchsia-500/25",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{p.emoji}</span>
                        <strong className="text-sm text-white">{p.label}</strong>
                      </div>
                      <p className="text-[10px] text-gray-500">{p.hint}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Porosity */}
            <div className="mb-4 p-3 rounded-xl bg-black/20 border border-white/[0.06]">
              <label className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-2">
                Porosidade alvo
                <span className="text-fuchsia-300 font-mono tabular-nums">
                  {(infill.porosity * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="10" max="95" step="1"
                value={infill.porosity * 100}
                onChange={e => setInfill(i => ({ ...i, porosity: Number(e.target.value) / 100 }))}
                data-testid="infill-porosity"
                className="w-full accent-fuchsia-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Típico: ósseo cortical 60-70% · esponjoso 70-80% · cartilagem/pele 80-90%
              </p>
            </div>
            {/* Cells per axis */}
            <div className="mb-4 p-3 rounded-xl bg-black/20 border border-white/[0.06]">
              <label className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-2">
                Células por eixo
                <span className="text-fuchsia-300 font-mono tabular-nums">
                  {infill.cellsPerAxis}
                </span>
              </label>
              <input
                type="range"
                min="2" max="12" step="1"
                value={infill.cellsPerAxis}
                onChange={e => setInfill(i => ({ ...i, cellsPerAxis: Number(e.target.value) }))}
                data-testid="infill-cells"
                className="w-full accent-fuchsia-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Mais células = poros menores = mais detalhe. Padrão: 4-6.
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={generateFromGuided}
                disabled={generating}
                data-testid="studio-generate-guided"
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-[0.98]",
                  generating
                    ? "bg-white/5 border border-white/10 text-gray-500"
                    : "bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-fuchsia-900/40",
                )}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? "Gerando..." : "Gerar STL"}
              </button>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 3: RESULTADO (preview + download) ───────────────── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Preview 3D */}
            <div className="lg:col-span-3 space-y-3">
              <div
                className="rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden relative"
                style={{ minHeight: "400px", height: "clamp(400px, 60vh, 600px)" }}
              >
                <canvas
                  ref={canvasRef}
                  data-testid="studio-preview-canvas"
                  className="w-full h-full block cursor-grab active:cursor-grabbing"
                  style={{ display: "block", width: "100%", height: "100%", minHeight: "400px" }}
                />
                {!stlBlob && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 pointer-events-none">
                    <Box className="w-16 h-16 opacity-30" />
                    <p className="text-sm">Gerando preview...</p>
                  </div>
                )}
                {threeError && (
                  <div className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-red-500/90 text-white text-xs" data-testid="three-error">
                    ⚠️ {threeError}
                  </div>
                )}
                {!threeReady && !threeError && stlBlob && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px]">
                    Carregando Three.js...
                  </div>
                )}
                {stlBlob && threeReady && !threeError && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-gray-300">
                    <Eye className="w-3 h-3" /> Arraste pra girar
                  </div>
                )}
              </div>

              {/* Botões ação */}
              <div className="flex gap-2">
                {stlBlob && (
                  <button
                    type="button"
                    onClick={download}
                    data-testid="studio-download-button"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-md shadow-emerald-900/40 active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Baixar STL ({(stlBlob.size / 1024).toFixed(0)} KB)
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-gray-300 hover:bg-white/[0.08]"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
                  Novo
                </button>
              </div>
            </div>

            {/* Stats + erros */}
            <div className="lg:col-span-2 space-y-3">
              {error && (
                <div
                  data-testid="studio-error"
                  className={cn(
                    "p-3 rounded-xl border text-xs",
                    quotaExhausted
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : "bg-red-500/10 border-red-500/30 text-red-200",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold mb-1">{quotaExhausted ? "Quota atingida" : "Erro"}</p>
                      <p>{error}</p>
                      {quotaExhausted && (
                        <a href="/dashboard/billing" className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px]">
                          Ver planos →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {stats && (
                <div data-testid="studio-stats" className="p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-300 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> STL gerado
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <StatRow label="Forma" value={`${stats.anatomyLabel}`} highlight />
                    <StatRow label="Dimensões" value={`${stats.size} mm`} />
                    <StatRow label="Volume sólido" value={`${stats.volumeMm3.toFixed(0)} mm³`} />
                    <StatRow label="Triângulos" value={stats.triangles.toLocaleString("pt-BR")} />
                    <StatRow label="Vértices" value={stats.vertices.toLocaleString("pt-BR")} />
                    <StatRow label="Tempo" value={`${stats.genMs} ms`} />
                    <StatRow label="Custo" value={`${stats.costCredits} créditos`} />
                  </div>
                  {stats.infillPattern && (
                    <div className="pt-3 border-t border-fuchsia-500/15 space-y-1.5 text-[11px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-1">
                        🧪 Metadata (não está no STL)
                      </div>
                      <StatRow label="Infill" value={stats.infillPattern} highlight />
                      {stats.infillPorosity !== undefined && (
                        <StatRow label="Porosidade" value={`${(stats.infillPorosity * 100).toFixed(0)}%`} />
                      )}
                      {stats.infillCells !== undefined && (
                        <StatRow label="Células/eixo" value={String(stats.infillCells)} />
                      )}
                    </div>
                  )}
                  {stats.warnings && stats.warnings.length > 0 && (
                    <div className="pt-3 border-t border-fuchsia-500/15">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-1">
                        Avisos do parser
                      </div>
                      {stats.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-amber-200/80 leading-relaxed">• {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300 mb-1">
                  <Volume2 className="w-3 h-3" /> Dica
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Agora o STL é um sólido real. Importe no slicer da sua bioimpressora
                  (ou use o fluxo <strong>Bioimpressão</strong> da BIA) para gerar o G-code
                  com o infill escolhido.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={cn("font-mono tabular-nums", highlight ? "text-fuchsia-200 font-bold" : "text-gray-200")}>
        {value}
      </span>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────
 * Three.js viewer script injetado via <Script>
 * Com dimensões fallback + retry se WebGL falhar
 * ──────────────────────────────────────────────────────────────────── */
const VIEWER_SCRIPT = `
(function(){
  window.__biaStudioInitViewer = function(canvas, stlBuf) {
    if (!window.THREE) { console.warn('[BIA Studio] THREE not loaded'); return; }
    const T = window.THREE;

    // Cleanup anterior se já tiver viewer rodando
    if (window.__biaViewer) {
      try { window.__biaViewer.renderer.dispose(); } catch(e){}
      try { window.__biaViewer.scene.clear(); } catch(e){}
      if (window.__biaViewer.raf) cancelAnimationFrame(window.__biaViewer.raf);
      if (window.__biaViewer.ro) window.__biaViewer.ro.disconnect();
    }

    // Dimensões FALLBACK se CSS ainda não aplicou
    let w = canvas.clientWidth || canvas.parentElement?.clientWidth || 500;
    let h = canvas.clientHeight || 400;
    if (w < 50) w = 500;
    if (h < 50) h = 400;

    const scene = new T.Scene();
    scene.background = new T.Color(0x0a0618);
    const camera = new T.PerspectiveCamera(45, w / h, 0.1, 2000);

    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.error('[BIA Studio] WebGL falhou:', e);
      return;
    }

    const ambient = new T.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const key = new T.DirectionalLight(0xffffff, 1.0);
    key.position.set(50, 100, 80);
    scene.add(key);
    const rim = new T.DirectionalLight(0xc084fc, 0.5);
    rim.position.set(-80, -40, -50);
    scene.add(rim);

    // Parse STL binário
    const view = new DataView(stlBuf);
    const triangleCount = view.getUint32(80, true);
    if (triangleCount === 0 || triangleCount > 2_000_000) {
      console.error('[BIA Studio] STL inválido, triangles=', triangleCount);
      return;
    }
    const positions = new Float32Array(triangleCount * 9);
    const normals = new Float32Array(triangleCount * 9);
    let offset = 84;
    for (let t = 0; t < triangleCount; t++) {
      const nx = view.getFloat32(offset, true); offset += 4;
      const ny = view.getFloat32(offset, true); offset += 4;
      const nz = view.getFloat32(offset, true); offset += 4;
      for (let v = 0; v < 3; v++) {
        positions[t * 9 + v * 3    ] = view.getFloat32(offset, true); offset += 4;
        positions[t * 9 + v * 3 + 1] = view.getFloat32(offset, true); offset += 4;
        positions[t * 9 + v * 3 + 2] = view.getFloat32(offset, true); offset += 4;
        normals[t * 9 + v * 3    ] = nx;
        normals[t * 9 + v * 3 + 1] = ny;
        normals[t * 9 + v * 3 + 2] = nz;
      }
      offset += 2;
    }

    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new T.BufferAttribute(normals, 3));
    geom.computeBoundingBox();
    geom.computeBoundingSphere();

    const material = new T.MeshStandardMaterial({
      color: 0xc084fc,
      metalness: 0.2,
      roughness: 0.6,
      side: T.DoubleSide,
      flatShading: false,
    });
    const mesh = new T.Mesh(geom, material);

    // Centraliza o mesh
    const bbox = geom.boundingBox;
    const center = new T.Vector3();
    bbox.getCenter(center);
    mesh.position.sub(center);
    scene.add(mesh);

    // Grid helper
    const sizeMax = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
    const grid = new T.GridHelper(sizeMax * 3, 30, 0x4c1d95, 0x1e1b4b);
    grid.position.y = -(bbox.max.y - bbox.min.y) / 2 - 2;
    scene.add(grid);

    // Câmera isométrica
    const camDist = sizeMax * 2.2;
    camera.position.set(camDist, camDist * 0.7, camDist);
    camera.lookAt(0, 0, 0);

    // Interação drag
    let dragging = false; let prevX = 0; let prevY = 0;
    let rotY = 0; let rotX = 0;
    canvas.addEventListener('mousedown', e => { dragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      rotY += (e.clientX - prevX) * 0.01;
      rotX += (e.clientY - prevY) * 0.01;
      prevX = e.clientX; prevY = e.clientY;
    });
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) { dragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
    });
    canvas.addEventListener('touchend', () => { dragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!dragging || e.touches.length !== 1) return;
      rotY += (e.touches[0].clientX - prevX) * 0.01;
      rotX += (e.touches[0].clientY - prevY) * 0.01;
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });

    // CRITICAL: inicializa __biaViewer ANTES de animate() rodar
    // (caso contrário a primeira frame tenta setar .raf em undefined)
    const resizeObs = new ResizeObserver(() => {
      const nw = canvas.clientWidth || 500;
      const nh = canvas.clientHeight || 400;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    resizeObs.observe(canvas);

    window.__biaViewer = { renderer, scene, camera, mesh, raf: 0, ro: resizeObs };

    // Auto-rotate
    let autoAngle = 0;
    function animate() {
      // Guard: se o viewer foi destruído, para o loop
      if (!window.__biaViewer) return;
      const raf = requestAnimationFrame(animate);
      window.__biaViewer.raf = raf;
      if (!dragging) {
        autoAngle += 0.003;
        mesh.rotation.y = rotY + autoAngle;
      } else {
        mesh.rotation.y = rotY;
      }
      mesh.rotation.x = rotX;
      renderer.render(scene, camera);
    }
    animate();

    console.log('[BIA Studio] viewer OK:', triangleCount, 'tri |', w + 'x' + h);
  };
})();
`
