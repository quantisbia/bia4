/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 11: Chat IA
 *  ───────────────────────────────────────────────────────────────────────
 *  Como conversar com a assistente especializada em bioimpressão e
 *  engenharia de tecidos.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  MessageSquare, Sparkles, Brain, Send, Paperclip, Image as ImageIcon,
  History, Pin, ChevronRight, Lightbulb, AlertTriangle,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function ChatIA() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={11}
        badge="CHAT"
        title="Chat IA — sua copiloto científica"
        icon={MessageSquare}
        gradient="from-blue-500/15 to-cyan-500/15 border-blue-500/20"
        lead={<>
          A <strong className="text-white">Chat IA</strong> não é um chatbot genérico. Ela é uma assistente
          treinada com toda a base interna da BIA (biomateriais, protocolos, papers, normas regulatórias)
          + modelos de fronteira. Use para tirar dúvidas, fazer cálculos, planejar experimentos e
          interpretar resultados.
        </>}
        href="/dashboard/chat"
        hrefLabel="Abrir Chat IA"
        readMin={5}
        cost="1 crédito por mensagem · imagens 3 créditos"
      />

      {/* ─── O que ela faz bem ───────────────────────────────────── */}
      <Box2 icon={Brain} title="O que a Chat IA faz muito bem" tone="info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Ciência" items={[
            "Explicar conceitos (reologia, viabilidade, mecânica)",
            "Sugerir materiais para um tecido",
            "Calcular concentrações (mg/mL, mM, % w/v)",
            "Comparar duas abordagens da literatura",
          ]} />
          <MiniCard title="Bioimpressão" items={[
            "Diagnosticar falhas de impressão",
            "Sugerir parâmetros iniciais",
            "Interpretar G-code",
            "Otimizar geometrias",
          ]} />
          <MiniCard title="Regulatório" items={[
            "Diferença ANVISA vs FDA vs EMA",
            "Documentos necessários para CEP",
            "Classificação de produto (medicamento ou dispositivo?)",
            "Caminho para registro ATMP",
          ]} />
          <MiniCard title="Análise" items={[
            "Interpretar gráfico de reologia",
            "Sugerir testes estatísticos",
            "Ler imagem de microscópio",
            "Discutir resultados (se você colar dados)",
          ]} />
        </div>
      </Box2>

      {/* ─── Como conversar ──────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Como conversar de forma eficaz</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Seja específico" icon={Send} accent="blue">
          <p className="mb-2"><strong className="text-rose-300">Ruim:</strong> "Que material eu uso?"</p>
          <p><strong className="text-emerald-300">Bom:</strong> "Preciso bioimprimir um scaffold de cartilagem articular para joelho, 15 mm × 15 mm × 3 mm, com condrócitos humanos primários a 5 × 10⁶ cells/mL. Quais 3 biotintas você sugere e por quê?"</p>
          <ProTip>
            Quanto mais contexto (tecido, dimensão, fonte celular, objetivo final), melhor a resposta.
          </ProTip>
        </StepCard>

        <StepCard n={2} title="Use o contexto do projeto" icon={Pin} accent="purple">
          <p>
            No topo da Chat, selecione um <strong>projeto</strong>. A IA passa a conhecer
            automaticamente a biotinta, geometria e parâmetros já definidos lá — você não
            precisa repetir.
          </p>
          <ScreenSpot>
            Dropdown azul "Contexto: Projeto" acima da caixa de mensagem.
          </ScreenSpot>
        </StepCard>

        <StepCard n={3} title="Envie imagens ou arquivos" icon={Paperclip} accent="amber">
          <p>
            Clique no clipe ou cole direto. A IA aceita:
          </p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• <strong>Imagens</strong> — foto da impressão, microscópio, gráfico</li>
            <li>• <strong>PDFs</strong> — paper, datasheet, protocolo</li>
            <li>• <strong>Planilhas</strong> — dados experimentais</li>
            <li>• <strong>G-code</strong> — para revisar</li>
          </ul>
          <p className="mt-2">Ela analisa o arquivo e responde no contexto.</p>
        </StepCard>

        <StepCard n={4} title="Itere até ficar bom" icon={Sparkles} accent="emerald">
          <p>
            Se a primeira resposta não bater 100%, refine: <em>"Mas eu quero algo
            biodegradável em ≤ 6 semanas e que aguente compressão de 1 MPa"</em>. Ela vai
            ajustar. Você pode pedir tabelas, listas, parágrafos curtos ou explicação visual.
          </p>
        </StepCard>

        <StepCard n={5} title="Salve respostas importantes" icon={History} accent="cyan">
          <p>
            Cada conversa fica salva no histórico (sidebar esquerda). Você pode renomeá-la,
            arquivar, ou <strong>"Enviar para Notebook"</strong> para virar entrada do ELN
            com referência permanente.
          </p>
        </StepCard>
      </div>

      {/* ─── Limites ─────────────────────────────────────────────── */}
      <Box2 icon={AlertTriangle} title="Limites — o que ela NÃO faz" tone="warn">
        <ul className="space-y-2 list-disc list-inside ml-2 text-sm">
          <li>Não toma decisão clínica por você — ela <em>sugere</em>, você <em>decide</em>.</li>
          <li>Não substitui leitura de paper original em decisão crítica.</li>
          <li>Não tem dados pós-treinamento — para informação muito recente, use o Motor de Conhecimento.</li>
          <li>Não acessa a internet em tempo real (a menos que você cole o link e peça pra ler).</li>
          <li>Pode errar em cálculos longos — sempre verifique se for crítico.</li>
        </ul>
        <Pitfall>
          Para decisões de paciente real (uso clínico, dosagem, indicação): consulte um médico
          ou farmacêutico. A Chat IA é ferramenta de pesquisa, não diagnóstico.
        </Pitfall>
      </Box2>

      {/* ─── Atalhos ─────────────────────────────────────────────── */}
      <Box2 icon={Lightbulb} title="Atalhos úteis" tone="ok">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3"><kbd className="px-2 py-1 rounded bg-white/10 text-[11px] font-mono">/</kbd> Foca a caixa de mensagem</div>
          <div className="flex items-center gap-3"><kbd className="px-2 py-1 rounded bg-white/10 text-[11px] font-mono">Shift + Enter</kbd> Nova linha sem enviar</div>
          <div className="flex items-center gap-3"><kbd className="px-2 py-1 rounded bg-white/10 text-[11px] font-mono">Ctrl + K</kbd> Nova conversa</div>
          <div className="flex items-center gap-3"><kbd className="px-2 py-1 rounded bg-white/10 text-[11px] font-mono">Ctrl + /</kbd> Lista de comandos rápidos</div>
        </div>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={MessageSquare} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Em que idioma posso falar?">
            Português, inglês ou espanhol — ela detecta automaticamente. Responde no idioma da pergunta.
          </FaqItem>
          <FaqItem q="A conversa é privada?">
            Sim. Suas conversas são privadas, criptografadas e não são usadas para treinar modelos externos.
          </FaqItem>
          <FaqItem q="Posso exportar a conversa?">
            Sim — botão "Exportar" gera markdown ou PDF de qualquer conversa.
          </FaqItem>
          <FaqItem q="Quanto custa uma mensagem?">
            1 crédito por mensagem de texto. Mensagens com imagem custam 3 créditos. Conversas longas
            (≥ 50 turnos) podem custar 2 créditos por mensagem por causa do contexto maior.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
