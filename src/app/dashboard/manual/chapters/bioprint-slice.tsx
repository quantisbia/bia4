/**
 * BIA · Manual · Capítulo — Bioimpressão · Fase 3 de 6 · Fatiamento (BioSlicer) — o ÚNICO lugar de STL
 * R22: reescrito para a base única (R20), infills honestos (R20-B), Mesa (R21).
 */

"use client"

import {
  FileCode2, Layers, Grid3X3, Sliders, Sparkles, Eye, Download, Wand2,
  AlertTriangle, CheckCircle2, Target, Palette, Move3d, Coins, Box,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterBioprintSlice() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={5}
        badge="FASE 3 DE 6 · ÚNICO LUGAR DE STL"
        title="Bioimpressão · Fatiamento — BioSlicer"
        icon={FileCode2}
        gradient="from-emerald-500/15 to-cyan-500/15 border-emerald-500/20"
        href="/dashboard/bioprint/slice"
        hrefLabel="Abrir o BioSlicer"
        cost="6 créditos por G-code gerado (prévia é grátis)"
        lead={
          <>
            A BIA tem <strong className="text-white">um único fatiador e um único lugar de geometria 3D</strong>: o BioSlicer.
            Ele transforma o modelo 3D (anatômico real, primitiva, upload de STL ou desenho à mão) em <strong className="text-white">G-code</strong> com
            extrusão volumétrica por seringa. Tudo o que antes era “G-code rápido”, “médico” ou “avançado” agora é só um
            caminho para esta mesma base — você sempre vê a peça na <em>Mesa</em>, confirma e só então paga.
          </>
        }
        readMin={10}
      />

      <Box2 icon={Sparkles} title="O que mudou (R20 → R22) em 30 segundos" tone="emerald">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Ponto zero é ponto zero</strong>: o G-code começa com <code>G92 X0 Y0 Z0 E0</code> onde o bico está. Sem <code>G28</code>, sem “park”, sem deslocamento seco — o 1º cordão nasce no ponto zero.</li>
          <li><strong className="text-white">Infills honestos</strong>: gyroid é gyroid, grid é grid, hexagonal é hexagonal, ondas são ondas. Nada é “aproximado” por outro padrão.</li>
          <li><strong className="text-white">Alvo</strong>: Petri, lâmina ou placa de 6–96 poços (1º poço = ponto zero; os demais por offset do pitch).</li>
          <li><strong className="text-white">1 a 4 cabeçotes</strong> em um único G-code (<code>T0..T3</code>), cada um com sua biotinta da Fase 2.</li>
          <li><strong className="text-white">Mesa</strong>: veja a peça de cima e em 3D sobre o alvo, gire (X/Y/Z), “deite” e só então fatie.</li>
          <li><strong className="text-white">Prévia grátis</strong> de 3 camadas no modal de confirmação — os 6 créditos só são debitados ao confirmar.</li>
        </ul>
      </Box2>

      <WhereIs path="Dashboard → Bioimprimir → Fase 3 · Fatiar (STL → G-code)" />

      {/* ── Passo a passo ─────────────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-white pt-2">Passo a passo</h2>

      <StepCard n={1} title="Modelo 3D — de onde vem a peça" icon={Box} accent="emerald">
        <p className="mb-2">Cinco origens, todas levam à mesma Mesa:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Vindo da Fase 1</strong> — se você confirmou o modelo de tecido, o BioSlicer já abre com o modelo, o tamanho, o perfil, o infill e o alvo sugeridos (via link <code>?anat=</code>/<code>?prim=</code>).</li>
          <li><strong className="text-white">Desenhar &amp; Imprimir</strong> — trace linhas, círculos e retângulos com o dedo ou mouse; cada traço vira um caminho de extrusão.</li>
          <li><strong className="text-white">Modelos anatômicos reais</strong> — menisco em C, orelha, nariz, rim, coração, fêmur, segmento vascular ramificado e a grade de fidelidade 15,4 mm. São <em>malhas curvas de verdade</em> (não semicírculos facetados). Você escolhe <strong className="text-white">uma única dimensão</strong> (ex.: comprimento do menisco) e a escala é uniforme — a anatomia é preservada.</li>
          <li><strong className="text-white">Upload .stl</strong> (binário ou ASCII) — arraste na caixa.</li>
          <li><strong className="text-white">Primitiva</strong> — bloco, disco, tubo, domo para testes rápidos.</li>
        </ul>
      </StepCard>

      <StepCard n={2} title="Mesa — ver e arrumar a peça" icon={Move3d} accent="cyan">
        <p className="mb-2">
          Assim que há uma peça, a <strong className="text-white">Mesa</strong> mostra a <em>vista de cima</em> (como você olha para a bioimpressora,
          com grade de 10 mm, o contorno do alvo e a cruz amarela do <strong className="text-white">ponto zero / bico</strong>) e a <em>vista 3D em relevo</em>.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Tombar X / Tombar Y / Girar Z</strong> (±15° ou ±90°) — a peça é sempre re-centrada no ponto zero e apoiada em Z = 0 depois de girar.</li>
          <li><strong className="text-white">Deitar na mesa</strong> — testa 6 orientações e escolhe a de maior área de apoio e menor altura (ex.: fêmur deitado em vez de em pé).</li>
          <li>Verde = cabe no alvo; <span className="text-rose-300">vermelho</span> = não cabe (reduza a dimensão ou troque o alvo).</li>
        </ul>
        <ProTip>O que você vê na Mesa é <em>exatamente</em> o que vai para o fatiador — prévia e G-code usam a malha já orientada.</ProTip>
      </StepCard>

      <StepCard n={3} title="Objetivo + Perfil + Parâmetros" icon={Sliders} accent="amber">
        <p className="mb-2">
          Descreva o objetivo em texto ou voz (“scaffold ósseo 10×10×4 mm, poro 400 µm, alginato com HAp, agulha 18G”) — a BIA escolhe
          perfil e parâmetros iniciais. Ou escolha um perfil <strong className="text-white">Básico</strong> (cartilagem, pele, osso, vascular…) e ajuste:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <MiniCard title="Básico (o essencial)" items={[
            "Agulha/bico (gauge → mm)",
            "Seringa (1–20 mL → E em mm de êmbolo)",
            "Altura de camada (70–90 % do bico)",
            "Padrão e densidade do infill",
            "Velocidade e número de paredes",
            "Temperatura do cartucho (opcional)",
          ]} />
          <MiniCard title="Avançado (quando precisar)" items={[
            "Largura de linha, overlap, costura",
            "Espaçamento explícito (tamanho de poro)",
            "Ângulo do infill e passo por camada",
            "Z-hop, retração, prime/dwell",
            "Reologia (viscosidade, n) → shear/viabilidade",
            "Start/End G-code customizado",
          ]} />
        </div>
      </StepCard>

      <StepCard n={4} title="Padrões de preenchimento (infill) — honestos" icon={Grid3X3} accent="purple">
        <p className="mb-2">Cada padrão gera exatamente o que o nome diz. Escolha pelo <em>tecido</em> e pelo <em>poro</em> que você quer:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-gray-400"><tr><th className="py-1 pr-3">Padrão</th><th className="py-1 pr-3">O que é</th><th className="py-1">Quando usar</th></tr></thead>
            <tbody className="text-gray-300 [&_td]:py-1 [&_td]:pr-3 [&_td]:align-top">
              <tr><td className="text-white">Linhas (woodpile 0/90)</td><td>Linhas paralelas, alterna 0°/90° por camada</td><td>Scaffold clássico, poro quadrado = espaçamento − linha</td></tr>
              <tr><td className="text-white">Zigzag contínuo</td><td>Linhas conectadas pela borda</td><td>Hidrogéis que “pingam” ao parar — menos starts/stops</td></tr>
              <tr><td className="text-white">Grid</td><td>0° + 90° na mesma camada</td><td>Rigidez em XY, poros fechados</td></tr>
              <tr><td className="text-white">Triangular</td><td>0/60/120° na mesma camada</td><td>Máxima rigidez (osso)</td></tr>
              <tr><td className="text-white">Hexagonal (honeycomb)</td><td>Favo de mel real, arestas contínuas</td><td>Cartilagem, fígado (ácino)</td></tr>
              <tr><td className="text-white">Ondas</td><td>Linhas senoidais paralelas, fase alterna por camada</td><td>Músculo/tendão alinhado com “folga”</td></tr>
              <tr><td className="text-white">Concêntrico</td><td>Anéis internos seguindo o contorno</td><td>Discos, córnea, anéis vasculares</td></tr>
              <tr><td className="text-white">Gyroid</td><td>Curvas senoidais defasadas em Z → canais interconectados</td><td>Vascularização, difusão isotrópica</td></tr>
              <tr><td className="text-violet-200">Schwarz P · Diamond (TPMS)</td><td>Iso-superfícies periódicas (poros esféricos / rede tetraédrica)</td><td>Osso trabecular, alta área superficial — aba <strong>Avançado</strong></td></tr>
              <tr><td className="text-violet-200">Voronoi</td><td>Células poligonais irregulares, determinísticas</td><td>Osso esponjoso, heterogeneidade — <strong>Avançado</strong></td></tr>
              <tr><td className="text-violet-200">Perlin</td><td>Iso-curvas de ruído → canais orgânicos não periódicos</td><td>Parênquima, tecidos “irregulares” — <strong>Avançado</strong></td></tr>
              <tr><td className="text-violet-200">Gradiente radial</td><td>Espaçamento cresce do centro para a borda</td><td>Interfaces osso-cartilagem, gradiente de porosidade — <strong>Avançado</strong></td></tr>
              <tr><td className="text-white">Sem preenchimento</td><td>Só paredes</td><td>Tubos, cascas, testes de parede</td></tr>
            </tbody>
          </table>
        </div>
        <Pitfall>Em bioimpressão o que importa é o <strong>tamanho de poro</strong> (espaçamento − largura da linha), não a “% de densidade”. Se você sabe o poro que quer (ex.: 400 µm), use o campo <em>Espaçamento (mm)</em> no Avançado — ele sobrepõe a densidade.</Pitfall>
      </StepCard>

      <StepCard n={5} title="Onde imprimir (alvo) — Petri, lâmina ou placa" icon={Target} accent="blue">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Petri</strong> 30/35/60/90/100 mm — peça centrada no ponto zero.</li>
          <li><strong className="text-white">Lâmina</strong> 25×75 mm.</li>
          <li><strong className="text-white">Placa</strong> 6/12/24/48/96 poços (pitch SBS). Posicione o bico no centro do <strong className="text-white">1º poço (superior-esquerdo)</strong> — ele é o ponto zero; os demais poços são offsets pelo pitch. Escolha “Todos”, “Só A1” ou “Linha A”. Entre poços: z-hop, pausa e purga configuráveis. O G-code marca cada poço com <code>;WELL:A1</code>.</li>
        </ul>
        <ProTip>A Mesa avisa se a peça não cabe no poço (área útil ≈ 85 % do diâmetro). Reduza a dimensão ou use uma placa com menos poços.</ProTip>
      </StepCard>

      <StepCard n={6} title="Cabeçotes e biotintas (1 a 4)" icon={Palette} accent="rose">
        <p className="mb-2">
          Informe <strong className="text-white">quantos cabeçotes</strong> sua bioimpressora tem. Para cada <code>T0..T3</code>: biotinta (vinda da Fase 2), seringa, temperatura,
          multiplicador de fluxo e offset XY (a partir do 2º). Atribua <em>papéis</em> → ferramenta: paredes externas, internas, infill, suporte.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Troca de ferramenta = retração → <code>T&lt;n&gt;</code> → prime → dwell, tudo no mesmo G-code.</li>
          <li>Offset dos cabeçotes: via <code>M218</code> (firmware) ou aplicado no caminho — você escolhe.</li>
          <li>O resultado mostra volume por cabeçote e nº de trocas.</li>
        </ul>
      </StepCard>

      <StepCard n={7} title="Confirmar, pagar e gerar" icon={Coins} accent="emerald">
        <p className="mb-2">
          Clique em <strong className="text-white">Fatiar e gerar G-code</strong>. Abre o modal de confirmação com a <strong className="text-white">prévia grátis</strong> de 3 camadas
          (base, meio, topo) e o resumo: modelo, preenchimento, paredes/camada, velocidade, alvo, cabeçotes, ponto zero, skirt. Nada é inventado — só o que está listado vai para o G-code.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ao confirmar, a BIA fatia no seu navegador e debita <strong className="text-white">6 créditos</strong> (administradores são isentos).</li>
          <li>Sem créditos suficientes o G-code não é liberado para download nem enviado à Fase 4.</li>
          <li>Depois: <strong className="text-white">Preview por camada</strong>, estatísticas (tempo, volume, êmbolo, vazão, shear no bico, viabilidade estimada), avisos e o G-code completo.</li>
        </ul>
      </StepCard>

      <StepCard n={8} title="Enviar para a Fase 4" icon={Download} accent="cyan">
        <p>
          <strong className="text-white">Baixar .gcode</strong>, <strong className="text-white">Enviar ao Host</strong> (impressão direta) ou <strong className="text-white">Fase 4 (Bioimpressão · Host)</strong> — que é uma única página:
          conexão USB, pré-flight (“bico posicionado no ponto zero”), joystick, fluxo da biotinta (M221), validador visual, regenerador e modo avançado.
        </p>
      </StepCard>

      {/* ── Dicas ─────────────────────────────────────────────────────── */}
      <Box2 icon={Eye} title="Leia a prévia antes de confirmar" tone="info">
        <ul className="list-disc pl-5 space-y-1">
          <li>A 1ª camada mostra paredes dentro→fora e o cordão de aproximação saindo do ponto zero.</li>
          <li>Ligue “camada anterior” para conferir o alinhamento 0/90 do woodpile.</li>
          <li>Se o infill parecer “cheio demais”, o problema costuma ser largura de linha &gt; bico (die swell): reduza a densidade ou aumente o espaçamento.</li>
        </ul>
      </Box2>

      <Box2 icon={AlertTriangle} title="Erros e avisos que bloqueiam" tone="warn">
        <ul className="list-disc pl-5 space-y-1">
          <li><code>target_too_small</code> — peça não cabe no alvo. Reduza ou troque o alvo.</li>
          <li><code>mesh_too_thin</code> — modelo mais baixo que meia camada. Aumente a escala.</li>
          <li><code>empty_layers</code> em toda a peça — STL aberto/não-manifold. Repare o arquivo.</li>
          <li>Avisos (não bloqueiam): camada &gt; bico, linha &lt; bico, cabeçote sem biotinta, célula multi-poço.</li>
        </ul>
      </Box2>

      <Box2 icon={Wand2} title="Regenerar sem voltar à Fase 3" tone="purple">
        <p>
          Na Fase 4, o painel <strong className="text-white">Regenerar G-code</strong> refatia localmente a mesma malha da Fase 3 com novas escalas X/Y/Z,
          camada, infill, velocidade, fluxo, paredes e temperatura — e cobra 6 créditos por G-code gerado, como qualquer outro.
        </p>
      </Box2>

      <Box2 icon={Layers} title="Testes de imprimibilidade" tone="cyan">
        <p>
          Em <em>Testes de imprimibilidade</em> os 8 testes (linha, grade Pf, ponte de colapso, torre, escada Z, leque, estrela, fidelidade) são fatiados a partir do
          <strong className="text-white"> STL real</strong> de cada teste pela mesma base — o que você vê é o que imprime.
        </p>
      </Box2>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-white pt-2">Perguntas frequentes</h2>
      <FaqItem q="Onde foram parar o 'G-code Rápido', o 'médico' e o 'avançado'?">
        Viraram caminhos para o BioSlicer. As rotas antigas (inclusive o BIA Studio e “Modelos 3D (STL)”) redirecionam para a Fase 3 (o “avançado” abre direto na aba Avançado). Os padrões Voronoi/Perlin/TPMS continuam existindo — agora honestos e na mesma base.
      </FaqItem>
      <FaqItem q="A prévia cobra créditos?">
        Não. A prévia de 3 camadas no modal é grátis. Só a geração do G-code completo (ao confirmar) debita 6 créditos.
      </FaqItem>
      <FaqItem q="Por que o G-code não tem G28?">
        Porque em bioimpressão o “home” da impressora não é o ponto zero da peça. Você posiciona o bico onde quer imprimir (centro da Petri, 1º poço), zera com <code>G92</code> na Fase 4 e o G-code começa ali. Isso evita colisões com a placa e tinta desperdiçada em park.
      </FaqItem>
      <FaqItem q="Posso usar 2 biotintas em uma placa de 24 poços?">
        Sim: 2 cabeçotes (T0/T1) + alvo “Placa 24” + “Todos” os poços. O G-code replica a peça poço a poço, com as trocas de ferramenta dentro de cada poço.
      </FaqItem>
      <FaqItem q="O menisco/fêmur/orelha ainda são facetados?">
        Não. Desde o R21/R22 são malhas anatômicas reais, na biblioteca da Fase 3 (o único lugar de geometria). Você escolhe só a dimensão principal e gira na Mesa.
      </FaqItem>

      <div className="flex items-center gap-2 text-xs text-emerald-200 pt-2">
        <CheckCircle2 className="w-4 h-4" /> Próximo capítulo: Fase 4 · Bioimpressão (Host).
      </div>
    </article>
  )
}
