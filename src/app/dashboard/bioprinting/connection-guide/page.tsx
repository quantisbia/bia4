"use client"

/**
 * BIA — Guia Completo de Conexão USB com Bioimpressoras
 * ======================================================
 * Tutorial passo-a-passo para conectar uma bioimpressora via USB e enviar
 * G-code, tanto pela BIA (Web Serial API) quanto pelo Pronterface/OctoPrint.
 */

import Link from "next/link"
import {
  Usb, ArrowLeft, ExternalLink, CheckCircle2, AlertTriangle, Info,
  Terminal, Download, Cable, Cpu, Zap, BookOpen, Monitor,
} from "lucide-react"

export default function ConnectionGuidePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* HEADER */}
      <div className="border-b border-gray-800 bg-gray-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard/bioprinting/engine"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Motor GCODE
          </Link>
          <span className="text-gray-600">·</span>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Usb className="w-5 h-5 text-cyan-400" />
            Guia de Conexão USB + Pronterface
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* INTRO */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">
            Como conectar sua bioimpressora ao computador
          </h2>
          <p className="text-gray-400 leading-relaxed">
            Há três formas de enviar o G-code gerado pela BIA à sua bioimpressora.
            Escolha a opção que melhor se adequa à sua impressora e ao seu fluxo de trabalho:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <Usb className="w-6 h-6 text-cyan-400 mb-2" />
              <div className="font-bold text-cyan-300 mb-1">1. BIA direto (USB)</div>
              <div className="text-xs text-gray-400">
                Conecta via Web Serial API (Chrome/Edge) e envia G-code em streaming direto da BIA.
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-2">✓ Mais prático</div>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">
              <Terminal className="w-6 h-6 text-violet-400 mb-2" />
              <div className="font-bold text-violet-300 mb-1">2. Pronterface</div>
              <div className="text-xs text-gray-400">
                Software desktop tradicional para Windows/Mac/Linux. Baixe o .gcode e envie pela GUI.
              </div>
              <div className="text-[10px] text-violet-400 font-bold mt-2">✓ Clássico</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
              <Monitor className="w-6 h-6 text-amber-400 mb-2" />
              <div className="font-bold text-amber-300 mb-1">3. OctoPrint (Pi)</div>
              <div className="text-xs text-gray-400">
                Interface web num Raspberry Pi — monitora remotamente, com câmera. Upload do .gcode via browser.
              </div>
              <div className="text-[10px] text-amber-400 font-bold mt-2">✓ Remoto/Profissional</div>
            </div>
          </div>
        </section>

        {/* PRÉ-REQUISITOS */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            Pré-requisitos (para TODAS as opções)
          </h3>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <Check text="Bioimpressora com saída USB-B ou USB-C (todas as Ender-based, Prusa, Anet, RepRap abertas)" />
            <Check text="Firmware aberto compatível: Marlin, Klipper, RepRap ou GCODE-standard" />
            <Check text="Cabo USB adequado (geralmente USB-A → USB-B tipo impressora, acompanha a impressora)" />
            <Check text="Driver de comunicação serial (veja abaixo — depende do chip na placa-mãe)" />
            <Check text="Baud rate correto (115200 para Marlin/BioEnder, 250000 para algumas customizadas)" />
          </div>
        </section>

        {/* DRIVERS */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            Drivers USB necessários
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            A maioria das bioimpressoras usa um chip conversor USB-Serial.
            Você precisa instalar o driver correto para o sistema operacional reconhecer a impressora como porta COM (Windows) ou /dev/ttyUSB* (Linux/Mac).
          </p>
          <div className="space-y-2">
            <DriverRow
              chip="CH340 / CH341"
              used="BioEnder, Ender 3 (v1/v2/Pro), Anet A8, maioria das placas chinesas"
              windows="https://www.wch.cn/downloads/CH341SER_EXE.html"
              mac="https://www.wch.cn/downloads/CH341SER_MAC_ZIP.html"
              linux="Pré-instalado no kernel desde 4.x"
            />
            <DriverRow
              chip="FTDI FT232"
              used="Algumas Prusas antigas, RAMPS originais, placas customizadas"
              windows="https://ftdichip.com/drivers/vcp-drivers/"
              mac="https://ftdichip.com/drivers/vcp-drivers/"
              linux="Pré-instalado no kernel"
            />
            <DriverRow
              chip="CP210x (Silicon Labs)"
              used="Prusa i3 MK3, algumas Creality CR-10 Pro, placas com ESP32"
              windows="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
              mac="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
              linux="Pré-instalado no kernel"
            />
          </div>
          <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
            💡 <b>Como saber qual chip sua impressora usa?</b> Conecte o USB e, no Windows, veja em
            &quot;Gerenciador de Dispositivos&quot; → &quot;Portas (COM e LPT)&quot;. Se aparecer &quot;USB-SERIAL CH340&quot; é o chip CH340.
            No Mac/Linux, rode: <code className="bg-black/40 px-1 rounded">lsusb</code> ou <code className="bg-black/40 px-1 rounded">system_profiler SPUSBDataType</code>.
          </div>
        </section>

        {/* OPÇÃO 1: BIA DIRETO */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-black">
              1
            </div>
            <h3 className="text-xl font-bold text-white">
              Opção 1: Conectar direto pela BIA (recomendado)
            </h3>
          </div>
          <div className="ml-12 space-y-3">
            <Step n={1} text="Abra a BIA no Chrome 89+ ou Edge 89+ (NÃO funciona no Firefox/Safari)" />
            <Step n={2} text="Vá em Dashboard → Motor GCODE → gere seu G-code normalmente" />
            <Step n={3} text="Conecte o cabo USB da bioimpressora ao computador e LIGUE a impressora" />
            <Step n={4} text='Na tela de resultado, clique em "Conectar USB" (botão cyan no painel de conexão)' />
            <Step n={5} text="O navegador abre um diálogo para escolher a porta — selecione a impressora (geralmente aparece como 'USB-SERIAL CH340' ou similar)" />
            <Step n={6} text="A BIA envia M115 automaticamente para identificar o firmware — você verá a resposta no terminal" />
            <Step n={7} text='Clique em "G28 Home" para fazer homing e em "Iniciar Impressão" para enviar o G-code em streaming' />
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 mt-2">
              <div className="text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Vantagens
              </div>
              <ul className="text-xs text-emerald-100/80 space-y-0.5 list-disc list-inside">
                <li>Não precisa instalar nenhum software adicional</li>
                <li>Terminal estilo Pronterface embutido (TX/RX em tempo real)</li>
                <li>Ações rápidas: homing, zerar posições, monitorar temperatura</li>
                <li>Pausa/retomada e parada de emergência (M112)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* OPÇÃO 2: PRONTERFACE */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 font-black">
              2
            </div>
            <h3 className="text-xl font-bold text-white">
              Opção 2: Usar Pronterface (software desktop)
            </h3>
          </div>
          <div className="ml-12 space-y-3">
            <p className="text-sm text-gray-400">
              Pronterface é parte do <b className="text-violet-300">Printrun</b>, um conjunto de ferramentas
              open-source para controle de impressoras 3D/bioimpressoras via G-code.
            </p>
            <Step
              n={1}
              text={
                <>
                  Baixe o Printrun no site oficial:{" "}
                  <a
                    href="https://github.com/kliment/Printrun/releases"
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-400 hover:underline inline-flex items-center gap-1"
                  >
                    github.com/kliment/Printrun/releases
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              }
            />
            <Step n={2} text="Instale o executável para seu sistema (Windows: .exe, Mac: .dmg, Linux: pacote .deb ou rode via Python)" />
            <Step n={3} text="Abra o Pronterface (pode ser um ícone 'pronterface.exe' ou 'Printrun')" />
            <Step n={4} text='No canto superior esquerdo, selecione a PORTA COM (ex.: COM3 no Windows, /dev/ttyUSB0 no Linux) e o BAUD (geralmente 115200)' />
            <Step n={5} text='Clique em "Connect" — o terminal mostra resposta do firmware' />
            <Step n={6} text='Baixe o .gcode da BIA (botão "Baixar .gcode" na página de resultado)' />
            <Step n={7} text='No Pronterface, clique em "Load file" e selecione o .gcode baixado' />
            <Step n={8} text='Clique em "Print" — acompanhe o progresso no painel central (visualização 2D + terminal)' />
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-3 mt-2">
              <div className="text-xs font-bold text-violet-300 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Dicas Pronterface
              </div>
              <ul className="text-xs text-violet-100/80 space-y-0.5 list-disc list-inside">
                <li>Use o painel de controle manual (setas XYZ) para posicionar o bico</li>
                <li>Comando <code className="bg-black/40 px-1 rounded">G28</code> faz homing</li>
                <li>Comando <code className="bg-black/40 px-1 rounded">M114</code> mostra posição atual</li>
                <li>O visualizador 2D mostra o toolpath antes de imprimir (igual ao preview da BIA)</li>
                <li>Para bioimpressão, ajuste o &quot;print speed&quot; para 5-20 mm/s (mais lento que FDM normal)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* OPÇÃO 3: OCTOPRINT */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black">
              3
            </div>
            <h3 className="text-xl font-bold text-white">
              Opção 3: OctoPrint em Raspberry Pi (profissional/remoto)
            </h3>
          </div>
          <div className="ml-12 space-y-3">
            <p className="text-sm text-gray-400">
              OctoPrint é a solução padrão profissional: transforma qualquer Raspberry Pi (3B+ ou superior)
              num servidor web local que controla a impressora, monitora via câmera e aceita upload de G-code pelo navegador.
            </p>
            <Step
              n={1}
              text={
                <>
                  Baixe a imagem OctoPi (OctoPrint + Raspbian):{" "}
                  <a
                    href="https://octoprint.org/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    octoprint.org/download
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              }
            />
            <Step n={2} text="Grave a imagem num cartão SD (use Raspberry Pi Imager — ele já oferece OctoPi no menu de imagens customizadas)" />
            <Step n={3} text="Configure Wi-Fi direto pelo Imager ou editando octopi-wpa-supplicant.txt no SD" />
            <Step n={4} text="Conecte o Raspberry Pi na energia e na bioimpressora (via USB-B)" />
            <Step n={5} text="Após 2-3 min, acesse http://octopi.local (ou o IP do Pi na rede) pelo navegador de qualquer dispositivo" />
            <Step n={6} text='Faça o setup inicial: usuário, senha, perfil da impressora (tamanho de mesa, firmware)' />
            <Step n={7} text='Baixe o .gcode da BIA e arraste-o para a área "Upload" do OctoPrint' />
            <Step n={8} text='Clique em "Start" — acompanhe o progresso, temperatura e webcam remotamente' />
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mt-2">
              <div className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Vantagens do OctoPrint
              </div>
              <ul className="text-xs text-amber-100/80 space-y-0.5 list-disc list-inside">
                <li>Monitoramento remoto (do celular, outra sala)</li>
                <li>Time-lapse com câmera Pi Camera ou webcam USB</li>
                <li>Plugins: Bed Visualizer, Cancel Object, OctoLapse</li>
                <li>Fila de impressões (várias amostras em sequência)</li>
                <li>API REST para integração com a BIA (futuro)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* TROUBLESHOOTING */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Troubleshooting (problemas comuns)
          </h3>
          <div className="space-y-2">
            <Issue
              q='A BIA não mostra o diálogo de "Conectar" ou dá erro "serial API not supported"'
              a="Você está usando um navegador não suportado. Abra a BIA no Chrome 89+ ou Edge 89+ (no desktop, não no celular). Firefox e Safari não suportam Web Serial API."
            />
            <Issue
              q="A impressora não aparece no diálogo do navegador"
              a="Verifique: (1) o cabo USB está conectado; (2) a impressora está LIGADA (interruptor traseiro); (3) o driver CH340/FTDI/CP210x está instalado. No Windows, abra o Gerenciador de Dispositivos e veja se aparece uma porta COM nova ao conectar."
            />
            <Issue
              q='Conecto, mas o terminal mostra caracteres estranhos ou lixo'
              a="Baud rate errado. Desconecte, mude o baud no dropdown (experimente 115200, depois 250000) e reconecte. BioEnder e Ender 3 sempre usam 115200."
            />
            <Issue
              q="O envio de G-code começa mas trava no meio"
              a="O buffer da impressora encheu. A BIA envia com pausa de 20ms entre linhas para evitar isso, mas em G-code muito denso pode precisar aumentar. Alternativa: salve o .gcode no cartão SD e imprima localmente."
            />
            <Issue
              q="A impressora move na direção errada ou não move"
              a="Problema de firmware ou calibração — nada a ver com a BIA. Teste primeiro na Pronterface ou no LCD da própria impressora: faça homing (G28) e movimentos manuais. Se não funcionar, reconfigure o firmware (Marlin Configuration.h)."
            />
            <Issue
              q="M112 (parada de emergência) não funciona"
              a="M112 trava o firmware — a IMPRESSORA PRECISA SER REINICIADA fisicamente (desligar/religar). É normal. É uma parada de segurança, não um pause."
            />
          </div>
        </section>

        {/* SAFETY */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Segurança — SEMPRE ANTES DE IMPRIMIR
          </h3>
          <div className="rounded-xl border-2 border-red-500/40 bg-red-950/20 p-4 space-y-2">
            <SafetyItem text="NIVELE a mesa antes de cada sessão (parafusos + teste da folha de papel)" />
            <SafetyItem text="Calibre o Z-OFFSET (altura do bico na primeira camada = 0.1-0.3 mm)" />
            <SafetyItem text="A BIA injeta G92 X0 Y0 Z0 E0 + G1 Z0.4 no início — mas você ainda precisa fazer HOMING (G28) antes" />
            <SafetyItem text="Nunca toque no bico durante a impressão (pode estar a 60°C para PCL)" />
            <SafetyItem text="Use bioink dentro do prazo de validade e à temperatura certa (ex.: GelMA 37°C, alginato 4-22°C)" />
            <SafetyItem text="Tenha um botão de parada de emergência físico acessível (muitas impressoras têm)" />
            <SafetyItem text="Para experimentos com células: trabalhe em fluxo laminar, não no ambiente comum do lab" />
          </div>
        </section>

        {/* LINKS ÚTEIS */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Links úteis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ExtLink href="https://marlinfw.org/docs/gcode/G028.html" label="Marlin G-code Reference" />
            <ExtLink href="https://reprap.org/wiki/G-code" label="RepRap G-code Wiki" />
            <ExtLink href="https://github.com/kliment/Printrun" label="Printrun (Pronterface) no GitHub" />
            <ExtLink href="https://octoprint.org/" label="OctoPrint (Raspberry Pi)" />
            <ExtLink href="https://developer.chrome.com/docs/capabilities/serial" label="Web Serial API Docs (Chrome)" />
            <ExtLink href="https://github.com/MarlinFirmware/Marlin" label="Marlin Firmware" />
          </div>
        </section>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════
function Check({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-emerald-100">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  )
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm text-gray-200">
      <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
        {n}
      </div>
      <div className="flex-1 pt-0.5">{text}</div>
    </div>
  )
}

function DriverRow({
  chip, used, windows, mac, linux,
}: {
  chip: string; used: string; windows: string; mac: string; linux: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Cable className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-white">{chip}</span>
      </div>
      <div className="text-[11px] text-gray-400 mb-2">Usado em: {used}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <a href={windows} target="_blank" rel="noreferrer" className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-2 py-0.5 rounded hover:bg-blue-500/30 transition-colors inline-flex items-center gap-1">
          Windows <ExternalLink className="w-3 h-3" />
        </a>
        <a href={mac} target="_blank" rel="noreferrer" className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-2 py-0.5 rounded hover:bg-blue-500/30 transition-colors inline-flex items-center gap-1">
          Mac <ExternalLink className="w-3 h-3" />
        </a>
        <span className="bg-gray-600/20 border border-gray-500/40 text-gray-300 px-2 py-0.5 rounded">
          Linux: {linux}
        </span>
      </div>
    </div>
  )
}

function Issue({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-lg border border-white/10 bg-black/30 p-3 group">
      <summary className="cursor-pointer text-sm font-semibold text-amber-300 flex items-start gap-2">
        <span className="text-amber-400 group-open:rotate-90 transition-transform">▶</span>
        {q}
      </summary>
      <div className="text-sm text-gray-300 mt-2 ml-5 leading-relaxed">{a}</div>
    </details>
  )
}

function SafetyItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-red-100">
      <Zap className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  )
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/10 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-all text-sm text-gray-300 hover:text-emerald-300"
    >
      <ExternalLink className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
    </a>
  )
}
