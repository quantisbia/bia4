/**
 * BIA · Manual · Capítulo — Roteiro Profissional
 */

"use client"

import {
  Map, Target, BookOpen, FlaskConical, GitBranch, Printer,
  Box, Zap, ClipboardCheck, Microscope, FileText, Sparkles,
} from "lucide-react"
import { Box2, ChapterCover, MiniCard, ProTip, Pitfall, WhereIs } from "./_components"

export function ChapterRoadmap() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={1}
        badge="PLANEJAMENTO"
        title="Roteiro Profissional"
        icon={Map}
        gradient="from-violet-500/15 to-purple-500/15 border-violet-500/20"
        href="/dashboard/roadmap"
        hrefLabel="Abrir Roteiro"
        lead={
          <>
            O <strong className="text-white">Roteiro Profissional</strong> é o seu mapa de 10 fases para
            sair do problema clínico até o tecido impresso validado. Cada fase tem
            <em> objetivo claro</em>, <em>duração estimada</em>, <em>módulo BIA recomendado</em> e
            o <em>entregável esperado</em>. Use como guia geral — você não precisa seguir linearmente.
          </>
        }
        readMin={6}
      />

      <Box2 icon={Target} title="Por que existe um Roteiro?" tone="info">
        <p className="mb-2">
          Projetos de biofabricação típicos levam <strong className="text-white">3 a 6 meses</strong> e
          envolvem dezenas de decisões interligadas: tecido alvo, biomaterial, geometria, parâmetros
          de impressão, cultura, caracterização, regulatório.
        </p>
        <p>
          O Roteiro existe para você <strong className="text-white">nunca perder o fio da meada</strong> —
          em qualquer momento sabe em que fase está, o que falta, e qual o próximo passo concreto.
          É inspirado em workflows ASTM F2150, ISO 10993 e FDA Regulatory Science, mas
          simplificado para uso prático no laboratório.
        </p>
      </Box2>

      <Box2 icon={Sparkles} title="As 10 fases em 1 minuto" tone="purple">
        <div className="space-y-2">
          <Phase n={1}  icon={Sparkles}      title="Definir o Problema Clínico"        duration="1–2 dias"  module="Chat IA" />
          <Phase n={2}  icon={BookOpen}      title="Revisão de Literatura & Patentes"  duration="3–7 dias"  module="Motor de Conhecimento" />
          <Phase n={3}  icon={GitBranch}     title="Especificações do Tecido"          duration="2–3 dias"  module="Pipeline" />
          <Phase n={4}  icon={FlaskConical}  title="Selecionar e Formular o Biomaterial" duration="3–5 dias" module="Formulador Pro" />
          <Phase n={5}  icon={Box}           title="Modelar a Geometria 3D"            duration="2–4 dias"  module="Bioimpressão → Modelo" />
          <Phase n={6}  icon={Zap}           title="Gerar G-code & Otimizar Parâmetros" duration="1–3 dias" module="Bioimpressão → Fatiar" />
          <Phase n={7}  icon={Printer}       title="Imprimir o Construto"              duration="1–2 dias"  module="Bioimpressão → Executar" />
          <Phase n={8}  icon={FlaskConical}  title="Cultura & Maturação"               duration="7–28 dias" module="Notebook" />
          <Phase n={9}  icon={Microscope}    title="Caracterizar & Validar"            duration="14–30 dias" module="Análises" />
          <Phase n={10} icon={FileText}      title="Documentar & Publicar / Submeter"  duration="30–90 dias" module="Protocolo Total" />
        </div>
        <ProTip>
          Cada card do Roteiro tem um botão <strong>Abrir módulo recomendado</strong> que já te
          leva pra a tela certa com o contexto carregado. Não precisa decorar onde fica cada coisa.
        </ProTip>
      </Box2>

      <Box2 icon={ClipboardCheck} title="Como acompanhar o progresso" tone="emerald">
        <p className="mb-2">
          O Roteiro <strong className="text-white">não impõe ordem rígida</strong>. Você pode pular fases,
          fazer em paralelo, voltar atrás. O que ele garante é:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <MiniCard title="Sempre visível"  items={[
            "Em que fase você está",
            "O que falta antes da próxima",
            "Quem é o entregável esperado",
          ]} />
          <MiniCard title="Sempre acessível" items={[
            "Atalho para o módulo BIA da fase",
            "Lista de passos numerados",
            "Dicas práticas inline (Lightbulb)",
          ]} />
        </div>
      </Box2>

      <Box2 icon={FlaskConical} title="Exemplo: regeneração de cartilagem em joelho" tone="cyan">
        <p className="mb-3 text-[13px]">
          Para te dar ideia concreta, aqui está como um projeto real flui pelo Roteiro:
        </p>
        <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-[12px] space-y-2">
          <ExampleRow phase="1" what="Defeito condral focal de 2 cm² em platô tibial; paciente 45-60 anos; alternativa atual é microfratura com 60% falha em 5 anos." />
          <ExampleRow phase="2" what="40 papers + 8 patentes mapeados; gap = scaffold com porosidade dual-zone (300µm para cartilagem, 100µm para osso subcondral)." />
          <ExampleRow phase="3" what="Especificações: cilindro Ø10mm × h5mm; E* = 0.5–1.5 MPa; vascularização zero; viabilidade > 85% em D7." />
          <ExampleRow phase="4" what="Formulador Pro: GelMA 10% + alginato 2% + condroitina sulfato 0.5% + FRESH support. Score 87/100." />
          <ExampleRow phase="5" what="Bioimpressão → Modelo → 'Disco vascularizado' (paramétrico) com 60% porosidade." />
          <ExampleRow phase="6" what="Bioimpressão → Fatiar → infill TPMS gyroid; nozzle 0.41mm; feedrate 600 mm/min." />
          <ExampleRow phase="7" what="Bioimpressão → Executar → impressão de 4 réplicas em ~12 min." />
          <ExampleRow phase="8" what="Notebook: registro diário de troca de meio, fotos por trans-iluminação, viabilidade Live/Dead em D7 e D14." />
          <ExampleRow phase="9" what="Análises: ensaio de compressão (Young), histologia (safranina-O), qPCR (COL2A1/ACAN)." />
          <ExampleRow phase="10" what="Protocolo Total exporta documento ABNT com dados, gráficos, DOIs e classificação regulatória estimada." />
        </div>
        <Pitfall>
          Não tente <strong>imprimir antes de formular</strong>. Bioimpressão é a etapa mais demorada
          e cara — fazer com biotinta mal calibrada é desperdício. A ordem 4→5→6→7 existe por isso.
        </Pitfall>
      </Box2>

      <Box2 icon={Map} title="Quando NÃO usar o Roteiro?" tone="warn">
        <p className="mb-2">
          O Roteiro é genérico — projetos com requisitos atípicos podem precisar adaptação:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li><strong>Estudos puramente in vitro</strong> sem geometria 3D: pule fases 5, 6, 7 e foque em 1-4 + 8-10.</li>
          <li><strong>Caracterização de biotinta sem impressão</strong>: 1-4 + 9.</li>
          <li><strong>Validação de bioimpressora</strong> (qualificação de equipamento): use só 6-7 com geometrias-padrão de teste.</li>
          <li><strong>Educação / aulas</strong>: rode 1-4 com o Chat IA e o Formulador Pro num único dia.</li>
        </ul>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function Phase({ n, icon: Icon, title, duration, module }: {
  n: number; icon: React.ElementType; title: string; duration: string; module: string
}) {
  return (
    <div className="grid grid-cols-[auto,1fr,auto,auto] gap-2 items-center px-2 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-[12px]">
      <div className="w-6 h-6 rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-200 text-[11px]">
        {n}
      </div>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-violet-300" />
        <span className="text-white font-semibold">{title}</span>
      </div>
      <span className="text-[10px] text-gray-500 font-mono">{duration}</span>
      <span className="text-[10px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded">{module}</span>
    </div>
  )
}

function ExampleRow({ phase, what }: { phase: string; what: string }) {
  return (
    <div className="grid grid-cols-[auto,1fr] gap-2 items-start">
      <span className="text-[10px] font-mono text-violet-400 mt-0.5 bg-violet-500/10 px-1.5 py-0.5 rounded">Fase {phase}</span>
      <span className="text-gray-300 leading-relaxed">{what}</span>
    </div>
  )
}
