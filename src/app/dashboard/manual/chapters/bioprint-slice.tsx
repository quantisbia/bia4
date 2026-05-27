/**
 * BIA · Manual · Capítulo — Bioimpressão · Etapa 3 · Fatiamento
 */

"use client"

import {
  FileCode2, Layers, Grid3X3, Sliders, Sparkles,
  Eye, Download, Wand2, AlertTriangle, CheckCircle2,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterBioprintSlice() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={5}
        badge="ETAPA 3 DE 4"
        title="Bioimpressão · Fatiamento (G-code)"
        icon={FileCode2}
        gradient="from-amber-500/15 to-orange-500/15 border-amber-500/20"
        href="/dashboard/bioprint/slice"
        hrefLabel="Abrir Fatiamento"
        cost="6 créditos por geração"
        lead={
          <>
            Fatiar é converter o modelo 3D em <strong className="text-white">G-code</strong> — a linguagem
            que a bioimpressora entende. A BIA tem <em>11 algoritmos</em> de fatiamento (do clássico
            ZigZag até TPMS Gyroid) e dezenas de parâmetros biomédicos otimizados.
          </>
        }
        readMin={8}
      />

      <Box2 icon={Sparkles} title="O que sai do Fatiamento?" tone="info">
        <p className="mb-2">
          Um arquivo <strong className="text-white">G-code</strong> (extensão <code>.gcode</code>) que
          contém milhares de linhas tipo <code>G1 X23.5 Y45.2 E0.034 F600</code>. Cada linha
          comanda o movimento do cabeçote em XYZ + extrusão de tinta. A BIA não te força a saber
          G-code — tudo é configurado via painel visual.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <MiniCard title="Você define" items={[
            "Espessura de camada",
            "Diâmetro do bico",
            "Velocidade de impressão",
            "Padrão de preenchimento",
            "Perímetros (paredes)",
          ]} />
          <MiniCard title="A BIA calcula" items={[
            "Quantidade de tinta total",
            "Tempo estimado de impressão",
            "Comprimento total de linha",
            "Validação de viabilidade",
          ]} />
          <MiniCard title="Você recebe" items={[
            "G-code pronto para imprimir",
            "Pré-visualização 3D do toolpath",
            "Relatório PDF com parâmetros",
            "Validador de integridade",
          ]} />
        </div>
      </Box2>

      <Box2 icon={Grid3X3} title="Os 11 algoritmos de fatiamento" tone="amber">
        <p className="mb-3 text-[13px]">
          O algoritmo determina <strong>como</strong> o cabeçote preenche cada camada. Escolha
          baseado no tipo de tecido:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Algo name="ZigZag"        speed="rápido"  use="Membranas, scaffolds simples" />
          <Algo name="Concentric"    speed="médio"   use="Discos, formas circulares" />
          <Algo name="Honeycomb"     speed="médio"   use="Scaffolds com alta resistência" />
          <Algo name="Grid"          speed="rápido"  use="Padrão clássico, fácil de validar" />
          <Algo name="Triangular"    speed="médio"   use="Boa razão peso/resistência" />
          <Algo name="Gyroid (TPMS)" speed="lento"   use="Osso, máxima superfície/volume" />
          <Algo name="Schwarz P (TPMS)" speed="lento" use="Vasos, fluxo isotrópico" />
          <Algo name="Diamond (TPMS)" speed="lento"  use="Cartilagem, módulo ajustável" />
          <Algo name="Apenas Contorno" speed="rápido" use="Testes de fidelidade da biotinta" />
          <Algo name="Linha única"   speed="rápido"  use="Calibração de pressão da seringa" />
          <Algo name="Cross-hatch"   speed="médio"   use="Pele, gengiva, membranas finas" />
        </div>
        <ProTip>
          Os <strong>TPMS</strong> (Gyroid, Schwarz P, Diamond) são mais lentos porque exigem mais
          movimentação não-linear, mas dão muito mais resistência por grama de material. Use sempre
          que precisar de scaffold ósseo ou cartilaginoso.
        </ProTip>
      </Box2>

      <Box2 icon={Sliders} title="Os parâmetros que importam" tone="purple">
        <p className="mb-3 text-[13px]">
          Não se assuste com a quantidade de campos — só estes 6 fazem 90% do resultado:
        </p>
        <div className="space-y-2">
          <Param
            name="Altura de camada"
            sym="layer height"
            range="0.1 – 0.5 mm"
            sweet="0.2 mm"
            why="Mais fino = mais detalhe, mais lento. Mais grosso = mais rápido, menos resolução."
          />
          <Param
            name="Diâmetro do bico"
            sym="nozzle"
            range="0.21 – 0.84 mm"
            sweet="0.41 mm (22G)"
            why="Bicos finos preservam células mais, mas exigem mais pressão. 22G é o equilíbrio."
          />
          <Param
            name="Velocidade de impressão"
            sym="feedrate"
            range="200 – 1200 mm/min"
            sweet="600 mm/min"
            why="Hidrogéis pedem velocidades menores que filamentos. Acima de 1200 quebra continuidade."
          />
          <Param
            name="Densidade de preenchimento"
            sym="infill"
            range="0 – 100%"
            sweet="20–60% para scaffolds"
            why="0% = só contorno (oco). 100% = sólido. Para osso, 30–50% é típico."
          />
          <Param
            name="Número de perímetros"
            sym="walls"
            range="1 – 5"
            sweet="2"
            why="Mais paredes = mais resistência, mas mais tempo. 2 é o padrão para hidrogéis."
          />
          <Param
            name="Multiplicador de fluxo"
            sym="flow %"
            range="50 – 200%"
            sweet="ajustável durante impressão"
            why="Compensa biotinta mais/menos viscosa. M221 no Marlin — pode ajustar em tempo real."
          />
        </div>
      </Box2>

      <Box2 icon={Eye} title="Pré-visualização 3D do toolpath" tone="cyan">
        <p className="mb-2">
          Antes de gastar os 6 créditos da geração, a BIA mostra um <strong className="text-white">preview
          interativo 3D</strong> do toolpath:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li><strong>Cores por camada</strong> — alterna roxo/azul/verde para você ver a estrutura</li>
          <li><strong>Slider de camadas</strong> — arrasta para ver imprimindo virtualmente, camada a camada</li>
          <li><strong>Travel moves</strong> — linhas vermelhas mostram movimentos sem extrusão (para evitar)</li>
          <li><strong>Hover sobre linha</strong> — mostra coordenadas X/Y/Z, velocidade e quantidade de tinta</li>
        </ul>
        <ProTip>
          Se você vir <strong className="text-rose-300">muitos travel moves vermelhos</strong> entre
          partes da peça, considere mudar o algoritmo ou re-orientar o modelo. Travel = bico
          arrastando vazio = chance de gotejar tinta na peça.
        </ProTip>
      </Box2>

      <Box2 icon={Wand2} title="Modo Apenas Contorno (R12.36)" tone="emerald">
        <p className="mb-2">
          Há um modo especial: <strong className="text-emerald-300">"Apenas Contorno"</strong>. Ele
          imprime <em>só o perímetro</em> sem preenchimento, e foi feito para 8 geometrias de
          calibração da biotinta:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
          {[
            "Linha única (10mm)",
            "Linha única (20mm)",
            "Quadrado 10mm",
            "Quadrado 20mm",
            "Cruz pequena",
            "Cruz grande",
            "Cilindro Ø5×5",
            "Disco fidelidade",
          ].map((g, i) => (
            <div key={i} className="rounded bg-emerald-500/[0.05] border border-emerald-500/15 px-2 py-1.5 text-emerald-200 font-mono">
              {g}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-gray-400 mt-3">
          Use sempre que estiver calibrando uma biotinta nova — gasta pouco material e revela
          rapidamente se a tinta vai espalhar, formar fio ou gotejar.
        </p>
      </Box2>

      <Box2 icon={Download} title="O que fazer depois de gerar?" tone="default">
        <div className="space-y-3 mt-2">
          <StepCard n={1} title="Validar o G-code" icon={CheckCircle2} accent="emerald">
            Um botão <strong>Validar</strong> roda 12 checagens automáticas (sintaxe Marlin,
            limites da máquina, linhas truncadas, M-codes inválidos). Veredito: BLOQUEADO,
            AVISOS, OU PRONTO.
          </StepCard>
          <StepCard n={2} title="Visualizar de novo" icon={Eye} accent="cyan">
            Veja o toolpath final com as linhas reais. Confira tempo estimado (canto inferior)
            e quantidade de tinta total (ml).
          </StepCard>
          <StepCard n={3} title="Baixar arquivo" icon={Download} accent="blue">
            Botão <strong>Baixar .gcode</strong> — arquivo plain text, pode ser inspecionado em
            qualquer editor. Útil para arquivar ou enviar pra parceiros.
          </StepCard>
          <StepCard n={4} title="Avançar para Executar" icon={Sparkles} accent="purple">
            Ou — se está com a bioimpressora conectada — clique direto em <strong>Avançar para
            Executar</strong>. O G-code segue pra próxima etapa sem precisar download.
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={AlertTriangle} title="Erros frequentes" tone="warn">
        <div className="space-y-2 text-[12px]">
          <FaqItem q="O preview mostra a peça torta ou deslocada">
            Geralmente é centralização da mesa diferente da centralização do STL. Em
            <em> Configurações avançadas</em>, ative <em>Auto-center</em>.
          </FaqItem>
          <FaqItem q="Tempo de impressão estimado é muito longo (horas)">
            Reduza densidade de preenchimento (de 80% pra 30%) ou aumente a velocidade.
            Cada -10% de infill economiza ~15% de tempo.
          </FaqItem>
          <FaqItem q="O botão Gerar G-code está cinza">
            Falta crédito (6 mínimos) ou o validador da biotinta bloqueou (score abaixo de 50).
            Verifique no painel de status.
          </FaqItem>
          <FaqItem q="Posso editar o G-code manualmente?">
            Sim, baixe o .gcode e edite em qualquer editor de texto. Mas perde o vínculo com o
            Pipeline — recomendamos voltar à BIA e re-gerar com os ajustes corretos.
          </FaqItem>
        </div>
      </Box2>

      <Pitfall>
        O custo de <strong>6 créditos</strong> é por geração — então se você precisa testar 5
        valores de infill diferentes, são 30 créditos. Para iteração rápida, use o
        <strong> Modo Apenas Contorno</strong> que tem geometria mais simples e roda mais barato.
      </Pitfall>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function Algo({ name, speed, use }: { name: string; speed: string; use: string }) {
  const speedColor = speed === "rápido" ? "text-emerald-300" : speed === "médio" ? "text-amber-300" : "text-rose-300"
  return (
    <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/15">
      <div className="flex-1 min-w-0">
        <div className="text-amber-200 font-semibold text-[12px]">{name}</div>
        <div className="text-gray-400 text-[10px]">{use}</div>
      </div>
      <span className={`text-[9px] font-mono ${speedColor} shrink-0`}>{speed}</span>
    </div>
  )
}

function Param({ name, sym, range, sweet, why }: {
  name: string; sym: string; range: string; sweet: string; why: string
}) {
  return (
    <div className="rounded-lg bg-purple-500/[0.04] border border-purple-500/15 p-2.5">
      <div className="flex items-baseline gap-2 mb-0.5">
        <strong className="text-purple-200 text-[13px]">{name}</strong>
        <code className="text-[10px] text-purple-400">{sym}</code>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-1">
        <span>faixa: <span className="text-gray-200 font-mono">{range}</span></span>
        <span>sweet spot: <span className="text-emerald-300 font-mono">{sweet}</span></span>
      </div>
      <div className="text-[11px] text-gray-500 leading-tight">{why}</div>
    </div>
  )
}
