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

### R13.03.2 — BIA Academy: Visibilidade na home + esconder formato antigo (2026-08-07)

Feedback comercial da Janaina após ver o R13.03 no ar: **"Cadê a Academy na home? Ninguém vai descobrir. E o formato antigo (R$ 4.970 · 6 meses presencial) não existe mais — precisa esconder."**

Hotfix para dar visibilidade máxima à Academy nos canais de descoberta e limpar o formato descontinuado da UI, sem quebrar dados de alunos existentes que já estão no plano ACADEMY.

**O que mudou:**

**A) Home pública `/` (canal de descoberta principal):**
- Novo item **"Academy"** no nav top (destaque fuchsia) linkando para `#academy`
- Novo **banner destacado abaixo do hero** (`section id="academy"` · testId `home-academy-banner`) com:
  * Título "Aprenda biofabricação com a ferramenta ao lado"
  * Descrição do programa (12 módulos + 12 meses + 3 encontros + certificado)
  * Bloco de preço destacado (testId `home-academy-price`): **R$ 2.375,00 à vista** ou **12x de R$ 197,92** no cartão
  * CTA primário (testId `home-academy-cta-primary`) → `/academy` (landing detalhada)
  * CTA secundário (testId `home-academy-cta-asaas`) → checkout Asaas direto
  * Mockup visual à direita: grid dos 12 módulos com o Módulo 1 destacado ("aberto agora")
  * Badge âncora "Módulo 1 aberto" com pulse verde
  * Rodapé com "Pagamento seguro via Asaas · Boleto, Pix ou cartão · Liberação em 24h úteis"

**B) Formato antigo ESCONDIDO (não mais oferecido):**
- Card **"Academy · R$ 4.970 · 6 meses · presencial"** removido da seção Planos da home `/` (grid reduzido de 3 colunas → 2)
- Linha **"Academy · R$ 4.970 · 6 meses"** removida do grid de "Planos disponíveis" em `/auth/register`
- Card **ACADEMY (R$ 4.970 · 6 meses + curso presencial)** removido do array `PLANS` em `/dashboard/billing/BillingClient.tsx`
- Link Asaas antigo do plano descontinuado (`9nvzkrlezi7ht2u5`) preservado apenas em comentários de código (documentação/retomada)

**C) `/dashboard/billing` (todos os usuários logados):**
- Novo **banner Academy com 2 estados** logo antes do "Payment info notice":
  * `currentPlan === "ACADEMY"` → banner ativo (`billing-academy-banner-active`): "Você é aluno da BIA Academy 🎓" com link direto para `/academy/dashboard`
  * Outros planos → banner prospect (`billing-academy-banner-prospect`): "Conheça a BIA Academy" com preço R$ 2.375,00 + link para `/academy`
- Aluno com plano ACADEMY tem atalho direto para o dashboard do curso sem passar pelo menu lateral

**D) SEO structured data (`src/app/layout.tsx`):**
- `AggregateOffer.highPrice` atualizado: **4970 → 2375** (novo preço máximo visível)
- `AggregateOffer.offerCount`: 6 → 5 (removido plano descontinuado)

**IMPORTANTE — Backend intocado (compatibilidade total):**
- Enum `plan: "ACADEMY"` continua **ATIVO** em `Prisma.User`, `api/billing`, `api/admin/*`, admin dashboard, chapters do manual e todas as APIs
- `PLAN_CREDITS.ACADEMY = 20000` mantido
- Alunos que já compraram o formato antigo (R$ 4.970) **mantêm acesso total** — nada mudou para eles
- Novos alunos do curso online R$ 2.375,00 recebem automaticamente `plan: "ACADEMY"` quando o pagamento é confirmado (processo manual atual, webhook automático virá em R13.10 Admin)

**Testes `tests/r13_03_2_academy_home_visibility.test.ts` — 26 verdes:**
- **R13.03.2.A** (2) — Item "Academy" no nav top da home com `href="#academy"`
- **R13.03.2.B** (8) — Banner destacado: testIds, R$ 2.375, 12x R$ 197,92, CTAs para /academy + Asaas, descrição do programa, gradient violet-fuchsia, "24h úteis"
- **R13.03.2.C** (3) — Card R$ 4.970 removido da home (fora de comentários), "Curso presencial incluso" removido, grid reduzido para 2 colunas
- **R13.03.2.D** (1) — Linha Academy R$ 4.970 removida do grid de `/auth/register`
- **R13.03.2.E** (2) — Card ACADEMY R$ 4.970 removido do array `PLANS` de billing, mas `PLAN_CREDITS.ACADEMY = 20000` preservado
- **R13.03.2.F** (5) — Banner billing com 2 estados: testIds active/prospect, link `/academy/dashboard` para aluno, link `/academy` para prospect, preço R$ 2.375 no prospect, condicional `currentPlan === "ACADEMY"`
- **R13.03.2.G** (1) — `layout.tsx` SEO highPrice atualizado para 2375 (não mais 4970)
- **R13.03.2.H** (4) — Consistência: links Asaas em `/academy`, `PendingEnrollment` e banner home todos apontam para `iu7ym1dp93cei9zk`; link antigo `9nvzkrlezi7ht2u5` só existe em comentários

**Testes:** **822/822 passing** (796 anteriores + 26 novos R13.03.2, zero regressões).

**Arquivos modificados (5):**
- `src/app/page.tsx` — item nav "Academy" + banner destacado (`#academy`) + card R$ 4.970 comentado
- `src/app/auth/register/page.tsx` — linha "Academy R$ 4.970" comentada no grid
- `src/app/dashboard/billing/BillingClient.tsx` — card ACADEMY R$ 4.970 removido do array `PLANS` + banner 2-estados adicionado
- `src/app/layout.tsx` — SEO highPrice 4970 → 2375, offerCount 6 → 5
- `tests/r13_03_2_academy_home_visibility.test.ts` — novo arquivo, 26 testes

---

### R13.03.1 — BIA Academy: Preço R$ 2.375,00 publicado na landing (2026-08-07)

Hotfix comercial pequeno, apenas para dar visibilidade do valor final na página `/academy` e alinhar com a descrição do checkout do Asaas.

**O que mudou:**
- Landing `/academy` agora exibe o preço em destaque no card "Curso online individual" (seção Investimento): **R$ 2.375,00 à vista** ou **12x de R$ 197,92 no cartão sem juros**
- Nova constante LOCKED `PRICE_BRL = 2375` no `page.tsx` (formatada via `toLocaleString("pt-BR", { style: "currency" })`)
- FAQ ganhou 7ª pergunta: "Quais são as formas de pagamento?" com resposta detalhada (Pix, boleto, cartão + liberação em 24h úteis)
- Novo `data-testid="academy-price-block"` no bloco de preço para automação
- Link Asaas continua o mesmo (LOCKED): `https://www.asaas.com/c/iu7ym1dp93cei9zk`

**Bloco novo de testes R13.02.M · Preço:**
- Constante `PRICE_BRL === 2375` presente
- Formatação pt-BR com currency BRL
- Card com `academy-price-block` testId
- Menção a 12x parcelas
- FAQ contém pergunta sobre pagamento com valor "R$ 2.375"

**Testes:** **796/796 passing** (791 anteriores + 5 novos R13.02.M, zero regressões).

---

### R13.03 — BIA Academy: Dashboard do aluno + Minha Jornada + Página de aula (2026-08-07)

**Terceiro sprint da trilha R13 — o coração da experiência do aluno.** Toda a área logada de `/academy/*` foi construída: sidebar próprio, dashboard "home" com 5 cards de agregação, timeline dos 12 módulos, página de módulo listando aulas, e a página de aula com iframe YouTube + biaHook + prev/next. 7 decisões travadas com a Janaina antes do commit.

**Decisões locked (Janaina · 2026-08-07):**
1. **Sidebar próprio (Opção B)** — `/academy` é um universo próprio (não reusa DashboardSidebar). AcademySidebar com 7 itens (Dashboard, Jornada, Módulos, Biblioteca, Projeto, Encontros, Certificado) + botão "Voltar para a BIA" + paleta violet→fuchsia
2. **continueFrom heurística A + fallback C** — última aula IN_PROGRESS por `updatedAt DESC`; se não houver, cai no fallback para a próxima aula não concluída em ordem (Aula 1 do Módulo 1 no primeiro acesso)
3. **Página de aula A: iframe simples + botão manual** — `<iframe>` YouTube embed + botão "Marcar como concluída". R13.04 vai substituir por IFrame API com tracking automático de segundos assistidos
4. **Gate acesso A** — anônimo/NO_ENROLLMENT/EXPIRED → redirect `/academy/welcome` (Opção B do R13.02 é reusada, único ponto para gerenciar CTAs Asaas/WhatsApp)
5. **biaHook A: nova aba** — clicar em "Abrir na BIA" navega `/dashboard/{tool}?params...&from=academy&lessonId=xxx` em `target="_blank"`. Tracka `bia_hook_opened` e promove NOT_STARTED → IN_PROGRESS automaticamente
6. **Selo "Concluído" B** — módulo ganha badge esmeralda quando 100% das aulas publicadas estão COMPLETED. Aulas não publicadas NÃO contam no cálculo (não bloqueia gate)
7. **Aula não publicada B** — aparece na lista com ícone de cadeado + label "em breve" (não some), mas retorna 404 se acessada diretamente por URL

**A) Helper `src/lib/academy/journey.ts` — 9.4 KB (funções puras)**

Encapsula toda a lógica de agregação de progresso do aluno. Zero I/O — recebe objetos Prisma já carregados. Exports:

- `computeStudentJourney(modules, progress, now?)` — retorna `StudentJourney` com módulos+aulas+progresso+% por módulo+% global+continueFrom+nextRecommendedLesson
- `findLessonInJourney(journey, moduleSlug, lessonSlug)` — encontra aula publicada específica (null se não existe/não publicada)
- `findNextLesson(journey, currentLessonId)` — próxima aula publicada na sequência global (atravessa fronteira de módulo)
- `findPreviousLesson(journey, currentLessonId)` — aula anterior publicada

Regras determinísticas: ordena módulos por `order ASC`, aulas por `order ASC`, aulas não publicadas viram status LOCKED e não contam no percent, módulos não publicados ficam fora do fluxo de próxima aula.

**B) AcademySidebar `src/components/academy/AcademySidebar.tsx` — 14.4 KB (client)**

Sidebar dedicado para `/academy/*` logado. 7 itens de nav + botão "Voltar para a BIA" no topo + user row + logout. Paleta violet→fuchsia (identidade Academy). Mesma UX do DashboardSidebar (desktop persistente + drawer mobile com hamburger). InfoTooltip hover-desktop/click-mobile em cada item.

**C) APIs (3):**

