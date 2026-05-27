/**
 * BIA · Manual · Capítulo — Bioimpressão · Etapa 4 · Executar (R12.39/R12.40)
 */

"use client"

import {
  Usb, Power, Play, Pause, Square, Send, Gamepad2,
  Droplet, Zap, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2,
  Terminal, RotateCcw, Crosshair, Wand2, Info, ArrowDown,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem, KeyShortcut } from "./_components"

export function ChapterBioprintExecute() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={6}
        badge="ETAPA 4 DE 4 · ATUALIZADO em R12.40"
        title="Bioimpressão · Executar"
        icon={Usb}
        gradient="from-emerald-500/15 to-teal-500/15 border-emerald-500/20"
        href="/dashboard/bioprint/execute"
        hrefLabel="Abrir Executar"
        lead={
          <>
            Aqui você <strong className="text-white">conecta a bioimpressora pela USB</strong> e roda
            o G-code. A BIA fala diretamente com firmware Marlin via Web Serial. Tem joystick em
            tempo real, controle de fluxo e velocidade durante a impressão, posicionamento automático
            e tudo que você precisa pra imprimir sem abrir um software extra.
          </>
        }
        readMin={9}
      />

      <Box2 icon={Sparkles} title="O que mudou em R12.40 (atual)" tone="emerald">
        <p className="mb-2 text-[13px]">
          A versão mais recente trouxe melhorias importantes baseadas em feedback de uso real:
        </p>
        <ul className="space-y-1.5 list-disc list-inside text-[13px]">
          <li><strong className="text-emerald-200">Extrusor funciona em qualquer estado</strong> — antes,
            durante e depois da impressão. Bug clássico de "cold extrusion" foi resolvido com <code>M302 S0 P1</code>.</li>
          <li><strong className="text-emerald-200">Aproximação automática da mesa</strong> — após o Home All,
            o cabeçote desce 22mm e fica em Z=8mm, pronto pra começar sem jog manual.</li>
          <li><strong className="text-emerald-200">Joystick em tempo real durante impressão</strong> — corrige
            X/Y/Z e E enquanto está imprimindo (sistema de fila de injeção interno).</li>
          <li><strong className="text-emerald-200">Controle de Velocidade (M220)</strong> — slider 25–200%
            que afeta TODOS os movimentos (XYZ+E), inclusive o joystick.</li>
          <li><strong className="text-emerald-200">Controle de Fluxo (M221)</strong> — slider 10–200% para
            ajustar só a extrusão, sem mexer na velocidade.</li>
          <li><strong className="text-emerald-200">Botões de Purga Rápida</strong> — +1mm, +2mm, +5mm, +10mm
            independentes do passo do joystick. Pra purgar ar e bolhas da seringa.</li>
        </ul>
      </Box2>

      <Box2 icon={Usb} title="Antes de conectar — checklist" tone="info">
        <p className="mb-2 text-[13px]">
          Pra conexão USB funcionar é preciso:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <MiniCard title="No seu computador" items={[
            "Chrome 89+ OU Edge 89+",
            "Cabo USB conectado",
            "Drivers da impressora instalados",
            "Nenhum outro app usando a porta",
          ]} />
          <MiniCard title="Na bioimpressora" items={[
            "Energia ligada",
            "Mecânica destravada",
            "Bico limpo e na posição",
            "Seringa montada (sem tinta ainda)",
          ]} />
        </div>
        <Pitfall>
          <strong>Firefox e Safari não suportam Web Serial.</strong> Use Chrome/Edge no desktop
          ou Chromebook. No celular não funciona — limitação do navegador, não da BIA.
        </Pitfall>
      </Box2>

      <Box2 icon={Power} title="Conectando a impressora" tone="cyan">
        <div className="space-y-3 mt-2">
          <StepCard n={1} title="Escolher o modo" icon={Usb} accent="cyan">
            No topo da página há dois modos:
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 p-2 text-[11px]">
                <strong className="text-emerald-300">REAL</strong> — conecta USB de verdade na bioimpressora
              </div>
              <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/20 p-2 text-[11px]">
                <strong className="text-violet-300">MOCK</strong> — simulador (sem hardware, pra ensino e testes)
              </div>
            </div>
          </StepCard>
          <StepCard n={2} title="Ativar Auto-Home e Centralizar" icon={Sparkles} accent="blue">
            Marque as duas opções antes de clicar Conectar. Faz tudo automático: G28 (home),
            sobe Z+30mm, move pro centro, desce 22mm. Final: cabeçote a Z=8mm da mesa.
          </StepCard>
          <StepCard n={3} title="Clique em Conectar USB" icon={Power} accent="emerald">
            Aparece a popup do Chrome listando portas seriais disponíveis. Escolha a sua
            impressora (procure nome ou COM3/COM4 no Windows, /dev/ttyUSB0 no Linux).
          </StepCard>
          <StepCard n={4} title="Aguarde o handshake" icon={CheckCircle2} accent="purple">
            A BIA envia uma sequência de comandos para preparar a máquina:
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px]">
              <li><code className="text-cyan-300">M115</code> — identifica firmware</li>
              <li><code className="text-cyan-300">G28</code> — homing mecânico</li>
              <li><code className="text-cyan-300">G90 + M83</code> — XYZ absoluto, E relativo</li>
              <li><code className="text-cyan-300">M302 S0 P1</code> — libera extrusão a frio (R12.40)</li>
              <li><code className="text-cyan-300">G1 X100 Y100 Z30</code> — vai pro centro</li>
              <li><code className="text-cyan-300">G1 Z8 F600</code> — desce 22mm (R12.40)</li>
              <li><code className="text-cyan-300">M400</code> — sincroniza</li>
            </ul>
            Em ~10–15 segundos a impressora está pronta.
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={Gamepad2} title="O Joystick — controle manual XYZE" tone="purple">
        <p className="mb-2">
          O joystick virtual deixa você posicionar o cabeçote <strong className="text-white">manualmente</strong> —
          antes, durante ou depois da impressão. Tem 4 seções:
        </p>
        <div className="space-y-3 mt-3">
          <Section icon={Crosshair} title="Passo do movimento" color="cyan">
            Linha com 6 botões: <kbd className="px-1 bg-white/10 rounded text-[9px]">0.05</kbd>{" "}
            <kbd className="px-1 bg-white/10 rounded text-[9px]">0.1</kbd>{" "}
            <kbd className="px-1 bg-white/10 rounded text-[9px]">0.5</kbd>{" "}
            <kbd className="px-1 bg-white/10 rounded text-[9px]">1</kbd>{" "}
            <kbd className="px-1 bg-white/10 rounded text-[9px]">5</kbd>{" "}
            <kbd className="px-1 bg-white/10 rounded text-[9px]">10</kbd> mm. Clique pra escolher
            quanto cada clique XY/Z move.
          </Section>
          <Section icon={Gamepad2} title="Pad XY" color="cyan">
            Cruz com Y+ no topo, Y- em baixo, X+ direita, X- esquerda. Botão central com ⌂ envia
            G92 (zera coordenadas no ponto atual — não move).
          </Section>
          <Section icon={ArrowDown} title="Z" color="amber">
            Dois botões: Z+ (sobe, longe da mesa) e Z- (desce, em direção à mesa). Z- é
            amarelo-aviso porque pode colidir com a placa de cultura.
          </Section>
          <Section icon={Droplet} title="Extrusora E (R12.40 redesenhada)" color="emerald">
            <p className="mb-1.5">3 linhas:</p>
            <ol className="space-y-1 list-decimal list-inside text-[11px]">
              <li><strong>Passos visuais</strong>: 0.05, 0.1, 0.5, 1, 2, 5, 10 mm</li>
              <li><strong>E+ e E-</strong> grandes com ícones ▼/▲ e o valor numérico no botão</li>
              <li><strong>Purga rápida</strong>: +1 / +2 / +5 / +10 (independentes do passo)</li>
            </ol>
          </Section>
        </div>
        <ProTip>
          Para <strong>purgar a seringa</strong> antes de imprimir: clique <code>+10</code> da
          purga rápida, espere o fio sair, depois <code>+5</code>, e mais um <code>+2</code> até
          o fio ficar contínuo e sem bolha. Limpe a ponta com gaze e pronto.
        </ProTip>
      </Box2>

      <Box2 icon={Droplet} title="Painel de Fluxo (M221) — só extrusão" tone="cyan">
        <p className="mb-2 text-[13px]">
          Slider de <strong>10% a 200%</strong> que multiplica TODAS as quantidades de extrusão E,
          em tempo real, sem pausar a impressão. Use quando perceber:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-lg bg-amber-500/[0.05] border border-amber-500/20 p-2.5">
            <strong className="text-amber-300">Sub-extrusão (aumente fluxo)</strong>
            <ul className="mt-1 space-y-0.5 text-gray-300 list-disc list-inside text-[11px]">
              <li>Linhas faltando ou descontínuas</li>
              <li>Camadas que não grudam</li>
              <li>Vazios entre paredes</li>
            </ul>
          </div>
          <div className="rounded-lg bg-rose-500/[0.05] border border-rose-500/20 p-2.5">
            <strong className="text-rose-300">Super-extrusão (diminua fluxo)</strong>
            <ul className="mt-1 space-y-0.5 text-gray-300 list-disc list-inside text-[11px]">
              <li>Acúmulo na ponta do bico</li>
              <li>Linhas grossas e disformes</li>
              <li>Tinta sai mesmo sem movimento</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-gray-400">
          <strong>4 presets:</strong> 30% (leve), 50% (padrão hidrogel), 70% (denso), 100%
          (filamento FDM). Botões ±1 e ±5 para ajuste fino.
        </p>
      </Box2>

      <Box2 icon={Zap} title="Painel de Velocidade (M220) — XYZ+E" tone="amber">
        <p className="mb-2 text-[13px]">
          Slider de <strong>25% a 200%</strong> que multiplica TODAS as velocidades de movimento
          (XYZ+E). Afeta também o joystick. Use quando:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
          <Preset pct="50%"  label="Lento"   why="Hidrogel viscoso, primeiras camadas" />
          <Preset pct="100%" label="Nominal" why="Velocidades calculadas pelo slicer" />
          <Preset pct="150%" label="Rápido"  why="Travels, geometrias simples" />
          <Preset pct="200%" label="Máximo"  why="Teste de limites mecânicos" />
        </div>
        <ProTip>
          <strong>Diferença entre M220 e M221</strong>: M220 (Velocidade) afeta o tempo total
          mantendo a proporção; M221 (Fluxo) muda só a quantidade de tinta. Para reduzir
          super-extrusão sem desacelerar: ajuste M221. Para ganhar tempo sem trocar de bico:
          ajuste M220.
        </ProTip>
      </Box2>

      <Box2 icon={Play} title="Imprimindo de verdade" tone="emerald">
        <div className="space-y-3 mt-2">
          <StepCard n={1} title="Carregar G-code" icon={Send} accent="blue">
            3 opções: importar da etapa Fatiar (vem automático se você seguiu o fluxo), upload
            de arquivo .gcode local, ou colar texto manual.
          </StepCard>
          <StepCard n={2} title="Validar" icon={CheckCircle2} accent="emerald">
            Botão <strong>Validar</strong> faz 12 checagens em ~1 segundo. Se houver erro
            BLOQUEANTE, não deixa imprimir. Se houver só AVISO, libera com confirmação.
          </StepCard>
          <StepCard n={3} title="Iniciar" icon={Play} accent="emerald">
            Botão verde grande <strong>▶ Imprimir</strong>. A BIA primeiro aplica fluxo (M221) e
            velocidade (M220) atuais, depois começa a enviar G-code linha por linha (handshake
            com 'ok' a cada linha).
          </StepCard>
          <StepCard n={4} title="Acompanhar progresso" icon={Sparkles} accent="purple">
            Barra de progresso com:
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px]">
              <li>% concluído + tempo decorrido + tempo estimado restante</li>
              <li>Linha atual / total (ex: 2341 / 18250)</li>
              <li>Z atual e camada atual</li>
              <li>Pré-visualização 3D ao vivo do que já foi impresso</li>
            </ul>
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={Pause} title="Pausar, Retomar, Cancelar" tone="cyan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Action
            icon={Pause}
            color="amber"
            label="Pausar"
            what="Marlin termina a linha atual e congela. Você pode usar o joystick, ajustar fluxo, velocidade. A purga durante pausa funciona normalmente (R12.39 injection queue)."
          />
          <Action
            icon={Play}
            color="emerald"
            label="Retomar"
            what="Volta de onde parou, na mesma camada e linha. Os ajustes de fluxo/velocidade feitos durante a pausa permanecem."
          />
          <Action
            icon={Square}
            color="rose"
            label="Cancelar"
            what="Aborta a impressão. Eleva Z em 10mm e move pra X=0/Y=0 (saída segura). O construto continua na mesa — você decide o que fazer com ele."
          />
        </div>
      </Box2>

      <Box2 icon={ShieldAlert} title="Parada de emergência (M112)" tone="rose">
        <p className="mb-2 text-[13px]">
          Botão vermelho destacado no topo: <strong className="text-rose-300">⚠ EMERGENCY STOP</strong>.
          Envia <code>M112</code> que trava o firmware imediatamente. Use se:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li>Bico colidiu com a mesa ou com o construto</li>
          <li>Cabo de extrusão soltou ou enroscou</li>
          <li>Aquecedor disparado fora de controle (no caso de hotend)</li>
          <li>Qualquer ruído mecânico incomum</li>
        </ul>
        <Pitfall>
          M112 <strong>requer reset físico</strong> da impressora depois (botão reset ou ciclar
          energia). É proteção de última instância — para parada controlada, use Cancelar.
        </Pitfall>
      </Box2>

      <Box2 icon={Terminal} title="Console e logs" tone="default">
        <p className="mb-2 text-[13px]">
          No painel direito você tem um <strong className="text-white">terminal G-code</strong> em tempo
          real mostrando:
        </p>
        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
          <div className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-1 text-cyan-200">TX  — comandos enviados</div>
          <div className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-emerald-200">RX  — respostas da máquina</div>
          <div className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-amber-200">WARN/ERR — avisos</div>
        </div>
        <p className="text-[12px] text-gray-400 mt-2">
          Filtros para esconder TX (foco em respostas) ou só erros. Download dos logs em .txt
          ou .json para análise posterior. Útil pra debug em projetos críticos.
        </p>
        <p className="text-[12px] text-gray-400 mt-2">
          Também há campo <strong>"Comando manual"</strong> — digita qualquer G-code ou M-code
          e envia direto (ex: <code>M115</code> pra checar firmware, <code>M105</code> pra ler
          temperaturas, <code>M114</code> pra ver posição atual).
        </p>
      </Box2>

      <Box2 icon={Wand2} title="Comandos rápidos" tone="purple">
        <p className="mb-2 text-[13px]">
          7 botões com os comandos Marlin mais úteis:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
          <QuickCmd code="M114" what="Posição atual XYZE" />
          <QuickCmd code="M105" what="Temperaturas" />
          <QuickCmd code="M115" what="Firmware info" />
          <QuickCmd code="G92" what="Define ponto inicial (zera)" />
          <QuickCmd code="M18" what="Motores OFF (destravar)" />
          <QuickCmd code="M84" what="Disable steppers" />
          <QuickCmd code="Cool All" what="M104 S0 + M140 S0 + M141 S0" />
        </div>
      </Box2>

      <Box2 icon={AlertTriangle} title="Problemas comuns na execução" tone="warn">
        <div className="space-y-2.5">
          <FaqItem q="Cliquei Conectar e não aparece a impressora na popup">
            (1) Verifique o cabo USB. (2) Feche outros softwares (Pronterface, Cura, OctoPrint).
            (3) No Windows, abra Gerenciador de Dispositivos e veja se há porta COM (se aparece
            "Dispositivo Desconhecido", instale o driver CH340/CP2102/FTDI da impressora).
          </FaqItem>
          <FaqItem q="E+/E- não move o motor da seringa">
            Em R12.40 isso foi resolvido — a BIA envia <code>M302 S0 P1</code> automaticamente.
            Se ainda assim não move: (1) verifique se o passo está em 1mm ou mais. (2) clique
            "Home All" pra re-armar. (3) confira o cabo do motor da extrusora.
          </FaqItem>
          <FaqItem q="Cabeçote bateu na mesa durante o home">
            Antes de fazer home, descole a seringa da mesa manualmente girando o eixo Z na mão
            (motores devem estar destravados — clique M18 OFF antes). O home só pode ser feito
            com clearance mínimo de 10mm.
          </FaqItem>
          <FaqItem q="Impressão pausa sozinha no meio">
            Geralmente significa que a impressora não respondeu 'ok' a tempo (timeout de 30s).
            Cabos USB ruins, interferência elétrica, ou comando G-code travando o firmware.
            Veja o último TX/RX no terminal para descobrir a linha problemática.
          </FaqItem>
          <FaqItem q="Quero salvar essa configuração de joystick">
            Atualmente o passo e fluxo/velocidade são por sessão (resetam ao reconectar). Em
            v5.0 haverá perfis salvos por bioimpressora. Por enquanto, anote os valores no
            Notebook ELN.
          </FaqItem>
        </div>
      </Box2>

      <Box2 icon={RotateCcw} title="Pós-impressão — o que fazer" tone="emerald">
        <ol className="space-y-1.5 list-decimal list-inside text-[13px]">
          <li>O cabeçote sobe automaticamente Z+10mm e move pra X=0 Y=0 (área segura).</li>
          <li>Desconecte a USB com botão vermelho <strong>Desconectar</strong> (não puxe o cabo direto).</li>
          <li>Aplique o crosslinker se necessário (UV com lâmpada calibrada, CaCl₂ por imersão, etc.).</li>
          <li>Transfira o constructo pra placa de cultura (use espátula esterilizada).</li>
          <li>Registre no Notebook: tempo total, fluxo/velocidade médios, observações.</li>
        </ol>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: "cyan" | "amber" | "emerald"; children: React.ReactNode
}) {
  const palette = {
    cyan:    "bg-cyan-500/[0.05] border-cyan-500/20 text-cyan-300",
    amber:   "bg-amber-500/[0.05] border-amber-500/20 text-amber-300",
    emerald: "bg-emerald-500/[0.05] border-emerald-500/20 text-emerald-300",
  }[color]
  return (
    <div className={`rounded-lg border p-3 ${palette}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        <strong className="text-white text-[12px]">{title}</strong>
      </div>
      <div className="text-[12px] text-gray-300 leading-relaxed">{children}</div>
    </div>
  )
}

function Preset({ pct, label, why }: { pct: string; label: string; why: string }) {
  return (
    <div className="rounded bg-amber-500/[0.05] border border-amber-500/20 p-1.5 text-[10px]">
      <div className="font-bold text-amber-300 font-mono">{pct}</div>
      <div className="text-amber-200 font-semibold">{label}</div>
      <div className="text-gray-400 text-[9px] leading-tight">{why}</div>
    </div>
  )
}

function Action({ icon: Icon, color, label, what }: {
  icon: React.ElementType; color: "amber" | "emerald" | "rose"; label: string; what: string
}) {
  const palette = {
    amber:   "bg-amber-500/[0.05] border-amber-500/20 text-amber-300",
    emerald: "bg-emerald-500/[0.05] border-emerald-500/20 text-emerald-300",
    rose:    "bg-rose-500/[0.05] border-rose-500/20 text-rose-300",
  }[color]
  return (
    <div className={`rounded-lg border p-3 ${palette}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-4 h-4" />
        <strong className="text-white text-[13px]">{label}</strong>
      </div>
      <div className="text-[11px] text-gray-300 leading-relaxed">{what}</div>
    </div>
  )
}

function QuickCmd({ code, what }: { code: string; what: string }) {
  return (
    <div className="rounded bg-purple-500/[0.05] border border-purple-500/20 p-1.5">
      <div className="text-purple-200 font-mono text-[11px]">{code}</div>
      <div className="text-gray-400 text-[10px]">{what}</div>
    </div>
  )
}
