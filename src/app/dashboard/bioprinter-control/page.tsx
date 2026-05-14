"use client"

/**
 * BIA — Bioprinter Control Center
 *
 * Hub central de controle de bioimpressora estilo Pronterface MAS especializado
 * em biofabricação. Esta é a FASE 2: joystick funcional + console de comandos.
 *
 * Próximas fases (já no roadmap):
 *  - FASE 3: Painel de extrusão fluida + sensores
 *  - FASE 4: Painel de tecido vivo (viabilidade)
 *  - FASE 5: Painel de pós-bioimpressão
 *
 * Esta rota é INDEPENDENTE de /dashboard/bioprinting (que continua funcionando).
 * É a versão "console avançado" para usuários que querem controle fino.
 */

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Gamepad2, Terminal, Microscope, Beaker,
  FlaskConical, Settings2, ShieldCheck, Info,
} from "lucide-react"
import { Joystick3D, type JoystickPosition } from "@/components/bioprinter/Joystick3D"

export default function BioprinterControlPage() {
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0, z: 0, e: 0 })
  const [gcodeLog, setGcodeLog] = useState<string[]>([
    "; BIA Bioprinter Control Center — pronto",
    "; Modo simulação (impressora não conectada)",
  ])

  // Helper para logar comandos G-code
  const log = useCallback((line: string) => {
    setGcodeLog((prev) => [...prev.slice(-99), line])
  }, [])

  // ─── Handlers do Joystick ────────────────────────────────────────────
  const handleMove = useCallback((axis: "X" | "Y" | "Z" | "E", delta: number) => {
    setPosition((prev) => {
      const next = { ...prev }
      const key = axis.toLowerCase() as "x" | "y" | "z" | "e"
      next[key] = +(prev[key] + delta).toFixed(3)
      const feedrate = axis === "Z" ? 300 : axis === "E" ? 200 : 1500
      log(`G91 ; modo relativo`)
      log(`G1 ${axis}${delta > 0 ? "+" : ""}${delta} F${feedrate}`)
      log(`G90 ; modo absoluto`)
      return next
    })
  }, [log])

  const handleHome = useCallback((axis: "all" | "X" | "Y" | "Z") => {
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
    log(`G28${axis === "all" ? "" : " " + axis} ; home ${axis === "all" ? "todos os eixos" : "eixo " + axis}`)
  }, [log])

  const handleZero = useCallback(() => {
    log(`G92 X0 Y0 Z0 E0 ; zera posições virtuais no local atual`)
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
  }, [log])

  const handleProbeZ = useCallback(() => {
    log(`; ── Z-Probe suave (0.5N) — modo bio ──`)
    log(`M851 Z-2.5 ; offset do probe`)
    log(`G29 ; auto-bed-leveling com sensor suave`)
    log(`G1 Z2 F300 ; sobe 2mm para segurança`)
  }, [log])

  const handlePurge = useCallback(() => {
    log(`; ── Purga de ar (pré-print) ──`)
    log(`G91`)
    log(`G1 E1.0 F60 ; extrude 1mm devagar para tirar bolha de ar`)
    log(`G90`)
    setPosition((p) => ({ ...p, e: +(p.e + 1).toFixed(3) }))
  }, [log])

  const handleSterilePause = useCallback(() => {
    log(`; ── Pausa estéril (mantém pressão pneumática) ──`)
    log(`M0 ; pausa firmware`)
    log(`; ATENÇÃO: NÃO despressurizar — toggle pneumático fica ON`)
  }, [log])

  const handleGoToRest = useCallback(() => {
    log(`; ── Posição de repouso para troca de cartucho ──`)
    log(`G1 Z20 F300 ; sobe 20mm`)
    log(`G1 X0 Y200 F3000 ; canto traseiro`)
    setPosition({ x: 0, y: 200, z: 20, e: position.e })
  }, [log, position.e])

  const clearLog = () => setGcodeLog([
    "; Log limpo",
    "; BIA Bioprinter Control Center — pronto",
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span className="text-white/20">/</span>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              Bioprinter Control Center
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-400">
            <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
              FASE 2 · joystick + console
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Aviso de fase / racional */}
        <section className="rounded-2xl bg-gradient-to-br from-violet-500/8 to-cyan-500/8 border border-violet-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white mb-1.5">
                Por que esta página existe (e por que NÃO é o Pronterface)
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                O Pronterface foi feito para imprimir plástico. Bioimpressão é outro mundo:
                células vivas, hidrogéis viscoelásticos, riscos de contaminação, viabilidade que despenca
                se você apertar demais. Este painel é o <strong className="text-violet-200">controle remoto da
                sua bioimpressora pensado por bioengenheiro</strong> — cada botão tem racional biológico.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                <Tag>✅ Joystick com micropasso 0.05mm</Tag>
                <Tag>✅ G92 com 1 clique</Tag>
                <Tag>✅ Z-probe suave (0.5N)</Tag>
                <Tag>✅ Purga anti-bolha</Tag>
                <Tag>✅ Pausa estéril</Tag>
                <Tag tone="pending">⏳ Sensores fluídos (Fase 3)</Tag>
                <Tag tone="pending">⏳ Viabilidade live (Fase 4)</Tag>
                <Tag tone="pending">⏳ Pós-bio (Fase 5)</Tag>
              </div>
            </div>
          </div>
        </section>

        {/* Grade principal: Joystick + Console */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-6">
          {/* Coluna esquerda: Joystick */}
          <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Joystick 3D</h3>
                <p className="text-[10px] text-gray-500">Controle manual X/Y/Z + extrusora</p>
              </div>
            </div>

            <Joystick3D
              position={position}
              onMove={handleMove}
              onHome={handleHome}
              onZero={handleZero}
              onProbeZ={handleProbeZ}
              onPurge={handlePurge}
              onSterilePause={handleSterilePause}
              onGoToRest={handleGoToRest}
              connected={false}
            />
          </section>

          {/* Coluna direita: Console G-code */}
          <section className="rounded-2xl bg-black/40 border border-white/5 p-5 space-y-3 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Console G-code</h3>
                  <p className="text-[10px] text-gray-500">
                    Cada movimento do joystick aparece aqui como código real
                  </p>
                </div>
              </div>
              <button
                onClick={clearLog}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                Limpar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-black/60 border border-white/5 p-3 font-mono text-[11px] leading-relaxed">
              {gcodeLog.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith(";")
                      ? "text-gray-500"
                      : line.startsWith("G28")
                        ? "text-violet-300"
                        : line.startsWith("G92")
                          ? "text-cyan-300 font-semibold"
                          : line.startsWith("G29") || line.startsWith("M851")
                            ? "text-cyan-300"
                            : line.startsWith("M0")
                              ? "text-amber-300"
                              : "text-emerald-200"
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="text-[10px] text-gray-500 flex items-center gap-2 pt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {gcodeLog.length - 2} comandos gerados nesta sessão · Marlin compatível
            </div>
          </section>
        </div>

        {/* Próximos painéis (preview do que vem) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            Próximos painéis (em construção)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UpcomingCard
              icon={FlaskConical}
              title="Extrusão Fluida"
              phase="Fase 3"
              description="Pressão pneumática / pistão / parafuso · Temperatura cartucho-cama-câmara · Umidade · Sensores live"
              color="cyan"
            />
            <UpcomingCard
              icon={Microscope}
              title="Tecido Vivo"
              phase="Fase 4"
              description="Cálculo de viabilidade em tempo real · Encolhimento pós-cura · Crosslinking inteligente · Padrões de infill BIO"
              color="emerald"
            />
            <UpcomingCard
              icon={Beaker}
              title="Pós-Bioimpressão"
              phase="Fase 5"
              description="Protocolo de cultura · Biorreator (estímulo elétrico/mecânico/fluxo) · Cronograma de assays · Validação morfológica"
              color="amber"
            />
          </div>
        </section>

        {/* Conexão com bioprinting clássico */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
          <div className="flex items-start gap-3">
            <Settings2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">
                Esta página é complementar a /dashboard/bioprinting
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                A página antiga continua funcionando para o fluxo "STL → G-code → download".
                Esta página nova é o <strong className="text-violet-300">controle avançado</strong>:
                permite manipular a impressora ao vivo, fazer ajustes finos antes/durante o print,
                e (futuramente) monitorar sensores em tempo real.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/bioprinting"
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  ← Fluxo clássico (STL→G-code)
                </Link>
                <Link
                  href="/dashboard/bioprinting/engine"
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  Motor de G-code (visualizador)
                </Link>
                <Link
                  href="/dashboard/stl"
                  className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 transition-colors"
                >
                  Gerador STL biomimético
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// ─── Componentes auxiliares ────────────────────────────────────────────

function Tag({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "pending" }) {
  return (
    <span
      className={
        tone === "pending"
          ? "px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300"
          : "px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
      }
    >
      {children}
    </span>
  )
}

function UpcomingCard({
  icon: Icon, title, phase, description, color,
}: {
  icon: React.ElementType
  title: string
  phase: string
  description: string
  color: "cyan" | "emerald" | "amber"
}) {
  const colorMap = {
    cyan:    { bg: "from-cyan-500/[0.04] to-cyan-500/[0.02]",       border: "border-cyan-500/15",    iconBg: "bg-cyan-500/15 border-cyan-500/30",    icon: "text-cyan-300",    phase: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25" },
    emerald: { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", icon: "text-emerald-300", phase: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
    amber:   { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",     border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",   icon: "text-amber-300",   phase: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  }[color]

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colorMap.bg} border ${colorMap.border} p-4 opacity-80 hover:opacity-100 transition-opacity`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${colorMap.iconBg}`}>
          <Icon className={`w-4 h-4 ${colorMap.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${colorMap.phase}`}>
            {phase}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}
