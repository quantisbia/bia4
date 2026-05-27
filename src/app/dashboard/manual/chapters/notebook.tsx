/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 10: Notebook (ELN — Electronic Lab Notebook)
 *  ───────────────────────────────────────────────────────────────────────
 *  Como usar o caderno eletrônico de laboratório integrado.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  Notebook as NotebookIcon, FileText, Image, Calendar, Lock, Users,
  Search, Tag, Paperclip, ChevronRight, Sparkles, BookOpen,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function Notebook() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={10}
        badge="ELN"
        title="Notebook — seu caderno eletrônico de laboratório"
        icon={NotebookIcon}
        gradient="from-rose-500/15 to-orange-500/15 border-rose-500/20"
        lead={<>
          O <strong className="text-white">Notebook</strong> é a versão digital do seu caderno
          de bancada. Cada entrada tem data, autor, timestamp imutável e fica vinculada a um projeto.
          Substitui o caderno físico para fins de patente, auditoria regulatória e publicação.
        </>}
        href="/dashboard/notebook"
        hrefLabel="Abrir Notebook"
        readMin={6}
        cost="Gratuito (incluso no plano)"
      />

      {/* ─── O que é um ELN ──────────────────────────────────────── */}
      <Box2 icon={BookOpen} title="Por que usar um ELN?" tone="rose">
        <p className="mb-3">
          Um ELN (Electronic Lab Notebook) substitui o caderno de papel com vantagens:
        </p>
        <ul className="space-y-1.5 list-disc list-inside ml-2 text-sm">
          <li><strong className="text-rose-200">Timestamp imutável</strong> — prova legal de quando o experimento foi feito (importante para patente)</li>
          <li><strong className="text-rose-200">Busca instantânea</strong> em todo o histórico</li>
          <li><strong className="text-rose-200">Anexos</strong> — fotos, gráficos, planilhas, vídeos</li>
          <li><strong className="text-rose-200">Compartilhamento controlado</strong> com colaboradores</li>
          <li><strong className="text-rose-200">Integração</strong> com Pipeline, Bioprint e Protocolos</li>
          <li><strong className="text-rose-200">Backup automático</strong> — nunca perde uma anotação</li>
        </ul>
      </Box2>

      {/* ─── Estrutura de uma entrada ────────────────────────────── */}
      <Box2 icon={FileText} title="Anatomia de uma entrada" tone="default">
        <p className="mb-3">Cada entrada do Notebook tem:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Metadados (auto)" items={[
            "Data e hora de criação",
            "Autor (você)",
            "ID único imutável",
            "Projeto vinculado",
          ]} />
          <MiniCard title="Cabeçalho" items={[
            "Título descritivo",
            "Tipo (experimento / observação / planejamento)",
            "Tags (cartilagem, GelMA, M1...)",
            "Status (rascunho / final)",
          ]} />
          <MiniCard title="Corpo" items={[
            "Texto rico (negrito, listas, fórmulas)",
            "Tabelas",
            "Equações LaTeX",
            "Código",
          ]} />
          <MiniCard title="Anexos" items={[
            "Fotos da bancada",
            "Imagens de microscópio",
            "Planilhas .xlsx, .csv",
            "G-code, PDFs",
          ]} />
        </div>
      </Box2>

      {/* ─── Passo a passo ───────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Criando sua primeira entrada</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Nova entrada" icon={NotebookIcon} accent="rose">
          <p>
            Clique em <strong>"+ Nova Entrada"</strong> no topo direito. Escolha o projeto
            (ou deixe como "Geral" se for uma observação solta).
          </p>
        </StepCard>

        <StepCard n={2} title="Título e tags" icon={Tag} accent="amber">
          <p>
            Use títulos descritivos como <em>"Teste de viabilidade GelMA + condrócitos lote#234"</em>.
            Adicione 3–5 tags para facilitar a busca depois.
          </p>
          <ProTip>
            Crie um padrão de tags na sua equipe (ex: <code>material:gelma</code>,
            <code> cell:condrocito</code>, <code> day:7</code>) para tornar a busca muito mais poderosa.
          </ProTip>
        </StepCard>

        <StepCard n={3} title="Escreva o experimento" icon={FileText} accent="purple">
          <p>
            Use a barra de ferramentas para formatação. Inserir tabela, equação LaTeX,
            checkboxes (para checklist), código, citações. Tudo salva automaticamente
            a cada 3 segundos.
          </p>
          <ScreenSpot>
            Atalho <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Ctrl+E</kbd> insere
            equação LaTeX. <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Ctrl+K</kbd>
             insere link.
          </ScreenSpot>
        </StepCard>

        <StepCard n={4} title="Anexe arquivos" icon={Paperclip} accent="emerald">
          <p>
            Arraste arquivos para a janela ou cole imagens direto do
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px] mx-1">Print Screen</kbd>.
            Tamanho máximo por arquivo: 50 MB. Formatos aceitos: JPG, PNG, PDF, XLSX, CSV, MP4, GCODE, STL.
          </p>
        </StepCard>

        <StepCard n={5} title="Finalize e assine" icon={Lock} accent="cyan">
          <p>
            Quando o experimento acabar, clique em <strong>"Finalizar e Assinar"</strong>.
            Isso congela a entrada (não pode mais ser editada — só adicionar comentários).
            O hash digital prova que aquele conteúdo existia naquele momento.
          </p>
          <Pitfall>
            Não finalize enquanto o experimento ainda está em andamento. Uma vez assinada,
            a entrada não pode ser modificada. Para correções, crie uma <em>nova entrada</em> vinculada.
          </Pitfall>
        </StepCard>
      </div>

      {/* ─── Busca e organização ────────────────────────────────── */}
      <Box2 icon={Search} title="Encontrando entradas antigas" tone="info">
        <p className="mb-3">A busca cobre todo o conteúdo das entradas (título, corpo, comentários):</p>
        <ul className="space-y-1.5 list-disc list-inside ml-2 text-sm">
          <li><strong>Texto livre</strong> — digite qualquer palavra</li>
          <li><strong>Por tag</strong> — clique numa tag para filtrar</li>
          <li><strong>Por período</strong> — calendário no canto esquerdo</li>
          <li><strong>Por projeto</strong> — dropdown no topo</li>
          <li><strong>Por autor</strong> (em times) — filtro lateral</li>
          <li><strong>Apenas finalizadas</strong> — checkbox</li>
        </ul>
        <ProTip>
          A busca também encontra conteúdo dentro de PDFs anexados (OCR automático).
        </ProTip>
      </Box2>

      {/* ─── Colaboração ─────────────────────────────────────────── */}
      <Box2 icon={Users} title="Trabalhando em equipe" tone="purple">
        <p className="mb-3">
          Adicione colaboradores na entrada com 3 níveis de permissão:
        </p>
        <ul className="space-y-1.5 list-disc list-inside ml-2 text-sm">
          <li><strong className="text-purple-200">Leitura</strong> — só visualiza</li>
          <li><strong className="text-purple-200">Comentário</strong> — pode comentar mas não editar</li>
          <li><strong className="text-purple-200">Edição</strong> — pode alterar (até finalizar)</li>
        </ul>
        <p className="mt-3 text-sm">
          Você vê em tempo real quem está olhando (avatar no canto). Todo comentário gera
          notificação por email.
        </p>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Calendar} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Posso usar o Notebook offline?">
            Sim — modo offline grava no navegador e sincroniza quando voltar a internet. Anexos grandes precisam de conexão.
          </FaqItem>
          <FaqItem q="O ELN é válido para patente?">
            Sim. O hash + timestamp são aceitos como prova de prioridade no INPI, USPTO e EPO.
          </FaqItem>
          <FaqItem q="Posso exportar tudo em PDF?">
            Sim — botão "Exportar projeto" gera um único PDF com todas as entradas, anexos e comentários.
          </FaqItem>
          <FaqItem q="Como fazer backup?">
            O backup é automático na nuvem (criptografado). Para cópia local, use "Exportar projeto" mensalmente.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
