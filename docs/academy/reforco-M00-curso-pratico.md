---
title: "Módulo 0 · Aulas introdutórias do curso prático"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# Antes de ligar a bioimpressora

> **Leitura: 15 min · Nível: básico · Vale para toda prática na BIA**

## 5 ideias que você precisa levar para a bancada

1. **A BIA tem 6 fases, e a ordem importa.** Modelo de tecido → Biotinta → Fatiamento → Bioimpressão → Análise → Maturação. Pular a Fase 2 (biotinta) é o erro nº 1: o G-code sai com fator de extrusão genérico e "não sai nada" na agulha.

2. **Nunca G28 com bandeja ou cartucho montados.** A bioimpressora não faz *home* mecânico: você posiciona o bico sobre o alvo com o joystick e clica **Zerar aqui (G92)**. O G-code da BIA começa exatamente nesse ponto.

3. **E-steps são a primeira coisa a conferir.** Se `E+10` move o êmbolo menos que 10 mm, o firmware ainda está com passos de filamento (Ender = 93 steps/mm). Extrusor de seringa precisa de 400–8 000. Regra: **novo = atual × pedido ÷ medido** → `M92 E<novo>` + `M500`.

4. **Pré-carga antes do primeiro cordão.** Agulha 22G + luer têm ~45 µL de volume morto. Até encher, a cabeça anda e nada sai. Use **Empurrar +50 µL** até ver o filamento na ponta; só depois imprima.

5. **O fluxo (M221) é um ajuste fino, não um conserto.** Se precisou passar de 150 %, o problema está em outro lugar: E-steps, seringa grande demais (10 mL → troque por 3 mL), agulha entupida ou biotinta fora da janela de gelificação.

## Checklist de 5 minutos (imprima e cole na bancada)

| ✓ | Item | Como verificar |
|---|---|---|
| ☐ | Biotinta na janela de temperatura | GelMA 21–25 °C · Pluronic frio p/ carregar, 25 °C p/ imprimir · Matrigel 4–10 °C |
| ☐ | Seringa sem bolhas | Êmbolo para cima, bater, purgar até cordão contínuo |
| ☐ | E-steps calibrados | `E+10` anda 10 mm (painel *Calibrar E-steps do êmbolo*) |
| ☐ | Extrusão a frio liberada | `M302 S0 P1` (a BIA envia ao conectar) |
| ☐ | Origem zerada sobre o alvo | Joystick → centro da Petri/poço → **Zerar aqui** |
| ☐ | Pré-carga feita | Filamento visível na ponta da agulha |
| ☐ | FlowCheck "ok" no BioSlicer | Sem aviso `flow_very_low` no painel *Vai sair biotinta?* |

## Faça agora na BIA
- **Fase 4 → `/dashboard/bioprint/execute`** → conecte (Chrome/Edge) → painel **Calibrar E-steps** → Ler · Mover E+10 · medir · Gravar.
- **Fase 3 → BioSlicer** → cubo 10×10×1 mm · perfil "Primeira impressão" → confira o veredito do **FlowCheck**.

## Para saber mais
- Guia do Aluno BIA Academy 2026 (PDF nesta aula).
- Manual da BIA · *Fase 4 · Bioimpressão* (`/dashboard/manual`).
- Cordova et al. 2024, *Enderstruder* — extrusor de seringa de baixo custo e sua calibração.

---

# Teste de aprendizagem · Módulo 0

*8 questões · nota mínima 70 % (6 acertos) · você pode refazer*

**1. Ao conectar a bioimpressora na BIA, o que deve acontecer antes de iniciar o G-code?**
- a) Enviar `G28` para encontrar a origem mecânica
- b) Posicionar o bico sobre o alvo e zerar com `G92` ✔
- c) Aquecer o hotend a 170 °C
- d) Desligar os motores com `M18`

*Explicação:* bioimpressoras preservam bandeja/cartucho; a origem é definida onde o bico está (`G92 X0 Y0 Z0 E0`). `G28` pode colidir com a placa; não há hotend; `M18` solta os motores e perde a posição.

**2. Você pede `E+10` e o êmbolo anda 1 mm. O firmware mostra `M92 E93`. Qual o novo valor?**
- a) 9,3
- b) 93
- c) 930 ✔
- d) 9 300

*Explicação:* novo = atual × pedido ÷ medido = 93 × 10 ÷ 1 = 930 steps/mm.

**3. Por que a BIA faz uma "pré-carga" antes do primeiro cordão?**
- a) Para aquecer a biotinta
- b) Para encher o volume morto da agulha e do luer (~45 µL) ✔
- c) Para testar o motor X
- d) Para limpar a mesa

*Explicação:* até a agulha encher, o êmbolo avança e nada sai na ponta — a cabeça "imprime seco".

**4. O fluxo (M221) já está em 200 % e ainda sai pouca biotinta. A atitude correta é:**
- a) Subir para 400 %
- b) Investigar E-steps, tamanho da seringa, agulha e temperatura ✔
- c) Aumentar a velocidade de impressão
- d) Trocar o G-code por um de FDM

*Explicação:* M221 multiplica um E que pode ser quase zero; acima de ~150 % o sinal é de erro de calibração ou de material, não de fluxo.

**5. Qual seringa faz o êmbolo andar mais por microlitro?**
- a) BD 20 mL
- b) BD 10 mL
- c) BD 5 mL
- d) BD 3 mL ✔

*Explicação:* E = V ÷ área. A 3 mL (59 mm²) anda 2,8× mais que a 10 mL (165 mm²) para o mesmo volume — melhor resolução e menos stick-slip.

**6. `M302 S0 P1` serve para:**
- a) Zerar o eixo E
- b) Gravar E-steps na EEPROM
- c) Permitir extrusão com o hotend frio ✔
- d) Definir o fluxo em 100 %

*Explicação:* Marlin bloqueia `G1 E` abaixo de 170 °C por padrão (PREVENT_COLD_EXTRUSION); bioimpressão acontece a 4–37 °C.

**7. O que o `M500` faz depois de `M92 E930`?**
- a) Testa o motor
- b) Salva a configuração na EEPROM (sobrevive ao desligar) ✔
- c) Move o êmbolo 500 passos
- d) Reseta o firmware

*Explicação:* sem `M500`, o valor volta ao padrão no próximo boot — é a causa clássica de "calibrei ontem e hoje desandou".

**8. Qual destas NÃO é uma das 6 fases da BIA?**
- a) Biotinta
- b) Fatiamento
- c) Esterilização em autoclave ✔
- d) Maturação

*Explicação:* as fases são Modelo de tecido · Biotinta · Fatiamento · Bioimpressão · Análise · Maturação. Esterilização é etapa do protocolo de laboratório, não uma fase da plataforma.
