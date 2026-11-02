---
title: "Módulo 3 · Biotintas — formulação, reologia e printabilidade"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# Biotintas: por que a mesma receita funciona num dia e não no outro

> **Leitura: 15 min · Nível: intermediário · Ferramenta BIA: Fase 2 · Formulador**

## 5 ideias-chave

1. **Biotinta ≠ biomaterial.** Biotinta é a formulação *imprimível com células*: polímero + solvente/meio + células + aditivos reológicos + estratégia de reticulação. O mesmo alginato é biomaterial no frasco e biotinta só depois de ajustado (concentração, Ca²⁺, viscosidade).

2. **A janela de printabilidade é um compromisso.** Viscosidade alta → fidelidade de forma, mas cisalhamento alto → morte celular. Viscosidade baixa → células felizes, mas o cordão escorre. Hidrogéis para extrusão vivem entre **~10 e 500 Pa·s** (na taxa de cisalhamento da agulha) — e o segredo é o comportamento **pseudoplástico** (afina ao passar pela agulha, recupera ao sair).

3. **Três números governam a extrusão mecânica:** área do cordão (largura × altura), velocidade da cabeça e área do êmbolo. A vazão é Q = A_cordão × v; o que o êmbolo precisa andar é E = V ÷ A_seringa. Hidrogéis moles pedem um **fator de extrusão 1,2–2,2×** sobre a teoria (compressibilidade, escorregamento na parede, die-swell).

4. **Reticulação tem dois tempos.** Pré-reticulação parcial (Ca²⁺ baixo, resfriamento da gelatina, fotoiniciador ativado por poucos segundos) dá *yield stress* para o cordão se sustentar; reticulação final (banho de CaCl₂, luz 405 nm, 37 °C) estabiliza. Pular a primeira = cordão que colapsa; exagerar = agulha entupida.

5. **Viabilidade cai com tensão de cisalhamento na parede** (τ = 4ηQ/πR³). Blaeser 2016: < 5 kPa ≈ 96 % de viabilidade; 5–10 kPa ≈ 91 %; > 10 kPa ≤ 76 %. Agulha maior, velocidade menor ou gel menos viscoso baixam τ — e cada um custa resolução ou forma. Você escolhe.

## Tabela de bolso — classes de biotinta na BIA

| Classe | Exemplos | Fator de extrusão | Vazão típica | Dica |
|---|---|---|---|---|
| Hidrogel mole | alginato 2–4 %, gelatina 5–10 %, GelMA 5–10 %, colágeno | **1,6×** (1,2–2,2) | 0,8–3 µL/s | Comprime e escorrega; comece generoso e ajuste pela largura do cordão |
| Pseudoplástica | blends alginato-gelatina, Pluronic 25–40 %, nanocelulose, comerciais | **1,35×** (1,1–1,8) | 1–4 µL/s | Flui sob cisalhamento e segura forma — a mais "fácil" |
| Pasta | HAp, cerâmicas, PCL-HAp | **1,15×** (1,0–1,4) | 4–30 µL/s | Quase incompressível; agulha ≥ 18G |
| FRESH (banho) | colágeno 10–20 mg/mL, alginato 2 % | **1,8×** (1,4–2,5) | 0,4–2 µL/s | Tinta fluida; o banho segura; retração obrigatória |
| Sacrificial | Pluronic F127 30–40 % | **1,3×** (1,1–1,7) | 1–5 µL/s | Gel acima de ~15 °C: frio para carregar, morno para imprimir |

## Faça agora na BIA
- **Fase 2 → Formulador:** escolha "Alginato 3 % + Gelatina 7 %" → veja a classe atribuída, o fator sugerido e a **seringa recomendada** (3 mL).
- **Fase 3 → BioSlicer → painel *Vai sair biotinta?*:** mude a seringa de 3 mL para 10 mL e observe a velocidade do êmbolo cair abaixo de 0,02 mm/s (zona de stick-slip). Volte para 3 mL.
- Registre sua primeira impressão na **Tabela de Aprendizado** (fluiu? nota 1–5) — a BIA ajusta o fator na próxima.