- `GET /api/academy/journey` — agrega toda a jornada do aluno em uma única chamada. Retorna `{ enrollment: { state, daysRemaining, ... }, journey: StudentJourney }`. Usa `hasAccess()` do R13.01. 401 anônimo, 403 sem matrícula ou EXPIRED
- `GET /api/academy/lessons/[lessonSlug]?moduleSlug=xxx` — retorna aula (title, objective, summary, youtubeId, biaHook, attachments, quiz?) + progresso do aluno + `navigation.previous/next`. Faz upsert idempotente em NOT_STARTED no primeiro acesso. 404 se aula/módulo não publicado. Compatível Next.js 15 async params
- `PATCH /api/academy/progress` — atualiza status/watchedSeconds/biaHookOpened/quizScore com Zod. Deriva `completedAt=now` automaticamente quando status=COMPLETED, e `completedAt=null` quando volta a NOT_STARTED. Detecta conclusão do programa (todas aulas publicadas COMPLETED) e marca `enrollment.completedAt` — retorna `enrollmentJustCompleted: true` no response (certificado sai em R13.09)

**D) Layout `src/app/academy/(app)/layout.tsx` — route group protegido**

O route group `(app)` do Next.js segrega as rotas logadas da landing pública. O layout `(app)/layout.tsx` faz:
1. Guarda de sessão: anônimo → `/auth/login?callbackUrl=/academy/dashboard`
2. Guarda de matrícula: `!hasAccess()` → `/academy/welcome` (reusa Opção B do R13.02)
3. Renderiza `<AcademySidebar />` + `<main>{children}</main>`

Como fica organizado:
```
/academy/                          ← landing PÚBLICA (R13.02)
/academy/welcome                   ← onboarding (R13.02)
/academy/(app)/dashboard           ← [protegida] home do aluno  ← NOVO
/academy/(app)/journey             ← [protegida] Minha Jornada  ← NOVO
/academy/(app)/modules/[slug]      ← [protegida] módulo         ← NOVO
/academy/(app)/modules/[m]/[l]     ← [protegida] aula           ← NOVO
```

**E) Página `/academy/dashboard` — 14 KB (server component)**

Home do aluno pós-login. 5 cards com testIds `dashboard-card-*`:

1. **Continue de onde parou** (card grande) — link direto para a aula IN_PROGRESS mais recente (ou fallback para próxima recomendada)
2. **Progresso geral** — % concluído + aulas completadas/total + dias restantes de acesso
3. **Próxima aula recomendada** — só aparece se for diferente do continueFrom
4. **Próximo encontro ao vivo** — próximo AcademyLiveEvent futuro, ou placeholder
5. **Feed de atualizações** (compacto) — últimas 3 AcademyUpdates publicadas
6. **CTA "Ver jornada completa"** — atalho para `/academy/journey`

Saudação personalizada com o primeiro nome do aluno da sessão.

**F) Página `/academy/journey` — 12.3 KB (server component)**

Timeline dos 12 módulos com progresso individual. Cada módulo é um card expandido mostrando:
- Ordem (padStart 2 dígitos), título, descrição, barra de progresso do módulo, badge de status
- Lista completa de aulas com status individual (COMPLETED/IN_PROGRESS/NOT_STARTED/LOCKED)
- Módulos concluídos com borda esmeralda + badge "Concluído ✓" (decisão #6)
- Módulos em andamento com borda fuchsia + badge "Em andamento"
- Módulos não publicados com opacity + badge "Em breve"

**G) Página `/academy/modules/[moduleSlug]` — 7.9 KB (server component)**

Página do módulo listando todas as aulas com status individual em cards maiores. Chama `notFound()` se o módulo não existe ou não está publicado. Breadcrumb: Jornada → Módulo N. Badge "Concluído" no header quando o módulo está 100%.

**H) Página `/academy/modules/[moduleSlug]/[lessonSlug]` — server + client (22 KB total)**

`page.tsx` (server) — carrega aula + módulo + progresso + prev/next. Chama `notFound()` se aula/módulo não publicado (decisão #7). Faz upsert idempotente do progresso em NOT_STARTED no primeiro acesso.

`_components/LessonView.tsx` (client) — renderiza:
- Breadcrumb (Jornada → Módulo → Aula N.N)
- Header (título, objetivo em card destacado)
- iframe YouTube embed (`https://www.youtube.com/embed/{youtubeId}?rel=0&modestbranding=1`)
- Barra de ações: badge de status + botão "Marcar como concluída" (verde) ou "Marcar como não concluída"
- Banner de confete "Aula concluída! 🎓" com link para próxima aula
- **biaHook card** (gradiente Academy): link em nova aba para `/dashboard/{tool}?...&from=academy&lessonId=xxx`, tracka `bia_hook_opened` e promove NOT_STARTED → IN_PROGRESS
- Resumo (markdown-plain)
- Anexos: PDF/LINK/STL/GCODE/IMAGE com ícones específicos
- Card do quiz "em breve" (funcional em R13.05)
- Navegação prev/next em grid 2 colunas

Tracka via `/api/academy/analytics` (fire-and-forget): `lesson_opened` (mount), `lesson_completed` (patch OK), `bia_hook_opened` (clique).

**I) Redirect do onboarding para /academy/dashboard**

Agora que a "casa do aluno" existe, `WelcomeForm.submit`, `WelcomeForm.skip` e `welcome/page.tsx` (already-answered) todos redirecionam para `/academy/dashboard?from=academy-welcome` em vez de `/dashboard/notebook`.

**J) Testes `tests/r13_03_academy_dashboard_journey_lesson.test.ts` — 81 verdes**

- **R13.03.A** (13) — Helper puro: agregação, %, LOCKED, ordenação, continueFrom com múltiplos IN_PROGRESS, findNextLesson atravessando módulos, edge cases
- **R13.03.B** (7) — AcademySidebar: 7 itens, botão voltar BIA, gradient violet-fuchsia, InfoTooltip
- **R13.03.C** (6) — API journey: GET, auth 401, hasAccess, 403, force-dynamic
- **R13.03.D** (6) — API lesson: query moduleSlug, 404 não publicado, upsert idempotente, prev/next, Next.js 15
- **R13.03.E** (8) — API progress: Zod, deriva completedAt, enrollmentJustCompleted, 404 não publicado
- **R13.03.F** (4) — Layout (app): redirect anon + redirect welcome + AcademySidebar
- **R13.03.G** (6) — /academy/dashboard: 5 cards com testIds, live event, updates feed
- **R13.03.H** (5) — /academy/journey: badges concluído/em breve, aulas LOCKED, barras
- **R13.03.I** (5) — /academy/modules/[slug]: notFound() gate, Next.js 15, testIds
- **R13.03.J** (13) — Página de aula: iframe YT, marcar concluída, biaHook target=_blank, tracking, 5 tipos de anexo, prev/next, quiz "em breve"
- **R13.03.K** (2) — Redirect onboarding → /academy/dashboard
- **R13.03.L** (4) — Sanidade global: helper exports, route group isola, force-dynamic em todas APIs, JSDoc R13.03

**Testes:** **791/791 passing** (710 anteriores + 81 novos R13.03, zero regressões, 45.15s).

**Arquivos criados (11):**
- `src/lib/academy/journey.ts` (9.4 KB — helper puro)
- `src/components/academy/AcademySidebar.tsx` (14.4 KB — client)
- `src/app/api/academy/journey/route.ts` (2.8 KB)
- `src/app/api/academy/lessons/[lessonSlug]/route.ts` (5.5 KB)
- `src/app/api/academy/progress/route.ts` (5.7 KB)
- `src/app/academy/(app)/layout.tsx` (1.7 KB — server, protegido)
- `src/app/academy/(app)/dashboard/page.tsx` (14 KB — 5 cards)
- `src/app/academy/(app)/journey/page.tsx` (12.3 KB — timeline)
- `src/app/academy/(app)/modules/[moduleSlug]/page.tsx` (7.9 KB — lista aulas)
- `src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/page.tsx` (4.9 KB — server)
- `src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/_components/LessonView.tsx` (17.6 KB — client)
- `tests/r13_03_academy_dashboard_journey_lesson.test.ts` (29.9 KB — 81 testes)

**Arquivos modificados (2):**
- `src/app/academy/welcome/_components/WelcomeForm.tsx` (redirect: `/dashboard/notebook` → `/academy/dashboard`)
- `src/app/academy/welcome/page.tsx` (redirect: `/dashboard/notebook` → `/academy/dashboard`)

**Próximo (R13.04):** Player YouTube com IFrame API + tracking automático de `watchedSeconds` — substitui o iframe simples desta sprint.

---

### R13.02 — BIA Academy: Landing pública `/academy` + onboarding + analytics mínimo (2026-08-07)

**Segundo sprint da trilha R13** — a porta de entrada comercial da plataforma educacional. Landing pública `biaquantis.bio/academy` (sem login), onboarding leve de 3 perguntas para o primeiro acesso do aluno, e tracking mínimo para dar visibilidade do funil comercial sem cookies e sem GA. 6 decisões travadas com a Janaina antes do commit.

**Decisões locked (Janaina · 2026-08-07):**
1. **Onboarding** = `Json?` no `AcademyEnrollment` (não colunas dedicadas) → schema flexível para evoluir perguntas sem migration
2. **Skip permitido** — onboarding é opcional (não bloqueia o fluxo do aluno)
3. **Opção B para pending/expired** — visitante sem matrícula ativa vê página dedicada com CTAs Asaas + WhatsApp em vez de ser jogado para o dashboard
4. **Opção A no sidebar** — link "Academy" visível para **TODOS** os usuários (canal de descoberta comercial), com badge "novo"
5. **pt-BR only** — sem preparação de i18n
6. **Analytics mínimo** — 1 API leve + 1 tabela (`AcademyAnalytics`), **sem cookies, sem GA, sem gtag** — só dados agregados server-side

**A) Schema Prisma — extensão + 1 novo model**

| Alteração | Detalhe |
|---|---|
| `AcademyEnrollment.onboarding Json?` | Guarda as 3 respostas (preferredArea/experienceLevel/mainGoal) + timestamps completed/skipped |
| `AcademyAnalytics` (novo model) | `id`, `event`, `userId?`, `path?`, `metadata Json?`, `createdAt` + 3 índices (event, userId, createdAt) |

**B) Migration `20260807000001_r13_02_academy_onboarding_analytics` — APLICADA no Neon Postgres**

- 22 linhas SQL: `ALTER TABLE academy_enrollments ADD COLUMN onboarding JSONB` + `CREATE TABLE academy_analytics` + 3 índices
- `npx prisma migrate deploy` → OK
- `npx prisma generate` → Client v7.6.0 regenerado

**C) API `/api/academy/onboarding` (GET + PATCH)**

- **GET** — retorna estado da matrícula + onboarding atual. 403 se `NO_ENROLLMENT` ou `EXPIRED`
- **PATCH** — aceita `{ preferredArea?, experienceLevel?, mainGoal?, skip? }` com Zod enums:
  - `preferredArea`: 13 opções (formulacao, bioimpressao, organoides, cicatrizacao_pele, osso_cartilagem, cardiovascular, neural, hepatico, renal, mucosa_oral, drug_delivery, regulatorio, outros)
  - `experienceLevel`: 3 opções (iniciante, intermediario, avancado)
  - `mainGoal`: 6 opções (formacao_academica, projeto_pesquisa, aplicacao_clinica, negocio_startup, atualizacao_profissional, curiosidade)
- Usa `hasAccess()` do helper R13.01 — reusa lógica de expiração

**D) API `/api/academy/analytics` (POST + GET)**

