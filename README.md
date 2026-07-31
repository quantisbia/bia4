# BIA v4 — Biomaterial Intelligent Assistant

> Plataforma de IA científica para formulação de biomateriais, geração de geometrias 3D
> e otimização de bioimpressão. Desenvolvida pela **Quantis Biotechnology**.

---

## 🎯 Visão Geral

- **Nome:** BIA v4 (Biomaterial Intelligent Assistant)
- **Stack:** Next.js 14 + TypeScript + TailwindCSS + Prisma + Gemini 2.5 Flash + Claude Sonnet 4.5 (geração de modelo 3D via IA · R12.56)
- **Foco:** Acelerar pesquisa em medicina regenerativa com IA + ferramentas científicas integradas
- **Status:** ✅ Operacional em produção

---

## 🚀 Funcionalidades Principais

### 🧪 Formulador Pro (NOVO em v4.3)
Combina até **8 biomateriais** com análise multi-dimensional via IA:
- 10 templates clínicos (cicatrização, osso, gengiva, mama, vaso, neural, drug delivery, organoide, cartilagem, genérico)
- Score 0-100 em 4 dimensões (mecânico, biológico, manufaturabilidade, regulatório)
- Detecção determinística de incompatibilidades químicas
- Protocolo de bancada passo-a-passo
- Parâmetros de bioimpressão otimizados
- Classificação regulatória estimada (FDA/ANVISA/EMA)
- 3+ DOIs reais de 2020-2025
- Auto-save em localStorage, retry automático, mensagens contextuais
- Exportação em JSON e Markdown

**Rota:** `/dashboard/formulator-pro`
**API:** `POST /api/biomaterials/formulate-pro` (10 créditos / 15 com alternativas)

### 🖨️ Bioimpressão Unificada (NOVO em v4.4 — R1→R8)
Processo linear em **4 etapas** que substitui os antigos `/stl`, `/biomaterials`,
`/bioprinting`, `/bioprinting/engine`, `/bioprinting/dual-porosity`, `/bioprinting/connection-guide`
e `/bioprinter-control`. Estado compartilhado via `BioprintProcessContext` (React Context
+ sessionStorage). Cada etapa desbloqueia a próxima.

| Etapa | Rota | Função |
|------:|------|--------|
| Hub | `/dashboard/bioprint` | Stepper visual + status das 4 etapas |
| 1 — Modelo 3D | `/dashboard/bioprint/model` | Upload ou geração paramétrica entre 5 categorias (membrana/scaffold/vascular/organoide/anatômico) com 20+ geometrias incluindo **TPMS** (Gyroid, Schwarz P, Diamond) e validador de mesh |
| 2 — Biotinta | `/dashboard/bioprint/bioink` | Formular com 807 biomateriais + reologia em tempo real (Hagen-Poiseuille) |
| 3 — Fatiamento | `/dashboard/bioprint/slice` | Motor G-code real com 11 algoritmos + parâmetros biomédicos · **6 créditos** por geração |
| 4 — Execução | `/dashboard/bioprint/control` | Joystick 3D, viabilidade celular (Blaeser 2016), crosslink e pós-processamento |

**Redirects permanentes (HTTP 308)** mantêm compatibilidade com links antigos:
- `/dashboard/stl` → `/dashboard/bioprint/model`
- `/dashboard/biomaterials` → `/dashboard/bioprint/bioink`
- `/dashboard/bioprinting/engine` → `/dashboard/bioprint/slice`
- `/dashboard/bioprinter-control` → `/dashboard/bioprint/control`
- `/dashboard/bioprinting/dual-porosity` → `/dashboard/bioprint/model`
- `/dashboard/bioprinting/connection-guide` → `/dashboard/bioprint/control`
- `/dashboard/bioprinting` → `/dashboard/bioprint`

**Libs envolvidas:** `src/lib/bioprint/process-context.tsx`, `src/lib/stl/*`,
`src/lib/bioprinter/biomedical-params.ts`, `src/lib/bioprinting/bioprinters.ts`,
`src/components/bioprinter/{Joystick3D,ExtrusionPanel,TissueViabilityPanel,PostBioprintingPanel}.tsx`
**API principal:** `POST /api/gcode/generate` (6 créditos)

### 📚 Manual do Usuário (NOVO em v4.3)
5 capítulos didáticos com racional fácil de entender:
1. **Formulador Pro** (8 min) — Como criar formulações profissionais
2. **Formulador Bio Clássico** (4 min) — Recomendação rápida do catálogo
3. **Gerador STL** (6 min) — Modelos 3D para bioimpressão
4. **Bioimpressão 3D** (7 min) — Parâmetros otimizados
5. **Roadmap Futuro** (5 min) — v4.4, v4.5, v5.0 + pesquisa em aberto

**Rota:** `/dashboard/manual`

### 🗺️ Roteiro Profissional v4.2
10 fases × 12 módulos para projeto completo de biomaterial (3-6 meses).
**Rota:** `/dashboard/roadmap`

### Outros módulos
- **Knowledge Base** — 120 artigos + 100 patentes indexados
- **Notebook** — Caderno eletrônico de laboratório
- **Pipeline** — Gestão de projetos científicos
- **Protocols** — Biblioteca de protocolos validados
- **Chat IA** — Assistente conversacional com contexto científico
- **Organoid Builder** — Geometrias para cultura 3D

---

## 🌐 URLs

- **Sandbox/Dev:** https://3000-iwzibv4qsyfaqrtufv7xc-de59bda9.sandbox.novita.ai
- **GitHub:** https://github.com/quantisbia/bia4

---

## 🏗️ Arquitetura de Dados

### Stack
- **Banco:** PostgreSQL (Prisma ORM)
- **Auth:** NextAuth.js (sessões JWT)
- **IA:** Google Gemini 2.5 Flash (via `@google/generative-ai`)
- **Persistência:** Formulações, protocolos, transações de crédito, sessões de chat

### Modelos principais (Prisma)
- `User` — usuário com créditos, plano, papel (USER/ADMIN)
- `Formulation` — formulações geradas com input + output IA
- `CreditTxn` — registro imutável de cobranças por feature
- `Protocol`, `NotebookEntry`, `PipelineProject`, `ChatSession`

---

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Build (com limite de memória para sandbox de 1GB)
NODE_OPTIONS="--max-old-space-size=768" npm run build

# Desenvolvimento (Vite dev server)
npm run dev

# Produção via PM2
pm2 start ecosystem.config.cjs

# Smoke tests
curl http://localhost:3000/                          # 200
curl http://localhost:3000/dashboard/formulator-pro  # 307 (redirect login)
```

### Variáveis de ambiente (.env.local)
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_AI_API_KEY=...
```

---

## 📊 Tamanhos do Bundle (build atual)

| Rota | Page Size | First Load JS |
|---|---|---|
| `/dashboard/formulator-pro` | 14.4 kB | 111 kB |
| `/dashboard/bioprint` | 5.75 kB | 111 kB |
| `/dashboard/bioprint/model` | 29.3 kB | 134 kB |
| `/dashboard/bioprint/bioink` | 11.9 kB | 117 kB |
| `/dashboard/bioprint/slice` | 14.5 kB | 128 kB |
| `/dashboard/bioprint/control` | 20 kB | 133 kB |
| `/dashboard/manual` | 23.7 kB | 129 kB |
| `/dashboard/roadmap` | 11 kB | 116 kB |
| **Shared** | — | 87.3 kB |

