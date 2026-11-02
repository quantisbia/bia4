---
title: "Módulo 6 · Células — cultivo 2D/3D e esferoides"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# A célula é o ingrediente que não se compra pronto

> **Leitura: 15 min · Nível: básico→intermediário · Ferramenta BIA: Organoid Builder / Chat**

## 5 ideias-chave

1. **2D mente.** Em plástico, a célula achata, polariza de forma artificial, prolifera mais e responde a fármacos de modo diferente do tecido. 3D (hidrogel, esferoide, organoide) recupera interações célula-célula e célula-matriz em todas as direções — por isso modelos 3D predizem toxicidade melhor que 2D.

2. **Fonte celular define o projeto.** *Primárias* (do paciente/doador: fiéis, mas finitas e variáveis) · *linhagens* (imortalizadas: reprodutíveis, mas desviadas) · *tronco adultas* (MSC de medula/adiposo: multipotentes, imunomoduladoras) · *iPSC* (pluripotentes, do próprio paciente, mas caras e com risco teratogênico). Para modelo *in vitro*, linhagem; para terapia, autóloga ou MSC alogênica.

3. **Densidade celular na biotinta: 1–20 × 10⁶ células/mL.** Abaixo de 1 × 10⁶ a célula fica isolada e não forma tecido; acima de 20 × 10⁶ a viscosidade sobe, a tinta entope e o consumo de O₂ supera a difusão. Pele e cartilagem ficam em 5–10 × 10⁶; osso 2–5 × 10⁶.

4. **Esferoides são "pixels biológicos".** Agregados de 100–500 µm formados por auto-organização (gota pendente, placa de baixa adesão, micropoços). Têm gradiente de O₂ (núcleo hipóxico acima de ~400 µm), produzem matriz própria e **fundem** entre si — base do bioassembly e da bioimpressão scaffold-free (Kenzan, aspiração).

5. **Viabilidade é medida, não presumida.** Live/Dead (calceína AM + etídio) no dia 0, 1 e 7; metabólica (alamarBlue/MTT) para proliferação; LDH no meio para lise. Meta prática: ≥ 85 % no dia 0 (perda só do cisalhamento) e recuperação até o dia 7.

## Tabela de bolso — métodos de esferoide

| Método | Tamanho | Uniformidade | Throughput | Custo | Nota |
|---|---|---|---|---|---|
| Gota pendente | 200–500 µm | alta | baixo | baixo | clássico; trabalhoso |
| Placa U de baixa adesão | 100–800 µm | alta | médio | médio | padrão de triagem |
| Micropoços (AggreWell) | 50–300 µm | muito alta | alto | alto | milhares por poço |
| Agitação (spinner) | variável | baixa | muito alto | médio | escala, menos controle |
| Magnético | 300–800 µm | média | médio | alto | manipulação fácil |

## Faça agora na BIA
- **Organoid Builder** (`/dashboard/organoids`): escolha *condrócitos*, 5 000 células/esferoide → veja o diâmetro previsto e o tempo até o núcleo hipóxico.
- **Chat BIA**: pergunte *"qual densidade celular para GelMA 10 % em cartilagem?"* e compare com a tabela acima.
- **Fase 2**: ative *"com células"* numa receita e observe a viabilidade estimada aparecer no BioSlicer.

## Para saber mais
- Pampaloni et al. 2007, *Nat. Rev. Mol. Cell Biol.* — the third dimension bridges the gap between cell culture and live tissue.
- Laschke & Menger 2017, *Trends Biotechnol.* — spheroids as building blocks.
- Blaeser et al. 2016 — viabilidade × cisalhamento na bioimpressão.

---

# Teste de aprendizagem · Módulo 6

*8 questões · nota mínima 70 %*

**1. Por que modelos 3D predizem a resposta a fármacos melhor que cultura 2D?**
- a) Porque usam mais células
- b) Porque recuperam interações célula-célula/matriz e gradientes semelhantes ao tecido ✔
- c) Porque são mais baratos
- d) Porque dispensam soro

*Explicação:* em 2D a célula achata e polariza artificialmente; em 3D morfologia, sinalização e difusão se aproximam do *in vivo*.

**2. Para um modelo de triagem reprodutível em larga escala, a fonte celular mais adequada é:**
- a) Primárias de cada paciente
- b) Linhagem imortalizada ✔
- c) iPSC diferenciadas caso a caso
- d) Biópsia fresca

*Explicação:* linhagens são homogêneas e ilimitadas; o preço é o desvio genético em relação ao tecido normal.

**3. A densidade celular típica numa biotinta de extrusão é:**
- a) 10³–10⁴ células/mL
- b) 10⁶–2 × 10⁷ células/mL ✔
- c) 10⁹ células/mL
- d) 1 célula por cordão

*Explicação:* abaixo de 1 milhão/mL não há tecido; acima de 20 milhões a tinta entope e o oxigênio não basta.

**4. Um esferoide de 600 µm de diâmetro tende a apresentar:**
- a) Proliferação uniforme
- b) Núcleo hipóxico/necrótico ✔
- c) Fusão impossível
- d) Ausência de matriz

*Explicação:* o limite de difusão (~200 µm da superfície) deixa o centro sem O₂ acima de ~400 µm de diâmetro.

**5. A propriedade dos esferoides que fundamenta o bioassembly é:**
- a) Serem transparentes
- b) Fundirem-se espontaneamente quando em contato ✔
- c) Não produzirem matriz
- d) Serem imortais

*Explicação:* tensão superficial tecidual leva agregados vizinhos a coalescer — princípio do Kenzan e da bioimpressão por aspiração.

**6. O ensaio Live/Dead (calceína AM / etídio homodímero) mede:**
- a) Proliferação ao longo de dias
- b) Viabilidade por integridade de membrana em um instante ✔
- c) Diferenciação
- d) Expressão gênica

*Explicação:* calceína marca células com esterases ativas (vivas, verde); etídio entra só em membranas rompidas (mortas, vermelho). É instantâneo; proliferação exige ensaio metabólico.

**7. Qual fonte celular carrega risco de formação de teratoma se indiferenciada?**
- a) MSC de tecido adiposo
- b) Fibroblastos primários
- c) iPSC ✔
- d) Condrócitos

*Explicação:* células pluripotentes residuais podem formar tumores de três folhetos; protocolos clínicos exigem purificação rigorosa.

**8. Uma viabilidade de 85 % no dia 0 que sobe para 95 % no dia 7 indica:**
- a) Erro de contagem
- b) Perda inicial por cisalhamento seguida de proliferação/recuperação — resultado esperado ✔
- c) Contaminação
- d) Falha de reticulação

*Explicação:* a impressão mata parte das células (cisalhamento, pressão); as sobreviventes proliferam e a proporção de vivas sobe.