- **POST** — fire-and-forget event tracking. Aceita `{ event, path?, metadata? }`. Autenticação opcional (funciona para visitantes anônimos na landing). Retorna 204 (ok) ou 202 (erro silencioso, não bloqueia UX)
- **GET** — restrito a `ADMIN` ou `INSTRUCTOR`. Retorna agregação por evento via `Prisma.groupBy` (contagens agregadas — dashboards internos)
- **13 eventos oficiais rastreados**: `landing_viewed`, `cta_asaas_clicked`, `cta_whatsapp_clicked`, `cta_login_clicked`, `module_preview_clicked`, `faq_expanded`, `onboarding_started`, `onboarding_completed`, `onboarding_skipped`, `lesson_opened`, `bia_hook_opened`, `quiz_started`, `quiz_completed`
- **Zero cookies**, **zero gtag**, **zero Google Analytics** — apenas registros server-side na tabela `academy_analytics`

**E) Landing pública `/academy` (28 KB — client component)**

Layout próprio (`/academy/layout.tsx`, minimalista, **não** usa `DashboardSidebar`) + página de 8 seções:

1. **Nav sticky** — logo BIA + link Login + CTA Asaas
2. **Hero** — headline "Aprenda biofabricação com a ferramenta ao lado", 2 CTAs (Asaas + WhatsApp)
3. **Programa oficial** — 12 módulos · 12 meses de acesso · 3 encontros ao vivo · certificado · plataforma BIA integrada
4. **Como funciona?** — passo-a-passo do fluxo aula → BIA → notebook → projeto pessoal
5. **12 Módulos** — cards com título, resumo e badge "disponível/em breve" (Módulo 1 já liberado do R13.01)
6. **Público-alvo** — 4 perfis (pesquisador acadêmico, clínico/dentista, empreendedor biotech, estudante avançado)
7. **Investimento** — 2 cards lado-a-lado: Asaas (matrícula direta) e WhatsApp (falar com Janaina)
8. **FAQ (6 itens)** — dúvidas comuns (pré-requisitos, prazo de acesso, certificado, encontros ao vivo, formas de pagamento, cancelamento)
9. **CTA final + Footer** — última chamada Asaas + créditos Quantis Biotechnology

Chama `trackEvent("landing_viewed")` no mount e rastreia cliques em todos os CTAs (Asaas nav/hero/pricing/footer, WhatsApp hero/pricing, login, preview de módulo, expansão de FAQ). Fire-and-forget via `fetch({ keepalive: true }).catch(() => {})` — analytics nunca bloqueia UX.

**Links comerciais LOCKED (idênticos em toda a base):**
- Asaas: `https://www.asaas.com/c/iu7ym1dp93cei9zk`
- WhatsApp: `https://wa.me/11968632231` (Janaina)

**F) Onboarding `/academy/welcome` (server component + 2 client components)**

`page.tsx` (server component) — 4 branches determinísticos:

1. **Anônimo** → `redirect("/auth/login?callbackUrl=/academy/welcome")`
2. **NO_ENROLLMENT / EXPIRED / PENDING** → renderiza `<PendingEnrollment>` (Opção B)
3. **Já respondeu** (e não veio com `?edit=1`) → `redirect("/dashboard/notebook?from=academy-welcome")`
4. **Ativo + não respondeu** → renderiza `<WelcomeForm>`

Compatível com Next.js 15 async `searchParams` via `instanceof Promise` check.

`WelcomeForm.tsx` (client, 10 KB):
- 3 perguntas em cards com radio-buttons visuais (área preferida · nível de experiência · principal objetivo)
- Botão "Pular por enquanto" (`skip: true` → tracka `onboarding_skipped`)
- Botão "Começar" só habilita com as 3 respostas (→ tracka `onboarding_completed`)
- Ambos redirecionam para `/dashboard/notebook?from=academy-welcome`

`PendingEnrollment.tsx` (client, 5.7 KB):
- Card âmbar explicando que a matrícula está pendente/inativa
- 2 CTAs: Asaas (`pending-cta-asaas`) e WhatsApp (`pending-cta-whatsapp`)
- Tracka `pending_enrollment_viewed`, `cta_asaas_clicked`, `cta_whatsapp_clicked`
- Links de retorno para `/academy` (conhecer o programa) e `/dashboard` (fallback)

**G) Sidebar — link Academy (Opção A: visível para TODOS)**

`DashboardSidebar.tsx` NAV_ITEMS agora tem 14 itens (era 13). Item Academy:

- `icon: GraduationCap` (lucide-react)
- `href: /academy`
- Badge visual "novo" (gradient violet→fuchsia)
- Cor de destaque fuchsia quando ativo (diferencia visualmente da paleta violet padrão do sidebar)
- Sem gate de role — canal de descoberta comercial para prospects (pesquisadores que ainda não são alunos veem a landing)
- `data-testid="sidebar-academy-link"` para automação

**H) Testes `tests/r13_02_academy_landing_onboarding.test.ts` — 78 verdes**

- **R13.02.A** (5) — Schema tem `onboarding Json?` em AcademyEnrollment + model AcademyAnalytics com todos os campos, `@@map`, 3 índices, e **NÃO** tem colunas dedicadas (decisão #1)
- **R13.02.B** (4) — Migration SQL R13.02 existe, tem ALTER TABLE, CREATE TABLE academy_analytics com colunas corretas e 3 índices
- **R13.02.C** (8) — API onboarding: GET+PATCH exportados, usa auth() com 401, Zod enums para os 3 campos, aceita skip, usa hasAccess do R13.01, 403 sem enrollment, grava em campo Json (não colunas)
- **R13.02.D** (7) — API analytics: POST+GET, POST não exige auth (anônimo funciona), retorna 204/202, GET restrito ADMIN/INSTRUCTOR, groupBy, KNOWN_EVENTS oficiais, sem cookies
- **R13.02.E** (12) — Landing: client component, links Asaas/WhatsApp LOCKED, 8 seções, 12 módulos, FAQ 6 itens, CTAs Asaas em 4 posições + WhatsApp 2, CTA login, tracka landing_viewed com keepalive+catch, pt-BR
- **R13.02.F** (4) — Layout: existe, NÃO importa DashboardSidebar, exporta metadata com keywords SEO
- **R13.02.G** (7) — /academy/welcome: server component, usa auth(), redireciona anônimo com callbackUrl, renderiza PendingEnrollment/WelcomeForm nas branches certas, redireciona já-respondido para notebook, usa helpers R13.01
- **R13.02.H** (8) — WelcomeForm: client, PATCH /api/academy/onboarding, 3 perguntas, botão skip, botão submit, tracka completed/skipped, redireciona notebook
- **R13.02.I** (6) — PendingEnrollment: client, links Asaas/WhatsApp LOCKED, testIds pending-cta-*, tracka 3 eventos, links de retorno
- **R13.02.J** (7) — DashboardSidebar: importa GraduationCap, NAV_ITEMS tem item /academy com label/icon/badge/info, render loop suporta badge, sem gate de role (Opção A), tem sidebar-academy-link
- **R13.02.K** (4) — Analytics: landing tracka eventos comerciais, API conhece todos, sem cookies/gtag/GA
- **R13.02.L** (3) — Consistência: links Asaas/WhatsApp idênticos em todos os arquivos onde aparecem, sem variantes antigas, WhatsApp sempre 11968632231

**Testes:** **710/710 passing** (632 anteriores + 78 novos R13.02, zero regressões, 46.79s).

**Arquivos criados (8):**
- `prisma/migrations/20260807000001_r13_02_academy_onboarding_analytics/migration.sql` (22 linhas)
- `src/app/api/academy/onboarding/route.ts` (5.5 KB — GET+PATCH com Zod)
- `src/app/api/academy/analytics/route.ts` (4.3 KB — POST fire-and-forget + GET restrito)
- `src/app/academy/layout.tsx` (1.5 KB — layout minimalista + metadata SEO)
- `src/app/academy/page.tsx` (28.6 KB — landing pública 8 seções)
- `src/app/academy/welcome/page.tsx` (2.9 KB — server component 4 branches)
- `src/app/academy/welcome/_components/WelcomeForm.tsx` (10.3 KB — form 3 perguntas + skip)
- `src/app/academy/welcome/_components/PendingEnrollment.tsx` (5.8 KB — Opção B)
- `tests/r13_02_academy_landing_onboarding.test.ts` (23.6 KB — 78 testes)

**Arquivos modificados (2):**
- `prisma/schema.prisma` (+ `onboarding Json?` em AcademyEnrollment + model AcademyAnalytics)
- `src/components/layout/DashboardSidebar.tsx` (+ import GraduationCap, + NAV_ITEM Academy com badge, render loop com badge + destaque fuchsia quando ativo)

**Próximo (R13.03):** Dashboard do aluno + "Minha Jornada" + página de aula (player embed + notas + biaHook).

---

### R13.01 — BIA Academy: schema Prisma (11 models) + migration aplicada no Neon + seed do Módulo 1 piloto + helper de matrícula (2026-08-07)

**Início da trilha R13** — a plataforma educacional integrada `biaquantis.bio/academy`. Todas as decisões acordadas em `docs/roadmap/R13_bia_academy_decisions.md` (10 decisões travadas com a Janaina).

**A) Schema Prisma — 11 novos models Academy**

| Model | Papel |
|---|---|
| `AcademyEnrollment` | Matrícula do aluno (1 por user, com `accessUntil = enrolledAt + 12 meses`) |
| `AcademyModule` | Módulo do curso (12 no total quando publicados) |
| `AcademyLesson` | Aula (com `youtubeId`, `objective`, `summary`, `biaHook Json?`) |
| `AcademyAttachment` | Anexos da aula (PDF/LINK/STL/GCODE/IMAGE) |
| `AcademyQuiz` | Quiz opcional por aula (passingScore default 70) |
| `AcademyQuizQuestion` | Pergunta do quiz (options Json + correctIndex) |
| `AcademyProgress` | Progresso do aluno (1 registro por lesson via `@@unique([enrollmentId, lessonId])`) |
| `AcademyProject` | "Meu Projeto de Biofabricação" — amarrado a `NotebookEntry` (R12.66) |
| `AcademyLiveEvent` | Encontros online ao vivo (3 no programa) |
| `AcademyUpdate` | Feed de atualizações (PROTOCOL/ARTICLE/LESSON_EXTRA/EVENT) |
| `AcademyCertificate` | Certificado emitido com `code @unique` |

**Relations bidirecionais:**
- `User.academyEnrollment` (opcional, 1:1)
- `NotebookEntry.academyProject` (opcional, 1:1) — permite versionamento automático V1/V2/V3 do projeto do aluno via R12.66

**B) Enum `UserRole` estendido**

- `USER`, `ADMIN`, `RESEARCHER` (existentes) + **`STUDENT`** (aluno matriculado) + **`INSTRUCTOR`** (professor/monitor que pode criar módulos/aulas/agendar encontros)

**C) Migration `20260806000001_r13_01_academy_schema` — APLICADA no Neon Postgres**

