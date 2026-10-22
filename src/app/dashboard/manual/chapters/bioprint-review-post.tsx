/**
 * BIA · Manual · Capítulo — Bioimpressão · Fases 5 e 6 de 6 (R24)
 *   Fase 5 · Análise da bioimpressão (laço fechado)
 *   Fase 6 · Maturação do tecido & caracterizações
 */

"use client"

import {
  ClipboardCheck, Star, Beaker, Sparkles, AlertTriangle, CheckCircle2,
  RotateCcw, FlaskConical, Microscope, Activity, Thermometer, ArrowRight, Layers,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterBioprintReviewPost() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={7}
        badge="FASES 5 E 6 DE 6 · R24"
        title="Bioimpressão · Análise e Maturação"
        icon={ClipboardCheck}
        gradient="from-sky-500/15 to-rose-500/15 border-sky-500/20"
        href="/dashboard/bioprint/review"
        hrefLabel="Abrir Fase 5"
        lead={
          <>
            Imprimir é metade do caminho. A <strong className="text-white">Fase 5</strong> fecha o laço: você avalia o que
            saiu da bioimpressora e a BIA converte isso em ajustes para o próximo G-code. A{" "}
            <strong className="text-white">Fase 6</strong> cuida do construto até virar tecido — crosslink, cultura,
            biorreator e as caracterizações que provam que funcionou.
          </>
        }
        readMin={8}
      />

      {/* ───────────────────────── FASE 5 ───────────────────────── */}
      <h3 className="text-lg font-bold text-white pt-2 flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-sky-300" /> Fase 5 · Análise da bioimpressão
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <WhereIs path="Bioimprimir → Fase 5 · Análise" />
        <WhereIs path="/dashboard/bioprint/review" />
      </div>

      <Box2 icon={Sparkles} title="O que é o laço fechado" tone="info">
        <p>
          Ao terminar uma impressão na Fase 4, um modal abre sozinho (ou você clica em{" "}
          <em>Registrar análise desta impressão</em>). Você dá uma <strong className="text-white">nota de 1 a 5</strong> e
          escreve livremente o que viu — “fios entre as paredes”, “a primeira camada descolou”, “ficou borrado”, “colapsou
          na camada 8”. A BIA interpreta os sintomas com regras explicáveis (não é caixa-preta) e decide ajustes com
          intensidade proporcional à nota: nota 3 → suave, nota 2 → médio, nota 1 → forte. Notas 4–5 não geram ajuste.
        </p>
      </Box2>

      <StepCard n={1} title="Nota e relato" icon={Star} accent="blue">
        <p>
          Seja descritivo: a interpretação procura palavras-chave em português (sub/superextrusão, fios, colapso,
          descolamento, bolhas, bico entupido, deslocamento de origem…). Quanto mais concreto o relato, mais certeiros
          os ajustes.
        </p>
        <ProTip>
          Fotografe o construto e anote a camada em que o problema apareceu no <strong className="text-white">Notebook</strong>.
          A nota e o relato ficam no histórico da Fase 5; a foto fica no caderno de laboratório.
        </ProTip>
      </StepCard>

      <StepCard n={2} title="Veja o que a BIA vai mudar" icon={RotateCcw} accent="purple">
        <p>O painel <em>“No próximo G-code a BIA vai…”</em> lista cada ajuste com o porquê. Os alvos possíveis:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <MiniCard title="Extrusão" items={["Fluxo (× multiplicador)", "Volume de prime / retração (µL)", "Temperatura do cartucho"]} />
          <MiniCard title="Movimento e geometria" items={["Velocidade de perímetro (e infill proporcional)", "Altura da 1ª camada e das demais", "Z-hop", "Número de paredes e densidade do infill", "Saia (skirt) para estabilizar pressão", "Reforço de ponto zero (G92 + pré-voo)"]} />
        </div>
        <p className="mt-2">
          Na Fase 3, um banner <em>“Aprendi com a sua última impressão”</em> mostra os mesmos ajustes; você pode aplicá-los
          ou ignorá-los. Quando aplicados, o G-code recebe linhas <code className="text-purple-200">; APRENDIDO (...)</code>{" "}
          para auditoria.
        </p>
      </StepCard>

      <StepCard n={3} title="Decida: repetir ou seguir" icon={CheckCircle2} accent="emerald">
        <ul className="space-y-1">
          <li>• <strong className="text-white">Repetir na Fase 3 com os ajustes</strong> — para notas ≤ 3. O BioSlicer abre com o aprendizado pendente para a mesma biotinta/geometria.</li>
          <li>• <strong className="text-white">Ficou bom → Fase 6</strong> — para notas 4–5. O construto segue para maturação.</li>
        </ul>
        <Pitfall>
          Não registre análises “genéricas” só para marcar a fase como pronta. Um relato errado ensina a BIA errado — e
          o ajuste vai para o seu próximo G-code.
        </Pitfall>
      </StepCard>

      <Box2 icon={Layers} title="Histórico" tone="default">
        <p>
          A Fase 5 lista todas as análises (nota, relato, ajustes derivados, material, geometria, perfil e parâmetros em
          vigor) e os resultados estruturados do histórico (qualidade excelente/aceitável/ruim + issues marcadas). O
          histórico fica no seu navegador; <em>Limpar histórico</em> apaga tudo.
        </p>
      </Box2>

      {/* ───────────────────────── FASE 6 ───────────────────────── */}
      <h3 className="text-lg font-bold text-white pt-4 flex items-center gap-2">
        <Beaker className="w-5 h-5 text-rose-300" /> Fase 6 · Maturação do tecido &amp; caracterizações
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <WhereIs path="Bioimprimir → Fase 6 · Maturação" />
        <WhereIs path="/dashboard/bioprint/post" />
      </div>

      <Box2 icon={FlaskConical} title="Do construto ao tecido" tone="rose">
        <p>
          A Fase 6 só abre depois da Fase 4 concluída. O <strong className="text-white">tecido-alvo</strong> vem do que você
          definiu na Fase 1 (pode ser trocado aqui) e seleciona um protocolo em três estágios que você confirma um a um.
        </p>
      </Box2>

      <StepCard n={1} title="Crosslink e estabilização" icon={Thermometer} accent="rose">
        <p>
          Reticulação pós-impressão conforme a biotinta: iônica (CaCl₂ para alginato), fotoquímica (UV/visível para GelMA
          com LAP/Irgacure), térmica ou enzimática. Tempo, concentração e lavagens são listados para o tecido escolhido.
        </p>
      </StepCard>

      <StepCard n={2} title="Cultura e biorreator" icon={Activity} accent="amber">
        <p>
          Meio, troca, duração e — quando o tecido pede — estímulo em biorreator: perfusão para vasos e rim, estímulo
          elétrico/mecânico para miocárdio, carga cíclica para osso e cartilagem, interface ar-líquido para a pele
          cornificar. Sugestões microfluídicas aparecem para construtos vascularizados.
        </p>
      </StepCard>

      <StepCard n={3} title="Caracterizações" icon={Microscope} accent="emerald">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
          <MiniCard title="Viabilidade" items={["Live/Dead (calceína/EthD-1)", "AlamarBlue / MTT", "Contagem e proliferação"]} />
          <MiniCard title="Morfologia e função" items={["Histologia (H&E, Alcian Blue, Alizarin, Masson)", "Imunofluorescência por marcador", "Expressão gênica (qPCR)"]} />
          <MiniCard title="Mecânica e forma" items={["Compressão / tração", "Fidelidade geométrica (Pf, ImageJ)", "Degradação e inchamento"]} />
        </div>
        <p className="mt-2">
          Quando os três estágios estão confirmados a Fase 6 fica “Pronta” e o processo se encerra. Registre resultados
          no <strong className="text-white">Notebook</strong> e gere o dossiê em <em>Protocolos GLP/GMP</em> ou{" "}
          <em>Protocolo Total</em>.
        </p>
      </StepCard>

      <Box2 icon={AlertTriangle} title="Protocolos por tecido" tone="warn">
        <p>
          Cardíaco (patch) · Ósseo · Cartilagem · Vaso sanguíneo · Pele · Nervo periférico · Hepático (mini-fígado). São
          pontos de partida baseados na literatura — adapte às suas células, à sua biotinta e ao seu comitê de ética.
        </p>
      </Box2>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-white">Perguntas frequentes</h3>
        <FaqItem q="A Fase 5 é obrigatória para chegar à Fase 6?">
          Não — a Fase 6 abre assim que a Fase 4 está concluída. Mas registrar a análise é o que faz a BIA melhorar o
          próximo G-code; recomendamos sempre.
        </FaqItem>
        <FaqItem q="Os ajustes valem para qualquer biotinta?">
          A BIA prioriza o aprendizado da <em>mesma</em> biotinta (e, se houver, da mesma geometria). Trocou a tinta?
          O banner da Fase 3 indica a origem do aprendizado para você decidir se aplica.
        </FaqItem>
        <FaqItem q="E organoides?">
          Não passam pelas 6 fases: são scaffold-free. Use o <strong className="text-white">Organoid Builder</strong>{" "}
          (grupo “Esferoides &amp; Organoides”), com protocolos QMicroNiche™/QMatrix™.
        </FaqItem>
      </section>

      <div className="rounded-xl bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-rose-500/20 p-4 flex items-center gap-3 text-sm text-gray-300">
        <ArrowRight className="w-4 h-4 text-rose-300 shrink-0" />
        <span>
          Processo completo. Para um novo tecido, volte ao hub e clique em <strong className="text-white">Reiniciar processo</strong>{" "}
          — o histórico da Fase 5 é preservado.
        </span>
      </div>
    </article>
  )
}
