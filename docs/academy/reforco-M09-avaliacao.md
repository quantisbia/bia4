---
title: "Módulo 9 · Avaliação pós-impressão — viabilidade, morfologia, mecânica e histologia"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# Se não mediu, não imprimiu

> **Leitura: 15 min · Nível: intermediário · Ferramenta BIA: Fase 5 · Análise da bioimpressão + Tabela de Aprendizado**

## 5 ideias-chave

1. **Avalie em três tempos.** *Dia 0* (o processo matou?): viabilidade, fidelidade de forma. *Dia 7* (as células se recuperaram e se adaptaram?): proliferação, morfologia, início de matriz. *Dia 21–28* (virou tecido?): marcadores de diferenciação, mecânica, histologia. Pular o dia 0 esconde o erro de processo atrás do erro de biologia.

2. **Fidelidade de forma é número, não impressão.** Razão de printabilidade **Pr = L²/16A** (Ouyang 2016): Pr = 1 → poro quadrado perfeito; < 1 → gel escorreu (sub-gelificado); > 1 → cordão irregular (sobre-gelificado). Mais: largura real do cordão ÷ diâmetro da agulha (die-swell, ideal 1,0–1,3), altura do construto ÷ altura de projeto (colapso).

3. **Viabilidade tem método e tem viés.** Live/Dead confocal em 3 planos Z (não só a superfície!); alamarBlue para cinética sem destruir a amostra; LDH no meio para lise cumulativa. Reporte sempre: tempo, profundidade, n de campos. "Viabilidade 95 %" na superfície e 40 % no centro é um construto morto.

4. **Mecânica diz se vai sobreviver ao implante.** Compressão não confinada (módulo de Young a 10–20 % de deformação) e *swelling* (razão de inchamento 24 h) são o mínimo; para cartilagem, compressão dinâmica; para vaso, pressão de ruptura. Compare com o tecido-alvo, não com "forte o suficiente".

5. **Histologia e marcadores fecham o laço.** H&E (organização), Alcian blue/Safranin O (GAG — cartilagem), Alizarin red/von Kossa (mineral — osso), imunofluorescência (colágeno II vs I, osteocalcina, CD31 para vasos), qPCR dos genes-alvo. Um resultado positivo sem controle negativo (scaffold sem indutor) não prova nada.

## Tabela de bolso — painel mínimo por pergunta

| Pergunta | Ensaio | Quando | Resultado esperado |
|---|---|---|---|
| O processo matou? | Live/Dead 3 planos Z | dia 0 (2–4 h) | ≥ 85 % vivas, homogêneo em Z |
| Saiu o que eu desenhei? | Pr = L²/16A; largura/agulha; altura real/projeto | dia 0 | Pr 0,9–1,1; 1,0–1,3×; ≥ 90 % |
| As células se recuperaram? | alamarBlue/CCK-8 d1, d3, d7 | semana 1 | curva ascendente |
| O construto aguenta? | compressão (E a 10–20 %); swelling 24 h | dia 1 e 21 | E compatível com tecido; swelling estável |
| Virou tecido? | histoquímica + IF + qPCR | dia 21–28 | marcador-alvo ↑ vs controle |
| Está estéril? | meio límpido, pH, teste de micoplasma | semanal | — |

## Faça agora na BIA
- **Fase 5 → `/dashboard/bioprint/review`**: registre a última impressão — nota 1–5, "fluiu?", relato. Veja a BIA interpretar e propor ajustes para o próximo G-code.
- **Tabela de Aprendizado**: filtre por material; observe o fator de extrusão efetivo convergir após 3 registros.
- **Fase 6 → Maturação**: monte o cronograma de ensaios d0 / d7 / d21 para o seu projeto do Pipeline.

## Para saber mais
- Ouyang et al. 2016, *Biofabrication* — índice de printabilidade Pr.
- Gillispie et al. 2020, *Biofabrication* — assessment methodologies for extrusion bioprinting (revisão).
- Ribeiro et al. 2017 — testes de colapso e fusão de filamentos.

---

# Teste de aprendizagem · Módulo 9

*8 questões · nota mínima 70 %*

**1. Um poro impresso tem perímetro L = 4 mm e área A = 0,8 mm². O Pr é:**
- a) 0,5
- b) 1,0
- c) 1,25 ✔
- d) 5,0

*Explicação:* Pr = L²/16A = 16/(16 × 0,8) = 1,25 → cordão irregular, gel sobre-gelificado (ou muito viscoso).

**2. Pr < 1 indica:**
- a) Poro perfeito
- b) Gel escorreu / sub-gelificado (poros arredondados) ✔
- c) Cordão quebradiço
- d) Agulha entupida

*Explicação:* bordas se arredondam porque o gel flui depois de depositado; aumente pré-reticulação ou viscosidade.

**3. Por que medir viabilidade em vários planos Z do construto?**
- a) Para gastar menos reagente
- b) Porque a superfície pode estar viva e o centro morto (difusão) ✔
- c) Porque o confocal exige
- d) Não é necessário

*Explicação:* oxigênio e corante penetram ~200 µm; só a superfície dá um número otimista e falso.

**4. Qual ensaio permite acompanhar a proliferação **sem destruir** a amostra?**
- a) MTT
- b) alamarBlue (resazurina) ✔
- c) Live/Dead com fixação
- d) Histologia H&E

*Explicação:* a resazurina é reduzida por células metabolicamente ativas e o meio é trocado; a amostra segue em cultura. MTT precipita formazan e mata.

**5. Para confirmar mineralização num scaffold ósseo, a coloração indicada é:**
- a) Alcian blue
- b) Alizarin red / von Kossa ✔
- c) Safranin O
- d) Oil red O

*Explicação:* Alizarin red liga cálcio; von Kossa, fosfato. Alcian blue e Safranin O marcam GAG (cartilagem); Oil red, lipídio (adiposo).

**6. Em cartilagem engenheirada, a razão colágeno II / colágeno I alta indica:**
- a) Fibrose
- b) Fenótipo condrocítico hialino preservado ✔
- c) Mineralização
- d) Morte celular

*Explicação:* colágeno II é marca da cartilagem hialina; colágeno I predomina em fibrocartilagem/desdiferenciação.

**7. Um controle negativo adequado para provar osteoindução é:**
- a) Scaffold sem células
- b) Mesmo scaffold + células em meio **sem** indutores osteogênicos ✔
- c) Placa 2D com células
- d) Nenhum — a coloração positiva basta

*Explicação:* sem o controle, não se distingue efeito do scaffold/células do efeito do meio.

**8. A largura do cordão medida é 0,70 mm para agulha de 0,41 mm (1,7×). Interpretação:**
- a) Normal — die-swell esperado
- b) Sobre-extrusão ou altura de camada baixa esmagando o cordão ✔
- c) Agulha errada
- d) Velocidade alta demais

*Explicação:* die-swell típico é 1,0–1,3×; 1,7× indica excesso de material ou esmagamento — reduza fluxo (M221) ou aumente a altura de camada.
