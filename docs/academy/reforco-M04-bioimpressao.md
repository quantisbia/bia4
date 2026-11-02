---
title: "Módulo 4 · Bioimpressão 3D — modelagem, fatiamento e parâmetros"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# Do modelo ao G-code: o que cada parâmetro faz com a célula

> **Leitura: 15 min · Nível: intermediário · Ferramenta BIA: Fase 3 · BioSlicer**

## 5 ideias-chave

1. **Quatro famílias, quatro compromissos.** *Extrusão* (viscoso, barato, 100–500 µm, células sofrem cisalhamento) · *Jato/inkjet* (gotas, baixa viscosidade, alta resolução, baixa densidade celular) · *Luz* (DLP/SLA/2-fóton: a melhor resolução, só fotorreticuláveis) · *Freeform/FRESH* (tinta fluida em banho de suporte, geometrias ocas). Na prática laboratorial, **extrusão é 80 % dos casos** — e é o que a BIA fatia.

2. **Altura de camada = 70–90 % do diâmetro da agulha.** Mais alto que a agulha → o cordão não encosta na camada de baixo (sem adesão); muito baixo → esmaga, alarga e fecha poros. Largura de linha ≈ 1,0–1,3× o diâmetro (die-swell).

3. **Velocidade e vazão andam juntas.** Hidrogéis: perímetro 3–10 mm/s, infill 20–40 % mais rápido, travel 30–50 mm/s. Dobrar a velocidade sem dobrar a vazão produz cordão fino e quebrado; dobrar só a vazão produz "macarrão". O slicer acopla os dois; o M221 desacopla em tempo real.

4. **Infill honesto.** *Rectilinear 0/90* (woodpile) dá poros quadrados ≈ espaçamento − largura; *zigzag* reduz arranques (menos gotas); *concêntrico* para peças redondas; *gyroid/TPMS* para scaffolds ósseos. Densidade 25–45 % é a janela típica para nutrição por difusão (poros 200–500 µm).

5. **Ponto zero é ponto zero.** O G-code da BIA não faz home: começa onde o bico está, extruda já na aproximação e termina com Z+5 sem *park*. Travels longos ganham retração + Z-hop; cada arranque de extrusão é uma gota potencial — por isso o BioSlicer avisa quando há > 40 arranques por camada.

## Tabela de bolso — parâmetros de partida (agulha 22G = 0,41 mm)

| Parâmetro | Hidrogel mole | Pseudoplástica | Pasta/cerâmica |
|---|---|---|---|
| Altura de camada | 0,30–0,33 mm | 0,33 mm | 0,6–0,7 mm (18G) |
| Largura de linha | 0,47 mm | 0,47 mm | 0,95 mm |
| Vel. perímetro | 6–8 mm/s | 8–10 mm/s | 8–12 mm/s |
| Infill | rectilinear 30–40 % | zigzag 40 % | zigzag 30 % |
| Fator de extrusão | 1,6× | 1,35× | 1,15× |
| Seringa | 3 mL | 3–5 mL | 10 mL |
| Retração | 0–0,4 µL | 0,3–0,5 µL | 1 µL |

## Faça agora na BIA
- **BioSlicer** → primitiva *disco Ø10 × 2 mm* → perfil *GelMA* → compare **rectilinear 35 %** vs **zigzag 35 %**: veja a diferença em *arranques de extrusão* e *tempo*.
- Troque a agulha para 27G (0,21 mm) e observe a viabilidade estimada cair e o aviso de cisalhamento aparecer.
- Abra o G-code gerado e localize: `G92`, a pré-carga, o primeiro `G1 … E` e o `;LAYER:1`.

## Para saber mais
- Murphy & Atala 2014, *Nat. Biotechnol.* — o artigo que organizou o campo.
- Ribeiro et al. 2017, *Biofabrication* — espaçamento ≥ 1,4× o cordão evita fusão de filamentos.
- Compaired et al. 2025, *Int. J. Bioprint.* — parâmetros de extrusão para pastas.

---

# Teste de aprendizagem · Módulo 4

*8 questões · nota mínima 70 %*

**1. Qual técnica de bioimpressão aceita biotintas mais viscosas e maior densidade celular?**
- a) Jato de tinta (inkjet)
- b) Extrusão ✔
- c) Estereolitografia
- d) Laser-assisted

*Explicação:* extrusão trabalha de 10 a > 1000 Pa·s e com 10⁶–10⁸ células/mL; inkjet exige < 10 mPa·s e poucas células por gota.

**2. A regra prática para altura de camada em hidrogel é:**
- a) Igual ao diâmetro da agulha
- b) 70–90 % do diâmetro da agulha ✔
- c) 2× o diâmetro da agulha
- d) Sempre 0,1 mm

*Explicação:* um pouco menor que a agulha garante que o cordão toque e adira à camada anterior sem ser esmagado.

**3. Você aumentou a velocidade de 6 para 12 mm/s sem mudar mais nada. O cordão deve ficar:**
- a) Mais largo
- b) Mais fino e com falhas ✔
- c) Igual — o slicer compensa sozinho
- d) Mais alto

*Explicação:* o slicer já calculou E por mm para a velocidade original; na impressora, mudar só a velocidade (M220) mantém E/mm, mas a pressão do gel não acompanha e o cordão estira.

**4. Para um scaffold que precisa de poros interconectados ~300 µm para nutrição por difusão, o infill mais indicado é:**
- a) Concêntrico 100 %
- b) Rectilinear 0/90 com espaçamento calculado ✔
- c) Sem infill (só paredes)
- d) Gradiente 90 %

*Explicação:* o woodpile 0/90 produz poros quadrados previsíveis (espaçamento − largura) e canais retos interconectados em Z.

**5. O que o padrão "zigzag" melhora em relação ao "rectilinear"?**
- a) Aumenta a resistência mecânica
- b) Reduz arranques de extrusão (menos gotas) ✔
- c) Permite agulhas menores
- d) Elimina a necessidade de retração

*Explicação:* as linhas são conectadas em um caminho contínuo, então o êmbolo não para e recomeça a cada linha.

**6. Por que o G-code da BIA NÃO contém `G28`?**
- a) Porque é mais rápido
- b) Porque a bioimpressora pode ter placa/cartucho montados e o home mecânico colidiria ✔
- c) Porque o Marlin não aceita G28
- d) Porque G92 é mais preciso que G28

*Explicação:* a origem é definida onde o bico está (G92). Home mecânico destruiria a amostra ou o cartucho.

**7. Um cordão de 0,47 mm de largura com espaçamento de 0,5 mm entre linhas tende a:**
- a) Formar poros nítidos
- b) Fundir com o vizinho ✔
- c) Quebrar
- d) Não aderir

*Explicação:* Ribeiro 2017 — espaçamento < 1,4× o cordão (aqui 0,66 mm) leva à fusão de filamentos e fechamento dos poros.

**8. "Pré-carga" e "retração" no G-code da BIA servem, respectivamente, para:**
- a) Aquecer e resfriar a agulha
- b) Encher a agulha antes do 1º cordão e aliviar pressão em travels longos ✔
- c) Mover em X e em Y
- d) Zerar o E e medir o cordão

*Explicação:* a pré-carga cobre o volume morto (~45 µL); a retração evita que o gel continue saindo enquanto a cabeça viaja sem imprimir.
