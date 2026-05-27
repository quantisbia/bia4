/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 12: Análises & Dossiês
 *  ───────────────────────────────────────────────────────────────────────
 *  Análise de imagens (microscopia, impressão) e geração de dossiês
 *  consolidados.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  Microscope, BarChart3, Image as ImageIcon, FileBarChart, Activity,
  Sparkles, Target, ChevronRight, Layers,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function Analyses() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={12}
        badge="ANALYSES"
        title="Análises & Dossiês — interprete seus resultados"
        icon={BarChart3}
        gradient="from-cyan-500/15 to-blue-500/15 border-cyan-500/20"
        lead={<>
          O módulo <strong className="text-white">Análises</strong> aplica visão computacional e
          estatística aos seus dados experimentais: imagens de microscópio, fotos da impressão,
          curvas de viabilidade, perfis de reologia. Ao final você recebe um
          <strong className="text-cyan-300"> dossiê consolidado</strong> pronto para incluir em
          relatórios e papers.
        </>}
        href="/dashboard/analyses"
        hrefLabel="Abrir Análises"
        readMin={7}
        cost="3-12 créditos por análise"
      />

      {/* ─── Tipos de análise ────────────────────────────────────── */}
      <Box2 icon={Layers} title="Tipos de análise disponíveis" tone="cyan">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Imagens de Microscópio" items={[
            "Contagem de células automática",
            "Viabilidade (live/dead)",
            "Morfologia (área, circularidade)",
            "Distribuição espacial",
          ]} />
          <MiniCard title="Fotos de Impressão" items={[
            "Fidelidade geométrica vs. CAD",
            "Detecção de defeitos (sub/super-extrusão)",
            "Uniformidade de linhas",
            "Aderência à base",
          ]} />
          <MiniCard title="Reologia" items={[
            "Ajuste a modelo Carreau/Cross",
            "Pontos de cisalhamento críticos",
            "Comparação entre lotes",
            "Score de imprimibilidade",
          ]} />
          <MiniCard title="Mecânica" items={[
            "Curva tensão-deformação",
            "Módulo de Young",
            "Tensão de ruptura",
            "Comparação com tecido nativo",
          ]} />
          <MiniCard title="Biológica" items={[
            "MTT/AlamarBlue (proliferação)",
            "ELISA (proteínas secretadas)",
            "qPCR (expressão gênica)",
            "FACS (populações celulares)",
          ]} />
          <MiniCard title="Estatística" items={[
            "Teste t / ANOVA",
            "Correlação (Pearson, Spearman)",
            "Sobrevida (Kaplan-Meier)",
            "Tamanho de amostra (poder)",
          ]} />
        </div>
      </Box2>

      {/* ─── Passo a passo ───────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Como analisar uma imagem</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Crie nova análise" icon={Target} accent="blue">
          <p>
            Clique em <strong>"+ Nova Análise"</strong> e escolha o tipo
            (microscopia, foto de impressão, etc.). Vincule ao projeto.
          </p>
        </StepCard>

        <StepCard n={2} title="Carregue as imagens" icon={ImageIcon} accent="purple">
          <p>
            Arraste 1–50 imagens. Formatos aceitos: JPG, PNG, TIFF (16-bit), CZI (Zeiss), LIF (Leica).
            Resolução mínima recomendada: 1024×1024.
          </p>
          <ProTip>
            Inclua a barra de escala visível na imagem — a IA detecta automaticamente e
            calibra as medidas em µm.
          </ProTip>
        </StepCard>

        <StepCard n={3} title="Configure parâmetros" icon={Activity} accent="amber">
          <p>
            Para viabilidade live/dead, indique os canais (ex: GFP=verde=vivo, PI=vermelho=morto).
            Para fidelidade, anexe o STL/imagem CAD original. Para reologia, cole os dados ou .csv.
          </p>
          <ScreenSpot>
            A interface mostra previsualizações em tempo real à medida que você ajusta.
          </ScreenSpot>
        </StepCard>

        <StepCard n={4} title="Rode a análise" icon={Sparkles} accent="emerald">
          <p>
            Clique em <strong>"Analisar"</strong>. Tempo típico: 30s para 1 imagem, 3 min
            para 50 imagens. Você vê o progresso barra a barra.
          </p>
        </StepCard>

        <StepCard n={5} title="Revise resultados" icon={BarChart3} accent="cyan">
          <p>
            A página de resultados mostra: imagens com overlay (células marcadas, defeitos
            destacados), tabela de medidas, gráficos estatísticos, e a interpretação por IA.
            Cada medida vem com sua <strong>incerteza</strong> (± SD) e <em>n</em> (tamanho da amostra).
          </p>
          <Pitfall>
            Sempre <strong>valide manualmente</strong> uma amostra dos overlays. Se a IA marcou
            errado, clique nas células e ajuste — ela aprende para as próximas.
          </Pitfall>
        </StepCard>

        <StepCard n={6} title="Gere o dossiê" icon={FileBarChart} accent="rose">
          <p>
            Botão <strong>"Gerar Dossiê"</strong> produz um PDF com: metodologia, tabelas,
            gráficos prontos para publicação, discussão automática, conclusão e referências
            relacionadas. Pronto para incluir em paper ou relatório.
          </p>
        </StepCard>
      </div>

      {/* ─── Exemplo prático ─────────────────────────────────────── */}
      <Box2 icon={Microscope} title="Exemplo: viabilidade celular pós-impressão" tone="info">
        <p className="mb-2"><strong className="text-white">Cenário:</strong> imprimiu scaffold de cartilagem com condrócitos. Quer saber a viabilidade no dia 1 e dia 7.</p>
        <ol className="space-y-2 list-decimal list-inside ml-2 text-sm">
          <li>Faz coloração live/dead (Calceína-AM verde / Etídio vermelho)</li>
          <li>Tira fotos no confocal (10 campos por scaffold, 3 scaffolds por grupo)</li>
          <li>Sobe as 30 imagens em Análises → Microscopia → Live/Dead</li>
          <li>Define: canal 488=vivo, canal 568=morto</li>
          <li>Roda análise — recebe % viabilidade por imagem + média ± SD + teste t entre D1 e D7</li>
          <li>Gera dossiê com 3 figuras prontas (overlay, gráfico de barras, distribuição espacial)</li>
        </ol>
        <p className="mt-3 text-sm">
          Total: ~8 minutos de trabalho. O mesmo que levaria 4–6h fazendo manualmente no ImageJ.
        </p>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Sparkles} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Posso reanalisar com parâmetros diferentes sem gastar créditos de novo?">
            Sim, dentro de 7 dias da análise original. Depois disso a sessão expira e roda como nova análise.
          </FaqItem>
          <FaqItem q="Como exportar dados brutos para Excel?">
            Botão "Exportar CSV" baixa a tabela de medidas individuais (cada célula, cada linha, cada ponto).
          </FaqItem>
          <FaqItem q="A análise estatística é válida para publicação?">
            Sim — o pipeline usa scikit-learn / scipy e segue boas práticas reportadas em literatura. As figuras seguem padrão ABNT/ACS.
          </FaqItem>
          <FaqItem q="Posso comparar 2 grupos de imagens?">
            Sim — crie 2 análises separadas e use a função "Comparar análises" no dashboard de Análises.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
