---
title: "Módulo 7 · Tecidos — pele, osso, cartilagem, tecidos moles e vasos"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# Cada tecido é um conjunto diferente de compromissos

> **Leitura: 15 min · Nível: intermediário · Ferramenta BIA: Fase 1 · Modelo de tecido + Pipeline**

## 5 ideias-chave

1. **Comece pela função, não pela forma.** Pele precisa de barreira (epiderme estratificada) e derme vascularizável; osso, de rigidez e osteocondução; cartilagem, de matriz avascular que suporte compressão; vaso, de lúmen patente com endotélio confluente. A arquitetura, a biotinta e as células derivam dessa pergunta.

2. **Pele é o tecido mais maduro em bioimpressão.** Camadas: derme (fibroblastos em colágeno/fibrina/GelMA, 5–10 × 10⁶/mL) → epiderme (queratinócitos em alta densidade, 10–20 × 10⁶/mL) → cultura em interface ar-líquido por 7–14 dias para estratificar. Já há enxertos bioimpressos *in situ* em estudos clínicos.

3. **Osso é mecânica + mineral.** Hidrogel com células (GelMA/alginato + MSC) **não** sustenta carga; a solução é híbrida — PCL ou cerâmica (HAp/TCP) como esqueleto + hidrogel celularizado nos poros. Poros 300–500 µm, gyroid ou 0/90, meio osteogênico (dexametasona, β-glicerofosfato, ácido ascórbico) por 21 dias.

4. **Cartilagem é o paradoxo:** avascular (não precisa de vasos — vantagem) mas hipocelular e de regeneração quase nula (desvantagem). Condrócitos desdiferenciam em 2D (passagem ≤ 2!). Biotintas: alginato/GelMA/HAMA 5–10 × 10⁶/mL, poros menores (100–300 µm), compressão dinâmica em biorreator melhora GAG e colágeno II.

5. **Vascularização é a condição de tudo acima de 200 µm.** Estratégias: (a) canais sacrificiais (Pluronic, gelatina, carboidrato) depois perfundidos e endotelizados; (b) coaxial — tinta de HUVEC no núcleo, hidrogel na casca; (c) FRESH com colágeno para redes ramificadas; (d) pré-vascularização por auto-organização (HUVEC + MSC formam redes em 7 dias). Sem isso, o centro do construto morre.

## Tabela de bolso — receita de partida por tecido

| Tecido | Células (densidade) | Biotinta típica | Arquitetura | Maturação |
|---|---|---|---|---|
| Pele | fibroblastos 5–10 M + queratinócitos 10–20 M | colágeno/fibrina/GelMA 5–7,5 % | 2 camadas planas, poros pequenos | ar-líquido 7–14 d |
| Osso | MSC/osteoblastos 2–5 M | GelMA 10 % + HAp; PCL de reforço | gyroid/0-90, poro 300–500 µm | osteogênico 21 d |
| Cartilagem | condrócitos P≤2 ou MSC 5–10 M | alginato 3 % + gelatina 7 %; HAMA | 0/90 ou concêntrico, poro 100–300 µm | condrogênico + compressão dinâmica 21–28 d |
| Vaso | HUVEC 5–10 M (+ SMC/pericitos) | GelMA/fibrina; sacrificial Pluronic 30–40 % | canal Ø 0,5–2 mm; coaxial | perfusão 3–7 d |
| Tecido mole/adiposo | ASC 5 M | dECM adiposo, GelMA 5 % | poros grandes, módulo baixo (1–5 kPa) | adipogênico 14 d |

## Faça agora na BIA
- **Fase 1 → Modelo de tecido**: *pele* → veja o preset de 2 camadas; *osteocondral* → veja o sanduíche gradiente.
- **Fase 2 → Receitas validadas** filtradas por *vascular*: compare a receita coaxial com a sacrificial (Pluronic).
- **Pipeline**: no seu projeto, preencha "tecido-alvo" e "função crítica" — a BIA sugere arquitetura e biotinta.