## Para saber mais
- Ouyang et al. 2016, *Biofabrication* — printabilidade de alginato/gelatina por janela de temperatura.
- Paxton et al. 2017, *Biofabrication* — avaliação de printabilidade em 2 passos (filamento + fusão de camadas).
- Schwab et al. 2020, *Chem. Rev.* — reologia e printabilidade de biotintas (revisão).
- Blaeser et al. 2016, *Adv. Healthc. Mater.* — cisalhamento × viabilidade.

---

# Teste de aprendizagem · Módulo 3

*8 questões · nota mínima 70 %*

**1. O que diferencia uma biotinta de um biomaterial?**
- a) Biotinta é sempre sintética
- b) Biotinta é a formulação ajustada para ser impressa com células viáveis ✔
- c) Biomaterial não pode ser reticulado
- d) Não há diferença — são sinônimos

*Explicação:* o biomaterial é o componente; a biotinta é o sistema completo (polímero + células + aditivos + reticulação) dentro da janela de printabilidade.

**2. Um gel "pseudoplástico" (shear-thinning) é desejável porque:**
- a) Fica mais viscoso quando cisalhado, protegendo as células
- b) Afina ao passar pela agulha e recupera a viscosidade ao sair ✔
- c) Nunca reticula
- d) Dispensa pré-carga

*Explicação:* baixa viscosidade dentro da agulha (menos cisalhamento nas células) e alta fora (cordão mantém forma) — o melhor dos dois mundos.

**3. Para a mesma biotinta e o mesmo cordão, trocar a seringa de 10 mL por 3 mL faz o êmbolo:**
- a) Andar ~2,8× menos por microlitro
- b) Andar ~2,8× mais por microlitro ✔
- c) Andar a mesma distância
- d) Parar de funcionar com M221

*Explicação:* E = V ÷ A. A área cai de 165 para 59 mm² → o mesmo volume exige 2,8× mais deslocamento, saindo da zona de stick-slip do fuso.

**4. O fator de extrusão de 1,6× recomendado para hidrogéis moles existe porque:**
- a) O slicer erra o cálculo de volume
- b) O gel comprime, escorrega na parede e incha ao sair (die-swell) ✔
- c) As células ocupam 60 % do volume
- d) A agulha 22G é muito larga

*Explicação:* o volume que realmente sai fica 20–60 % abaixo do teórico (Ribeiro 2017, Lee 2020); o fator compensa.

**5. Segundo Blaeser (2016), qual faixa de tensão de cisalhamento na parede mantém viabilidade ≈ 96 %?**
- a) < 5 kPa ✔
- b) 5–10 kPa
- c) 10–20 kPa
- d) > 20 kPa

*Explicação:* acima de 10 kPa a viabilidade cai para ≤ 76 %. A BIA calcula τ no BioSlicer quando você informa a viscosidade.

**6. Para reduzir o cisalhamento sem trocar de biotinta, a medida mais eficaz é:**
- a) Aumentar a velocidade de impressão
- b) Usar agulha de diâmetro maior ✔
- c) Aumentar o fator de extrusão
- d) Resfriar a mesa

*Explicação:* τ ∝ 1/R³ — dobrar o raio divide a tensão por 8. Velocidade maior *aumenta* Q e τ.

**7. Pluronic F127 a 30 % deve ser carregado na seringa:**
- a) A 37 °C
- b) Frio (≈ 4 °C), pois é líquido abaixo de ~15 °C ✔
- c) Após reticulação com Ca²⁺
- d) Misturado a fotoiniciador

*Explicação:* é um gel termorreversível invertido: líquido frio, gel morno. Carrega frio sem bolhas, imprime a ~25 °C.

**8. Um cordão de alginato colapsa logo após sair da agulha. A causa mais provável é:**
- a) Fator de extrusão muito baixo
- b) Falta de pré-reticulação / yield stress insuficiente ✔
- c) Agulha muito fina
- d) Velocidade de travel alta

*Explicação:* sem yield stress o gel escorre; adicionar gelatina, um pouco de Ca²⁺ ou resfriar o cartucho dá estrutura ao cordão antes do banho final.
