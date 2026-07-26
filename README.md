# BIA v4 — Biomaterial Intelligent Assistant

> Plataforma de IA científica para formulação de biomateriais, geração de geometrias 3D
> e otimização de bioimpressão. Desenvolvida pela **Quantis Biotechnology**.

---

## 🎯 Visão Geral

- **Nome:** BIA v4 (Biomaterial Intelligent Assistant)
- **Stack:** Next.js 14 + TypeScript + TailwindCSS + Prisma + Gemini 2.5 Flash
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

**Last Updated:** 2026-07-26 — R12.55.1 (Fix: bed centering + Nelson score justo p/ fotocuráveis)
