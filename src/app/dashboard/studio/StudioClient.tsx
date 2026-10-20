/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · StudioClient — UI principal do BIA Studio
 *  ─────────────────────────────────────────────────────────────────────
 *  Interface completa em 3 colunas no desktop, stacked no mobile:
 *    ┌─────────────┬──────────────────────┬──────────────┐
 *    │ 📝 Entrada  │ 👁️ Preview 3D        │ 📊 Params    │
 *    │ (voz + text)│ (Three.js CDN)       │ (sliders)    │
 *    └─────────────┴──────────────────────┴──────────────┘
 *
 *  Three.js é carregado via CDN para não impactar o bundle da BIA.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import {
  Mic, MicOff, Loader2, Download, Sparkles, Volume2,
  Box, Zap, FlaskConical, AlertCircle, CheckCircle2, Info,
  RotateCcw, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

/* ──────────────────────────────────────────────────────────────────────
 * Tipos locais (mirror do backend sem importar o server-only)
 * ──────────────────────────────────────────────────────────────────── */
type TPMSKind = "gyroid" | "schwarz_p" | "diamond"

interface TPMSParams {
  kind: TPMSKind
  sizeX: number
  sizeY: number
  sizeZ: number
  resolution: number
  cellsPerAxis: number
  wallThickness: number
}

interface GenerationStats {
  triangles: number
  vertices: number
  porosity: number
  volumeMm3: number
  genMs: number
  costCredits: number
  parseConfidence?: number
  parsePreset?: string | null
}

/* ──────────────────────────────────────────────────────────────────────
 * Presets de prompt pt-BR
 * ──────────────────────────────────────────────────────────────────── */
const PROMPT_PRESETS = [
  {
    emoji: "🦴",
    label: "Osso esponjoso",
    hint: "Fêmur, tíbia, vértebra",
    text: "Scaffold ósseo esponjoso gyroid 20x20x10 mm com 75% porosidade",
  },
  {
    emoji: "🦴",
    label: "Osso cortical",
    hint: "Calota craniana, mandíbula",
    text: "Scaffold ósseo cortical diamond 30x20x4 mm com 60% porosidade",
  },
  {
    emoji: "🦵",
    label: "Cartilagem",
    hint: "Articular, menisco",
    text: "Scaffold de cartilagem gyroid 15x15x3 mm com 80% porosidade",
  },
  {
    emoji: "🩹",
    label: "Pele",
    hint: "Queimadura, cicatriz",
    text: "Scaffold de pele schwarz-p 25x25x2 mm com 85% porosidade",
  },
  {
    emoji: "🦷",
    label: "Enxerto alveolar",
    hint: "Odontologia",
    text: "Enxerto alveolar diamond 10x8x5 mm com 65% porosidade",
  },
  {
    emoji: "🧪",
    label: "Teste in vitro",
    hint: "Multi-poço, drug screening",
    text: "Scaffold gyroid 8x8x3 mm com 70% porosidade para teste in vitro",
  },
]

/* ══════════════════════════════════════════════════════════════════════
 *  Componente principal
 * ══════════════════════════════════════════════════════════════════════ */

export function StudioClient({ userName }: { userName: string }) {
  const [prompt, setPrompt] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState<boolean | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [stlBlob, setStlBlob] = useState<Blob | null>(null)
  const [stats, setStats] = useState<GenerationStats | null>(null)
  const [params, setParams] = useState<TPMSParams | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  const recognitionRef = useRef<unknown>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const threeInitRef = useRef(false)

  /* ─────────── Web Speech API (pt-BR) ─────────── */
  useEffect(() => {
    if (typeof window === "undefined") return
    const SR = (window as unknown as {
      SpeechRecognition?: new () => unknown
      webkitSpeechRecognition?: new () => unknown
    }).SpeechRecognition ?? (window as unknown as {
      webkitSpeechRecognition?: new () => unknown
    }).webkitSpeechRecognition

    if (!SR) {
      setMicSupported(false)
      return
    }
    setMicSupported(true)

    const rec = new (SR as new () => {
      lang: string
      continuous: boolean
      interimResults: boolean
      maxAlternatives: number
      onresult: ((e: unknown) => void) | null
      onerror: ((e: unknown) => void) | null
      onend: (() => void) | null
      start: () => void
      stop: () => void
    })()
    rec.lang = "pt-BR"
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e: unknown) => {
      const event = e as { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }
      let transcript = ""
      let isFinal = false
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) isFinal = true
      }
      setPrompt(transcript)
      if (isFinal) {
        setIsListening(false)
      }
    }
    rec.onerror = (e: unknown) => {
      const err = (e as { error: string }).error
      setIsListening(false)
      if (err === "no-speech") {
        setMicError("Não escutei nada — tente de novo mais perto do microfone.")
      } else if (err === "not-allowed") {
        setMicError("Permissão de microfone negada. Habilite no navegador.")
      } else {
        setMicError(`Erro no reconhecimento: ${err}`)
      }
    }
    rec.onend = () => setIsListening(false)

    recognitionRef.current = rec
  }, [])

  function toggleMic() {
    setMicError(null)
    const rec = recognitionRef.current as { start: () => void; stop: () => void } | null
    if (!rec) return
    if (isListening) {
      rec.stop()
      setIsListening(false)
    } else {
      try {
        rec.start()
        setIsListening(true)
      } catch (err) {
        setMicError(err instanceof Error ? err.message : "Não consegui iniciar o microfone.")
        setIsListening(false)
      }
    }
  }

  /* ─────────── Geração ─────────── */
  async function generate() {
    if (!prompt.trim()) {
      setError("Diga ou escreva o que você quer gerar.")
      return
    }
    setGenerating(true)
    setError(null)
    setQuotaExhausted(false)
    setStlBlob(null)
    setStats(null)

    try {
      const res = await fetch("/api/studio/scaffold/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, filename: `bia-scaffold-${Date.now()}` }),
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
      const parsedStats: GenerationStats = {
        triangles: Number(h.get("x-bia-triangles") ?? 0),
        vertices: Number(h.get("x-bia-vertices") ?? 0),
        porosity: Number(h.get("x-bia-porosity") ?? 0),
        volumeMm3: Number(h.get("x-bia-volume-mm3") ?? 0),
        genMs: Number(h.get("x-bia-gen-ms") ?? 0),
        costCredits: Number(h.get("x-bia-cost-credits") ?? 0),
        parseConfidence: h.get("x-bia-parse-confidence")
          ? Number(h.get("x-bia-parse-confidence"))
          : undefined,
        parsePreset: h.get("x-bia-parse-preset") || null,
      }
      setStats(parsedStats)

      const sizeStr = h.get("x-bia-size") ?? ""
      const [sx, sy, sz] = sizeStr.split("x").map(Number)
      const kind = (h.get("x-bia-kind") ?? "gyroid") as TPMSKind
      setParams({
        kind,
        sizeX: sx || 20,
        sizeY: sy || 20,
        sizeZ: sz || 10,
        resolution: 48,
        cellsPerAxis: 4,
        wallThickness: 0.3,
      })

      // Renderiza no preview 3D
      renderSTLInViewer(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.")
    } finally {
      setGenerating(false)
    }
  }

  /* ─────────── Preview 3D (Three.js via CDN carregado abaixo) ─────────── */
  const renderSTLInViewer = useCallback((blob: Blob) => {
    const w = window as unknown as {
      __biaStudioInitViewer?: (canvas: HTMLCanvasElement, stlBuf: ArrayBuffer) => void
      THREE?: unknown
    }
    if (!w.__biaStudioInitViewer || !canvasRef.current) {
      // Three ainda não carregou — enfileira pra depois
      setTimeout(() => renderSTLInViewer(blob), 300)
      return
    }
    blob.arrayBuffer().then(buf => {
      w.__biaStudioInitViewer!(canvasRef.current!, buf)
    })
  }, [])

  /* ─────────── Download ─────────── */
  function download() {
    if (!stlBlob) return
    const url = URL.createObjectURL(stlBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia-scaffold-${Date.now()}.stl`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function reset() {
    setPrompt("")
    setStlBlob(null)
    setStats(null)
    setParams(null)
    setError(null)
    setQuotaExhausted(false)
  }

  /* ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Three.js via CDN — carrega 1x e deixa window.THREE disponível */}
      <Script src="https://unpkg.com/three@0.160.0/build/three.min.js" strategy="afterInteractive" />
      <Script id="bia-studio-viewer" strategy="afterInteractive">{`
        (function(){
          window.__biaStudioInitViewer = function(canvas, stlBuf) {
            if (!window.THREE) { console.warn('THREE not loaded yet'); return; }
            const T = window.THREE;

            // Cleanup anterior
            if (window.__biaViewer) {
              window.__biaViewer.renderer.dispose();
              window.__biaViewer.scene.clear();
              if (window.__biaViewer.raf) cancelAnimationFrame(window.__biaViewer.raf);
            }

            const scene = new T.Scene();
            scene.background = new T.Color(0x0a0618);

            const w = canvas.clientWidth, h = canvas.clientHeight;
            const camera = new T.PerspectiveCamera(45, w / h, 0.1, 1000);

            const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(w, h, false);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Luzes
            const ambient = new T.AmbientLight(0xffffff, 0.4);
            scene.add(ambient);
            const key = new T.DirectionalLight(0xffffff, 1.0);
            key.position.set(50, 100, 80);
            scene.add(key);
            const rim = new T.DirectionalLight(0xc084fc, 0.4);
            rim.position.set(-80, -40, -50);
            scene.add(rim);

            // Parse STL binário
            const view = new DataView(stlBuf);
            const triangleCount = view.getUint32(80, true);
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

            // Material fuchsia/violet (identidade BIA)
            const material = new T.MeshStandardMaterial({
              color: 0xc084fc,
              metalness: 0.3,
              roughness: 0.5,
              side: T.DoubleSide,
              flatShading: true,
            });
            const mesh = new T.Mesh(geom, material);

            // Centraliza
            const bbox = geom.boundingBox;
            const center = new T.Vector3();
            bbox.getCenter(center);
            mesh.position.sub(center);
            scene.add(mesh);

            // Grid helper (floor)
            const maxDim = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
            const grid = new T.GridHelper(maxDim * 2, 20, 0x4c1d95, 0x1e1b4b);
            grid.position.y = -(bbox.max.y - bbox.min.y) / 2 - 1;
            scene.add(grid);

            // Posiciona câmera
            const camDist = maxDim * 2;
            camera.position.set(camDist, camDist * 0.7, camDist);
            camera.lookAt(0, 0, 0);

            // Rotação drag-based
            let dragging = false;
            let prevX = 0, prevY = 0;
            let rotY = 0, rotX = 0;
            canvas.addEventListener('mousedown', e => { dragging = true; prevX = e.clientX; prevY = e.clientY; });
            window.addEventListener('mouseup', () => { dragging = false; });
            window.addEventListener('mousemove', e => {
              if (!dragging) return;
              rotY += (e.clientX - prevX) * 0.01;
              rotX += (e.clientY - prevY) * 0.01;
              prevX = e.clientX;
              prevY = e.clientY;
            });
            // Touch
            canvas.addEventListener('touchstart', e => {
              if (e.touches.length === 1) { dragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
            });
            canvas.addEventListener('touchend', () => { dragging = false; });
            canvas.addEventListener('touchmove', e => {
              if (!dragging || e.touches.length !== 1) return;
              rotY += (e.touches[0].clientX - prevX) * 0.01;
              rotX += (e.touches[0].clientY - prevY) * 0.01;
              prevX = e.touches[0].clientX;
              prevY = e.touches[0].clientY;
              e.preventDefault();
            }, { passive: false });

            // Auto-rotate quando parado
            let autoAngle = 0;
            function animate() {
              const raf = requestAnimationFrame(animate);
              window.__biaViewer.raf = raf;
              if (!dragging) {
                autoAngle += 0.004;
                mesh.rotation.y = rotY + autoAngle;
              } else {
                mesh.rotation.y = rotY;
              }
              mesh.rotation.x = rotX;
              renderer.render(scene, camera);
            }
            animate();

            // Resize observer
            const ro = new ResizeObserver(() => {
              const nw = canvas.clientWidth, nh = canvas.clientHeight;
              renderer.setSize(nw, nh, false);
              camera.aspect = nw / nh;
              camera.updateProjectionMatrix();
            });
            ro.observe(canvas);

            window.__biaViewer = { renderer, scene, camera, mesh, raf: 0 };
          };
        })();
      `}</Script>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-transparent p-5 sm:p-6">
          <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-fuchsia-300" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  BIA Studio <span className="text-fuchsia-300">· Scaffold Generator</span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 ml-12">
                {userName}, descreva por voz ou texto o scaffold que você precisa.
                A BIA gera o STL pronto pra bioimpressão em segundos.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-fuchsia-200/80 ml-12 sm:ml-0">
              <FlaskConical className="w-3.5 h-3.5" />
              Engine TPMS (gyroid · schwarz-p · diamond)
            </div>
          </div>
        </div>

        {/* ── 3 Colunas: entrada / preview / stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ─── COLUNA 1: Entrada (voz + prompt + presets) ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Prompt area */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <label className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Descreva seu scaffold
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

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                data-testid="studio-prompt-input"
                placeholder='Ex: "Scaffold ósseo esponjoso 20x20x10 mm, gyroid, 75% porosidade"'
                rows={3}
                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/40 focus:ring-1 focus:ring-fuchsia-500/20 resize-none"
              />

              {micError && (
                <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  {micError}
                </div>
              )}

              {micSupported === false && (
                <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] text-gray-400">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  Microfone não suportado neste navegador — use o Chrome, Edge ou Safari.
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating || !prompt.trim()}
                  data-testid="studio-generate-button"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                    generating || !prompt.trim()
                      ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      : "bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-md shadow-fuchsia-900/40",
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Gerar STL
                    </>
                  )}
                </button>
                {(stlBlob || error) && (
                  <button
                    type="button"
                    onClick={reset}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-gray-300 hover:bg-white/[0.08] transition-colors"
                    title="Limpar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Presets */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Exemplos prontos (toque pra preencher)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPrompt(p.text)}
                    data-testid={`studio-preset-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-fuchsia-500/25 hover:bg-fuchsia-500/[0.03] transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">{p.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{p.hint}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── COLUNA 2: Preview 3D ─── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden h-[280px] sm:h-[400px] lg:h-[500px] relative">
              <canvas
                ref={canvasRef}
                data-testid="studio-preview-canvas"
                className="w-full h-full block cursor-grab active:cursor-grabbing"
              />

              {!stlBlob && !generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 pointer-events-none">
                  <Box className="w-16 h-16 opacity-30" />
                  <p className="text-sm">O preview 3D aparece aqui depois de gerar</p>
                  <p className="text-[11px] opacity-60">Arraste pra girar · Zoom automático</p>
                </div>
              )}

              {generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
                  <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
                  <p className="text-sm font-medium text-fuchsia-200">
                    Gerando scaffold TPMS...
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Marching cubes + validação geométrica
                  </p>
                </div>
              )}

              {stlBlob && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-gray-300">
                  <Eye className="w-3 h-3" /> Arraste pra girar
                </div>
              )}
            </div>

            {/* Download bar */}
            {stlBlob && (
              <button
                type="button"
                onClick={download}
                data-testid="studio-download-button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-md shadow-emerald-900/40 transition-colors active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Baixar STL ({(stlBlob.size / 1024).toFixed(0)} KB)
              </button>
            )}
          </div>

          {/* ─── COLUNA 3: Stats + feedback ─── */}
          <div className="lg:col-span-1 space-y-3">
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
                    <p className="font-semibold mb-1">
                      {quotaExhausted ? "Quota atingida" : "Erro"}
                    </p>
                    <p className="leading-relaxed">{error}</p>
                    {quotaExhausted && (
                      <a
                        href="/dashboard/billing"
                        className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px] hover:bg-amber-400 transition-colors"
                      >
                        Ver planos pagos →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stats && (
              <div
                data-testid="studio-stats"
                className="p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/20 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-300 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Scaffold gerado
                </div>

                <div className="space-y-2 text-[11px]">
                  <StatRow label="Triângulos" value={stats.triangles.toLocaleString("pt-BR")} />
                  <StatRow label="Vértices" value={stats.vertices.toLocaleString("pt-BR")} />
                  <StatRow label="Porosidade" value={`${(stats.porosity * 100).toFixed(1)}%`} highlight />
                  <StatRow label="Volume" value={`${stats.volumeMm3.toFixed(0)} mm³`} />
                  <StatRow label="Tempo" value={`${stats.genMs} ms`} />
                  {params && (
                    <>
                      <StatRow label="TPMS" value={params.kind} highlight />
                      <StatRow label="Dimensões" value={`${params.sizeX}×${params.sizeY}×${params.sizeZ} mm`} />
                    </>
                  )}
                  {stats.parseConfidence !== undefined && (
                    <StatRow
                      label="NLU"
                      value={`${(stats.parseConfidence * 100).toFixed(0)}% conf.`}
                    />
                  )}
                  <StatRow label="Custo" value={`${stats.costCredits} créditos`} />
                </div>
              </div>
            )}

            {/* Dica fixa */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300 mb-1">
                <Volume2 className="w-3 h-3" />
                Dica de voz
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Fale frases naturais como:
                <br />
                • <em>&quot;Scaffold ósseo esponjoso 20x20x10 mm porosidade 75%&quot;</em>
                <br />
                • <em>&quot;Cartilagem gyroid 15 mm cubo&quot;</em>
                <br />
                • <em>&quot;Enxerto alveolar diamond 10x8x5 mm&quot;</em>
              </p>
            </div>
          </div>
        </div>
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