- 262 linhas SQL: 2 `ALTER TYPE UserRole ADD VALUE` + 11 `CREATE TABLE` + 22 `CREATE INDEX` + 13 FK constraints
- Aplicada com `npx prisma migrate deploy` — resultado: `Applying migration '20260806000001_r13_01_academy_schema'` OK
- Prisma Client regenerado (`npx prisma generate`) — v7.6.0 em 1.17s
- Vercel próxima deploy vai reportar "already applied" e passar direto

**D) Helper `src/lib/academy/enrollment.ts` — cálculos deterministas (6 KB)**

Funções puras (sem I/O — 100% testáveis):
- `ACCESS_DURATION_MS` = 365 dias em ms
- `calculateAccessUntil(enrolledAt)` = `enrolledAt + 12 meses`
- `getEnrollmentState(enrollment, now)` → `PENDING | ACTIVE | COMPLETED | EXPIRED`
- `hasAccess(enrollment, now)` — atalho: ACTIVE ou COMPLETED = true
- `daysRemaining(enrollment, now)` — número positivo, 0 (EXPIRED), ou null (COMPLETED)
- `moduleCompletionPercent(lessons, progress)` — % de aulas concluídas do módulo
- `overallCompletionPercent(modules, progress)` — % do programa (só publicados)
- `generateCertificateCode(year, seq)` → `"BIA-ACAD-2027-0001"`
- `prepareEnrollmentData({ userId, source, asaasPaymentId?, enrolledAt? })` — payload para `prisma.academyEnrollment.create`

**E) Seed script `scripts/seed-academy-module-01.ts` — Módulo 1 piloto (14 KB)**

**RODADO em produção com `--publish`** → Neon agora tem o Módulo 1 completo:

- 1 módulo: **"Introdução à Biofabricação"** (slug `introducao-biofabricacao`, order 1)
- 5 aulas piloto:
  1. **O que é biofabricação?** (12 min · basic · quiz de 1 pergunta · 1 link Groll 2019)
  2. **Fundamentos de engenharia tecidual** (15 min · basic · biaHook para Formulator Pro)
  3. **Panorama da bioimpressão 3D** (18 min · intermediate · biaHook para bioprint/model)
  4. **Aplicações clínicas atuais** (14 min · intermediate · 1 link Murphy & Atala 2014)
  5. **Limitações e desafios do estado da arte** (16 min · advanced · quiz de 2 perguntas)
- `youtubeId` como `PLACEHOLDER_M01_L01..L05` — time de conteúdo substitui pelos IDs reais dos vídeos não listados antes do lançamento público
- **Idempotente**: 2ª execução relatou `updated: true` em vez de duplicar
- **Não-destrutivo**: nunca chama `.delete()` em `AcademyModule`, `AcademyLesson` ou `AcademyEnrollment`. Attachments/quizzes SÃO recriados por lesson (reconciliação local, sem risco global)
- Suporta `--dry-run` (preview sem gravar) e `--publish` (marca isPublished=true; sem flag fica como draft)
- Reusa o singleton `prisma` do app (`src/lib/db/prisma.ts`) — adapter Neon já configurado

Rodar depois:
```bash
# preview
npx tsx scripts/seed-academy-module-01.ts --dry-run

# executar (carrega .env.local automaticamente com set -a; source .env.local; set +a)
set -a; source .env.local; set +a
npx tsx scripts/seed-academy-module-01.ts --publish
```

**F) Testes `tests/r13_01_academy_schema.test.ts` — 44 verdes**

- **R13.01.A** (7) — Schema tem 11 models com campos verbatim (AcademyEnrollment.accessUntil, AcademyLesson.youtubeId+biaHook Json, AcademyProject.notebookEntryId @unique, AcademyProgress @@unique lesson+enrollment, AcademyLiveEvent.order 1|2|3, AcademyCertificate.code @unique)
- **R13.01.B** (2) — Relations bidirecionais: `User.academyEnrollment` e `NotebookEntry.academyProject`
- **R13.01.C** (3) — Enum UserRole mantém originais + adiciona STUDENT + INSTRUCTOR
- **R13.01.D** (4) — Migration existe, cria 11 tabelas com prefixo `academy_`, adiciona 2 enum values, FKs corretas
- **R13.01.E** (10) — Helper enrollment.ts: constante correta, cálculo determinista de accessUntil, ordem COMPLETED > EXPIRED > ACTIVE > PENDING, dias restantes, moduleCompletionPercent (retorna 0 se vazio), overallCompletionPercent só considera publicados, formato do certificate code, prepareEnrollmentData
- **R13.01.F** (9) — Seed idempotente (upsert por slug), suporta flags, NÃO chama .delete em módulos/aulas/enrollments, contém as 5 aulas piloto, reusa singleton prisma do app, saída JSON
- **R13.01.G** (4) — Coerência com o doc R13: 11 models mencionados batem, roles STUDENT+INSTRUCTOR no doc, `notebookEntryId` no doc, rolling+12 meses
- **R13.01.H** (5) — Sanidade global: arquivos existem, 9 exports do helper, seed sem secrets

**Testes:** **632/632 passing** (588 anteriores + 44 novos R13.01, zero regressões, 44.72s).

**Arquivos criados (4):**
- `prisma/migrations/20260806000001_r13_01_academy_schema/migration.sql` (262 linhas)
- `src/lib/academy/enrollment.ts` (6 KB — helper transacional)
- `scripts/seed-academy-module-01.ts` (14 KB — seed idempotente)
- `tests/r13_01_academy_schema.test.ts` (18 KB — 44 testes)

**Arquivos modificados (1):**
- `prisma/schema.prisma` (+ 11 models Academy + 2 roles + 2 relations bidirecionais)

**🎯 Estado atual do R13 · BIA Academy**

```
✅ R13.01  Schema Prisma + Migration + Seed do Módulo 1
✅ R13.02  Landing pública /academy + onboarding + analytics mínimo
✅ R13.03  Dashboard aluno + Minha Jornada + página de aula (ESTA SPRINT)
⏳ R13.04  Player YouTube com tracking de progresso (IFrame API)
⏳ R13.05  Quizzes + Biblioteca
⏳ R13.06  Integração BIA (bia-hook + retorno de progresso)
⏳ R13.07  Meu Projeto (reusa Notebook R12.69)
⏳ R13.08  Feed de Atualizações
⏳ R13.09  Certificado (reusa jspdf do R12.67)
⏳ R13.10  Admin (CRUD módulos/aulas/alunos/eventos)
```

**Próximo (R13.02):** Landing pública `/academy` — página comercial + botões de compra Asaas + WhatsApp corporativo + onboarding de 3 perguntas para primeiro login.

---

### R12.69 — UI hierárquica do Notebook: Projetos → Entradas → Versões + busca global + diff visual (Fase 4 de 4 · CONCLUI o pacote export/salvar/rastreabilidade) (2026-08-06)

Mandato Janaina (Fase 4 final do pacote):
> **"Hierarquia Projetos → Experimentos → Protocolos → Formulações → Bioinks → Resultados → Imagens → Próximos Passos → Versões; busca por título/projeto/palavra-chave/data/protocolo/tag; UI para consultar/abrir/comparar/restaurar/exportar versões."**

Esta sprint entrega o **Explorador hierárquico** do Notebook — a UI que finalmente amarra Projetos + Entradas + Versões numa única experiência. Depois disso, o pacote de 4 fases está encerrado e ficamos livres para começar o **R13.01 BIA Academy**.

**5 defaults aprovados pela Janaina:**
1. ✅ Mobile: tabs no topo (Projetos | Entradas | Viewer)
2. ✅ Diff: **side-by-side simples, ZERO libs novas** (opção A)
3. ✅ Projetos ordenados por atividade recente (`updatedAt DESC`)
4. ✅ 4 filtros na EntryList: Tipo · Data · Tem imagens · Pinned
5. ✅ Views `create` e `generate` existentes **preservadas intactas** (o explorer é adicionado como modo separado; nada foi removido)

**A) API GET `/api/notebook` estendida (retro-compatível)**

3 novos query params:
- `?projectId=<id>` — filtra entradas de um projeto específico
- `?projectId=null` — filtra entradas SEM projeto (soltas)
- `?sinceDays=N` — filtra `updatedAt >= now - N dias` (usado no filtro de Data)

Busca `?q=` **agora inclui `tags[]`** (`{ tags: { has: q } }`) além de title/content/category — quem procurar "gelma" acha entradas com essa tag mesmo sem ela aparecer no título.

Select expandido: adiciona `projectId`, `currentVersion`, `_count.images`, `_count.versions` — o mínimo que a UI precisa para renderizar badges e filtros.

**B) `<ProjectSidebar>` — Nível 1 da hierarquia (13 KB)**

```
┌────────────────────────────┐
│ 🌳 PROJETOS            [+] │
├────────────────────────────┤
│ 📁 Todas as entradas       │
│ 📁 Sem projeto             │
│ ─────                      │
│ 🟪 Cartilagem MVP     12   │
│ 🟦 Reparo condral      5   │
└────────────────────────────┘
```

- Consome `GET /api/projects` (R12.66) — ordenação já vem por `updatedAt DESC` do backend
- 2 slots virtuais no topo: **"all"** (todas as entradas) e **"none"** (sem projeto)
- Botão `[+]` abre modal de criação: nome + área de pesquisa + color picker (default `#a78bfa` — violet-400)
- Projetos arquivados aparecem com `opacity-50` (não escondidos)
- Após criar, o novo projeto vai automaticamente para o topo da lista e fica selecionado

**C) `<EntryList>` — Nível 2 com busca global + 4 filtros (17 KB)**

- **Busca global** com debounce de 250ms (query em title/content/category/tags)
- **4 filtros oficiais** ocultos por default (clique em "Filtros" para expandir):
  1. **Tipo** (dropdown com todos os `NotebookEntryType`)
  2. **Data** (botões: Todos / 7d / 30d / 90d)
  3. **Tem imagens** (checkbox — filtro client-side via `_count.images > 0`)
  4. **Pinned** (checkbox — usa `?pinned=true` da API)
- Badge com contador de filtros ativos + botão "Limpar filtros"
- Cards de entrada mostram: tipo (pill colorido) + versão (v3 quando > 1) + nº de imagens + data relativa ("há 5 min", "há 2 d") + 2 primeiras tags
- Pinned entries têm ícone dourado no canto

**D) `<VersionTimeline>` — Nível 3 parte 1 (10 KB)**

Timeline **horizontal** com scroll (mobile-friendly):

```
[v5·atual] [v4] [v3] [v2] [v1]
    ●       ○    ●    ○    ○    ← seleção múltipla (max 2)
```

- Consome `GET /api/notebook/[id]/versions` (R12.66)
- Cada card mostra: badge da versão + data/hora + autor + `changeSummary` + botão "Restaurar" (só nas não-atuais)
- **Selecionar 2 versões → botão "Comparar vN × vM"** aparece no header
- Se já tem 2 selecionadas e clicar em uma 3ª, substitui a mais antiga (não acumula)
- **Restaurar usa `window.confirm()`** antes de chamar API (proteção contra clique acidental)
- Restaurar é NÃO-destrutivo — chama `POST /versions/restore` que cria N+1 preservando todo o histórico

**E) `<VersionDiff>` — Nível 3 parte 2 · side-by-side ZERO libs (13 KB)**

Modal com layout de 2 colunas comparando 2 versões:

