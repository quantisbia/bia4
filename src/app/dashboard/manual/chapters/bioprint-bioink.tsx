/**
 * BIA · Manual · Capítulo — Bioimpressão · Etapa 2 · Biotinta
 */

"use client"

import {
  Droplet, FlaskConical, Beaker, Atom, AlertTriangle,
  Sparkles, Search, CheckCircle2, Sliders, TrendingUp,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterBioprintBioink() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={4}
        badge="ETAPA 2 DE 4"
        title="Bioimpressão · Biotinta"
        icon={Droplet}
        gradient="from-cyan-500/15 to-teal-500/15 border-cyan-500/20"
        href="/dashboard/bioprint/bioink"
        hrefLabel="Abrir Biotinta"
        lead={
          <>
            Aqui você define <strong className="text-white">o que vai sair da seringa</strong> — a
            composição da biotinta. Tem três caminhos: usar uma <em>formulação salva</em> do
            Formulador Pro, escolher do <em>catálogo BIA</em> (807 biomateriais) ou criar uma
            <em> nova combinação</em> e testar a viscosidade em tempo real.
          </>
        }
        readMin={7}
      />

      <Box2 icon={Sparkles} title="O que esta etapa decide?" tone="info">
        <p className="mb-2">
          A biotinta determina <strong className="text-white">quase tudo</strong> que vem depois: pressão
          de extrusão, velocidade da impressão, fidelidade de forma, viabilidade celular. Errar
          aqui é o motivo mais comum de impressão falhar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <MiniCard title="O que você define" items={[
            "Biomateriais e concentrações",
            "Tipo de reticulação (UV, iônica, térmica)",
            "Densidade celular (cels/mL)",
            "Aditivos (fatores, drogas)",
          ]} />
          <MiniCard title="A BIA calcula" items={[
            "Viscosidade aparente (Pa·s)",
            "Shear-thinning index",
            "Yield stress (Pa)",
            "Pressão sugerida no bico",
          ]} />
          <MiniCard title="Você recebe" items={[
            "Score de printabilidade 0–100",
            "Janela de operação (P, v, T)",
            "Lista de alertas críticos",
            "Protocolo de mistura",
          ]} />
        </div>
      </Box2>

      <Box2 icon={Search} title="Como navegar nos 807 biomateriais" tone="cyan">
        <p className="mb-2">
          O catálogo é <strong className="text-white">enorme</strong> de propósito — cobre desde clássicos
          (alginato, GelMA) até nichos (proteínas de seda, DNA). Para não se perder:
        </p>
        <ul className="space-y-1.5 list-disc list-inside text-[13px]">
          <li><strong>Filtros à esquerda</strong>: por <em>classe</em> (polissacarídeo, proteína, sintético),
            por <em>origem</em> (mamífero, vegetal, microbiano), por <em>função</em> (estrutural, célula-suporte, releasing).</li>
          <li><strong>Busca textual</strong>: digite parte do nome ou fórmula química (ex: "GelMA", "alginato 2%", "PEG").</li>
          <li><strong>Tags clínicas</strong>: clique nas tags coloridas (osso, gengiva, vaso…) para ver só os
            biomateriais já usados naquele tipo de aplicação.</li>
          <li><strong>Comparar</strong>: marque até 4 com checkbox e clique <em>Comparar</em> para ver lado-a-lado
            (viscosidade, módulo, degradação, custo, fornecedores).</li>
        </ul>
        <ProTip>
          Para começar projetos novos, prefira biomateriais com <strong className="text-emerald-300">selo
          "Validado BIA"</strong> — significa que tem pelo menos 3 artigos peer-reviewed e parâmetros
          reológicos confirmados. Reduz risco de surpresa no laboratório.
        </ProTip>
      </Box2>

      <Box2 icon={Sliders} title="Reologia em tempo real" tone="purple">
        <p className="mb-3">
          Conforme você adiciona biomateriais e ajusta concentrações, um <strong className="text-white">painel
          lateral</strong> recalcula em tempo real (em &lt; 100ms):
        </p>
        <div className="space-y-2 text-[13px]">
          <RheoItem
            param="Viscosidade aparente (η)"
            unit="Pa·s"
            range="0.1 — 1000"
            ideal="10–100 para extrusão"
            note="Calculada via Hagen-Poiseuille a partir das concentrações e do shear rate"
          />
          <RheoItem
            param="Yield stress (τ₀)"
            unit="Pa"
            range="0 — 500"
            ideal="50–200 para fidelidade"
            note="Quanto maior, melhor a forma se mantém após sair do bico"
          />
          <RheoItem
            param="Shear-thinning index (n)"
            unit="—"
            range="0.1 — 1.0"
            ideal="0.3–0.6"
            note="< 1 indica que a tinta fica mais fluida sob pressão (bom)"
          />
          <RheoItem
            param="Tempo de reticulação (t½)"
            unit="s"
            range="0.1 — 600"
            ideal="depende do método"
            note="Iônica (CaCl₂): segundos. UV (LAP): segundos com luz. Térmica (gelatina): minutos"
          />
        </div>
        <ProTip>
          Se a viscosidade ficar acima de <strong>500 Pa·s</strong>, vai precisar de muita pressão
          e o jato sai irregular. Se ficar abaixo de <strong>5 Pa·s</strong>, a tinta espalha
          (não mantém a forma). A faixa-doce é <strong className="text-purple-300">10–100 Pa·s</strong>.
        </ProTip>
      </Box2>

      <Box2 icon={Atom} title="Adicionando células à biotinta" tone="amber">
        <p className="mb-2">
          O catálogo separa <strong className="text-white">tinta acelular</strong> de <strong className="text-white">bioink (com
          células)</strong>. Para virar bioink:
        </p>
        <div className="space-y-3 mt-3">
          <StepCard n={1} title="Escolher tipo celular" icon={FlaskConical} accent="amber">
            Dropdown com tipos comuns: <code>hMSC</code>, <code>condrócitos</code>, <code>hepatócitos</code>,
            <code>iPSC</code>, <code>fibroblastos</code>, <code>HUVEC</code>, etc. Cada um carrega
            parâmetros de viabilidade já mapeados.
          </StepCard>
          <StepCard n={2} title="Definir densidade" icon={Sliders} accent="blue">
            Densidade típica: <strong>1×10⁶ a 1×10⁷ cels/mL</strong>. Muito baixa = constructo não
            funcional. Muito alta = células se asfixiam por falta de difusão.
          </StepCard>
          <StepCard n={3} title="Observar a previsão de viabilidade" icon={CheckCircle2} accent="emerald">
            A BIA aplica o modelo <strong>Blaeser 2016</strong> (shear-stress × tempo no bico) e
            prediz <em>viabilidade pós-impressão</em>. Verde &gt;85%, amarelo 70–85%, vermelho &lt;70%.
          </StepCard>
        </div>
        <Pitfall>
          Bioink com células <strong>não pode esquentar acima de 37 °C</strong> em nenhum
          momento — gelatinas com gel térmico (Pluronic) precisam ser homogeneizadas no frio
          e mantidas em banho à 37°C dentro da seringa. A BIA emite alerta automático.
        </Pitfall>
      </Box2>

      <Box2 icon={TrendingUp} title="Score de printabilidade" tone="emerald">
        <p className="mb-2">
          Cada biotinta recebe um <strong className="text-white">score 0–100</strong> calculado a partir
          de 4 dimensões. Use como guia para decidir se vale a pena imprimir:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <ScoreRow label="Mecânica"          weight="30%" what="Módulo elástico, yield stress, formação de fio" />
          <ScoreRow label="Biológica"         weight="35%" what="Citotoxicidade, viabilidade predita, biocompatibilidade" />
          <ScoreRow label="Manufaturabilidade" weight="20%" what="Viscosidade na janela, tempo de gel, reprodutibilidade" />
          <ScoreRow label="Regulatória"       weight="15%" what="Origem (animal, sintético), pureza, status FDA/ANVISA" />
        </div>
        <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 p-3 mt-3 text-[12px]">
          <strong className="text-emerald-300">Interpretação:</strong>
          <ul className="mt-1 space-y-0.5 text-gray-300">
            <li>• <strong>90–100</strong>: pronta para imprimir, baixo risco</li>
            <li>• <strong>70–89</strong>: imprimível com ajustes; teste rápido recomendado</li>
            <li>• <strong>50–69</strong>: imprimível mas requer otimização extensa</li>
            <li>• <strong>&lt; 50</strong>: reformule antes — provavelmente vai falhar</li>
          </ul>
        </div>
      </Box2>

      <Box2 icon={Beaker} title="Protocolo de mistura automático" tone="default">
        <p className="mb-2">
          Quando você confirma a biotinta, a BIA gera um <strong className="text-white">protocolo de bancada
          passo-a-passo</strong> com:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li>Sequência de adição (qual biomaterial primeiro, ordem importa!)</li>
          <li>pH-alvo e ajuste com NaOH/HCl</li>
          <li>Temperatura de cada etapa</li>
          <li>Tempo de agitação e tipo (stirrer, vortex, banho ultrassônico)</li>
          <li>Quando adicionar células (sempre por último, sob luz amarela se houver LAP)</li>
          <li>Como envasar a seringa sem bolhas</li>
        </ul>
        <p className="text-[12px] text-gray-400 mt-2">
          Exportável em PDF para imprimir e levar pro fluxo laminar. Também fica salvo no Pipeline ativo.
        </p>
      </Box2>

      <Box2 icon={AlertTriangle} title="FAQ rápida da Biotinta" tone="warn">
        <div className="space-y-2.5">
          <FaqItem q="Posso pular esta etapa se já tenho biotinta pronta?">
            Sim — clique em <em>Pular para Fatiamento</em>. Mas perde a otimização automática de
            parâmetros de impressão na próxima etapa. Recomendamos pelo menos preencher
            "viscosidade aproximada" no formulário rápido.
          </FaqItem>
          <FaqItem q="Como uso uma formulação que fiz no Formulador Pro?">
            No topo da página, botão <em>Importar do Formulador Pro</em>. Aparece a lista das suas
            últimas 10 formulações; clique para carregar todos os parâmetros automaticamente.
          </FaqItem>
          <FaqItem q="O catálogo tem alginato de Macrocystis vs. Laminaria?">
            Sim — o catálogo separa por espécie e fornecedor (Sigma, Merck, FMC). Cada um tem
            massa molecular, M/G ratio e pureza específicos. Importa muito para reprodutibilidade.
          </FaqItem>
          <FaqItem q="Preciso saber reologia para usar isto?">
            Não. Os números aparecem para o usuário avançado, mas o <strong>Score de
            printabilidade</strong> resume tudo. Se está verde, pode imprimir.
          </FaqItem>
        </div>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function RheoItem({ param, unit, range, ideal, note }: {
  param: string; unit: string; range: string; ideal: string; note: string
}) {
  return (
    <div className="rounded-lg bg-purple-500/[0.04] border border-purple-500/15 p-2.5">
      <div className="flex items-baseline justify-between mb-1">
        <strong className="text-purple-200 text-[12px]">{param}</strong>
        <span className="text-[10px] text-purple-400 font-mono">{unit}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-1">
        <span>faixa: <span className="text-gray-200 font-mono">{range}</span></span>
        <span>ideal: <span className="text-emerald-300 font-mono">{ideal}</span></span>
      </div>
      <div className="text-[11px] text-gray-500 leading-tight">{note}</div>
    </div>
  )
}

function ScoreRow({ label, weight, what }: { label: string; weight: string; what: string }) {
  return (
    <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">{weight}</span>
      <div>
        <div className="text-emerald-200 font-semibold text-[12px]">{label}</div>
        <div className="text-gray-400 text-[11px]">{what}</div>
      </div>
    </div>
  )
}