---

## 🚦 Próximos Passos (ver Roadmap Futuro no Manual)

### v4.4 (próximo mês)
- Preview 3D real com Three.js (orbit + zoom + medição)
- Histórico de formulações no painel
- Exportação PDF científico ABNT/Vancouver

### v4.5 (Q3 2026)
- Importação DICOM-CT/MRI direto na Etapa 1 da Bioimpressão
- Multi-LLM: Gemini + GPT-4o + Claude 3.5 com comparação A/B
- Reparo automático de mesh (NON_MANIFOLD → fix)

### v5.0 (2027)
- Workspaces multi-usuário com permissões
- Integração WebUSB/Serial com bioimpressoras reais
- ELN certificado (21 CFR Part 11)
- Marketplace de protocolos

---

## 🗓 Changelog Recente

### R12.65 — Regenerador embutido na pré-execução + destaque MAGNÍFICO do ponto inicial G92 X0 Y0 Z0 E0 (2026-07-31)

Mandato Janaina: **"para regenerar um gcode, precisa ser feito no painel Validação visual do G-code · pré-execução, onde podemos alterar dimensões do STL e Parâmetros de GCode para visualizar depois de uma regeneracao e antes de bioimpimir. deixe no painel a vista onde está o ponto inicial da impressão, onde está o G92 x0 y0 z0 e0 para facilitar termos um resultado magnifico e todo conseguirem imprimir sem dificuldade."**

**A) Novo componente RegeneratePanel — embutido acima do validador visual em /execute**
- `src/components/bioprinter/RegeneratePanel.tsx` — painel expansível com controles para:
  - **Dimensões do STL** — escala X (25–200%), escala Y, escala Z (aplicadas aos parâmetros numéricos da geometria por heurística de nomes: `width/x/diameter` → escala X, `depth/y` → escala Y, `height/z/thickness` → escala Z)
  - **Parâmetros de G-code** — Layer height (0.1–0.8 mm), Infill (0–100%), Print speed (2–30 mm/s), Flow / multiplicador de extrusão (0.2–2.0×), Walls (1–5), Temperatura cartucho (4–60°C)
- Botão **"Regerar G-code"** faz POST para o mesmo endpoint da Etapa 3 (`/api/gcode/generate`) com o payload completo (geometria + bioink + slicer + bioprinterId) + overrides atuais
- Ao regerar com sucesso, o `gcodeText` da /execute é substituído **sem sair da página** — validador + viewer 3D atualizam imediatamente
- Feedback visual: badge "parâmetros alterados" quando há mudanças, botão "Resetar", cards de sucesso/erro, logs no PrintLogger com source `regenerator`
- Pré-check: se falta modelo ou biotinta (usuária importou G-code direto sem passar pelas Etapas 1/2), o painel avisa e sugere alterar o arquivo diretamente

**B) Destaque MAGNÍFICO do ponto inicial G92 X0 Y0 Z0 E0 no GcodeViewer3D**

O marcador antigo era um círculo esmeralda de 5 pixels com o texto "G92 zero" — sutil demais. R12.65 transforma em um destaque inequívoco:
- **Cruz de origem** (X vermelho, Y verde) — 24px de raio, marca os eixos ao redor do zero
- **Anel externo esmeralda largo** (raio 18px) — visibilidade máxima
- **Anel intermediário sólido** (raio 11px) — bordas duplas reforçam
- **Ponto sólido central** (4px) — âncora inequívoca
- **Label multilinha com fundo esmeralda-900**:
  - `⊙ INÍCIO · G92 X0 Y0 Z0 E0` (linha 1, bold)
  - `Posicione o bico AQUI antes de imprimir` (linha 2, instrução prática)
- **Marcador do "1º filamento"** (primeiro G1 com E>0) — círculo laranja + linha tracejada saindo do zero até ele + label com coordenadas exatas: `▶ 1º filamento (x, y, z) mm`
  - Deixa evidente que o bico VAI se mover do G92 zero até esse ponto antes de depositar biotinta
  - Ajuda a usuária a antecipar a trajetória e conferir se o skirt/perímetro começa onde esperado

**C) Integração na /execute (pré-execução)**
- `src/app/dashboard/bioprint/execute/page.tsx` — o `<RegeneratePanel>` é renderizado ANTES do `<GcodeValidatorPanel>` (que já contém o viewer 3D com os marcadores destacados)
- Título do validador atualizado: `"Validação visual do G-code · pré-execução · ponto inicial destacado"` — enfatiza a nova funcionalidade
- Callback `onRegenerated`: `setGcodeText(newGcode)` + rename de `gcodeName` para `"(regerado · HH:MM:SS)"` + log OK no PrintLogger
- Callback `onLog`: liga o painel ao PrintLogger global (info/ok/warn/error com source `regenerator`)

**D) Fluxo de uso — magnífico e simples**

1. Usuária chega no /execute com um G-code carregado (do handoff ou do state.slice.gcode)
2. Vê o viewer 3D com o ponto inicial CLARAMENTE destacado (cruz + anéis + label) e o 1º filamento marcado
3. Se quiser ajustar antes de imprimir: expande o "Regenerar G-code"
4. Move sliders — vê ao vivo o badge "parâmetros alterados" e o botão "Regerar" ficar em gradiente cyan→violet
5. Clica "Regerar" — o motor `/api/gcode/generate` roda com os novos valores
6. Novo G-code substitui o antigo instantaneamente — viewer + validador atualizam
7. Ponto inicial permanece destacado no novo G-code
8. Se satisfeita, prossegue para "Enviar para Bioimpressora"

**E) Testes de regressão (R12.65)**
- Novo arquivo `tests/r12_65_regenerate_panel_and_start_marker.test.ts` com **23 testes** em 6 blocos:
  - **R12.65.A** — arquivo `RegeneratePanel.tsx` existe, exporta o componente, tipo `RegenerateOverrides` tem 9 campos obrigatórios
  - **R12.65.B** — source do painel expõe controles de Escala X/Y/Z + Layer height + Infill + Print speed + Flow + Walls + Temp cartucho + botão "Regerar G-code"
  - **R12.65.C** — painel faz POST em `/api/gcode/generate` e envia `flowMultiplier`, `layerHeight_mm`, `walls`, `infillPercent` com overrides do usuário
  - **R12.65.D** — GcodeViewer3D desenha label `⊙ INÍCIO · G92 X0 Y0 Z0 E0` + instrução "Posicione o bico AQUI antes de imprimir" + anel externo raio 18 + cruz de origem (X vermelho / Y verde, raio 24)
  - **R12.65.E** — GcodeViewer3D destaca 1º filamento: busca `parsed.moves.find(m => m.type === "G1" && m.e > 0)` + linha tracejada `setLineDash([4, 4])` + label "1º filamento" com coordenadas x/y/z
  - **R12.65.F** — /execute importa RegeneratePanel, renderiza com `bioprintState` + `onRegenerated`, o callback chama `setGcodeText(newGcode)`, o painel aparece ANTES do validador, título contém "ponto inicial destacado"

**Testes**: **393/393 passing** (370 anteriores + 23 novos R12.65, zero regressões, 41.38s).

**Arquivos modificados/criados**: `src/components/bioprinter/RegeneratePanel.tsx` (novo, 470 linhas), `src/components/bioprinter/GcodeViewer3D.tsx` (marcadores destacados), `src/app/dashboard/bioprint/execute/page.tsx` (integração + título), `tests/r12_65_regenerate_panel_and_start_marker.test.ts` (novo, 23 testes).