```
┌─────────────────────────────────────────────┐
│ Comparar v3 ↔ v5           [3 alterados] × │
├─────────────────────────────────────────────┤
│ 🔴 v3 (mais antiga)  🟢 v5 (mais nova)      │
├─────────────────────────────────────────────┤
│ TÍTULO (alterado 🟨)                        │
│ ┌──────────────┐  ┌──────────────┐          │
│ │ − v3         │  │ + v5         │          │
│ │ GelMA v2     │  │ GelMA v3     │          │
│ └──────────────┘  └──────────────┘          │
│                                             │
│ TAGS (alterado 🟨)                          │
│ ┌──────────────┐  ┌──────────────┐          │
│ │ [gelma]      │  │ [gelma][HA]  │          │
│ └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────┘
```

- Consome `GET /api/notebook/[id]/versions/[versionNew]?compareTo=[versionOld]` (R12.66)
- Backend já entrega `changedFields[]` + `diff[]` prontos
- **Renderiza 6 campos versionáveis:** title / entryType / category / tags / projectId / content
- **Campos alterados:** background âmbar + coluna vermelha (antiga) / verde (nova)
- **Campos idênticos:** aparecem esmaecidos (opacity-60) — para dar contexto sem distrair
- **Tags viram pills**, content vira `<pre>` com scroll interno de 224px
- Se `changedFields.length === 0` mostra callout: *"Estas duas versões têm conteúdo idêntico"* (raro mas possível quando usuária apenas confirma "gerar nova versão" sem mudar nada)
- **ZERO libs de diff externas** — nem `diff`, nem `fast-diff`, nem `diff-match-patch`. Testado explicitamente.
- Layout responsive: `grid-cols-1 md:grid-cols-2` (empilha em mobile)

**F) Página `/dashboard/notebook/page.tsx` refatorada (não-destrutiva)**

- Estado `view` estendido: `"list" | "create" | "generate" | "viewer" | "explorer"` (+1 valor)
- **Views existentes preservadas 100%** (`create`, `generate`, `viewer`, `list`)
- Novo botão **"Explorador"** (ícone `FolderTree`) no header — toggle entre `list` (vista antiga) e `explorer` (nova)
- Modo `explorer` renderiza layout de **3 colunas responsivo**:
  - Desktop (`md+`): sidebar 224px + list 320px + viewer flex-1
  - Mobile (`<md`): **tabs no topo** (Projetos | Entradas | Detalhes) — navegação sequencial
- Ao selecionar projeto → auto-navega para tab "Entradas" no mobile
- Ao selecionar entrada → auto-navega para tab "Detalhes" no mobile
- Viewer mostra: título + tags + **ExportBar** (R12.67) + **VersionTimeline** (R12.69) + conteúdo em Markdown
- ExportBar reidrata blocos via `metadata.__exportableBlocks` preservados pelo R12.67 — quem salvou pelo Formulator Pro/Pipeline/Bioink/Chat consegue re-exportar como PDF/DOCX sem perder formatação
- Timeline `.onCompare()` abre modal `<VersionDiff>` sobreposto
- Timeline `.onRestored()` bumpa `reloadKey` — força reload da entry + versions

**G) Testes `tests/r12_69_notebook_ui_hierarchical.test.ts` — 57 verdes**

- **R12.69.A** (7) — API estendida: projectId (real + null), busca em tags via `has`, sinceDays com cutoff, _count.images/versions no select, projectId+currentVersion no select
- **R12.69.B** (7) — ProjectSidebar: Client Component, exports corretos, 2 slots virtuais, botão criar + modal com 3 campos, arquivados com opacity-50
- **R12.69.C** (9) — EntryList: fetch dinâmico, debounce 250ms, projectId=null literal, 4 filtros (Tipo/Data 4×/Imagens/Pinned), hasImagesOnly client-side, badge de versão, contador de imagens, testId busca, formatRelative
- **R12.69.D** (8) — VersionTimeline: consumo APIs R12.66, seleção max 2 (substitui mais antiga), sort desc, onCompare(a,b), window.confirm, botão restaurar oculto na atual, badge "atual"
- **R12.69.E** (10) — VersionDiff: URL compareTo=, ZERO libs de diff, 2 colunas semânticas (red/emerald), background âmbar em alterados, 6 campos versionáveis, tags→pills, content→pre com scroll, empilha em mobile, callout de idêntico, testIds por campo
- **R12.69.F** (10) — Página: imports dos 4 componentes + ExportBar, tipo `view` com 5 valores, create/generate/viewer preservadas, botão toggle, layout 3 colunas + tabs mobile, mobile tabs 3 valores, auto-navegação, VersionDiff modal, reloadKey após restauração, reidratação via __exportableBlocks
- **R12.69.G** (5) — Sanidade: 4 arquivos existem, todos são Client Components, zero secrets, ZERO deps de diff instaladas, namespace @/components/notebook/

**Testes:** **588/588 passing** (531 anteriores + 57 novos R12.69, zero regressões, 44.84s).

**Arquivos criados (5):**
- `src/components/notebook/ProjectSidebar.tsx` (13 KB — sidebar + modal de criar projeto)
- `src/components/notebook/EntryList.tsx` (17 KB — busca global + 4 filtros + cards ricos)
- `src/components/notebook/VersionTimeline.tsx` (10 KB — timeline horizontal + restore + seleção múltipla)
- `src/components/notebook/VersionDiff.tsx` (13 KB — modal side-by-side sem libs externas)
- `tests/r12_69_notebook_ui_hierarchical.test.ts` (16 KB — 57 testes)

**Arquivos modificados (2):**
- `src/app/api/notebook/route.ts` (+ 3 query params + tags no OR + _count/projectId/currentVersion no select)
- `src/app/dashboard/notebook/page.tsx` (+ imports + view=explorer + layout 3 colunas + mobile tabs; **create/generate 100% preservados**)

**🎉 PACOTE EXPORT/SALVAR/RASTREABILIDADE 100% CONCLUÍDO (R12.66 → R12.69):**
- ✅ **R12.66** Backend versionamento + projetos + imagens (Prisma + 5 APIs)
- ✅ **R12.67** ExportBar universal com 7 botões + jsPDF + docx
- ✅ **R12.68** Espalhado em Pipeline + Formulator Pro + Bioink + Chat IA
- ✅ **R12.69** UI hierárquica Projetos → Entradas → Versões + diff visual

**Próximo:** **R13.01 · BIA Academy** — Schema Prisma + migration + seed do primeiro módulo teste. Todas as decisões travadas em `docs/roadmap/R13_bia_academy_decisions.md`.

---

### R12.68 — Integração: `<ExportBar>` espalhada em Pipeline + Formulator Pro + Bioink + Chat IA + Próximos Passos + script de migração Protocol → Notebook (Fase 3 de 4) (2026-08-05)

Mandato Janaina (Fase 3 do pacote export/salvar/rastreabilidade):
> **"Botões padrão em TODAS as ferramentas: Pipeline, Formulator Pro, Bioink, Chat IA, Próximos Passos."**

5 decisões da Janaina aplicadas verbatim:
1. ✅ "Próximos Passos" é uma **seção do card de análise da Pipeline** (não uma rota) → 1 ExportBar da Pipeline cobre as duas features
2. ✅ Formulator Pro: **botão antigo "Salvar Protocolo" removido**; Notebook R12.66 é fonte única de verdade
3. ✅ Script de migração Protocol → NotebookEntry criado agora (não-destrutivo, idempotente)
4. ✅ Bioink: dropdown de escopo no clique (`active` / `both` / `single-0` / `single-1`) — opção C
5. ✅ Chat IA: filtro por autor (`all` / `assistant` / `user`) — opção C

**A) 4 adapters puros em `src/lib/export/adapters/` (~800 linhas líquidas)**

Cada adapter é uma **função pura** que converte o estado da ferramenta em `ExportableContent`. Sem `fetch()`, sem side-effects — 100% testável isoladamente.

| Adapter | Arquivo | Tamanho | Output |
|---|---|---|---|
| `buildContentFromPipeline` | `pipeline-adapter.ts` | 5.3 KB | project + analysis (recommendation + parameters + warnings + Próximos Passos numerada) |
| `buildContentFromProFormulation` | `formulator-pro-adapter.ts` | 12 KB | **16 campos ricos**: score (5 dims), componentes (tabela), crosslinking, protocolo (headings + parágrafos), warnings (callouts), printing params, characterization, regulatório, referências, alternativas |
| `buildContentFromBioinkDrafts` | `bioink-adapter.ts` | 7.9 KB | Escopo `active`/`both`/`single` + reologia (bloco individual) + setup de bioimpressão |
| `buildContentFromChatSession` | `chat-adapter.ts` | 7.1 KB | Filtro `all`/`assistant`/`user` + detecção heurística de code fences markdown → CodeBlock |

Smoke test em Node: Pipeline PDF 7.8 KB, Formulator PDF 12 KB (rico!), Bioink PDF 8 KB, Chat PDF 6.4 KB. **Todos os 4 adapters produzem PDF real navegável.**

**B) Integração na `/dashboard/pipeline/page.tsx`**

- `<ExportBar>` renderizado **dentro** do card `analysis`, **logo depois da seção "Próximos Passos"** (linha exata da regra da Janaina)
- Estado `notebookEntry` rastreia vínculo com entrada do Notebook (reset ao trocar projeto ou etapa)
- `buildPipelineContent()` via `useCallback` lê estado atualizado no clique de cada botão
- **1 ExportBar cobre Pipeline + Próximos Passos** (economia de 1 sprint)

**C) Integração na `/dashboard/formulator-pro/page.tsx` — REMOÇÃO do save antigo**

**Removido do código (R12.28 → deprecado no R12.68):**
- `useState<"idle" | "saving" | "saved" | "error">("idle")` (3 states de save)
- `useCallback handleSaveProtocol` (18 linhas)
- Botão visual "Salvar protocolo" (18 linhas com ícone FolderHeart)
- Link "Salvo — abrir" (10 linhas)
- Bloco de erro `saveState === "error"` (15 linhas)
- Import `FolderHeart` (não usado)

**Adicionado:**
- Import `ExportBar` + `buildContentFromProFormulation`
- Estado `notebookEntry` (reset a cada nova geração de resultado)
- `buildFormulatorContent()` via `useCallback`
- `<ExportBar>` no rodapé do bloco de resultado — mantendo os botões utilitários (Baixar JSON, Copiar Markdown) ao lado

**Retrocompatibilidade preservada:**
- API `/api/protocols/save-formulation` **continua funcionando** (não foi deletada)
- Rota `/dashboard/protocols` **continua acessível**
- Formulações antigas continuam onde estavam → **Nada perdido**
- Novas formulações (a partir do R12.68) vão diretamente para o Notebook com versionamento

**D) Integração na `/dashboard/bioprint/bioink/page.tsx` — dropdown de escopo**

Barra fixa **acima do `<main>`** dentro da tab "formulate":

```
┌────────────────────────────────────────────────────────────────────┐
│ Escopo: [Biotinta ativa (T0) ▾]   💾 Salvar  ✏ Editar  🆕 v+1  ... │
└────────────────────────────────────────────────────────────────────┘
```

