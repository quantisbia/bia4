/**
 * BIA · Manual · Capítulo — Bioimpressão · Fase 2 de 6 · Biotinta
 */

"use client"

import {
  Droplet, FlaskConical, Beaker, Atom, AlertTriangle,
  Sparkles, Search, CheckCircle2, Sliders, TrendingUp,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, FaqItem } from "./_components"

export function ChapterBioprintBioink() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={4}
        badge="FASE 2 DE 6"
        title="Bioimpressão · Biotinta"
        icon={Droplet}
        gradient="from-cyan-500/15 to-teal-500/15 border-cyan-500/20"
        href="/dashboard/bioprint/bioink"
        hrefLabel="Abrir Biotinta"
        lead={
          <>
            Nesta fase define-se a <strong className="text-white">composição da biotinta</strong> — o material que
            será extrudado pela seringa. A Fase 2 é o <strong className="text-white">único local de formulação</strong> da BIA
            e oferece quatro modos, selecionáveis no topo da página: <em>Formulações validadas</em>,
            <em>Laboratório guiado</em>, <em>Formulação livre</em> (catálogo de 807 biomateriais e reologia em tempo real)
            e <em>Formulador Pro</em> (análise científica assistida por IA).
          </>
        }
        readMin={7}
      />

      <Box2 icon={FlaskConical} title="Os quatro modos da Fase 2" tone="cyan">
        <p className="mb-2">
          Todos os modos gravam o resultado no mesmo estado do processo e conduzem à Fase 3 · Fatiamento.
          Rotas antigas (<code>/bioink/lab</code>, <code>/bioink/classic</code>, <code>/formulator-pro</code>) redirecionam para o modo correspondente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <MiniCard title="1. Formulações validadas (padrão)" items={[
            "18 biotintas descritas na literatura (alginato-gelatina, GelMA, Pluronic, FRESH, CELLINK SKIN, dECM…)",
            "Filtro por objetivo: pele, cartilagem, osso, vascular, hepático, neural, cardíaco",
            "Parâmetros de impressão correspondentes carregados automaticamente",
            "Seleção de tipo celular e densidade dentro da faixa validada",
          ]} />
          <MiniCard title="2. Laboratório guiado" items={[
            "Três passos: objetivo e equipamento → formulação recomendada → protocolo de bancada",
            "Janela de biofabricação e quantidades calculadas",
            "Preparo passo a passo, troubleshooting e protocolo exportável",
          ]} />
          <MiniCard title="3. Formulação livre" items={[
            "Material, concentração, agente de reticulação e aditivos",
            "Catálogo de 807 biomateriais com filtros e comparação",
            "Reologia em tempo real (viscosidade, shear-thinning, yield stress)",
            "Configuração multimaterial (até 4 cabeçotes) e exportação ao Notebook",
          ]} />
          <MiniCard title="4. Formulador Pro (IA)" items={[
            "Até 8 componentes, do catálogo ou personalizados",
            "Objetivo clínico e especificações viscoelásticas",
            "Análise científica: score, incompatibilidades, protocolo, ISO/ANVISA",
            "Custo: 10 créditos por análise",
          ]} />
        </div>
      </Box2>

      <Box2 icon={Sparkles} title="O que esta fase determina?" tone="info">
        <p className="mb-2">
          A biotinta condiciona <strong className="text-white">praticamente todas as variáveis subsequentes</strong>: pressão
          de extrusão, velocidade de impressão, fidelidade geométrica e viabilidade celular. Uma formulação
          inadequada é a causa mais frequente de falha na bioimpressão.
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

      <Box2 icon={Search} title="Catálogo de 807 biomateriais (modo Formulação livre)" tone="cyan">
        <p className="mb-2">
          O catálogo é intencionalmente <strong className="text-white">abrangente</strong> — de materiais consolidados
          (alginato, GelMA) a nichos (proteínas de seda, DNA). Recursos de navegação:
        </p>
        <ul className="space-y-1.5 list-disc list-inside text-[13px]">
          <li><strong>Filtros à esquerda</strong>: por <em>classe</em> (polissacarídeo, proteína, sintético),
            por <em>origem</em> (mamífero, vegetal, microbiano), por <em>função</em> (estrutural, célula-suporte, releasing).</li>
          <li><strong>Busca textual</strong>: digite parte do nome ou fórmula química (ex.: “GelMA”, “alginato 2%”, “PEG”).</li>
          <li><strong>Tags clínicas</strong>: clique nas tags coloridas (osso, gengiva, vaso…) para ver só os
            biomateriais já usados naquele tipo de aplicação.</li>
          <li><strong>Comparar</strong>: marque até 4 com checkbox e clique <em>Comparar</em> para ver lado-a-lado
            (viscosidade, módulo, degradação, custo, fornecedores).</li>
        </ul>
        <ProTip>
          Para começar projetos novos, prefira biomateriais com <strong className="text-emerald-300">selo
          “Validado BIA”</strong> — significa que tem pelo menos 3 artigos peer-reviewed e parâmetros
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

      <Box2 icon={AlertTriangle} title="Perguntas frequentes" tone="warn">
        <div className="space-y-2.5">
          <FaqItem q="Já possuo uma biotinta pronta. É possível omitir esta fase?">
            A Fase 3 não bloqueia o fatiamento, mas sem a Fase 2 os parâmetros iniciais (agulha, velocidade,
            altura de camada, temperatura) não são pré-preenchidos. Recomenda-se, no mínimo, selecionar a
            formulação validada mais próxima no modo padrão.
          </FaqItem>
          <FaqItem q="Onde está o Formulador Pro?">
            É o quarto modo da Fase 2 (botão <em>Formulador Pro (IA)</em> no topo da página, ou
            <code> /dashboard/bioprint/bioink?mode=pro</code>). O resultado pode ser enviado diretamente à Fase 3.
          </FaqItem>
          <FaqItem q="O catálogo tem alginato de Macrocystis vs. Laminaria?">
            Sim — o catálogo separa por espécie e fornecedor (Sigma, Merck, FMC). Cada um tem
            massa molecular, M/G ratio e pureza específicos. Importa muito para reprodutibilidade.
          </FaqItem>
          <FaqItem q="É necessário dominar reologia para utilizar esta fase?">
            Não. Os parâmetros reológicos são exibidos para o usuário avançado; o <strong>score de
            imprimibilidade</strong> sintetiza a avaliação. Indicador verde significa formulação apta à impressão.
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