---

### R12.64 — Zero G28 + G92 X0 Y0 Z0 E0 universal + Mesa REDONDA (2026-07-30)

Correção crítica solicitada pela usuária: **"retirar todo home all - e sempre zerar as coordenadas, G92 X0 Y0 Z0 E0, e a mesa ser redonda. sejá criterioso, em todo fatiamento gcode, colocar no sistema o G92 x0 y0 z0 e0"**.

**Racional biológico**: bioimpressora **NUNCA** faz home mecânico (G28). A bandeja carrega células vivas, placas de Petri, wells, scaffolds já posicionados. Um G28 destruiria tudo. O referencial em bioimpressão vem da **biologia** (o alvo: poço, tecido, hidrogel), não da mecânica dos endstops. Zeramos com **G92 X0 Y0 Z0 E0** — que define o ponto atual como origem sem mover nada.

**A) G28 completamente banido do sistema**
- `src/lib/gcode/core/emitter.ts` — removida a linha G28 do header; adicionado **filtro defensivo** que bloqueia qualquer `startPrint` iniciado com "G28"
- `src/lib/gcode/core/dlp-emitter.ts` — `G28 Z` substituído por `G92 X0 Y0 Z0 E0` (mesmo em DLP, preservamos o vat)
- `src/lib/gcode/profiles/bioprinters.ts` — 5 perfis com `startPrint: "G28"` (Allevi 2, Allevi 3, REGEMAT BIO V1, EnvisionTEC 3D-Bioplotter, Generic Marlin) agora usam comentário informativo `"; <nome> start (no home)"`. Perfis CELLINK mantêm `"M710"` (start proprietário, não é home).
- `src/app/dashboard/bioprint/execute/page.tsx` — `handleHomeAll` renomeado para `handleZeroHere` (com alias retrocompat); botão UI agora exibe **"Zerar aqui (G92 X0 Y0 Z0 E0)"**; auto-home ao conectar substituído por **auto-zero (G92)**; chamada de `moveToSafeCenterAfterHome` removida do fluxo de conexão

**B) G92 X0 Y0 Z0 E0 em TODO gerador de G-code**
- `src/lib/gcode/core/emitter.ts` — header principal emite `G92 X0 Y0 Z0 E0 ; zerar TODAS as coordenadas AQUI (ponto atual = origem)` com comentários explicativos ("NENHUM G28", "preserva bandeja/cartucho")
- `src/lib/gcode/core/dlp-emitter.ts` — mesma linha, adaptada para SLA/DLP
- `src/lib/bioprint/medical-gcode.ts` — **bug corrigido**: linha 649 tinha só `G92 E0` (zerava apenas extrusor) → agora `G92 X0 Y0 Z0 E0` completo
- `src/lib/bioprint/quick-gcode.ts` — já emitia G92 completo desde R12.62 (verificado)
- `src/lib/bioprint/toolpath-engine.ts` — todos os infills (Gyroid, Voronoi, Concêntrico, Vector Field) e testes simples (helloSquare, cross, spiral, dotArray) verificados: emitem G92 completo, zero G28

**C) Mesa REDONDA (circular) em todos os perfis**
- `src/lib/gcode/core/types.ts` — `BioprinterProfile` ganhou `bedShape: "circular" | "rectangular"` + `bedDiameter_mm?: number` (obrigatório quando circular)
- Todos os 8 perfis marcados como `bedShape: "circular"` com diâmetro coerente:
  - CELLINK BIO X → **Ø 90 mm**
  - CELLINK BIO X Incubator → **Ø 80 mm**
  - Allevi 2 → **Ø 70 mm**
  - Allevi 3 → **Ø 80 mm**
  - REGEMAT BIO V1 → **Ø 150 mm**
  - EnvisionTEC Perfactory P4K (DLP) → **Ø 84 mm**
  - EnvisionTEC 3D-Bioplotter → **Ø 150 mm**
  - Generic Marlin → **Ø 200 mm**
- `src/components/bioprinter/GcodeViewer3D.tsx` — `drawBed()` agora desenha **círculo cyan-400** (64 segmentos), fill sutil, cruz central e label **"⊙ Mesa redonda Ø{d} mm"**
- `src/app/dashboard/bioprint/execute/page.tsx` — antigo checkbox "Centralizar + aproximar mesa" substituído por card informativo explicando o novo referencial biológico

**D) Testes de regressão (R12.64)**
- Novo arquivo `tests/r12_64_no_home_all_g92_round_bed.test.ts` com **19 testes** em 4 blocos:
  - **R12.64.A** — nenhum G28 em qualquer G-code (header/footer/infills/medical/quick/DLP)
  - **R12.64.B** — G92 X0 Y0 Z0 E0 completo (com todos os 4 eixos) em todos os geradores
  - **R12.64.C** — todos os 8 perfis têm `bedShape === "circular"` + `bedDiameter_mm > 0`
  - **R12.64.D** — filtro defensivo do emitter bloqueia startPrint começando com "G28"

**Testes**: **370/370 passing** (351 anteriores + 19 novos R12.64, zero regressões, 42.23s).

**Arquivos modificados**: 7 (emitter.ts, dlp-emitter.ts, types.ts, bioprinters.ts, medical-gcode.ts, GcodeViewer3D.tsx, execute/page.tsx) + 1 novo (teste R12.64).

**Próximo**: monitorar em produção se algum perfil legado (que ainda tenha `startPrint: "G28"` em fixture de teste antiga) tenta injetar G28 — o filtro defensivo já cobre esse caso.

---

### R12.63 — Gyroid simples + Nivea padrão-ouro + Baby-step Z tempo real + Presets de flow (2026-07-30)

4 melhorias em resposta ao feedback: **"adicionar o giroide nos modelos simples, adicionar abaixar o z em tempo real para ajustar, adicionar creme nivea como biomaterial (padrão ouro) testes iniciais e que tenha o gcode com fluxo de multiplicador de extrusão 0.4. e adicionar um botão no processo de escolha dos parametros, infill, altura da camada, um parametro do fluxo / multiplicador de extrusão para escolhermos antes de levar pra impressora."**

**A) Gyroid promovido a "geometria simples"**

`tpms_gyroid` movido de `ADVANCED_GEOMETRY_IDS` para `BASIC_GEOMETRY_IDS` em `geometry-bounds.ts`. Agora aparece na Etapa 1 mesmo com o toggle "Mostrar experimentais" **desligado** — antes ficava escondido por padrão. Schwarz e Diamond continuam experimentais (menos usados, gerações mais pesadas). Gyroid é o TPMS clássico, benchmark de scaffold poroso na literatura (Karageorgiou 2005, Bobbert 2017).

**B) Baby-step Z em tempo real durante impressão**

Adicionada barra destacada de **Ajuste fino Z** ao lado dos botões Pausar/Retomar em `/execute`. Aparece **apenas durante `isStreaming || isPaused`**. Botões grandes para descer (`Z−0.05`, `Z−0.1`, `Z−0.2`, `Z−0.5` mm) e subir (`Z+0.05`, `Z+0.1`, `Z+0.2`, `Z+0.5` mm), com Z atual visível no topo. Usa `sendJog("Z", ±d)` via `controller.inject()` — latência 50-300ms, **sem pausar a impressão**. Antes o micro-ajuste ficava escondido no painel lateral de joystick; agora está onde a atenção da usuária realmente está durante o print.