O `<select>` só aparece quando há 2 biotintas (`drafts.length === 2`). Opções:
- **"Biotinta ativa (T0/T1)"** — só a que a usuária está editando (default)
- **"Ambas as biotintas (T0 + T1)"** — documento com as duas + callout info explicando que reologia é individual
- **"Apenas T0"** / **"Apenas T1"** — export forçado de uma biotinta específica

Reologia (Hagen-Poiseuille) só é incluída no PDF quando escopo `= 1 biotinta`; para escopo `both`, é substituída por callout informando o comportamento.

**E) Integração na `/dashboard/chat/page.tsx` — filtro por autor**

Barra logo abaixo do header do chat, **só aparece com sessão + mensagens**:

```
Filtro: [Integral (você + BIA) ▾]  💾 Salvar  ✏ Editar  🆕 v+1  📄 PDF  📝 DOCX
```

Opções:
- **`all` — Integral (você + BIA)** — transcrição verbatim (default)
- **`assistant` — Só respostas da BIA** — vira "resumo científico" para arquivar
- **`user` — Só suas perguntas** — útil para revisão de dúvidas

Mensagens `role: "system"` são **sempre filtradas** (independente do escopo). Blocos de código markdown (```lang) são detectados heuristicamente e viram `CodeBlock` no ExportableContent — a formatação sobrevive ao PDF/DOCX.

**F) Script de migração `scripts/migrate-protocols-to-notebook.ts` (não-destrutivo)**

```bash
# Preview:
npx tsx scripts/migrate-protocols-to-notebook.ts --dry-run

# Executar:
npx tsx scripts/migrate-protocols-to-notebook.ts

# Migrar 1 usuário:
npx tsx scripts/migrate-protocols-to-notebook.ts --user-id=<cuid>

# Migrar 1 protocolo:
npx tsx scripts/migrate-protocols-to-notebook.ts --protocol-id=<cuid>
```

- **NUNCA apaga** `Protocol` (retrocompatibilidade total)
- **Idempotente:** procura `NotebookEntry.metadata.__migratedFromProtocolId` antes de criar → pula se já migrado
- Cria `NotebookEntry` + versão V1 (via helper `createInitialVersion` do R12.66) em transação
- Preserva metadados: `__migratedFromProtocolId`, `__migratedAt`, `protocolMeta` (duration/difficulty/aiGenerated/validated), `sourceInputs`
- Converte `steps`/`materials`/`equipment`/`safetyNotes` em markdown estruturado
- `category === "synthesis"` → `entryType = FORMULATION`; demais → `entryType = PROTOCOL`
- Saída JSON no stdout: `{ total, migrated, skipped, failed[], dryRun }`
- Exit code 0 se tudo OK, 1 se algum falhou, 2 se erro fatal

**Estratégia sugerida para rodar em produção (opcional, quando a Janaina decidir):**
1. `--dry-run` para ver quantos protocolos existem
2. Executar sem flag em horário de baixo tráfego
3. Verificar em `/dashboard/notebook` se as entradas migradas apareceram com tag `migrado`
4. Se OK, comunicar aos usuários que suas formulações antigas agora estão no Notebook
5. `Protocol` continua intacto — script de cleanup fica para uma sprint futura R12.68.5 (se necessário)

**G) Testes `tests/r12_68_exportbar_integration.test.ts` — 60 testes verdes**

- **R12.68.A** (5) — Todos os 4 adapters existem e são funções exportadas
- **R12.68.B** (7) — Adapter Pipeline: título com etapa, entryType=PIPELINE_SUMMARY, warnings→callouts, Próximos Passos→lista numerada, metadata preservada, PDF real
- **R12.68.C** (7) — Adapter Formulator Pro: 16 campos ricos (scores formato N/100, componentes tabela, protocolo com heading crítico, warnings callout, regulatório+referências+alternativas), PDF >4KB
- **R12.68.D** (5) — Adapter Bioink: 3 escopos (active/both/single), material resolvido pelo catálogo, reologia condicional
- **R12.68.E** (7) — Adapter Chat: 3 filtros, system sempre filtrado, code fences preservados, callout informativo para filtro vazio
- **R12.68.F** (5) — Pipeline page: ExportBar renderizado após "Próximos Passos", estado notebookEntry, imports corretos
- **R12.68.G** (5) — Formulator Pro: **REMOVEU handleSaveProtocol + setSaveState + fetch save-formulation + botão "Salvar protocolo" + FolderHeart**; instalou ExportBar
- **R12.68.H** (4) — Bioink: dropdown com 4 opções (active/both/single-0/single-1), só aparece com drafts.length===2, na tab formulate
- **R12.68.I** (4) — Chat: filtro com 3 opções, só aparece com mensagens, reset de vínculo
- **R12.68.J** (9) — Script de migração: --dry-run, --user-id, --protocol-id, **jamais chama .delete() no Protocol**, idempotente via `__migratedFromProtocolId`, usa `createInitialVersion` do R12.66, saída JSON
- **R12.68.K** (2) — Sanidade: zero secrets, adapters são funções puras (sem fetch)

**Testes:** **531/531 passing** (471 anteriores + 60 novos R12.68, zero regressões, 42.96s).

**Arquivos criados (6):**
- `src/lib/export/adapters/pipeline-adapter.ts` (5.3 KB)
- `src/lib/export/adapters/formulator-pro-adapter.ts` (12 KB — o mais rico)
- `src/lib/export/adapters/bioink-adapter.ts` (7.9 KB)
- `src/lib/export/adapters/chat-adapter.ts` (7.1 KB)
- `scripts/migrate-protocols-to-notebook.ts` (8.4 KB — não-destrutivo)
- `tests/r12_68_exportbar_integration.test.ts` (25.7 KB — 60 testes)

**Arquivos modificados (4):**
- `src/app/dashboard/pipeline/page.tsx` (+ ExportBar após Próximos Passos)
- `src/app/dashboard/formulator-pro/page.tsx` (- 60 linhas do save antigo, + ExportBar universal)
- `src/app/dashboard/bioprint/bioink/page.tsx` (+ dropdown de escopo + ExportBar na tab formulate)
- `src/app/dashboard/chat/page.tsx` (+ dropdown de filtro + ExportBar após header)

**Próximo (R12.69):** UI hierárquica do Notebook (Projetos → Entradas → Versões) + busca global + diff visual entre versões. Depois disso, **R13.01 · BIA Academy** começa (schema + migration + seed do primeiro módulo teste).

---

### R12.67 — Frontend: `<ExportBar>` universal (7 botões) + jsPDF + docx + preservação R13 BIA Academy (Fase 2 de 4) (2026-08-04)

Mandato Janaina (Fase 2 do pacote export/salvar/rastreabilidade):
> **"Botões padrão em TODA a plataforma: Salvar no Notebook / Editar / Gerar nova versão / Exportar PDF / Exportar DOCX / Adicionar imagem / Consultar histórico. Antes de substituir conteúdo existente, perguntar ao usuário: atualizar versão atual OU criar nova versão. Padrão = criar nova."**

Este sprint entrega o **componente universal** que a partir de R12.68 vai ser espalhado em Pipeline, Formulator Pro, Bioink, Chat IA e Próximos Passos.

**A) Contrato universal `ExportableContent` (`src/lib/export/types.ts`)**

Interface neutra que **qualquer ferramenta da BIA** produz para ser exportada/salva/versionada — o `<ExportBar>` cuida do resto. Suporta 9 tipos de bloco:
- `heading` (níveis 1/2/3) · `paragraph` · `list` (bullet/numbered)
- `keyvalue` (pares chave-valor científicos) · `table` (com título)
- `code` (com syntax hint) · `image` (dataURL ou http)
- `divider` · `callout` (info/warning/success/note)

Campos-chave: `title`, `subtitle`, `source`, `entryType`, `tags`, `category`, `blocks`, `metadata`, `existing` (para editar), `projectId`, `autoChangeSummary`. Helpers: `slugifyFileName()`, `timestampForFileName()`.

**B) PDF Exporter (`src/lib/export/pdf-exporter.ts`) — 17 KB de renderer**

Renderer completo em jsPDF 4.2.1 com identidade visual BIA:
- A4 · margens 20mm · fonte Helvetica · rodapé com marca "BIA · Biofabrication Intelligent Assistant · Quantis Biotechnology"
- Barra fina roxa no topo (cor da marca `#7C3AED`) + fonte-marca "BIA" à esquerda + source (nome da ferramenta) à direita
- Callouts com variantes visuais (info/warning/success) — cada uma com bg + barra lateral colorida
- Tabelas com cabeçalho sombreado + linhas de divisão · listas com bullets/números em roxo · blocos de código com fundo cinza claro em Courier
- Imagens dataURL embutidas com detecção automática de PNG/WEBP/JPG + caption em itálico
- **Quebra de página automática** (`ensureSpace(needed)` antes de escrever cada bloco)
- Paginação `1 / N` no rodapé de todas as páginas

**Smoke test em Node:** documento científico com todos os 9 tipos de bloco → **PDF de 6.9 KB gerado com sucesso**.

**C) DOCX Exporter (`src/lib/export/docx-exporter.ts`) — 17 KB de renderer**

Renderer paralelo em `docx@9.7.1`:
- Compatível com **Word / LibreOffice / Google Docs** · fonte Calibri
- Header com "BIA" + source · footer centralizado com marca completa
- Callouts em Tables com barra lateral colorida (border-left 12pt)
- KeyValue como Table sem bordas · Tables científicas com header shaded + bordas rule
- Code blocks em Consolas com fundo · imagens base64 decodificadas via `atob`/`Buffer` (funciona em browser E em Node/testes)
- Pageorientation portrait · margens 1200 twips

**Smoke test em Node:** mesmo documento científico → **DOCX de 11.4 KB gerado com sucesso**, começa com magic bytes `PK` (ZIP válido).

**D) Componente `<ExportBar>` (`src/components/notebook/ExportBar.tsx`) — 38 KB**

Client Component com os **7 botões oficiais na ordem aprovada pela Janaina**:

| # | Botão | Ícone | Variant | Aparece quando |
|---|---|---|---|---|
| 1 | 💾 **Salvar no Notebook** | `Save` | primary | conteúdo é NOVO (sem `existing`) |
| 2 | ✏️ **Editar** | `Pencil` | secondary | conteúdo já existe |
| 3 | 🆕 **Gerar nova versão** | `GitBranch` | primary | conteúdo já existe |
| 4 | 📄 **Exportar PDF** | `FileDown` | ghost | sempre |
| 5 | 📝 **Exportar DOCX** | `FileText` | ghost | sempre |
| 6 | 🖼️ **Adicionar imagem** | `ImagePlus` | ghost | conteúdo já existe |
| 7 | 🕐 **Consultar histórico** | `History` | ghost | conteúdo já existe |

Botões primários usam **gradient violet→fuchsia** (`from-violet-600 to-fuchsia-600`) — mesma paleta que será usada em BIA Academy (R13).

Contrato de uso:
```tsx
<ExportBar
  buildContent={() => buildMyExportable(state)}
  onSaved={(res) => setState(s => ({ ...s, entryId: res.entryId, currentVersion: res.versionNumber }))}
  hide={["addImage"]}   // opcional — ocultar botões específicos
  askMetadataOnSave     // opcional — abre modal antes do POST
/>
```

