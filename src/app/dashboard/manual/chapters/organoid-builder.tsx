/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 7: Organoid Builder
 *  ───────────────────────────────────────────────────────────────────────
 *  Como projetar organoides (mini-órgãos) cultivados a partir de
 *  células-tronco em condições controladas — passo-a-passo prático.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  Beaker, Sparkles, FlaskConical, ListChecks, Layers, ClipboardList,
  Microscope, Target, Lightbulb, Activity, ChevronRight,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function OrganoidBuilder() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={7}
        badge="ORGANOIDS"
        title="Organoid Builder — desenhe mini-órgãos"
        icon={Beaker}
        gradient="from-purple-500/15 to-pink-500/15 border-purple-500/20"
        lead={<>
          O <strong className="text-white">Organoid Builder</strong> ajuda você a planejar a criação de
          organoides — versões miniaturizadas e funcionais de um órgão, cultivadas a partir de células-tronco.
          A plataforma sugere meio de cultura, fatores de crescimento, scaffold e cronograma de maturação.
        </>}
        href="/dashboard/organoids"
        hrefLabel="Abrir Organoid Builder"
        readMin={8}
        cost="8 créditos por geração de protocolo completo"
      />

      {/* ─── O que é um organoide ─────────────────────────────────── */}
      <Box2 icon={Sparkles} title="O que é um organoide?" tone="info">
        <p className="mb-3">
          Um organoide é um <strong className="text-white">aglomerado celular 3D auto-organizado</strong> que
          imita a arquitetura e função de um órgão real, em escala miniaturizada (0,1–5 mm). Diferente de uma
          cultura 2D em placa, organoides têm:
        </p>
        <ul className="space-y-1.5 list-disc list-inside ml-2">
          <li><strong className="text-purple-200">Múltiplos tipos celulares</strong> arranjados em camadas reais</li>
          <li><strong className="text-purple-200">Polaridade apical-basal</strong> (cima e baixo definidos)</li>
          <li><strong className="text-purple-200">Função biológica parcial</strong> (secreção, contração, resposta a estímulos)</li>
          <li><strong className="text-purple-200">Auto-renovação</strong> por dias ou semanas em cultura</li>
        </ul>
        <ProTip>
          Organoides são usados em <strong>descoberta de fármacos</strong>, modelagem de doenças,
          medicina personalizada (organoide do <em>seu</em> tumor para testar quimioterapia) e ensaios
          de toxicidade — substituindo modelos animais em muitos casos.
        </ProTip>
      </Box2>

      {/* ─── Tipos suportados ────────────────────────────────────── */}
      <Box2 icon={Layers} title="Tipos de organoide na biblioteca" tone="purple">
        <p className="mb-3">
          A plataforma cobre os tipos clinicamente relevantes. Selecione o tecido-alvo na primeira tela:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Sistema Nervoso" items={[
            "Cerebral (cortex, hipocampo)",
            "Médula espinhal",
            "Retina (foto-receptores)",
            "Neurônios dopaminérgicos",
          ]} />
          <MiniCard title="Trato Digestivo" items={[
            "Intestino (crypto-villi)",
            "Estômago (corpus, antro)",
            "Esôfago",
            "Cólon",
          ]} />
          <MiniCard title="Órgãos Sólidos" items={[
            "Fígado (hepatócitos + colangiócitos)",
            "Pâncreas (ilhotas)",
            "Rim (néfron)",
            "Pulmão (alvéolos)",
          ]} />
          <MiniCard title="Outros" items={[
            "Próstata",
            "Mama (acini ductal)",
            "Tireoide",
            "Tumor / paciente-específico",
          ]} />
        </div>
      </Box2>

      {/* ─── Passo a passo ───────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Fluxo passo-a-passo (5 etapas)</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Escolha o tecido-alvo" icon={Target} accent="blue">
          <p>
            Na tela inicial, clique no <strong>card do órgão</strong> que você quer modelar.
            Cada card mostra a complexidade (★ a ★★★★★), tempo de maturação típico e fonte celular recomendada.
          </p>
          <ScreenSpot>
            Cards no topo da página, com gradiente roxo. Hover para ver a descrição curta.
          </ScreenSpot>
        </StepCard>

        <StepCard n={2} title="Defina a fonte celular" icon={FlaskConical} accent="purple">
          <p>Três opções principais:</p>
          <ul className="space-y-1 mt-2 ml-2">
            <li>• <strong className="text-purple-200">iPSC</strong> (células-tronco pluripotentes induzidas) — versáteis, qualquer tecido</li>
            <li>• <strong className="text-purple-200">ESC</strong> (embrionárias) — exige aprovação ética específica</li>
            <li>• <strong className="text-purple-200">Adultas / paciente</strong> — biopsia, tumor, sangue</li>
          </ul>
          <ProTip>
            Se você vai testar fármacos em um paciente específico (medicina personalizada), use
            <strong> "Adultas / paciente"</strong> e informe o ID da biopsia para rastreabilidade.
          </ProTip>
        </StepCard>

        <StepCard n={3} title="Configure meio de cultura e fatores" icon={Beaker} accent="emerald">
          <p>
            A plataforma sugere automaticamente o meio base (DMEM/F12, Neurobasal, Advanced DMEM, etc.) e os
            fatores de crescimento (Wnt3a, R-spondin, Noggin, EGF, FGF, BMP4, retinoic acid…) com concentrações em ng/mL.
          </p>
          <p className="mt-2">
            Você pode <strong className="text-white">aceitar a receita sugerida</strong> ou customizar cada componente
            clicando em <code className="text-emerald-300">Editar</code>.
          </p>
        </StepCard>

        <StepCard n={4} title="Escolha o scaffold (matriz 3D)" icon={Layers} accent="amber">
          <p>Define onde as células vão crescer:</p>
          <ul className="space-y-1 mt-2 ml-2">
            <li>• <strong>Matrigel / BME</strong> — padrão-ouro, mas variável entre lotes</li>
            <li>• <strong>Hidrogel sintético</strong> (PEG, GelMA) — reprodutível, integra com bioimpressão</li>
            <li>• <strong>Suspensão (spinner)</strong> — para organoides que não precisam de matriz</li>
            <li>• <strong>Air-liquid interface</strong> — pulmão, intestino terminal</li>
          </ul>
          <Pitfall>
            Matrigel é derivado de tumor murino — não é aceito em ensaios clínicos GMP.
            Para uso translacional, escolha hidrogel sintético definido quimicamente.
          </Pitfall>
        </StepCard>

        <StepCard n={5} title="Cronograma de maturação" icon={Activity} accent="cyan">
          <p>
            A plataforma gera um calendário com os <strong>dias-chave</strong>: troca de meio, expansão,
            diferenciação, checagem morfológica, criopreservação opcional. Para um organoide cerebral
            típico você verá ~60 dias divididos em 5 fases.
          </p>
          <ScreenSpot>
            Após salvar, baixe o <strong>protocolo em PDF</strong> ou envie direto para o ELN
            (Notebook) clicando em <code className="text-cyan-300">Exportar → Notebook</code>.
          </ScreenSpot>
        </StepCard>
      </div>

      {/* ─── Saídas ──────────────────────────────────────────────── */}
      <Box2 icon={ClipboardList} title="O que você recebe ao final" tone="ok">
        <ul className="space-y-2 list-disc list-inside ml-2">
          <li><strong className="text-white">Protocolo completo</strong> em PDF (12–20 páginas) com referências</li>
          <li><strong className="text-white">Lista de reagentes</strong> com fornecedores sugeridos e códigos de catálogo</li>
          <li><strong className="text-white">Cronograma diário</strong> imprimível para o laboratório</li>
          <li><strong className="text-white">Critérios de aceitação</strong> — o que medir para considerar o organoide "maduro"</li>
          <li><strong className="text-white">Integração com bioimpressão</strong> — opcional, se você quer combinar com scaffold impresso</li>
        </ul>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Microscope} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Posso usar este protocolo direto no meu laboratório?">
            Sim, é validado contra a literatura, mas <strong>sempre valide a primeira leva</strong> e ajuste concentrações conforme a sua fonte celular (lotes variam).
          </FaqItem>
          <FaqItem q="Quanto tempo leva para gerar um organoide?">
            Depende do tecido: intestinal 7–14 dias, fígado 14–21, cerebral 60–90, retina 120+ dias.
          </FaqItem>
          <FaqItem q="Posso combinar Organoid Builder com bioimpressão?">
            Sim — no passo 4, escolha "Hidrogel sintético" e clique em <strong>"Enviar para Bioprint"</strong>.
            A geometria do scaffold é levada para a etapa Modelo 3D.
          </FaqItem>
          <FaqItem q="É seguro para uso em pacientes (uso clínico)?">
            O protocolo é de pesquisa. Para uso clínico, gere a versão GMP a partir do módulo Protocolos.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