**C) Creme Nivea como biomaterial padrão-ouro (0.4×)**

Novo item `nivea_cream` em `BIOMATERIALS` com categoria dedicada `test-standard`. Documentado com literatura reológica (Paxton 2017 Biofabrication, Ouyang 2016). Marcado explicitamente como **NÃO biocompatível** (`cellViability_24h_pct: 0`) — só para calibração mecânica.

Preset `nivea_test_standard` em `BIOINK_PRESETS` para seleção rápida. **Auto-preset**: quando usuária escolhe Nivea na Etapa 2, `slice/page.tsx` detecta e aplica automaticamente `extrusionMultiplier = 0.4` (respeitando override manual se ela já ajustou antes).

Nova função `getRecommendedFlowMultiplier(materialId)` em `biomaterials.ts` — retorna 0.4 para Nivea, fallback global 0.6 para outros. Documentado o racional: creme puro é MENOS viscoso que biotintas típicas, então precisa de MENOS extrusão pra evitar over-extrusion.

Nova categoria `🧴 Padrão-ouro (teste)` em `BIOMATERIAL_CATEGORIES`, posicionada no topo (logo depois de "Todos") — convida a calibrar antes de gastar biotinta cara.

**D) Slider de multiplicador de extrusão destacado com presets**

O slider da /slice foi encapsulado em um **card com borda âmbar destacada**, título `⚡ Multiplicador de extrusão (flow rate)`, e range expandido de `0.5-2.0×` para `0.3-2.0×` (Nivea usa 0.4). Adicionados 4 botões de preset rápido logo abaixo:

- 🧴 **Nivea 0.4×** — teste inicial com creme
- 🧫 **Bio 0.6×** — biotintas viscosas típicas (GelMA, Alginato)
- 🔧 **FDM 1.0×** — padrão filamento sólido
- 🌊 **Viscosa 1.5×** — biotintas muito viscosas (>3000 cP)

Cada botão fica destacado quando o valor atual bate (tolerância 0.001). Hint atualizada: "Escolha antes de imprimir · será gravado no G-code (M221 + volume por passo)".

**Files touched**:
- `src/lib/gcode/slicer/geometry-bounds.ts` — `tpms_gyroid`: ADVANCED → BASIC
- `src/lib/bioprinting/biomaterials.ts` — item `nivea_cream`, categoria `test-standard`, preset `nivea_test_standard`, `FLOW_MULTIPLIER_BY_MATERIAL`, `getRecommendedFlowMultiplier()`
- `src/app/dashboard/bioprint/slice/page.tsx` — slider destacado + 4 presets + auto-detecção Nivea
- `src/app/dashboard/bioprint/execute/page.tsx` — barra de baby-step Z durante streaming
- `tests/r12_63_gyroid_nivea_babystep.test.ts` — 11 testes novos (gyroid basic, Nivea catalog, flowMultiplier 0.4, integration com emitter)
- `tests/r12_55_smoke.test.ts` — ajustes 13→14 basic, 15→14 advanced
- `tests/r12_57_experimental_filter.test.ts` — ajustes de contagem + novo teste "gyroid é BASIC"

**Testes**: **351/351 passing** (338 anteriores + 11 novos R12.63 + 2 casos ajustados).

**Comportamento verificável**:
- ✅ Toggle experimental OFF na Etapa 1 → gyroid aparece na categoria TPMS
- ✅ Etapa 2 → seletor tem "🧴 Padrão-ouro (teste)" no topo, com Nivea listado
- ✅ Escolher Nivea → slider da Etapa 3 vai automaticamente para 0.4×
- ✅ G-code emitido tem `; ExtrusionMultiplier: 0.40×` no header
- ✅ Durante impressão → barra "Ajuste fino Z" visível com botões Z± em incrementos 0.05-0.5mm
- ✅ Botão Z−0.1 durante streaming → injeta `G91 → G1 Z-0.1 F300 → G90` na fila do controller (~50-300ms)
- ✅ Presets do slider (Nivea/Bio/FDM/Viscosa) → um clique define o multiplicador

---

### R12.62 — Ponto inicial forte + fator de extrusão configurável + printability no fluxo normal (2026-07-30)

3 correções em resposta ao feedback da usuária: **"você pode melhorar a funcionalidade do ponto inicial - G92 X0 Y0 Z0, pois tem momentos que não funciona e é muito importante começar a imprimir no ponto 0. será importante o Gcode ter o parametro de fator de extrusão para selecionar. O fluxo está muito fraco quando inicia as bioimpressoes. será bom escolher o numero, mas pode deixar os GCode padores começar com 0.6 ou escolher. Além disso, esconda o teste de imprimibilidade, colocando ele no processo de bioimpressao, sendo selecionado no inicio."**

**A) G92 X0 Y0 Z0 E0 — ponto inicial forte**

Root cause: `emitter.ts` e `quick-gcode.ts` emitiam apenas `G92 E0`, zerando **só o extrusor**. O firmware Marlin mantinha resíduos de X/Y/Z do trabalho anterior, então o primeiro `G1` do novo job podia parar em coordenada errada — aparente "não começa no ponto zero".

Fix: agora emitimos `G92 X0 Y0 Z0 E0` (zera **todas** as coordenadas). Combinado com o `G28` (homing) que precede, a origem fica exatamente no zero mecânico + zero de extrusão. Ponto inicial 100% previsível.

**B) Fator de extrusão configurável (default 0.6×)**

Root cause duplo:
1. `slice/page.tsx` linha 569 tinha `flowMultiplier: 1.0` **hardcoded** no payload da API. O slider "Multiplicador de extrusão" (0.5-2.0×, presente na UI desde R12.11) **nunca teve efeito** no G-code gerado. Bug silencioso.
2. Default de 1.0× (padrão FDM) era muito fraco para biotintas. Bicos bio 200-410µm + hidrogéis viscosos (500-5000 cP) exigem fluxo maior no início pra vencer inércia do êmbolo.

Fix:
- `flowMultiplier: extrusionMultiplier` (passa o valor real do slider da UI).
- Default global mudou de **1.0 → 0.6** (Zod schema em `route.ts` + `useState` em `slice/page.tsx`).
- Campo `extrusionMultiplier: number | null` adicionado a `SliceStepState` — persiste entre navegações via context/sessionStorage.
- `execute/page.tsx` agora lê `state.slice.extrusionMultiplier * 100` para `flowPercent` (antes hardcoded 100). Preset editor recebe valor real.
- Emitter emite `; ExtrusionMultiplier: 0.60× (flow rate)` no header do G-code para transparência e debug.

Usuária escolhe 0.5-2.0× via slider (step 0.05). 0.6× é o novo padrão seguro; 1.5-2.0× para biotintas muito viscosas.

**C) Testes de imprimibilidade → integrado ao processo (não mais pré-etapa separada)**

Antes: card destacado no hub `/dashboard/bioprint` (linhas 203-275) apontava para `/dashboard/bioprint/printability` como **pré-etapa fora do fluxo das 5 etapas**. Duplicava caminhos: usuária podia entrar por lá ou pela categoria "printability-test" na Etapa 1 (Modelo).

