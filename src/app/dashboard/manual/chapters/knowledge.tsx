/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 9: Motor de Conhecimento
 *  ───────────────────────────────────────────────────────────────────────
 *  Busca científica integrada (PubMed, arXiv, patentes) com filtros
 *  e dossiês automáticos.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  BookOpen, Search, Filter, FileSearch, Sparkles, Award,
  Globe, Library, BookMarked, ChevronRight,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function Knowledge() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={9}
        badge="KNOWLEDGE"
        title="Motor de Conhecimento — busca científica unificada"
        icon={BookOpen}
        gradient="from-amber-500/15 to-yellow-500/15 border-amber-500/20"
        lead={<>
          O <strong className="text-white">Motor de Conhecimento</strong> faz buscas em paralelo em
          PubMed, arXiv, bioRxiv, Patents, Crossref e ClinicalTrials, devolvendo já filtrado por
          relevância, ano, fator de impacto e tipo de evidência. Use para revisar a literatura
          sem perder horas no Google Scholar.
        </>}
        href="/dashboard/knowledge"
        hrefLabel="Abrir Motor de Conhecimento"
        readMin={6}
        cost="2 créditos por consulta · Dossiê: 15 créditos"
      />

      {/* ─── Fontes ──────────────────────────────────────────────── */}
      <Box2 icon={Library} title="Fontes consultadas em paralelo" tone="amber">
        <p className="mb-3">Em cada busca a plataforma consulta simultaneamente:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MiniCard title="Biomédica" items={["PubMed", "MEDLINE", "Embase"]} />
          <MiniCard title="Preprints" items={["arXiv", "bioRxiv", "medRxiv"]} />
          <MiniCard title="Patentes" items={["USPTO", "EPO", "WIPO"]} />
          <MiniCard title="Clínicas" items={["ClinicalTrials.gov", "ICTRP (WHO)"]} />
          <MiniCard title="Citações" items={["Crossref", "Semantic Scholar"]} />
          <MiniCard title="Regulatório" items={["ANVISA", "FDA", "EMA"]} />
        </div>
      </Box2>

      {/* ─── Passo a passo ───────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Como buscar</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Digite em linguagem natural" icon={Search} accent="blue">
          <p>
            Você não precisa usar operadores booleanos. Pode escrever
            <em> "bioimpressão de cartilagem com GelMA e condrócitos em hidrogel duplo"</em> que
            a plataforma traduz internamente para a sintaxe correta de cada banco.
          </p>
          <ProTip>
            Quanto mais específico, melhor. Inclua o tecido, o material, o tipo celular e
            (opcional) o desfecho que você quer (viabilidade? expressão gênica? mecânica?).
          </ProTip>
        </StepCard>

        <StepCard n={2} title="Aplique filtros" icon={Filter} accent="purple">
          <p>Na barra lateral esquerda você pode restringir:</p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• <strong>Período</strong> — últimos 12 meses, 5 anos, todos</li>
            <li>• <strong>Tipo de estudo</strong> — revisão sistemática, ensaio clínico, in vivo, in vitro</li>
            <li>• <strong>Fator de impacto</strong> — pré-define um corte mínimo (ex: ≥ 5)</li>
            <li>• <strong>Idioma</strong> — inglês, português, espanhol, etc.</li>
            <li>• <strong>Acesso aberto</strong> — apenas papers com PDF gratuito</li>
          </ul>
        </StepCard>

        <StepCard n={3} title="Veja a lista de resultados" icon={BookMarked} accent="amber">
          <p>
            Cada resultado mostra: título, autores, journal, ano, DOI, abstract (clicável para
            expandir), e três botões:
          </p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• <strong className="text-blue-300">Resumir</strong> — IA gera 3 bullets do paper</li>
            <li>• <strong className="text-purple-300">Salvar</strong> — adiciona ao seu projeto</li>
            <li>• <strong className="text-amber-300">Citar</strong> — copia BibTeX/RIS para sua referência</li>
          </ul>
        </StepCard>

        <StepCard n={4} title="Gere um dossiê" icon={FileSearch} accent="emerald">
          <p>
            Selecione 10–30 papers de interesse e clique em <strong>"Gerar Dossiê"</strong>.
            A IA produz um documento de revisão de literatura, organizado por subtema,
            com tabela comparativa, gráfico de evolução temporal e gaps de pesquisa identificados.
          </p>
          <ScreenSpot>
            O botão <strong>"Gerar Dossiê"</strong> só aparece quando você seleciona ≥ 5 papers.
          </ScreenSpot>
        </StepCard>
      </div>

      {/* ─── Dossiês prontos ─────────────────────────────────────── */}
      <Box2 icon={Award} title="Dossiês temáticos prontos" tone="ok">
        <p className="mb-3">
          A plataforma mantém uma biblioteca de dossiês curados, atualizados mensalmente,
          que você pode baixar diretamente (não custa créditos):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <MiniCard title="Bioimpressão" items={[
            "Hidrogéis bioimprimíveis 2020-2025",
            "Vascularização em scaffolds 3D",
            "Bioimpressão de pele para queimados",
            "Cartilagem articular impressa",
          ]} />
          <MiniCard title="Organoides" items={[
            "Organoides cerebrais — protocolos",
            "Organoides intestinais para drug screening",
            "Tumoroides personalizados",
            "Organoides + microfluídica",
          ]} />
          <MiniCard title="Regulatório" items={[
            "GMP cell therapy — ANVISA 2024",
            "FDA guidance bioprinted products",
            "EMA ATMP framework",
            "Importação de bioinks para clínica",
          ]} />
          <MiniCard title="Translacional" items={[
            "Primeiros ensaios clínicos com bioimpressão",
            "Custo de fabricação de produto bioimpresso",
            "Reembolso por SUS / planos privados",
            "Patentes-chave em bioimpressão",
          ]} />
        </div>
      </Box2>

      {/* ─── Cuidados ────────────────────────────────────────────── */}
      <Box2 icon={Globe} title="O que esperar (e o que não esperar)" tone="warn">
        <p className="mb-2"><strong className="text-amber-200">O que a IA faz bem:</strong></p>
        <ul className="space-y-1 list-disc list-inside ml-2 text-xs mb-3">
          <li>Encontrar papers relevantes em segundos</li>
          <li>Resumir resultados objetivamente</li>
          <li>Comparar metodologias entre estudos</li>
          <li>Identificar gaps onde poucos papers existem</li>
        </ul>
        <p className="mb-2"><strong className="text-amber-200">O que a IA NÃO faz:</strong></p>
        <ul className="space-y-1 list-disc list-inside ml-2 text-xs">
          <li>Substituir leitura crítica do paper completo</li>
          <li>Avaliar qualidade metodológica em detalhe</li>
          <li>Decidir qual paper citar na sua tese — isso é com você</li>
        </ul>
        <Pitfall>
          Sempre <strong>leia o paper original</strong> antes de citar. O resumo da IA é um
          ponto de partida, não um substituto.
        </Pitfall>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Sparkles} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="A busca cobre papers em português?">
            Sim, mas a maior parte da literatura técnica é em inglês. Recomendamos buscar em inglês para maior cobertura.
          </FaqItem>
          <FaqItem q="Posso baixar o PDF direto da plataforma?">
            Para artigos de acesso aberto, sim (botão "Download PDF"). Para papers atrás de paywall, mostramos o link da editora.
          </FaqItem>
          <FaqItem q="Como exportar a lista de referências para o Word?">
            Selecione → "Citar" → escolha o formato (ABNT, APA, Vancouver, BibTeX) → "Copiar tudo".
          </FaqItem>
          <FaqItem q="A IA inventa referências (alucinações)?">
            Não. Todos os papers listados vêm de buscas reais; cada um tem DOI verificado. Avise se encontrar uma exceção.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