Ferramenta = **1 função** `buildContent()` que devolve `ExportableContent`. Toda a orquestração (fetch, versão, histórico, imagens) fica no ExportBar.

**E) 4 diálogos internos (todos inline no mesmo arquivo — evita split-loading e simplifica testes)**

1. **`SaveDialog`** — form de metadados (título / descrição / tags / projectId). Chama `POST /api/notebook` (R12.66) → cria entry + V1 automática
2. **`EditDialog`** — pergunta verbatim da Janaina: *"Como aplicar as alterações?"* com 2 RadioCards:
   - **Criar nova versão (recomendado)** — mode="newVersion" · **estado inicial = este** (padrão Janaina)
   - **Atualizar versão atual** — mode="inPlace" · warning visual porque sobrescreve
   - Campo `changeSummary` só aparece quando mode=newVersion
   - Chama `PATCH /api/notebook?id=xxx` ou `PATCH /api/notebook?id=xxx&updateInPlace=true`
3. **`AddImageDialog`** — file picker + preview + campos científicos completos: title, caption, experimentId, sampleNumber, tags, observations, checkbox "associar à versão atual". Valida `image/*` + limite 5 MB. Envia dataURL para `POST /api/notebook/[id]/images`
4. **`HistoryDialog`** — carrega versões via `GET /api/notebook/[id]/versions` (**dentro de `useEffect` com flag `cancelled`** — anti-pattern `useState(fn)` corrigido antes do commit). Lista todas as versões com badge de "atual", data/hora, autor e changeSummary. Botão "Restaurar" em cada versão antiga → `window.confirm()` de segurança → `POST /api/notebook/[id]/versions/restore` (que **nunca apaga** — cria N+1 com snapshot antigo). Modal wide (`max-w-2xl`)

**F) Integração 100% com APIs R12.66 (backend versionamento)**

- ✅ `POST /api/notebook` para criar (com `projectId`, `createInitialVersion` automática)
- ✅ `PATCH /api/notebook?id=xxx` (padrão = nova versão via `updateEntryWithVersion`)
- ✅ `PATCH /api/notebook?id=xxx&updateInPlace=true` (exceção — sobrescreve versão atual)
- ✅ `GET /api/notebook/[id]/versions` para listar histórico
- ✅ `POST /api/notebook/[id]/versions/restore` para restaurar (cria N+1)
- ✅ `POST /api/notebook/[id]/images` para adicionar imagens (base64)
- ✅ `changeSummary` viaja do EditDialog até a API preservando rastreabilidade
- ✅ Blocos do `ExportableContent` são preservados em `NotebookEntry.metadata.__exportableBlocks` para permitir reidratação futura (R12.68 vai usar isso)

**G) Preservação R13 · BIA Academy (`docs/roadmap/R13_bia_academy_decisions.md` · 18 KB)**

Documento oficial travando **todas as decisões acordadas com a Janaina** para o produto BIA Academy — a plataforma educacional que vai integrar aprender + aplicar num único ambiente `biaquantis.bio/academy`. **Este documento é fonte de verdade** — se conflitar com README, prevalece ele. Registra:

- **10 decisões travadas** (1x URL `/academy` path · 2x oferta padronizada · 3x compras via Asaas + WhatsApp · 4x roles STUDENT/INSTRUCTOR · 5x YouTube não listado + nocookie · 6x certificado simples · 7x Meu Projeto via Notebook R12.66 · 8x tracking IFrame API · 9x acesso rolling · 10x prioridade R12.67-69 antes)
- **Oferta oficial padronizada verbatim** (12 módulos + 12 meses + 3 encontros ao vivo + práticas presenciais só corporativo)
- Links comerciais: Asaas `asaas.com/c/iu7ym1dp93cei9zk` + WhatsApp `wa.me/11968632231`
- **10 modelos Prisma propostos** para R13.01 (AcademyEnrollment, AcademyModule, AcademyLesson, AcademyAttachment, AcademyQuiz, AcademyQuizQuestion, AcademyProgress, AcademyProject, AcademyLiveEvent, AcademyUpdate, AcademyCertificate)
- **Sitemap oficial** com 14 rotas
- **12 módulos do curso** enumerados (Intro → Biomateriais → Biotintas → Bioimpressão → Arquitetura → Células → Tecidos → Organoides → Avaliação → Translação → Projeto → Final)
- **Roadmap R13.01 → R13.10** com dependências (R13.01 depende de R12.69, R13.07 depende de R12.69, R13.09 depende de R12.67…)
- **Fluxo completo de compra + primeiro acesso** (via Asaas → cadastro manual no admin → email com senha temporária)
- **Fora do escopo do MVP** (fórum, gamificação pesada, mobile nativo, checkout embutido, IA de correção, marketplace, i18n, webhook Asaas)
- **Guia de retomada** para quem abrir o arquivo meses depois

**H) Testes de regressão (`tests/r12_67_export_bar_component.test.ts`) — 43 testes verdes**

- **R12.67.A** (3) — Helpers (slugify, timestamp) + interface `ExportableContent` aceita todos os 9 tipos de bloco
- **R12.67.B** (4) — PDF Exporter gera Blob real para conteúdo mínimo, rico (9 tipos), longo (30 parágrafos com quebra de página) e tabela larga (5 colunas)
- **R12.67.C** (3) — DOCX Exporter gera ArrayBuffer real com magic bytes `PK` (ZIP válido) para conteúdo mínimo, rico e com imagem base64 embutida
- **R12.67.D** (10) — Source-code do ExportBar tem `"use client"`, exporta ExportBar + ExportBarProps, importa jspdf + docx exporters, contém os **7 botões oficiais na ordem correta com testIds únicos**, usa gradient violet→fuchsia, permite ocultar cada um dos 7 botões via prop `hide`
- **R12.67.E** (7) — Integração com APIs R12.66: POST /api/notebook, PATCH com/sem updateInPlace, POST /images, GET /versions, POST /versions/restore, envia changeSummary, preserva blocks em `__exportableBlocks`
- **R12.67.F** (5) — Diálogos: SaveDialog tem 5 testIds (title/description/tags/projectid/confirm); EditDialog usa estado inicial `"newVersion"` (padrão Janaina verbatim); AddImageDialog tem todos os 6 campos científicos; HistoryDialog usa **useEffect** (não useState anti-pattern) e **`window.confirm()`** antes de restaurar
- **R12.67.G** (4) — Documento R13 BIA Academy preservado com **10 decisões verbatim**, roadmap R13.01-10 completo, 12 módulos oficiais e 10 modelos Prisma listados
- **R12.67.H** (3) — Todos os 5 arquivos existem, `package.json` declara jspdf+docx+file-saver+@types/file-saver, nenhum arquivo vaza secret/DATABASE_URL

**Testes:** **471/471 passing** (428 anteriores + 43 novos R12.67, zero regressões, 42.27s).

**Arquivos criados (5):**
- `docs/roadmap/R13_bia_academy_decisions.md` (18 KB — decisões Academy)
- `src/lib/export/types.ts` (5 KB — interface universal)
- `src/lib/export/pdf-exporter.ts` (17 KB — renderer PDF)
- `src/lib/export/docx-exporter.ts` (17 KB — renderer DOCX)
- `src/components/notebook/ExportBar.tsx` (38 KB — componente + 4 diálogos)
- `tests/r12_67_export_bar_component.test.ts` (18 KB — 43 testes)

**Dependências instaladas (3+1):**
- `jspdf@4.2.1` · `docx@9.7.1` · `file-saver@2.0.5` · `@types/file-saver@2.0.7` (dev)

**Próximo (R12.68):** Espalhar `<ExportBar>` em 5 ferramentas — Pipeline, Formulator Pro, Bioink, Chat IA, Próximos Passos. Cada ferramenta implementa apenas 1 função `buildContent()` que converte seu estado atual em `ExportableContent`. Todo o resto (7 botões, 4 diálogos, integração APIs R12.66) já está pronto.

---

### R12.66 — Backend: versionamento + projetos + biblioteca de imagens do Notebook (Fase 1 de 4) (2026-08-03)

Mandato Janaina (pacote completo):
> **"Implementar recursos de exportação, salvamento e rastreabilidade de protocolos em todas as ferramentas da plataforma. Cada alteração realizada em um conteúdo salvo deve gerar automaticamente uma nova versão numerada, sem apagar as versões anteriores. Exemplo: Versão 1; Versão 2; Versão 3. Cada versão deve registrar: Número da versão; Data e horário da alteração; Usuário responsável; Descrição resumida da alteração; Conteúdo anterior; Conteúdo atualizado. Antes de substituir ou alterar um conteúdo existente, perguntar ao usuário se deseja: 1. Atualizar a versão atual; ou 2. Criar uma nova versão. Como padrão, priorizar a criação de uma nova versão para preservar a rastreabilidade."**

Faseamento acordado com 5 "sim" da Janaina:
- **R12.66 (esta sprint):** Backend — modelos Prisma + APIs
- R12.67: Frontend — componente universal `<ExportBar>` + libs jspdf/docx
- R12.68: Integração — espalhar ExportBar em Pipeline, Formulador Pro, Bioink, Chat IA, Próximos Passos
- R12.69: UI do Notebook — hierárquica (Projetos → Entradas → Versões) + busca global + diff

**A) Schema Prisma (`prisma/schema.prisma`) — 3 modelos novos + 2 campos em `NotebookEntry`**

| Modelo | Papel | Campos-chave |
|---|---|---|
| `NotebookVersion` | Rastreabilidade completa (Janaina verbatim) | `versionNumber`, `changeSummary`, `snapshot Json` (conteúdo atualizado), `previousSnapshot Json?` (conteúdo anterior), `userId`, `createdAt`, `@@unique([entryId, versionNumber])` |
| `NotebookImage` | Biblioteca de imagens científicas | `title`, `caption`, `experimentId`, `sampleNumber`, `tags[]`, `observations`, `versionNumber?` (associação a versão), `dataBase64` (base64-in-Postgres · R12.70 migra para Vercel Blob), `storageUrl?`, `mimeType`, `sizeBytes`, `width`, `height` |
| `Project` | Guarda-chuva de organização (dedicado ao Notebook, separado de `PipelineProject`) | `name`, `description`, `researchArea`, `color`, `isArchived`, relação `entries NotebookEntry[]` |

**Novos campos em `NotebookEntry`:** `currentVersion Int @default(1)` + `projectId String?` (FK opcional para `Project`).

**B) Migration `20260731000001_r12_66_notebook_versioning_projects_images` — aplicada no Neon Postgres**

- 111 linhas SQL — ALTER `notebook_entries` (2 colunas novas) + CREATE 3 tabelas + 10 índices + 6 FK constraints
- Vercel corre `prisma migrate deploy` no build → migration ficará marcada como "already applied" no próximo deploy
- Antes: 2 migrations legadas (`add_organoid_lab_plan` e `add_password_reset_tokens`) estavam em estado `failed` no Neon com objetos já criados manualmente → resolvidas com `prisma migrate resolve --applied <name>` sem re-rodar SQL