Fix: card destacado do hub **removido**. Agora acessa-se **apenas via Etapa 1 → Categoria "Testes de imprimibilidade"**, com badge visual `🧪 Recomendado 1º` na lateral do seletor de categorias. Fluxo linear, sem porta dos fundos. A página standalone `/dashboard/bioprint/printability` continua acessível por deep-link (mantida por compatibilidade), apenas não é mais promovida no hub.

**Files touched**:
- `src/lib/gcode/core/emitter.ts` — `G92 X0 Y0 Z0 E0` + `; ExtrusionMultiplier:` no header
- `src/lib/bioprint/quick-gcode.ts` — `G92 X0 Y0 Z0 E0` no header
- `src/app/api/gcode/generate/route.ts` — Zod default `flowMultiplier: 0.6`
- `src/app/dashboard/bioprint/slice/page.tsx` — default 0.6, **fix bug hardcoded 1.0**, persist no context
- `src/app/dashboard/bioprint/execute/page.tsx` — `flowPercent` derivado do context
- `src/lib/bioprint/process-context.tsx` — campo `extrusionMultiplier` em `SliceStepState`
- `src/app/dashboard/bioprint/page.tsx` — remove card destacado printability do hub
- `src/app/dashboard/bioprint/model/page.tsx` — badge `🧪 Recomendado 1º` em `printability-test`
- `tests/_helpers/factories.ts` — `extrusionMultiplier: null` em `EMPTY_SLICE`
- `tests/quick-gcode.test.ts` — regex atualizado para `G92 X0 Y0 Z0 E0` (era `G92 E0`)
- `tests/r12_62_extrusion_and_g92.test.ts` — 9 testes novos (G92, ExtrusionMultiplier, context roundtrip, sanity footer)

**Testes**: **338/338 passing** (329 anteriores + 9 novos R12.62).

**Comportamento verificável**:
- ✅ Primeiro G1 sempre parte do (0,0,0) — resíduos do trabalho anterior zerados
- ✅ Slider "Multiplicador de extrusão" agora realmente altera o G-code (default 0.6×)
- ✅ Header do G-code documenta o valor: `; ExtrusionMultiplier: 0.60×`
- ✅ Voltar para `/slice` depois de navegar preserva o valor escolhido (context)
- ✅ Hub `/dashboard/bioprint` sem card de printability — acesso via Etapa 1 → categoria
- ✅ Etapa 1 exibe badge `🧪 Recomendado 1º` chamando atenção pra testar biotinta antes

---

### R12.61 — Coherence check: desbloqueio de G-codes válidos que confundiam padrão de infill com geometria (2026-07-29)

Correção reportada pela usuária: **"tem muito erro em gcode Bloqueado: resolva incoerências modelo↔G-code. faca os gcodes funcionares."**. Investigação revelou que `coherence-check.ts` (R12.47) bloqueava impressões perfeitamente válidas por confundir **padrão de preenchimento** com **geometria 3D**:

**Root cause**: `GEOMETRY_KEYWORDS` continha `gyroid`, `honeycomb`, `voronoi` etc — que são **algoritmos de infill**, não formas 3D. Quando o slicer emitia `; Infill: gyroid_tpms @ 30%` (padrão válido de preenchimento), o keyword scan interpretava "gyroid" como **geometria** = gyroid. Ao comparar com `state.model.geometryId = "ear"`, detectava divergência → **bloqueava impressão** com "geometria-divergente".

**Correção completa em 4 camadas**:

1. **`emitter.ts`** — Emite `; JobName: <name>` e `; Geometry: <id>` no header do G-code, dando ao coherence uma **fonte da verdade explícita** ao invés de keyword scan heurístico.
2. **`route.ts` (/api/gcode/generate)** — Propaga `geometryId: geometry.id` para o `PrintJob`, para o emitter poder incluí-lo no header.
3. **`types.ts` (PrintJob)** — Adicionado campo opcional `geometryId?: string`.
4. **`coherence-check.ts`** — 4 subcorreções:
   - **`; Geometry:` explícito é fonte da verdade**: se presente no header, comparação é direta (case-insensitive, tolerante a espaços) — não faz keyword scan
   - **`GEOMETRY_KEYWORDS` limpo**: `gyroid/honeycomb/voronoi/tpms/schwarz/diamond` REMOVIDOS (são padrões de infill). Apenas formas 3D reais (ear, heart, kidney, cube, sphere, disk, patch, cylinder, ...) ficam
   - **`INFILL_PATTERN_KEYWORDS` isolado**: scan de infill agora prioriza a linha `; Infill:` do header (fonte limpa) e só cai em scan geral como fallback
   - **Keyword scan de geometria = warning, nunca blocking**: sem tag `; Geometry:` explícita, a evidência é heurística demais para bloquear impressão. Emite `geometria-possivelmente-divergente` (warning) permitindo que o usuário decida
   - **Word boundary para keywords inglesas**: `\bear\b` em vez de `.includes("ear")` — evita falsos positivos como "gearbox" contendo "ear"

**Files touched**:
- `src/lib/gcode/core/types.ts` — `PrintJob.geometryId?`
- `src/lib/gcode/core/emitter.ts` — emit `; JobName:` + `; Geometry:`
- `src/app/api/gcode/generate/route.ts` — propaga `geometryId`
- `src/lib/bioprint/coherence-check.ts` — 4 subcorreções acima
- `tests/r12_61_coherence_geometry_infill.test.ts` — 20 testes novos (16 unit + 4 integração pipeline emitter→coherence)

**Testes**: **329/329 passing** (309 anteriores + 20 novos R12.61).

**Comportamento verificável**:
- ✅ `state=ear + G-code com "; Geometry: ear" e "; Infill: gyroid_tpms"` → **NÃO bloqueia** (era o bug reportado)
- ✅ `state=ear + G-code com "; Geometry: cube"` → **BLOQUEIA** com mensagem clara citando a tag `; Geometry:`
- ✅ G-codes externos (sem `; Geometry:`) → no máximo `warning`, nunca `blocking`
- ✅ Padrão de infill divergente (state=lines, gcode=gyroid) → warning, não bloqueia

---

### R12.60 — Conexão USB BioEnder · aplica filtros USB por bioprinterId, toggle escape, mensagens acionáveis (2026-07-29)

Correção crítica reportada pela usuária: **"não estou conseguindo conectar com a bioender, USB, o que houve"**. A conexão USB via Web Serial não funcionava de forma confiável. Diagnóstico completo do componente `PrinterConnection.tsx` revelou **4 bugs** que juntos travavam a conexão:

- **Bug #1 — Sem filtros USB**: `navigator.serial.requestPort()` era chamado sem `filters`, então o diálogo do navegador listava **TODAS** as portas seriais do sistema (impressora térmica, GPS, HC-05 Bluetooth, cabos USB-TTL soltos, teclado gamer com RGB). Usuário podia clicar na porta errada e ficar travado esperando resposta M115 que nunca vinha.
- **Bug #2 — Sem consciência de bioprinterId**: O componente não puxava qual bioimpressora fora selecionada na Etapa 3 (`state.slice.bioprinterId`), então não sabia quais Vendor IDs filtrar. BioEnder usa 3 chips diferentes conforme a revisão da placa: **CH340 (0x1A86)** o mais comum, **CP210x (0x10C4)** em placas v4.2.7, **FTDI (0x0403)** em Sanguino antigo.
- **Bug #3 — Sem escape hatch**: Se por algum motivo o chip USB do usuário fosse exótico (ex: clone com chip pirata que reporta VID diferente), o filtro esconderia a porta correta e o usuário ficaria preso sem alternativa.
- **Bug #4 — Sem mensagens acionáveis**: Erros do navegador eram exibidos crus (`NotFoundError: No port selected by the user`) sem tradução ou hint de como resolver.

