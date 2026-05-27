/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 8: Protocolos GLP/GMP & Protocolo Total
 *  ───────────────────────────────────────────────────────────────────────
 *  Como gerar protocolos de pesquisa (GLP) e protocolos clínicos (GMP),
 *  e a diferença para o "Protocolo Total" (dossiê completo do projeto).
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  FileText, ShieldCheck, Award, ClipboardList, GitBranch, Lock,
  CheckCircle2, AlertTriangle, FileCheck2, Stamp, ChevronRight,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function Protocols() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={8}
        badge="PROTOCOLS"
        title="Protocolos — pesquisa (GLP) e clínico (GMP)"
        icon={FileText}
        gradient="from-emerald-500/15 to-cyan-500/15 border-emerald-500/20"
        lead={<>
          Aqui você gera os <strong className="text-white">documentos oficiais</strong> de cada etapa
          do seu projeto. Existem dois níveis: <strong className="text-emerald-300">GLP</strong> (boas
          práticas de laboratório, para pesquisa) e <strong className="text-cyan-300">GMP</strong>
          (boas práticas de fabricação, para uso clínico em humanos). Cada um exige um nível diferente
          de rigor, rastreabilidade e validação.
        </>}
        href="/dashboard/protocols"
        hrefLabel="Abrir Protocolos"
        readMin={9}
        cost="GLP: 10 créditos · GMP: 25 créditos · Total: 50 créditos"
      />

      {/* ─── GLP vs GMP ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Box2 icon={ShieldCheck} title="GLP — Pesquisa & Bancada" tone="emerald">
          <p className="mb-2">
            <strong className="text-emerald-200">Good Laboratory Practice</strong>. Para uso em laboratório,
            artigos científicos, patentes, ensaios pré-clínicos em animais.
          </p>
          <ul className="space-y-1 text-xs list-disc list-inside ml-2">
            <li>Rastreabilidade de reagentes (lote, validade)</li>
            <li>Controle de equipamentos e calibração</li>
            <li>Documentação completa do procedimento</li>
            <li>Não exige sala-limpa GMP</li>
            <li>Tempo de geração: ~3 minutos</li>
          </ul>
        </Box2>

        <Box2 icon={Award} title="GMP — Clínico & Humanos" tone="cyan">
          <p className="mb-2">
            <strong className="text-cyan-200">Good Manufacturing Practice</strong>. Obrigatório para
            terapia em humanos, ensaios clínicos fase I/II/III, registro na ANVISA / FDA / EMA.
          </p>
          <ul className="space-y-1 text-xs list-disc list-inside ml-2">
            <li>Sala-limpa classe ISO 5/7 obrigatória</li>
            <li>Validação completa de cada equipamento</li>
            <li>Pessoa qualificada (QP) deve assinar</li>
            <li>Auditoria por agência reguladora</li>
            <li>Tempo de geração: ~8 minutos</li>
          </ul>
          <Pitfall>
            GMP exige infraestrutura específica que não vem com o documento. Verifique se sua
            instituição tem sala-limpa certificada antes de seguir.
          </Pitfall>
        </Box2>
      </div>

      {/* ─── Estrutura do documento ──────────────────────────────── */}
      <Box2 icon={ClipboardList} title="O que vem em cada protocolo" tone="default">
        <p className="mb-3">Todo protocolo gerado contém estas seções, na mesma ordem:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Cabeçalho" items={[
            "Título e código único",
            "Versão e data",
            "Autor e revisores",
            "Aprovação ética (CEP/CONEP)",
          ]} />
          <MiniCard title="Objetivo" items={[
            "Finalidade clínica/científica",
            "Critérios de sucesso",
            "Hipótese",
            "Indicação terapêutica (GMP)",
          ]} />
          <MiniCard title="Materiais" items={[
            "Lista de reagentes com lotes",
            "Equipamentos calibrados",
            "Consumíveis estéreis",
            "Fornecedores aprovados",
          ]} />
          <MiniCard title="Procedimento" items={[
            "Passo-a-passo numerado",
            "Tempos e temperaturas",
            "Pontos críticos (CCP)",
            "Diagramas de fluxo",
          ]} />
          <MiniCard title="Controle de Qualidade" items={[
            "Critérios de aceitação",
            "Métodos analíticos",
            "Especificações de release",
            "Estabilidade",
          ]} />
          <MiniCard title="Anexos" items={[
            "Fichas de segurança (MSDS)",
            "Certificados de análise",
            "Referências bibliográficas",
            "Assinaturas digitais",
          ]} />
        </div>
      </Box2>

      {/* ─── Passo a passo ───────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Como gerar um protocolo</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Selecione o tipo" icon={FileText} accent="blue">
          <p>
            Na página inicial de Protocolos, clique no card <strong>GLP</strong> ou <strong>GMP</strong>.
            Em caso de dúvida, comece com GLP — você pode "promover" depois para GMP.
          </p>
        </StepCard>

        <StepCard n={2} title="Importe do seu projeto" icon={GitBranch} accent="purple">
          <p>
            Cole o ID do projeto ou selecione na lista. A plataforma puxa automaticamente:
            biotinta usada, parâmetros de impressão, fonte celular, scaffold, condições de cultivo.
            Não precisa redigitar nada.
          </p>
          <ScreenSpot>
            Botão azul <strong>"Importar do Pipeline"</strong> no topo da tela.
          </ScreenSpot>
        </StepCard>

        <StepCard n={3} title="Preencha lacunas" icon={ClipboardList} accent="amber">
          <p>
            Alguns campos não são auto-preenchidos — você precisa informar: responsável técnico,
            instituição, comitê de ética, número do projeto, e (em GMP) o pessoal qualificado.
            Campos obrigatórios ficam marcados em <span className="text-rose-300">vermelho</span>.
          </p>
        </StepCard>

        <StepCard n={4} title="Revise e assine" icon={Stamp} accent="emerald">
          <p>
            Antes de finalizar, a IA faz uma revisão automática e aponta inconsistências (ex: lote
            vencido, parâmetro fora da faixa, etapa faltando). Corrija e clique em <strong>Assinar</strong>.
          </p>
          <ProTip>
            Em GMP, a assinatura digital deve ser feita por uma <strong>Pessoa Qualificada (QP)</strong>
            registrada na ANVISA. Convide-a com permissão "Assinatura GMP" via Configurações.
          </ProTip>
        </StepCard>

        <StepCard n={5} title="Baixe e arquive" icon={Lock} accent="cyan">
          <p>
            Exporte como <strong>PDF assinado</strong>. O documento fica armazenado no projeto e
            no ELN com timestamp imutável. Toda alteração futura cria uma nova versão (1.0 → 1.1 → 2.0).
          </p>
        </StepCard>
      </div>

      {/* ─── Protocolo Total ──────────────────────────────────────── */}
      <Box2 icon={FileCheck2} title="Protocolo Total — o dossiê definitivo" tone="purple">
        <p className="mb-3">
          O <strong className="text-purple-200">Protocolo Total</strong> é uma compilação única
          contendo TUDO sobre seu projeto, pronto para submeter a uma agência reguladora ou para
          publicação em revista científica de alto impacto. É o documento "selo de ouro" da plataforma.
        </p>
        <p className="mb-2">Inclui automaticamente:</p>
        <ul className="space-y-1.5 list-disc list-inside ml-2 text-xs">
          <li>Protocolo GLP + protocolo GMP (lado a lado, mostrando a transição)</li>
          <li>Toda a especificação da biotinta (com reologia, citotoxicidade, esterilidade)</li>
          <li>G-code completo, anotado e versionado</li>
          <li>Resultados de bioimpressão (fotos, logs do printer-controller, qualidade)</li>
          <li>Análises histológicas e moleculares (se gerados em Análises)</li>
          <li>Compatibilidade regulatória ANVISA, FDA, EMA, PMDA</li>
          <li>Dossiê de referências (até 200 papers)</li>
          <li>Patentes relacionadas (busca automática)</li>
        </ul>
        <ProTip>
          Use Protocolo Total quando estiver pronto para submeter o seu trabalho a uma revista
          de alto impacto, depositar uma patente ou abrir um ensaio clínico fase I.
        </ProTip>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={CheckCircle2} title="Perguntas frequentes" tone="info">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Posso editar o PDF depois de assinado?">
            Não. Para mudar algo, gere uma nova versão. A original fica preservada por integridade documental.
          </FaqItem>
          <FaqItem q="O protocolo GLP serve para ANVISA?">
            Para pesquisa pré-clínica sim. Para ensaio em humanos é obrigatório GMP.
          </FaqItem>
          <FaqItem q="Posso compartilhar com alguém fora da minha conta?">
            Sim — clique em "Compartilhar" e gere um link com prazo de expiração configurável.
          </FaqItem>
          <FaqItem q="Em que idiomas o protocolo é gerado?">
            Português, Inglês e Espanhol. Para submissão à FDA gere em inglês; ANVISA aceita PT-BR.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
