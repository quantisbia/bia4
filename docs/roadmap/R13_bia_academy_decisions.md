# R13 — BIA Academy · Decisões travadas e roadmap oficial

> **Criado em:** 2026-08-03 (durante sprint R12.67)
> **Status:** decisões travadas · implementação começa após R12.69
> **Autora do produto:** Janaina Dernowsek (CEO/Founder Quantis)
> **Última revisão:** 2026-08-03

Este documento preserva **todas as decisões acordadas na conversa entre Janaina e o time de engenharia** sobre a criação da **BIA Academy** — plataforma educacional integrada à BIA. O objetivo é que qualquer pessoa (ou LLM) que abrir este repositório meses depois consiga retomar o trabalho **sem perder contexto**.

---

## 1. Contexto e tese

Hoje a Quantis tem **dois produtos separados**:

- **Curso online da Quantis** — [onlinequantis.com](https://www.onlinequantis.com/challenge-page/89769ada-c3bc-4a44-afc8-c57d373039ce) · biblioteca de vídeos, jornada de 12 semanas
- **BIA — Biofabrication Intelligent Assistant** — [biaquantis.bio](https://biaquantis.bio) · plataforma científica com login, formulador, organoides, gerador de protocolos, bioimpressão

**Tese aprovada pela Janaina:** unificar aprender + aplicar num único ambiente, criando a **BIA Academy** dentro do domínio da BIA. Isso transforma o curso no **único do mundo em que a ferramenta abre junto com a aula**.

**Identidade de marca:**

```
┌─────────────────────────────────────────────────────────────┐
│                    QUANTIS BIOTECHNOLOGY                    │
├─────────────────────┬────────────────────┬──────────────────┤
│  BIA Academy        │  BIA               │  Quantis Lab     │
│  (aprender)         │  (desenvolver)     │  (experimentar)  │
│  /academy           │  /dashboard        │  presencial      │
└──────────┬──────────┴────────┬───────────┴──────────────────┘
           │                   │
           └───── Um login ────┘
```

---

## 2. As 10 decisões travadas (com aprovação verbatim da Janaina)

| # | Decisão | Resposta Janaina |
|---|---|---|
| 1 | **URL:** `biaquantis.bio/academy` (path — não subdomínio). Sessão NextAuth compartilhada, sem CORS, deploy Vercel único. | ✅ sim |
| 2 | **Oferta padronizada:** 12 módulos + 12 meses de acesso + 3 encontros online ao vivo. Práticas presenciais **apenas** para cursos corporativos/institucionais ou grupos fechados. | ✅ ajustada (veja seção 3) |
| 3 | **Compra:** link Asaas para curso online + WhatsApp comercial para curso prático/corporativo. Sem checkout dentro da plataforma. | ✅ sim |
| 4 | **Novos roles:** `STUDENT` e `INSTRUCTOR` adicionados ao enum `UserRole`. | ✅ sim |
| 5 | **Vídeos:** YouTube não listado + `youtube-nocookie` + `rel=0` + `modestbranding=1`. Segurança suficiente para MVP. | ✅ sim |
| 6 | **Certificado:** PDF simples via `jspdf` (herdado do R12.67). Sem QR code de verificação no MVP. | ✅ simples |
| 7 | **Meu Projeto do Aluno:** amarrado ao `NotebookEntry` do R12.66 via FK `AcademyProject.notebookEntryId`. Aluno vê o projeto tanto no Academy quanto no Notebook da BIA. Cada resposta gera versão automática (R12.66). | ✅ sim |
| 8 | **Tracking de progresso:** YouTube IFrame API (`YT.Player.onStateChange`) → grava `watchedSeconds`. Não é 100% à prova de fraude, mas aceitável para MVP. | ✅ sim |
| 9 | **Acesso:** rolling (cada aluno entra individualmente, timer de 12 meses a partir do primeiro login). Sem cohorts fixas. | ✅ rolling |
| 10 | **Prioridade:** continuar R12.67 → R12.68 → R12.69 **antes** de codar Academy. Cada sprint anterior reduz o trabalho do Academy. | ✅ continuar |

---

## 3. Oferta oficial padronizada (copy verbatim para 3 páginas)

> **BIA Academy — Programa online de biofabricação e bioimpressão 3D**
>
> - **12 módulos** de conteúdo (aulas gravadas, liberação progressiva)
> - **12 meses de acesso** completo à plataforma e atualizações
> - **3 encontros online ao vivo** com a equipe científica Quantis
> - **Acesso à BIA** (Biofabrication Intelligent Assistant) durante os 12 meses
> - **Meu Projeto de Biofabricação** — protocolo experimental próprio, exportável em PDF/DOCX
> - **Certificado** ao completar os 12 módulos + projeto final
> - **Práticas presenciais** disponíveis apenas para cursos **corporativos, institucionais ou grupos fechados**
>
> **Investimento — curso online:** 👉 [Inscreva-se aqui](https://www.asaas.com/c/iu7ym1dp93cei9zk)
> **Curso corporativo/prático:** 👉 [Fale com o time comercial](https://wa.me/11968632231)

**Onde essa copy vai ser aplicada (verbatim):**
- Landing `/academy` (versão pública dentro da BIA)
- Página atual do curso em `onlinequantis.com` (substituir copy antiga)
- Página do Academy dentro da área logada da BIA (`/academy`)

**Elimina as 3 versões conflitantes hoje publicadas:**
- ❌ ~~"12 semanas + 1 aula ao vivo" (onlinequantis.com atual)~~
- ❌ ~~"6 meses, presencial, turmas de até 10 alunos" (biaquantis.bio antigo)~~
- ✅ **A copy acima é agora a única fonte de verdade.**

---

## 4. Público-alvo

Profissionais e pesquisadores das áreas de:
- Biofabricação · Bioimpressão 3D · Engenharia tecidual
- Biomateriais · Medicina regenerativa · Odontologia
- Cosméticos · Farmacêutica · Biotecnologia · Saúde animal
- Universidades · Laboratórios de pesquisa · P&D empresarial

Nível varia de **iniciante a pesquisador experiente**.

---

## 5. Arquitetura técnica

### 5.1 Stack (reuso máximo da BIA)

| Camada | Tecnologia | Novo? |
|---|---|---|
| Frontend | Next.js 14 App Router + Tailwind | ♻️ reuso |
| Auth | NextAuth v5 | ♻️ reuso |
| DB | Prisma + Neon Postgres | ♻️ reuso |
| Deploy | Vercel + `prisma migrate deploy` no build | ♻️ reuso |
| Vídeo | YouTube não listado + `<iframe>` `youtube-nocookie.com` | Novo (zero custo) |
| PDF/DOCX | `jspdf` + `docx` | ♻️ herdado do R12.67 |
| Versionamento do Projeto do Aluno | Helper `src/lib/notebook/versioning.ts` | ♻️ herdado do R12.66 |
| UI Hierárquica | Componentes do Notebook R12.69 | ♻️ herdado do R12.69 |

### 5.2 Modelos Prisma propostos (R13.01)

```prisma
enum UserRole {
  USER
  ADMIN
  STUDENT       // R13.01 · novo
  INSTRUCTOR    // R13.01 · novo
}

model AcademyEnrollment {
  id             String   @id @default(cuid())
  userId         String   @unique
  enrolledAt     DateTime @default(now())    // primeiro login = t0
  accessUntil    DateTime                     // enrolledAt + 12 meses
  completedAt    DateTime?
  source         String?                      // "asaas" | "corporate" | "manual"
  asaasPaymentId String?                      // rastreio da compra Asaas
  progress       AcademyProgress[]
  project        AcademyProject?
  certificate    AcademyCertificate?
  user           User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AcademyModule {
  id          String   @id @default(cuid())
  slug        String   @unique
  order       Int
  title       String
  description String?
  coverImage  String?
  isPublished Boolean  @default(false)
  lessons     AcademyLesson[]
}

model AcademyLesson {
  id          String   @id @default(cuid())
  moduleId    String
  slug        String
  order       Int
  title       String
  objective   String?  // markdown
  summary     String?  // markdown
  youtubeId   String   // ex: "dQw4w9WgXcQ"
  durationMin Int      @default(0)
  level       String   @default("intermediate") // basic | intermediate | advanced
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  biaHook     Json?    // { tool: "formulator-pro", label: "Criar formulação", params: { preset: "gelma-cartilagem" } }
  attachments AcademyAttachment[]
  quiz        AcademyQuiz?
  module      AcademyModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  @@unique([moduleId, slug])
}

model AcademyAttachment {
  id       String @id @default(cuid())
  lessonId String
  kind     String // PDF | LINK | STL | GCODE | IMAGE
  title    String
  url      String
  sizeBytes Int?
  lesson   AcademyLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model AcademyQuiz {
  id            String @id @default(cuid())
  lessonId      String @unique
  passingScore  Int    @default(70)
  questions     AcademyQuizQuestion[]
  lesson        AcademyLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model AcademyQuizQuestion {
  id            String @id @default(cuid())
  quizId        String
  order         Int
  prompt        String
  options       Json   // array de strings
  correctIndex  Int
  explanation   String?
  quiz          AcademyQuiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
}

model AcademyProgress {
  id             String   @id @default(cuid())
  enrollmentId   String
  lessonId       String
  status         String   @default("NOT_STARTED") // NOT_STARTED | IN_PROGRESS | COMPLETED
  watchedSeconds Int      @default(0)
  quizScore      Int?
  biaHookOpened  Boolean  @default(false)
  completedAt    DateTime?
  updatedAt      DateTime @updatedAt
  enrollment     AcademyEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  @@unique([enrollmentId, lessonId])
}

model AcademyProject {
  id              String  @id @default(cuid())
  enrollmentId    String  @unique
  notebookEntryId String  @unique       // FK para R12.66 · NotebookEntry
  currentStep     Int     @default(0)
  answers         Json    @default("{}")
  updatedAt       DateTime @updatedAt
  enrollment      AcademyEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  notebookEntry   NotebookEntry     @relation(fields: [notebookEntryId], references: [id], onDelete: Cascade)
}

model AcademyLiveEvent {
  id           String   @id @default(cuid())
  title        String
  description  String?
  scheduledAt  DateTime
  durationMin  Int      @default(60)
  meetingUrl   String?  // Zoom / Meet / Teams
  recordingUrl String?  // YouTube URL depois do evento (vira aula da biblioteca)
  order        Int      // 1 | 2 | 3 dos 3 encontros
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model AcademyUpdate {
  id          String   @id @default(cuid())
  publishedAt DateTime @default(now())
  title       String
  body        String   // markdown
  kind        String   // PROTOCOL | ARTICLE | LESSON_EXTRA | EVENT
  attachments Json     @default("[]")
}

model AcademyCertificate {
  id           String   @id @default(cuid())
  enrollmentId String   @unique
  issuedAt     DateTime @default(now())
  code         String   @unique  // ex: "BIA-ACAD-2027-0001"
  pdfUrl       String?
  enrollment   AcademyEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
}
```

**Total: 10 modelos + 2 novos valores no enum `UserRole`.**

### 5.3 Ponte Academy ↔ BIA

| Aula | Botão | Redireciona para |
|---|---|---|
| Módulo 2 · Biomateriais | "Criar formulação" | `/dashboard/formulator-pro?from=academy&lessonId=xxx` |
| Módulo 5 · Arquitetura 3D | "Explorar estruturas STL" | `/dashboard/bioprint/model?from=academy&lessonId=xxx` |
| Módulo 4 · Bioimpressão | "Preparar G-code" | `/dashboard/bioprint/slice?from=academy&lessonId=xxx` |
| Módulo 8 · Organoides | "Abrir Organoid Builder" | `/dashboard/organoid?from=academy&lessonId=xxx` |

**Mecânica exata:**
1. Aluno clica no botão da aula
2. `POST /api/academy/progress` marca `biaHookOpened = true`
3. Redireciona para `/dashboard/<tool>?from=academy&lessonId=xxx`
4. BIA lê query params → mostra faixa superior: *"🎓 Você veio da aula 'X'. A criação será vinculada ao seu Projeto Academy."*
5. Ao salvar no Notebook (R12.66), detecta `from=academy` e amarra em `AcademyProject.notebookEntryId`
6. Aluno volta à Academy → progresso avança automaticamente

Zero pop-ups. Zero código duplicado. Reuso total do R12.66.

---

## 6. Módulos oficiais (conteúdo)

```
1. Introdução à Biofabricação
   Engenharia tecidual · Biofabricação · Bioimpressão ·
   Aplicações atuais · Limitações da área

2. Biomateriais
   Polímeros naturais · Polímeros sintéticos · Hidrogéis ·
   Matriz extracelular · Propriedades mecânicas · Biocompatibilidade

3. Biotintas
   Formulação · Viscosidade · Reologia · Reticulação · Printabilidade

4. Bioimpressão 3D
   Extrusão · Pressão · Velocidade · Altura de camada · Bicos · Temperatura

5. Arquitetura 3D
   Scaffold · Porosidade · Infill · STL · G-code · Geometria

6. Células
   Tipo celular · Densidade celular · Viabilidade · Cultura pós-impressão

7. Tecidos
   Pele · Osso · Cartilagem · Tecidos moles · Vasos

8. Esferoides e organoides
   Building blocks · Scaffold-free · Organoides · Modelos de doença

9. Avaliação pós-impressão
   Viabilidade · Morfologia · Mecânica · Histologia · Marcadores

10. Translação
    Escalabilidade · Reprodutibilidade · Qualidade · Regulação

11. Desenvolvimento de projeto
    Aluno estrutura projeto próprio

12. Projeto final
    Da ideia ao protocolo experimental (exporta via ExportBar do R12.67)
```

---

## 7. Fluxo de compra + primeiro acesso (MVP)

```
1. Visitante entra em biaquantis.bio/academy
   ↓
2. Vê a landing pública com os 2 CTAs:
   [ Inscreva-se no curso online ]   → asaas.com/c/iu7ym1dp93cei9zk
   [ Curso corporativo/prático ]     → wa.me/11968632231
   ↓
3. Compra pelo Asaas
   ↓
4. Time Quantis recebe notificação de pagamento (email do Asaas)
   ↓
5. Admin da BIA entra em /academy/admin/students → "Cadastrar aluno"
   • Cria User (role=STUDENT)
   • Cria AcademyEnrollment (enrolledAt=now, accessUntil=now+365d, source="asaas")
   • Sistema envia email com senha temporária
   ↓
6. Aluno faz primeiro login em biaquantis.bio/academy
   ↓
7. Onboarding (3 perguntas: área, nível, meta) → dashboard personalizado
   ↓
8. Progressão livre pelos 12 módulos ao longo de 12 meses
```

**Automação Asaas via webhook fica para R13.02.5 (opcional, quando volume justificar).**

---

## 8. Sitemap oficial

```
biaquantis.bio/academy
│
├── /                      → Landing pública (converte visitante)
├── /login                 → NextAuth (reuso 100%)
├── /welcome               → Onboarding 3 perguntas (só primeiro login)
│
├── /dashboard             → "Olá, X. Continue sua jornada."
├── /journey               → Minha Jornada (12 módulos em linha do tempo)
├── /modules               → Lista de módulos
│   └── /[moduleSlug]      → Módulo
│       └── /[lessonSlug]  → Aula (vídeo + tudo)
│
├── /library               → Biblioteca (filtrada por área)
├── /project               → Meu Projeto de Biofabricação (usa Notebook R12.66)
├── /live                  → 3 encontros online ao vivo (datas + gravações)
├── /corporate             → Página B2B (só CTA WhatsApp comercial)
├── /updates               → Feed de atualizações (12 meses)
├── /certificate           → Certificado (quando 100% + projeto final)
├── /profile               → Perfil / senha
│
└── /admin                 → Painel Quantis (role=INSTRUCTOR ou ADMIN)
    ├── /modules           → CRUD módulos e aulas
    ├── /students          → Cadastrar/desativar alunos
    ├── /live-events       → Agendar os 3 encontros ao vivo
    ├── /updates           → Publicar no feed
    ├── /quizzes           → CRUD quizzes
    └── /certificates      → Template do certificado
```

---

## 9. Roadmap R13 (10 sprints)

| Sprint | Escopo | Depende de | Complexidade | Tempo |
|---|---|---|---|---|
| **R13.01** | Schema Prisma + migration + seeds de 1 módulo teste | — | ⭐⭐ | 1 sprint |
| **R13.02** | Landing pública `/academy` + login (reuso NextAuth) + onboarding | R13.01 | ⭐⭐ | 1 sprint |
| **R13.03** | Dashboard aluno + Minha Jornada + página de aula | R13.02 | ⭐⭐⭐ | 2 sprints |
| **R13.04** | Player YouTube com tracking de progresso (IFrame API) | R13.03 | ⭐⭐ | 1 sprint |
| **R13.05** | Quizzes + Biblioteca + downloads | R13.03 | ⭐⭐ | 1 sprint |
| **R13.06** | Integração BIA (bia-hook + retorno de progresso) | R13.04, R12.68 | ⭐⭐⭐ | 1 sprint |
| **R13.07** | Meu Projeto (reusa Notebook R12.69) | R13.06, R12.69 | ⭐⭐ | 1 sprint |
| **R13.08** | Feed de Atualizações | R13.02 | ⭐ | 0.5 sprint |
| **R13.09** | Certificado (reusa jspdf do R12.67) | R13.05, R12.67 | ⭐⭐ | 0.5 sprint |
| **R13.10** | Admin (CRUD módulos/aulas/alunos/eventos) | R13.02 | ⭐⭐⭐ | 2 sprints |

**Total estimado:** ~11 sprints paralelizáveis. **Início do R13:** após R12.69 concluído.

---

## 10. Fora do escopo do MVP (v2+)

Explicitamente **NÃO** implementar no R13.01–R13.10:

- ❌ Fórum/comunidade entre alunos
- ❌ Sistema de badges avançado / gamificação visual pesada
- ❌ Live streaming embutido (usar Zoom/YT Live externo com link em `AcademyLiveEvent.meetingUrl`)
- ❌ App mobile nativo (web responsivo cobre)
- ❌ Cobrança/checkout dentro da plataforma (mantém no Asaas externo)
- ❌ Corretor automático de projeto final por IA
- ❌ Marketplace de protocolos entre alunos
- ❌ Múltiplos idiomas (fica só PT-BR no MVP)
- ❌ Webhook automático do Asaas (cadastro é manual pelo admin)

---

## 11. Referências

- Curso atual da Quantis: <https://www.onlinequantis.com/challenge-page/89769ada-c3bc-4a44-afc8-c57d373039ce>
- BIA em produção: <https://biaquantis.bio>
- Link de pagamento Asaas: <https://www.asaas.com/c/iu7ym1dp93cei9zk>
- WhatsApp comercial: <https://wa.me/11968632231>

---

## 12. Como retomar este trabalho meses depois

Se você é um humano ou uma LLM que abriu este arquivo pela primeira vez:

1. Confirme com Janaina se as **10 decisões da seção 2** ainda valem
2. Confirme se a **oferta oficial da seção 3** ainda é a corrente (checar 3 páginas: `onlinequantis.com`, `biaquantis.bio/academy`, `biaquantis.bio/`)
3. Verifique se **R12.67, R12.68, R12.69 já estão em produção** (`README.md` na raiz tem o changelog)
4. Se sim, abra **R13.01** seguindo o padrão dos sprints R12.66/R12.67:
   - Prisma schema + migration
   - `npx prisma migrate deploy` no Neon
   - Seeds de 1 módulo teste
   - Testes verdes
   - README changelog
   - `git commit` seguindo padrão `R13.01 · ...`
5. Se as decisões mudaram, **atualize este arquivo primeiro** e commita a mudança antes de codar.

**Este documento é a fonte de verdade sobre BIA Academy.** Se conflitar com README, prevalece este.