**Bônus**: chamada `port.open()` estava incompleta — só passava `baudRate`, faltavam `dataBits: 8`, `stopBits: 1`, `parity: "none"`, `flowControl: "none"`, `bufferSize: 16384`. Alguns firmwares Marlin rejeitam data se esses campos ficarem undefined.

**Correção aplicada** (`src/components/bioprinting/PrinterConnection.tsx` reescrito, ~950 linhas):
- Nova prop `bioprinterId?: string` (fallback: `state.slice.bioprinterId` via `useBioprintProcess()`, último fallback `"bioender_bioedtech"`)
- `getBioprinterById()` → puxa `usbVendorIds` do catálogo `BIOPRINTERS` → aplica no `requestPort({filters})`
- Checkbox **"Filtrar por Vendor ID"** (default ON) — usuário pode desligar se precisar
- Helper `vendorLabel()` traduz VIDs: 0x1A86→"WCH CH340/CH341", 0x10C4→"Silicon Labs CP210x", 0x0403→"FTDI FT232", 0x2341→"Arduino LLC", 0x2E8A→"Raspberry Pi Pico"
- Helper `buildErrorHint()` — 5 cenários com hints acionáveis: "no port selected", "access denied/port in use", "not supported", "secure context (HTTPS)", "generic + hints de driver"
- Painel diagnóstico colapsável (Web Serial support / secure context / bioprinter id / Marlin compat / baud / filtros ativos / vendor IDs esperados / portas pré-autorizadas)
- Banner de aviso HTTPS quando `!isSecureContextForWebSerial()`
- Botão "🔄 Portas Autorizadas" — chama `navigator.serial.getPorts()` e mostra portas já autorizadas pra reconexão em 1 clique (sem passar pelo diálogo)
- `port.open()` completo com dataBits/stopBits/parity/flowControl/bufferSize

**Files touched**:
- `src/components/bioprinting/PrinterConnection.tsx` — reescrito
- `src/app/dashboard/bioprint/slice/page.tsx` — `<PrinterPrepSection>` propaga `bioprinterId`, `<PrinterConnection>` recebe explícito
- `src/app/dashboard/bioprint/control/page.tsx` — `<PrinterConnection>` recebe `bioprinterId={state.slice.bioprinterId ?? "bioender_bioedtech"}`

**Testes**: 309/309 passing (nenhum teste anterior quebrou — Web Serial não é testável em vitest, então sem novos testes).

---

### R12.59 — Etapa 3 · Fluxo contínuo (elimina duplicação Etapa 1/2 dentro do Fatiamento) (2026-07-28)

Correção de arquitetura reportada pela usuária: **a Etapa 3 (Fatiamento) re-perguntava STL/geometria e biotinta que já tinham sido definidos nas Etapas 1 e 2**, criando confusão e — pior — o `BasicModePanel` oferecia `MultiBioinkSelector` com até **4 slots**, contradizendo diretamente a regra da R12.58 (máx 2 biotintas). Agora:

- **BasicModePanel 100% controlado por contexto**: geometria vem de `state.model` (Etapa 1), blend vem de `state.bioink.formulations[]` (Etapa 2). Zero estado local para geometria/blend
- **Cards read-only** no topo mostrando o resumo das Etapas 1 e 2 (com dimensões inferidas + até 2 pontos coloridos T0/T1 mostrando material + concentração + células) e botão **"← alterar"** que navega de volta para a etapa correspondente
- **Removidas 108 linhas** do BasicModePanel: seção "1. Geometria básica" com seletor de 6 cards + inputs de dimensões (X/Y/Z/wall/pitch) + seção "2. Multi-bioink" com o `MultiBioinkSelector` de 4 slots. Só sobra o que faz sentido em fatiamento: parâmetros técnicos (layer height, walls, infill %, densidade) + botão Gerar + resultado
- **Novo helper `context-to-quick.ts`**: 8 funções puras (`toQuickGeometryId`, `extractDims`, `contextToQuickGeometry`, `formulationToQuick`, `contextToQuickBlend`, `summarizeModel`, `summarizeFormulation` + heurísticas de bico/viscosidade/velocidade/pressão) que traduzem `state.model` + `state.bioink.formulations[]` → `QuickGeometry` + `QuickMultiBioink` que o `generateQuickGcodeMulti()` consome
- **Fração automática entre biotintas**: 1 biotinta = fraction 1.0; 2 biotintas = fraction 0.5 cada (mistura homogênea). O backend `collapseMultiBioink()` do quick-gcode já sabe lidar com isso
- **Backward compat total**: se `formulations[]` está vazio mas `state.bioink.material` (legacy R12.0..R12.9) existe, o helper sintetiza 1 QuickBioinkFormulation a partir dos campos legacy; se ambos vazios, cai em GelMA 10% default seguro
- **Heurísticas de parâmetros de impressão**: sem `rheology.viscosityPaS` explícito, o helper infere por família de material (GelMA → 5 Pa·s, Alginato → 3, Colágeno → 8, Fibrina → 4, Pluronic → 30, PEGDA → 6, dECM → 10). Bico: 0.41 mm (22G) padrão, 0.58 mm (20G) para colágeno/Pluronic/dECM. Pressão: 60 kPa com células (Nelson 2021 safe), 60-150 kPa sem células
- **Botão "Gerar" só habilita quando** `state.model.geometryId` existe E `blend.length > 0` — evita geração inválida
- **BasicModePanelProps encolheu**: `initialGeometryId` e `initialBioink` foram REMOVIDOS. Só `onGcodeGenerated`, `jobName`, `className` sobraram
- **`slice/page.tsx` simplificado**: chamada do `<BasicModePanel>` não passa mais `initialGeometryId`; imports `ENGINE_TO_QUICK_ID` e `QuickGeometryId` removidos (agora encapsulados no helper)

**Rationale de arquitetura**: sem essa refatoração o usuário sentia que "estava começando do zero" ao entrar na Etapa 3 — as escolhas das etapas anteriores pareciam ter sido ignoradas. Além disso, a existência dos 4 slots no `MultiBioinkSelector` da Etapa 3 abria a porta para o usuário configurar 2 biotintas na Etapa 2 e ver 4 slots vazios/duplicados na Etapa 3, o que é UX incoerente. Agora o fluxo é linear: Modelo → Biotinta → Fatiamento (só parâmetros técnicos) → Execução.

**Arquivos**:
- `src/lib/bioprint/context-to-quick.ts` (novo, 264 linhas) — helpers puros de conversão + resumo textual
- `src/components/bioprinter/BasicModePanel.tsx` (497 → 387 linhas, -108/-8 linhas úteis) — refactor completo removendo seções 1 e 2, mantendo só banner + cards read-only + parâmetros de fatiamento + botão Gerar + resultado
- `src/app/dashboard/bioprint/slice/page.tsx` (2567 linhas → 2564) — remove imports não usados + prop `initialGeometryId`
- `tests/r12_59_context_to_quick.test.ts` (novo, 38 testes) — cobre mapping engine→quick, extractDims com defaults/edge cases, formulationToQuick com/sem células, contextToQuickBlend (formulations vs legacy vs default), summaries, pipeline integrado

