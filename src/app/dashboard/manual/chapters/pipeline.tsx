/**
 * BIA · Manual · Capítulo — Pipeline (gestão de projetos)
 */

"use client"

import {
  GitBranch, FolderKanban, Tag, Users, Clock, Layers,
  CheckCircle2, Filter, Search, FileText, Plus, ArrowRight,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs } from "./_components"

export function ChapterPipeline() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={2}
        badge="ORGANIZAÇÃO"
        title="Pipeline — gestão dos seus projetos"
        icon={GitBranch}
        gradient="from-indigo-500/15 to-violet-500/15 border-indigo-500/20"
        href="/dashboard/pipeline"
        hrefLabel="Abrir Pipeline"
        lead={
          <>
            Pipeline é o seu <strong className="text-white">painel de projetos</strong>: cada
            tecido/scaffold/dispositivo que você está desenvolvendo vira um <em>projeto</em> com
            status, etapas, anexos e linha do tempo. Funciona como um Trello específico para
            biofabricação, com lembretes do que falta antes da próxima fase.
          </>
        }
        readMin={5}
      />

      <Box2 icon={FolderKanban} title="O que é um Pipeline?" tone="info">
        <p className="mb-2">
          Um Pipeline é um projeto científico — desde uma ideia até uma submissão regulatória.
          Cada projeto tem:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <MiniCard title="Identidade" items={[
            "Nome e código interno",
            "Tags (osso, gengiva, vaso…)",
            "Status (rascunho, ativo, concluído)",
          ]} />
          <MiniCard title="Histórico" items={[
            "Data de criação e última edição",
            "Quem editou (em workspaces)",
            "Timeline de eventos",
          ]} />
          <MiniCard title="Conteúdo" items={[
            "Especificações do tecido",
            "Formulações vinculadas",
            "G-codes e protocolos",
          ]} />
        </div>
      </Box2>

      <Box2 icon={Plus} title="Criando seu primeiro projeto" tone="emerald">
        <div className="space-y-4">
          <StepCard n={1} title="Botão Novo Pipeline" icon={Plus} accent="emerald">
            No topo da página, clique em <strong>+ Novo Pipeline</strong>. Abre um formulário
            simples com 3 campos essenciais.
          </StepCard>
          <StepCard n={2} title="Preencher os dados básicos" icon={FileText} accent="blue">
            <ul className="space-y-1 list-disc list-inside text-[13px]">
              <li><strong>Nome do projeto</strong> — ex: "Scaffold cartilagem-osso bizonal v1"</li>
              <li><strong>Aplicação clínica</strong> — escolha do dropdown ou digite livremente</li>
              <li><strong>Tags</strong> — separadas por vírgula (ex: <code>cartilagem, GelMA, FRESH</code>)</li>
              <li><strong>Descrição curta</strong> — 2-3 frases sobre o objetivo</li>
            </ul>
          </StepCard>
          <StepCard n={3} title="Salvar e vincular" icon={CheckCircle2} accent="purple">
            Após salvar, o projeto aparece na lista. Clique nele para abrir a tela de detalhes onde
            você vincula formulações, geometrias, G-codes, protocolos e anotações do Notebook.
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={Layers} title="Estrutura de um projeto detalhado" tone="purple">
        <p className="mb-3">
          Ao abrir um Pipeline, você vê 5 abas principais:
        </p>
        <div className="space-y-2 text-[13px]">
          <TabRow icon={FileText} label="Visão Geral"   desc="Dados básicos, status, descrição. Marca % de progresso por fase do Roteiro." />
          <TabRow icon={Layers}   label="Especificações" desc="Dimensões, módulo elástico alvo, porosidade, densidade celular. Editável a qualquer momento." />
          <TabRow icon={FolderKanban} label="Artefatos" desc="Formulações vinculadas, STL/G-code, protocolos, fotos, dados brutos." />
          <TabRow icon={Clock}    label="Timeline"      desc="Eventos cronológicos automáticos (você gerou G-code em D5) e notas manuais." />
          <TabRow icon={Users}    label="Colaboradores" desc="(Plano ENTERPRISE) — convide colegas com permissão de leitura ou edição." />
        </div>
      </Box2>

      <Box2 icon={Filter} title="Encontrando projetos antigos" tone="cyan">
        <p className="mb-2">
          Conforme você acumula projetos, a barra de busca no topo do Pipeline filtra por:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li><strong className="text-white">Nome</strong> — busca textual no nome e descrição</li>
          <li><strong className="text-white">Tag</strong> — clique numa tag colorida para filtrar tudo dela</li>
          <li><strong className="text-white">Status</strong> — só rascunhos, só ativos, só concluídos</li>
          <li><strong className="text-white">Data</strong> — últimos 7/30/90 dias</li>
        </ul>
        <ProTip>
          Use uma convenção de nomes <strong>consistente</strong>: <code>[aplicação] [biomaterial principal] vN</code>.
          Exemplo: <em>"Cartilagem GelMA v3"</em> — facilita muito na hora de buscar 6 meses depois.
        </ProTip>
      </Box2>

      <Box2 icon={ArrowRight} title="Como o Pipeline conversa com outros módulos" tone="emerald">
        <p className="mb-3">
          O Pipeline é o <strong className="text-white">eixo central</strong> da BIA — todos os outros
          módulos sabem que projeto está aberto e vinculam o que você cria automaticamente:
        </p>
        <div className="space-y-1.5 text-[12px]">
          <Connection from="Formulador Pro"    to="Pipeline" what="Formulação gerada vira anexo do projeto ativo" />
          <Connection from="Bioimpressão → Fatiar" to="Pipeline" what="G-code salvo fica registrado na Timeline" />
          <Connection from="Notebook"          to="Pipeline" what="Cada entrada do caderno pode ser tagueada com o projeto" />
          <Connection from="Protocolos"        to="Pipeline" what="Protocolos salvos aparecem na aba Artefatos" />
          <Connection from="Protocolo Total"   to="Pipeline" what="Compila TODO o projeto num documento único" />
        </div>
      </Box2>

      <Box2 icon={CheckCircle2} title="Boas práticas" tone="ok">
        <ul className="space-y-1.5 list-disc list-inside text-[13px]">
          <li>Crie 1 Pipeline por <strong>variante</strong> (não 1 por experimento). Variações de
            parâmetro ficam dentro do mesmo Pipeline, na Timeline.</li>
          <li>Use <strong>status "Concluído"</strong> quando o projeto vira artigo/produto — assim os
            ativos não poluem sua lista de trabalho.</li>
          <li>Faça <strong>uma exportação Protocolo Total</strong> mensal: gera um snapshot PDF
            cronológico que serve de backup e de relatório.</li>
        </ul>
        <Pitfall>
          Apagar um Pipeline <strong>não apaga</strong> as formulações, G-codes e protocolos vinculados —
          eles continuam em seus módulos individuais. Mas você perde a linha do tempo e os vínculos.
          Em caso de dúvida, marque como <em>Arquivado</em> em vez de excluir.
        </Pitfall>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function TabRow({ icon: Icon, label, desc }: { icon: React.ElementType; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/8">
      <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-violet-300" />
      </div>
      <div className="flex-1">
        <div className="text-white font-semibold">{label}</div>
        <div className="text-gray-400 text-[11px] leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

function Connection({ from, to, what }: { from: string; to: string; what: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
      <span className="text-emerald-300 font-mono text-[11px]">{from}</span>
      <ArrowRight className="w-3 h-3 text-gray-500 shrink-0" />
      <span className="text-violet-300 font-mono text-[11px]">{to}</span>
      <span className="text-gray-400 text-[11px] ml-1">— {what}</span>
    </div>
  )
}
