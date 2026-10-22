/**
 * BIA · Manual · Capítulo — Bioimpressão · Fase 1 de 6 · Modelo de tecido (R24)
 *
 * R24: a Fase 1 NÃO tem STL. Ela registra a intenção (tecido, aplicação,
 * tamanho, células) e a BIA sugere modelo/perfil/biotinta/alvo para as
 * próximas fases. Toda geometria 3D vive na Fase 3 · Fatiamento.
 */

"use client"

import {
  Box, Sparkles, CheckCircle2, AlertTriangle, Layers, Droplets, Target,
  Ruler, Users, ListChecks, ArrowRight, Beaker, ClipboardCheck, Gamepad2,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterBioprintModel() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={3}
        badge="FASE 1 DE 6 · R24"
        title="Bioimpressão · Modelo de tecido"
        icon={Box}
        gradient="from-emerald-500/15 to-cyan-500/15 border-emerald-500/20"
        href="/dashboard/bioprint/model"
        hrefLabel="Abrir Fase 1"
        lead={
          <>
            A bioimpressão na BIA segue <strong className="text-white">um racional único em 6 fases</strong>,
            do tecido ao tecido. A Fase 1 responde a uma pergunta simples: <em>o que você vai bioimprimir?</em>{" "}
            Aqui <strong className="text-white">não há STL nem modelagem 3D</strong> — você descreve o tecido-alvo,
            a aplicação, o tamanho e se leva células, e a BIA traduz isso em sugestões para as fases seguintes.
          </>
        }
        readMin={6}
      />

      <Box2 icon={ListChecks} title="O racional das 6 fases" tone="info">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
          <Phase n={1} icon={Box} label="Modelo de tecido" what="O que você quer construir (sem STL)." color="emerald" />
          <Phase n={2} icon={Droplets} label="Biotinta" what="Receita validada + células." color="cyan" />
          <Phase n={3} icon={Layers} label="Fatiamento" what="O ÚNICO lugar de STL/geometria → G-code." color="purple" />
          <Phase n={4} icon={Gamepad2} label="Bioimpressão (Host)" what="USB, stream do G-code, viabilidade live." color="amber" />
          <Phase n={5} icon={ClipboardCheck} label="Análise" what="Nota + relato → ajustes no próximo G-code." color="blue" />
          <Phase n={6} icon={Beaker} label="Maturação" what="Cultura, biorreator, caracterizações." color="rose" />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Cada fase desbloqueia a próxima. Esferoides e organoides são <em>scaffold-free</em> e não passam por este
          fluxo — ficam no <strong className="text-white">Organoid Builder</strong>, no grupo “Esferoides &amp; Organoides”.
        </p>
      </Box2>

      <div className="flex flex-wrap items-center gap-2">
        <WhereIs path="Dashboard → Bioimprimir → Fase 1 · Modelo de tecido" />
        <span className="text-[11px] text-gray-500">ou</span>
        <WhereIs path="/dashboard/bioprint/model" />
      </div>

      <h3 className="text-lg font-bold text-white pt-2">Passo a passo</h3>

      <StepCard n={1} title="Escolha o tecido-alvo" icon={Box} accent="emerald">
        <p>
          Nove cartões: <strong className="text-white">cartilagem</strong> (menisco, orelha, nariz),{" "}
          <strong className="text-white">pele</strong> (derme + epiderme), <strong className="text-white">osso</strong>,{" "}
          <strong className="text-white">vascular</strong>, <strong className="text-white">miocárdio</strong>,{" "}
          <strong className="text-white">renal</strong>, <strong className="text-white">hepático</strong>,{" "}
          <strong className="text-white">neural</strong> e <strong className="text-white">teste de imprimibilidade</strong>.
          Cada cartão já carrega o racional biológico (ex.: cartilagem pede paredes contínuas e poros hexagonais de
          300–400 µm; pele segue o protocolo CELLINK SKIN de 3 camadas, um cabeçote por camada).
        </p>
        <ProTip>
          Primeira vez com uma biotinta nova? Comece por <em>Teste de imprimibilidade</em>: a BIA leva você ao modelo de
          fidelidade/grade da Fase 3 e você qualifica a tinta (Pf, colapso, torre) antes de gastar células.
        </ProTip>
      </StepCard>

      <StepCard n={2} title="Aplicação e tamanho" icon={Ruler} accent="cyan">
        <p>
          Marque a aplicação (implante/reconstrução, modelo de doença, scaffold para cultura, screening…) e ajuste a{" "}
          <strong className="text-white">dimensão principal</strong> no controle deslizante — o intervalo muda por tecido
          (ex.: patch de pele 6–30 mm; menisco 10–60 mm). Essa dimensão vai direto para a Fase 3, que escala o modelo
          mantendo a proporção.
        </p>
      </StepCard>

      <StepCard n={3} title="Com ou sem células" icon={Users} accent="purple">
        <p>
          Se o construto leva células, a BIA já indica os tipos usuais (condrócitos/hMSC, fibroblastos + queratinócitos,
          HUVEC…) e, nas fases seguintes, prioriza perfis de baixo cisalhamento, bico maior e velocidades moderadas. Sem
          células, o foco passa a ser fidelidade de forma e tempo de impressão.
        </p>
      </StepCard>

      <StepCard n={4} title="Leia o painel “A BIA sugere” e confirme" icon={Sparkles} accent="amber">
        <p>À direita, a BIA mostra o que vai propor para as próximas fases:</p>
        <ul className="mt-2 space-y-1">
          <li className="flex items-start gap-2"><Layers className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" /><span><strong className="text-white">Modelo 3D</strong> (Fase 3): anatômico real (menisco, rim, vaso, fêmur…) ou primitiva (disco, bloco, tubo).</span></li>
          <li className="flex items-start gap-2"><Target className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" /><span><strong className="text-white">Perfil de fatiamento + infill</strong>: concêntrico, favo de mel, gyroid, triangular, ondas ou sem infill (vasos).</span></li>
          <li className="flex items-start gap-2"><Droplets className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" /><span><strong className="text-white">Biotinta</strong> (Fase 2): GelMA + HA, CELLINK SKIN, alginato-gelatina, FRESH…</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" /><span><strong className="text-white">Alvo</strong>: placa de Petri, placa de 24/96 poços ou lâmina.</span></li>
        </ul>
        <p className="mt-2">
          Clique em <strong className="text-white">Confirmar modelo de tecido</strong>. A Fase 1 fica “Pronta”, a Fase 2
          desbloqueia e o botão <em>Ir para a Fase 3 com as sugestões</em> abre o BioSlicer já com modelo, tamanho,
          perfil, infill e alvo carregados.
        </p>
      </StepCard>

      <Box2 icon={AlertTriangle} title="Onde ficou o STL?" tone="warn">
        <p>
          Em um lugar só: a <strong className="text-white">Fase 3 · Fatiamento (BioSlicer)</strong>. Lá você escolhe modelo
          anatômico real, primitiva, faz upload do seu STL, desenha à mão (Desenhar &amp; Imprimir) ou usa os testes de
          imprimibilidade — e vê a prévia das camadas antes de gerar o G-code. Os antigos “BIA Studio” e “Modelos 3D (STL)”
          foram incorporados ali; links antigos redirecionam automaticamente.
        </p>
        <Pitfall>
          Não procure um botão de upload na Fase 1 — ele não existe de propósito. Definir primeiro <em>o que</em> e
          <em>para quê</em> evita fatiar uma geometria bonita com a biotinta errada.
        </Pitfall>
      </Box2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniCard title="A Fase 1 define" items={["Tecido-alvo e aplicação", "Dimensão principal (mm)", "Com/sem células e tipos usuais", "Sugestões para Fases 2 e 3 (modelo, perfil, infill, biotinta, alvo)", "Tecido-alvo da Fase 6 (protocolos de maturação)"]} />
        <MiniCard title="A Fase 1 NÃO faz" items={["Upload ou geração de STL", "Rotação/escala de malha (isso é a Mesa, na Fase 3)", "Escolha final da biotinta (Fase 2)", "Cobrança de créditos — é gratuita"]} />
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-white">Perguntas frequentes</h3>
        <FaqItem q="Posso pular a Fase 1 e ir direto fatiar?">
          Pode: o BioSlicer (Fase 3) aceita qualquer modelo mesmo sem a Fase 1 pronta — ele só avisa. Mas sem o brief a
          Fase 6 não sabe o tecido-alvo e a Fase 5 perde contexto para aprender com a impressão.
        </FaqItem>
        <FaqItem q="Meu tecido não está na lista">
          Escolha o mais próximo em comportamento mecânico (mole/rígido/tubular) e descreva o detalhe em “Observações”.
          Na Fase 3 você pode trocar o modelo e o infill livremente.
        </FaqItem>
        <FaqItem q="E organoides?">
          Não entram neste fluxo. Use o <strong className="text-white">Organoid Builder</strong> (grupo “Esferoides &amp;
          Organoides”): esferoides e organoides são scaffold-free e seguem protocolos QMicroNiche™/QMatrix™.
        </FaqItem>
      </section>

      <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 p-4 flex items-center gap-3 text-sm text-gray-300">
        <ArrowRight className="w-4 h-4 text-cyan-300 shrink-0" />
        <span>
          Próximo capítulo: <strong className="text-white">Fase 2 · Biotinta</strong> — escolher a receita validada e as células.
        </span>
      </div>
    </article>
  )
}

function Phase({ n, icon: Icon, label, what, color }: {
  n: number; icon: React.ElementType; label: string; what: string
  color: "emerald" | "cyan" | "purple" | "amber" | "blue" | "rose"
}) {
  const palette = {
    emerald: "bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-200",
    cyan:    "bg-cyan-500/[0.06] border-cyan-500/20 text-cyan-200",
    purple:  "bg-purple-500/[0.06] border-purple-500/20 text-purple-200",
    amber:   "bg-amber-500/[0.06] border-amber-500/20 text-amber-200",
    blue:    "bg-blue-500/[0.06] border-blue-500/20 text-blue-200",
    rose:    "bg-rose-500/[0.06] border-rose-500/20 text-rose-200",
  }[color]
  return (
    <div className={`rounded-lg border p-2.5 ${palette}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[10px] font-mono opacity-70">Fase {n}</span>
        <Icon className="w-3.5 h-3.5" />
        <strong className="text-white text-[12.5px]">{label}</strong>
      </div>
      <div className="text-[11px] text-gray-300 leading-snug">{what}</div>
    </div>
  )
}