**Testes**: 309/309 passing (271 anteriores + 38 novos R12.59).

**Próximo**: escutar validação do usuário em produção. Se aprovado, marcar `/toolpath` e `/gcode` como rotas "auxiliares/pro" (fora do fluxo canônico) com banner discreto — elas ainda duplicam formulação via `BioinkMultiMaterialFormulator`, mas são secundárias.

### R12.58 — Etapa 2 · Multi-biotinta (max 2, 1 célula por biotinta) (2026-07-28)

Correção de UX crítica reportada pela usuária: **a Etapa 2 forçava biotinta única com 1 tipo celular**, mas na prática real de bioimpressão trabalha-se com múltiplos materiais e tipos celulares. Agora:

- **Até 2 biotintas** — controle explícito de "biotinta 1" (T0) e "biotinta 2" (T1), mapeando para os slots Marlin da bioimpressora
- **1 tipo celular por biotinta** — cada biotinta encapsula UMA linhagem celular (ex: bio 1 = GelMA estrutural acelular; bio 2 = Alginato com hMSC). O scaffold como um todo pode ter 2 tipos celulares diferentes, um por biotinta
- **Botão "+ Adicionar biotinta 2"** e **"− Remover biotinta 2"** — usuário começa com 1 (single) e escala para 2 (dual) quando precisa
- **Seletor de biotinta ativa**: cards Bio 1 / Bio 2 no topo mostram material + concentração + role + status celular; clicar num deles muda qual está sendo editada
- **Papel funcional (role)**: seletor novo antes do material — 5 opções (`structural` / `cellular` / `sacrificial` / `vascular` / `support-bath`)
- **Cores por tool**: T0 ciano (`#22d3ee`), T1 violeta (`#a78bfa`) — visualmente consistente com o preview 3D
- **Rodapé sticky mostra AMBAS**: "Bio 1 [T0]: GelMA 8% · Bio 2 [T1]: Alginato 3% · hMSC 5×10⁶/mL"
- **Reologia**: continua calculada para a biotinta ATIVA (a que o usuário está vendo) — é a que aparece no painel de reologia
- **Backward compat**: `slice/page.tsx` e `control/page.tsx` continuam consumindo `state.bioink.material` / `.concentration` / `.cellType` etc. — a UI R12.58 espelha os campos legacy a partir de `formulations[0]` (biotinta principal). Nenhum código downstream precisa mudar
- **Migração automática**: usuários vindos de R12.57 (com campos legacy preenchidos) veem sua biotinta antiga hidratada como bio 1 (T0) com `role: "structural"` (ou `"cellular"` se tinha células)
- **Hidratação priorizada**: se `state.bioink.formulations[]` já tiver dados persistidos (sessionStorage), usa direto; senão migra do legacy; senão cria default GelMA 8% estrutural
- **strategy** derivada: `"single"` (1 bio) / `"dual"` (2 bio)

**Rationale científico**: na prática de laboratório real (relato da Janaina), scaffolds funcionais quase sempre combinam pelo menos duas biotintas — uma estrutural (dá rigidez e forma) e uma celular (carrega o tipo de célula do tecido alvo), frequentemente com sacrificial ou vascular como terceira. O limite de 2 do R12.58 cobre 80% dos casos práticos sem complicar demais a UI; o backend já suporta multi-material completo via `formulations[]`, então expandir para 3+ no futuro é só destravar a UI.

**Arquivos**:
- `src/app/dashboard/bioprint/bioink/page.tsx` (+272/-70 linhas) — refactor completo do estado + UI multi-biotinta
- `tests/r12_58_multi_biotinta.test.ts` (novo, 16 testes) — cobre draftToFormulation, buildBioinkPatch, dual/single strategy, legacy mirror, role preservation

**Testes**: 271/271 passing (255 anteriores + 16 novos R12.58).

**Próximo (Sprints B/C do R12.56 estão desbloqueados)**: cobrança de créditos + streaming do rationale IA + expandir IA para geometrias avançadas.

### R12.57 — Etapa 1 · Filtro "geometrias verificadas vs experimentais" (2026-07-28)

Correção de UX crítica reportada pela usuária: **geometrias anatômicas complexas apareciam por padrão e travavam** (heart, kidney, femur, TPMS, formas compostas experimentais). Agora:

- **Padrão OFF (novo comportamento)**: só as **13 geometrias verificadas** aparecem — 5 formas paramétricas simples (`membrane`, `disk`, `skin_cylinder`, `cube_tissue`, `vessel`) + 8 testes de imprimibilidade (`test_*`)
- **Toggle "🧪 Mostrar experimentais"** na sidebar do painel "Gerar" — quando ativado, todas as ~30 formas aparecem, com badge **`🧪 exp`** no canto superior direito de cada card experimental
- **Persistência**: preferência salva em `localStorage` (`bia:showExperimentalGeometries`)
- **Auto-detect**: se o usuário voltar para a Etapa 1 com uma geometria experimental já selecionada, o toggle liga automaticamente para ele não perder a seleção
- **Fallback inteligente**: se o usuário estiver numa categoria 100% experimental (ex: `rigid-tissue`, `biomimetic-tpms`, `organoid-vascular`) com o toggle OFF, a UI migra automaticamente para uma categoria com formas verificadas
- **Contador N/M**: cada categoria mostra "5/17 verificadas" quando há formas ocultas
- **Link inline**: header do grid mostra "🧪 12 experimentais ocultas" clicável, que liga o toggle
- **Fonte da verdade**: `BASIC_GEOMETRY_IDS` / `ADVANCED_GEOMETRY_IDS` já existiam em `src/lib/gcode/slicer/geometry-bounds.ts` (13 + 15 = 28 IDs classificados) — a UI agora **consome** essa classificação em vez de mostrar tudo indiscriminadamente

**Rationale**: as formas anatômicas complexas (heart 447k triangles, kidney, femur) e as TPMS (Gyroid, Schwarz, Diamond — geração matemática pesada) frequentemente exigem >30s de slicing ou falham em máquinas modestas. As formas compostas experimentais (`skin_3layer`, `cardiac_patch`, `cornea_curved`, etc.) nem sempre estão registradas no motor B. Esconder por padrão evita frustrar o usuário na primeira sessão sem tirar o poder de quem quer explorar.

**Testes**: 255/255 passando (241 anteriores + 14 novos em `tests/r12_57_experimental_filter.test.ts` cobrindo integridade BASIC/ADVANCED, disjunção dos conjuntos, contagem exata por categoria, e geometrias que travam ficam ocultas por padrão).

**Próximo**: R12.58 (Etapa 2 · biotintas múltiplas — refactor para 2 biotintas com 1 célula cada, conforme prática real do laboratório).

### R12.56 — Geração por IA da Etapa 1 (Claude Sonnet 4.5) · Sprint A (2026-07-27)

Ativação da aba **"IA (beta)"** em `/dashboard/bioprint/model` — antes um placeholder marcado "EM BREVE", agora funcional:

