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

**Last Updated:** 2026-07-29 — R12.60 (Conexão USB BioEnder: filtros por Vendor ID + toggle escape + mensagens acionáveis + diagnóstico)