## Para saber mais
- Cubo et al. 2017, *Biofabrication* — pele humana bioimpressa.
- Kolesky et al. 2014/2016, *Adv. Mater. / PNAS* — canais sacrificiais e tecidos espessos vascularizados.
- Daly et al. 2016, *Adv. Healthc. Mater.* — biotintas para cartilagem: comparação.

---

# Teste de aprendizagem · Módulo 7

*8 questões · nota mínima 70 %*

**1. Para estratificar a epiderme de uma pele bioimpressa, a etapa indispensável é:**
- a) Reticulação com Ca²⁺
- b) Cultura em interface ar-líquido por 7–14 dias ✔
- c) Compressão dinâmica
- d) Perfusão imediata

*Explicação:* queratinócitos só formam camadas córneas quando expostos ao ar; submersos, não diferenciam.

**2. Por que scaffolds ósseos para carga são híbridos (PCL/cerâmica + hidrogel)?**
- a) Porque hidrogel não reticula com células
- b) Porque hidrogel celularizado não sustenta carga mecânica; o polímero/cerâmica dá o esqueleto ✔
- c) Porque PCL é osteoindutor
- d) Porque é mais barato

*Explicação:* módulo de hidrogéis (kPa) é 10³–10⁶× menor que o do osso (GPa); o reforço dá forma e rigidez enquanto o hidrogel carrega células.

**3. Condrócitos em cultura 2D por muitas passagens:**
- a) Proliferam mais e mantêm fenótipo
- b) Desdiferenciam para fenótipo fibroblástico (colágeno I em vez de II) ✔
- c) Tornam-se osteoblastos
- d) Morrem em 24 h

*Explicação:* use passagem ≤ 2 ou re-diferencie em 3D com TGF-β; é o erro clássico em cartilagem.

**4. Qual estratégia de vascularização usa uma tinta que é removida depois da impressão?**
- a) Coaxial
- b) Canais sacrificiais (Pluronic, gelatina, carboidrato) ✔
- c) Pré-vascularização por auto-organização
- d) FRESH

*Explicação:* o material sacrificial ocupa o lugar do canal, é dissolvido (frio, água, enzima) e o canal é perfundido e endotelizado.

**5. Na bioimpressão coaxial de um vaso, o núcleo e a casca contêm, tipicamente:**
- a) Núcleo: HAp · casca: PCL
- b) Núcleo: células endoteliais/meio ou sacrificial · casca: hidrogel estrutural ✔
- c) Núcleo: queratinócitos · casca: fibroblastos
- d) Núcleo: ar · casca: alginato

*Explicação:* a casca de alginato/GelMA reticula ao sair (CaCl₂ no núcleo ou externo) formando um tubo oco já com endotélio.

**6. A maior vantagem da cartilagem para a biofabricação é ser:**
- a) Altamente vascularizada
- b) Avascular — não exige rede de vasos para sobreviver ✔
- c) Rica em células
- d) De regeneração rápida

*Explicação:* nutrição por difusão a partir do líquido sinovial; a desvantagem é a baixa celularidade e capacidade regenerativa.

**7. O meio osteogênico padrão contém:**
- a) TGF-β3 e insulina
- b) Dexametasona, β-glicerofosfato e ácido ascórbico ✔
- c) Trombina e fibrinogênio
- d) EGF e KGF

*Explicação:* o trio induz MSC a osteoblastos e fornece fosfato para mineralização (ALP↑, nódulos de cálcio em 21 d).

**8. Um construto de pele de 2 mm de espessura sem vascularização, após 7 dias, provavelmente mostrará:**
- a) Epiderme perfeita e derme viável
- b) Necrose central da derme por limite de difusão ✔
- c) Mineralização
- d) Formação espontânea de vasos

*Explicação:* 2 mm ≫ 200 µm de difusão; derme espessa exige pré-vascularização ou canais perfundidos.