- **LLM**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via SDK oficial Anthropic
- **Endpoint novo**: `POST /api/bioprint/model/ai-generate` recebe `{ prompt }` (5-2000 chars) e retorna proposta estruturada
- **Estratégia técnica**: uso do `tool_use` do Claude com schema JSON estrito — garante saída 100% estruturada sem parsing de string
- **Guardrails server-side**:
  - Geometria restrita a whitelist de 5 formas do Modo Básico (`cube_tissue`, `skin_cylinder`, `disk`, `membrane`, `vessel`)
  - Material restrito a 10 canônicos (`GelMA`, `Alginate`, `Gelatin`, `Collagen`, `Fibrinogen`, `dECM`, `Hyaluronic Acid`, `PCL`, `Pluronic F127`, `PEGDA`)
  - Clamp defensivo em todas as dimensões (5-100 mm) com warnings quando ajustes ocorrem
  - Fallback de material inválido → GelMA (com warning explícito)
- **UI refatorada**: `AIPanel()` em `model/page.tsx` totalmente reescrito
  - Textarea funcional com 4 exemplos rápidos clicáveis
  - Card de resultado com: geometria + dims + biotinta + rationale bioink + rationale científico (pt-BR) + DOIs clicáveis + warnings de validação
  - Botão "Aplicar sugestão" persiste em `state.model` com `source: "ai-prompt"` — a Etapa 2 (Biotinta) já lê o material sugerido
- **Rationale**: modelo produz 2-4 parágrafos em pt-BR citando literatura peer-review (Biomaterials, Acta Biomaterialia, Biofabrication, etc)
- **Performance real**: ~20s por chamada, ~1400 in / ~940 out tokens
- **Segurança**: `ANTHROPIC_API_KEY` só em `.env.local` (gitignored) — nunca exposta ao browser
- **Sprint A limitações conscientes**: sem cobrança de créditos, sem streaming, sem retry automático — planejados para Sprint B
- **Testes**: 241/241 passando (22 novos em `tests/r12_56_ai_generate.test.ts` cobrindo validação, whitelist, clamps, defaults, contract com UI)
- **Live smoke test validado com 3 prompts reais**:
  - "Scaffold poroso osso cortical 20×15×10" → `cube_tissue` + `GelMA 10%` + UV/LAP + infill 40% (4 DOIs)
  - "Córnea 11 mm × 0.8 mm" → `disk` + `GelMA 7.5%` + infill 100% + agulha 200 µm (4 DOIs)
  - "Vaso 6 mm interno × 20 mm altura" → `vessel` + `GelMA 7%` + LAP UV + infill 25% (4 DOIs)

Sprint B (próximo) — cobrança de créditos + retry automático + streaming do rationale.
Sprint C (depois) — expandir para geometrias avançadas + sugestão de alternativas (top-3).

### R12.55.1 — Correções críticas do Modo Básico (2026-07-26)

Dois bugs reportados pela usuária no Modo Básico R12.55, ambos corrigidos:

- **Bug 1 — `Validação: blocked` com 420 erros `OUT_OF_VOLUME`**:
  as geometrias eram geradas centradas em (0,0) mas o validador espera coordenadas
  dentro do volume da bioimpressora (0-220mm). **Fix**: nova opção `bedCenter` em
  `QuickGcodeOptions` (default `{x:110, y:110}` — centro do bed BioEnder 220×220).
  Toda peça sai automaticamente centralizada no bed. Header do G-code documenta
  o centro usado. Custom bed suportado via `bedCenter: {x, y}`.
- **Bug 2 — `Nelson 2021: 42/100 poor` para GelMA fotocurável**:
  o modelo Nelson 2021 é calibrado para hidrogéis **pré-crosslinked** (Alginate+CMC+Ca²⁺),
  que exigem viscosidade alta (200-800 Pa·s). Mas GelMA/PEGDA/HAMA são **fotocuráveis**:
  a viscosidade baixa (1-20 Pa·s) é intencional pré-UV. **Fix**: nova função
  `classifyCrosslinker()` detecta 5 classes (photocurable / thermoreversible /
  enzymatic / ionic / pre-crosslinked) e aplica janela alternativa (1-50 Pa·s ideal 15)
  para os 3 primeiros. Score GelMA 10% pré-UV agora: **98/100 excellent** (era 44/100 poor).
  Rationale explica: *"Bioink fotocurável (UV/luz visível) — modelo Nelson 2021 é para
  hidrogéis PRÉ-crosslinked. Aplicando janela alternativa."*
- **Testes**: 216/216 passando (5 novos de regressão explicitamente para os 2 bugs).

### R12.55 — Modo Básico (default) + Avançado (gated) + multi-biotinta + CSV real (2026-07-26)
Refactor da Etapa 3 (`/dashboard/bioprint/slice`) para separar pipeline **verificado** vs **experimental**:

- **Modo Básico (default, ⚡ pipeline verificado):** motor `quick-gcode` síncrono (&lt;100ms).
  5 geometrias 3D simples: **cubo, cilindro, disco, patch retangular, tubo** (vascular).
  Esfera oca removida (não é comum em bioimpressão prática).
  Validador estático de G-code + score Nelson 2021 (shear stress Hagen-Poiseuille Power-Law).
- **Modo Avançado (gated, 🧪 experimental):** motor `engine.ts` (Motor A, timeout 45s).
  Anatômicos (femur, coração, rim, ouvido, mão, meniscus, cornea, lens, nariz, organoide, fígado hexagonal) + TPMS (gyroid, schwarz, diamond).
  Banner amber deixa claro que a geração pode falhar.
- **Multi-biotinta (novo):** seleção de até 4 formulações misturadas com fração %.
  Merge por média ponderada (viscosidade, travel), mínimo (print speed), concat (label, crosslinker).
  Simula blend pré-misturado em nozzle único (padrão real de laboratório).
- **Base de dados de materiais (novo):** CSV real com 803/807 linhas (99.5%) do banco CECT parseado
  para `material-database.ts` — **128 materiais canônicos** (Alginate 152×, PCL 134×, GelMA 86×,
  Gelatin 71×, Pluronic F127 25×, PLGA 21×). DOIs 2020-2025.
  Parser Python robusto lida com vírgula-decimal do PT-BR via *needle anchor* + *decimal-fusion*.
- **G-code funcional:** parâmetros recomendados vêm direto do CSV (pressão kPa, temp °C, velocidade
  mm/s, diâmetro de agulha µm) por material selecionado. Auto-aplicados na formulação.
- **Testes:** 211/211 passando (201 anteriores + 10 novos smoke R12.55).
- **Arquivos:** `material-database.ts` (244KB), `quick-gcode.ts` (+cylinder/+tube/+multi-bioink),
  `geometry-bounds.ts` (BASIC_GEOMETRY_IDS/ADVANCED_GEOMETRY_IDS/classifyGeometry),
  `MultiBioinkSelector.tsx` (7 presets), `BasicModePanel.tsx` (UI self-contained),
  `/slice/page.tsx` (toggle Básico ↔ Avançado).

### R12.54 — G-code adaptativo por tecido (Onda 1: membrana / vaso / músculo / nervo)
`TissueRecommendationCard` integrado ao `/slice` sugere parâmetros por tecido inferido da geometria.
Learning store persiste ajustes do usuário e re-alimenta as próximas sugestões.

---

## 📜 Licença

Proprietário — Quantis Biotechnology © 2026
Janaina Dernowsek (CEO/Founder)

**Last Updated:** 2026-07-31 — R12.65 (Regenerador embutido na pré-execução · alterar dimensões do STL e parâmetros de G-code sem sair da tela · destaque MAGNÍFICO do ponto inicial G92 X0 Y0 Z0 E0 no viewer 3D · marcador do 1º filamento · usuária vê ANTES de imprimir onde o bico precisa estar posicionado 🎯⊙▶)