**C) Helper `src/lib/notebook/versioning.ts` — camada transacional única de versionamento**

- `snapshotFromEntry(entry)` — extrai snapshot serializável (`{ title, content, entryType, category, tags, generatedDoc, metadata, projectId }`)
- `createInitialVersion(prisma, entry)` — grava V1 automaticamente na criação (`changeSummary: "Criação inicial"`)
- `createNewVersion(prisma, params)` — insere versão N+1 pura (helper de baixo nível)
- `updateEntryWithVersion(prisma, { entryId, userId, patch, updateInPlace?, changeSummary? })` — **fluxo padrão da Janaina**: dentro de uma `$transaction`, lê entrada atual → grava `previousSnapshot` → aplica patch → incrementa `currentVersion` → cria nova versão. Se `updateInPlace: true`, só atualiza a entrada (exceção — não cria versão).
- `restoreVersion(prisma, { entryId, userId, targetVersionNumber })` — **NUNCA APAGA**: recria uma versão N+1 com o snapshot da versão-alvo, marca `changeSummary: "Restaurada versão N"` e preserva todo o histórico intermediário
- `snapshotsAreEqual(a, b)` — utilidade para o PATCH não abrir versão fantasma quando o patch é no-op

**D) APIs criadas — todas com validação Zod + `session.user.id` (NextAuth v5) + ownership check**

| Rota | Verbos | Função |
|---|---|---|
| `/api/notebook/[id]/versions` | GET, POST | Lista histórico (ordem DESC, sem snapshot para leveza) · POST manual (uso raro — o PATCH principal já cria) |
| `/api/notebook/[id]/versions/[version]` | GET | Snapshot completo da versão N · `?compareTo=M` → diff campo-a-campo com `changedFields[]` |
| `/api/notebook/[id]/versions/restore` | POST | Body `{ targetVersion }` → chama helper `restoreVersion` (sempre cria N+1) |
| `/api/notebook/[id]/images` | GET, POST, DELETE | GET com `?includeData=true` opcional (base64 pesado, default = só metadata) · POST valida `mimeType image/*`, aceita dataURL ou base64+mime, limite de 5 MB originais (≈ 6.7 MB base64), armazena como dataURL em `dataBase64` · DELETE via `?imageId=` |
| `/api/projects` | GET, POST, PATCH, DELETE | GET com `?includeArchived=true` + `?q=` para busca em name/description/researchArea · PATCH via `?id=` (rename/arquivar/cor) · DELETE via `?id=` (desassocia entradas em vez de perder — `projectId` vira null) |

**E) `/api/notebook/route.ts` — POST/PATCH estendidos (R12.66)**

- **POST** agora aceita `projectId` no schema, valida ownership do projeto se enviado, cria a entrada + versão V1 (via `createInitialVersion`) dentro de uma única `$transaction`. Resposta inclui `currentVersion: 1` e `versionNumber: 1`.
- **PATCH** por padrão **CRIA NOVA VERSÃO** (via `updateEntryWithVersion`) — rastreabilidade preservada verbatim como a Janaina pediu. Para sobrescrever a versão atual, é preciso passar explicitamente `?updateInPlace=true` na URL (exceção). Suporta `changeSummary` no body para descrever a alteração. Trata `isPinned` à parte (não gera versão só para pin/unpin). Resposta inclui `newVersionNumber` para o front usar em toast/confirmation.

**F) Defaults aceitos pela Janaina (5x "sim"):**

1. Vercel corre `prisma migrate deploy` no build ✅
2. `userId` do NextAuth (`session.user.id`) preenche `NotebookVersion.userId` ✅
3. Imagens em **base64 no Postgres** por enquanto — R12.70 migra para Vercel Blob ✅
4. Novo modelo `Project` **dedicado ao Notebook** (separado de `PipelineProject`) ✅
5. **Padrão = criar nova versão** ao editar; "atualizar versão atual" é exceção via `?updateInPlace=true` ✅

**G) Testes de regressão (`tests/r12_66_notebook_versioning_backend.test.ts`) — 35 testes verdes**

Análise estática dos arquivos-fonte (não roda Prisma real; suficiente para validar surface pública, imports, e alinhamento com o mandato verbatim da Janaina):
- **R12.66.A** — schema Prisma tem Project + NotebookVersion + NotebookImage com todos os campos exigidos verbatim (número, data, usuário, descrição, conteúdo anterior, conteúdo atualizado); NotebookEntry tem `currentVersion` e `projectId`
- **R12.66.B** — migration SQL R12.66 existe e cria as 3 tabelas + alter em `notebook_entries`
- **R12.66.C** — helper `versioning.ts` expõe todas as funções (`snapshotFromEntry`, `createInitialVersion`, `createNewVersion`, `updateEntryWithVersion`, `restoreVersion`, `snapshotsAreEqual`); `createInitialVersion` sempre grava V1 com `changeSummary: "Criação inicial"`; `restoreVersion` **jamais chama `.delete()`** e sempre incrementa `currentVersion + 1`
- **R12.66.D** — todas as 5 APIs existem, exportam os verbos corretos, validam ownership via `session.user.id`; `images/route.ts` valida `mimeType image/*` e tem limite de tamanho
- **R12.66.E** — POST `/api/notebook` importa `createInitialVersion`, aceita `projectId`, executa dentro de `$transaction`, valida ownership do projeto
- **R12.66.F** — PATCH `/api/notebook` lê `?updateInPlace=true`, chama `updateEntryWithVersion`, padrão é criar nova versão (updateInPlace só ativa com match exato "true"), retorna `newVersionNumber`, passa `changeSummary` para o helper
- **R12.66.G** — todos os 9 arquivos R12.66 existem em disco, nenhum vaza secrets

**Testes:** **428/428 passing** (393 anteriores + 35 novos R12.66, zero regressões, 45.26s).

**Arquivos criados (6):**
- `prisma/migrations/20260731000001_r12_66_notebook_versioning_projects_images/migration.sql` (111 linhas SQL)
- `src/lib/notebook/versioning.ts` (helper transacional único)
- `src/app/api/notebook/[id]/versions/route.ts` (GET+POST)
- `src/app/api/notebook/[id]/versions/[version]/route.ts` (GET + diff)
- `src/app/api/notebook/[id]/versions/restore/route.ts` (POST restore)
- `src/app/api/notebook/[id]/images/route.ts` (GET+POST+DELETE)
- `src/app/api/projects/route.ts` (GET+POST+PATCH+DELETE)
- `tests/r12_66_notebook_versioning_backend.test.ts` (35 testes)

**Arquivos modificados (2):**
- `prisma/schema.prisma` (User relations + NotebookEntry campos + 3 modelos novos)
- `src/app/api/notebook/route.ts` (POST cria V1, PATCH usa updateEntryWithVersion com padrão = nova versão)

**Próximo (R12.67):** Frontend — componente `<ExportBar>` com botões `Salvar no Notebook` / `Editar` / `Gerar nova versão` / `Exportar PDF` / `Exportar DOCX` / `Adicionar imagem` / `Consultar histórico` + libs `jspdf` + `docx`.

---

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

**Last Updated:** 2026-08-07 — R13.03.2 (BIA Academy · Visibilidade máxima nos canais de descoberta + esconder formato antigo R$ 4.970 · feedback comercial da Janaina "cadê a Academy na home?" · novo item "Academy" no nav top da home (destaque fuchsia linkando para #academy) · novo BANNER destacado abaixo do hero (`section id="academy"` testId home-academy-banner) com preço R$ 2.375,00 + parcelamento 12x R$ 197,92 + CTAs para /academy landing e Asaas direto + mockup visual grid 12 módulos + badge "Módulo 1 aberto" com pulse verde · Card ACADEMY R$ 4.970 · 6 meses · presencial REMOVIDO da home (grid 3→2 colunas) + de /auth/register (grid planos) + de /dashboard/billing (array PLANS) — link antigo Asaas 9nvzkrlezi7ht2u5 preservado só em comentários · Novo BANNER 2-ESTADOS em /dashboard/billing: aluno com plan=ACADEMY vê "Você é aluno da Academy 🎓" com link para /academy/dashboard, outros veem "Conheça a Academy R$ 2.375,00" com link para /academy landing · SEO structured data highPrice 4970 → 2375, offerCount 6 → 5 · BACKEND INTOCADO: enum plan=ACADEMY continua ATIVO (alunos existentes mantêm acesso, novos alunos do curso online recebem plan=ACADEMY automaticamente) · **822/822 testes verdes** (796 anteriores + 26 novos R13.03.2 em 8 blocos A-H, zero regressões) · próximo = R13.04 Player YouTube IFrame API 🎓📢💜) — anteriormente = R13.03.1 (BIA Academy · Preço publicado · R$ 2.375,00 à vista OU 12x de R$ 197,92 sem juros no cartão · card destacado no bloco Investimento da landing /academy com testId academy-price-block · nova constante LOCKED `PRICE_BRL = 2375` formatada via toLocaleString pt-BR + currency BRL · nova pergunta 7 no FAQ sobre formas de pagamento · link Asaas MANTIDO (https://www.asaas.com/c/iu7ym1dp93cei9zk) — só o valor foi confirmado · 5 testes novos no bloco R13.02.M validam preço/formato/parcelas/FAQ · **796/796 testes verdes** (791 anteriores + 5 novos R13.02.M, zero regressões) · próximo = R13.04 Player YouTube IFrame API 🎓💰📺💜) — anteriormente = R13.03 (BIA Academy · Dashboard do aluno + Minha Jornada + Página de aula · 7 decisões locked com a Janaina · sidebar próprio Opção B (AcademySidebar 14.4 KB com 7 itens de nav + botão Voltar-BIA + paleta violet→fuchsia) · helper puro journey.ts (9.4 KB — computeStudentJourney + findLessonInJourney + findNextLesson + findPreviousLesson, ZERO I/O) · 3 APIs (GET /journey agregado, GET /lessons/[slug] com upsert idempotente, PATCH /progress derivando completedAt + detectando conclusão do programa) · route group /academy/(app) segrega rotas logadas com layout protegido (redirect anon → /auth/login, redirect NO_ENROLLMENT/EXPIRED → /academy/welcome Opção B) · 4 páginas server: dashboard 5 cards (continue/progresso/next/live/updates), journey timeline 12 módulos com selos "Concluído ✓" + "Em breve", modules/[slug] lista de aulas, modules/[m]/[l] com iframe YouTube + botão manual "Marcar concluída" + biaHook em nova aba + tracking (lesson_opened, lesson_completed, bia_hook_opened) · aulas não publicadas aparecem com cadeado (não somem) mas 404 se acessadas direto · onboarding pós-completed agora redireciona para /academy/dashboard (não mais /dashboard/notebook) · continueFrom = último IN_PROGRESS por updatedAt DESC com fallback para próxima aula não concluída · módulo ganha selo "Concluído" quando 100% das aulas publicadas · R13.04 vai substituir iframe simples por YouTube IFrame API com tracking automático de watchedSeconds · **791/791 testes verdes** (710 anteriores + 81 novos R13.03 em 12 blocos A–L, zero regressões, 45.15s) · próximo = R13.04 Player YouTube IFrame API 🎓📺🧭🎯💜)
