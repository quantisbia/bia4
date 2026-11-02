# BIA Academy — Diagnóstico e sugestões de melhoria

*Quantis Biotechnology · outubro/2026 · base: banco de produção (Neon) + código `src/app/academy`, `src/lib/academy`*

---

## 1. Retrato atual (dados reais)

| Indicador | Valor | Leitura |
|---|---|---|
| Matrículas ativas | **15** | turma pequena — ótimo para iterar rápido |
| Módulos publicados / total | **11 / 12** (M10 Translação e M12 Projeto Final em rascunho, sem aulas) | |
| Aulas publicadas | **12** (1 por módulo; M6 tem 2) | formato "aula corrida" de 70–100 min |
| Aulas **sem vídeo real** (`PLACEHOLDER`) | **6 / 12** — M1, M3, M5, M7, M8, M11 | metade do programa não tem o vídeo prometido |
| Questões de quiz no programa inteiro | **1** (M1) | a UI do quiz ainda exibe "interface interativa chega em R13.05" |
| Anexos | **2** (ambos links/DOI em M1) · **0 PDFs** | aluno não tem nada para baixar/imprimir |
| Feed de atualizações (`AcademyUpdate`) | **0** publicadas | o card "Atualizações" do dashboard está vazio desde o lançamento |
| Registros de progresso | 12 (2 concluídas · 1 em andamento · 9 não iniciadas) | de 15 alunos × 12 aulas = 180 possíveis → **~1 % concluído** |
| Certificados por aula emitidos | **0** | |
| `biaHook` (ponte para a BIA) | presente em **12/12** aulas | o melhor ativo do programa — mas é só um link, sem tarefa verificável |

**Síntese:** o conteúdo textual é forte (resumos de 12–36 mil caracteres, referências primárias, objetivos claros). O que falta é **ciclo de aprendizagem**: assistir → fazer na BIA → testar → receber feedback → ser lembrado de voltar. Hoje o aluno recebe um texto longo e um link; nada o puxa de volta.

---

## 2. Dez melhorias, em ordem de impacto × esforço

### 2.1 Quiz funcional em todas as aulas (impacto alto · esforço baixo)
Toda a infraestrutura existe (`AcademyQuiz`, `AcademyQuizQuestion`, `quizScore` em `AcademyProgress`). Falta a UI de responder e o banco de questões.
- **Entrega junto com este documento:** 8 questões por módulo (M1–M7, M9) com explicação de cada alternativa — arquivo `docs/academy/quiz-seed.json` + `scripts/seed-academy-quizzes.ts`.
- Regra sugerida: nota ≥ 70 % **libera o certificado da aula**; abaixo, mostra a explicação e deixa refazer (sem limite).
- Variante leve: 3 perguntas rápidas *antes* do vídeo (pré-teste) e as 8 depois — o aluno vê o próprio ganho.

### 2.2 Material de reforço em PDF por aula (impacto alto · esforço baixo)
Uma página A4 por módulo: 5 ideias-chave, 1 figura/tabela, "o que fazer na BIA agora", 3 referências. É o que o aluno imprime e leva para a bancada.
- **Entrega junto com este documento:** `docs/academy/reforco-M0x-*.md` (+ PDF). Carregar pela aba de arquivos da aula (R28).

### 2.3 Tarefa prática verificável na BIA ("faça e prove") (impacto muito alto · esforço médio)
Hoje `biaHook` = "abrir ferramenta". Trocar por **tarefa com evidência automática**:
| Módulo | Tarefa na BIA | Evidência que a BIA já grava |
|---|---|---|
| M2/M3 | Formular uma biotinta no Formulador e salvar | `bioink.formulations[]` no `process-context` |
| M4 | Fatiar um cubo 10×10×1 no BioSlicer com FlowCheck "ok" | `SliceResult.warnings` sem `flow_*` |
| M5 | Gerar scaffold gyroid 30 % e exportar | `studio/scaffold/generate` |
| M9 | Registrar uma impressão na Tabela de Aprendizado (fluiu? nota) | `PrintLearning` (R26) |
| M11 | Criar um projeto no Pipeline com 6 fases preenchidas | `PipelineProject` |
Marcar a aula como concluída **só quando a evidência existir** (ou deixar "concluir manualmente" como fallback). Isso transforma a Academy em tutorial guiado da plataforma.

### 2.4 Módulo 0 — "Aulas introdutórias do curso prático" (impacto alto · esforço baixo — em andamento, R28)
Aulas de leitura (sem vídeo) com os PDFs operacionais: Guia do Aluno, checklist de bancada, calibração de E-steps, purga e fluxo, segurança biológica. É o módulo que os alunos das práticas de 23–24/10 mais precisavam. **Entrega junto:** `reforco-M00-curso-pratico.md` com 8 questões.

### 2.5 Notificações de material novo (impacto alto · esforço médio — em andamento, R28)
Sininho no sidebar + e-mail (Resend, já configurado) quando a Janaina publicar PDF/aula/aviso, com descadastro de 1 clique. Sem isso o aluno nunca sabe que voltou conteúdo.

### 2.6 Dividir as aulas corridas em blocos de 10–20 min (impacto alto · esforço médio)
Aulas de 75–100 min têm conclusão baixíssima em plataformas assíncronas. O resumo do M1 já está estruturado em "Parte 1…5" — basta cortar o vídeo nesses marcos (ou usar `?start=` no embed) e criar 1 aula por parte, cada uma com 2–3 questões. O progresso passa a ser visível (5 ticks em vez de 1).

### 2.7 Gravar ou substituir os 6 vídeos `PLACEHOLDER` (impacto alto · esforço alto)
Enquanto não houver vídeo, a aula deve se apresentar como **aula de leitura** (texto + PDF + quiz), não como vídeo quebrado. A mudança de `youtubeId` para opcional (R28) resolve a exibição; a gravação é decisão de conteúdo. Prioridade: M3 Biotintas e M7 Tecidos (mais ligados à prática).

### 2.8 Feed de atualizações alimentado automaticamente (impacto médio · esforço baixo)
Toda publicação (aula, PDF, aviso R28, nova live) deve criar um `AcademyUpdate`. O card do dashboard deixa de estar vazio sem trabalho manual.

### 2.9 Laço Academy ↔ BIA no sentido inverso (impacto médio · esforço baixo)
Quando a BIA detecta um erro típico, sugerir a aula: `flow_very_low` no FlowCheck → "veja M3 · reologia e fator de extrusão"; `shear_high` → "M9 · viabilidade"; `pore_fusion` → "M5 · porosidade". Um `Link` contextual em cada aviso. Fecha o ciclo: a plataforma ensina no momento da dúvida.

### 2.10 Painel do instrutor (impacto médio · esforço médio)
Hoje não há como ver quem está travado. Uma página `/dashboard/admin/academy/alunos` com: último acesso, aulas concluídas, nota média de quiz, tarefas da BIA feitas, e botão "enviar lembrete" (usa R28). Para 15 alunos isso é acompanhamento individual — o diferencial de um curso pequeno.

---

## 3. Sequência sugerida (próximas 4 semanas)

| Semana | Entrega | Depende de |
|---|---|---|
| 1 | Quiz funcional + carregar os 8 bancos de questões · PDFs de reforço nas aulas · Módulo 0 publicado | R28 (upload) — ~60 % pronto |
| 2 | Notificações (sininho + e-mail) · feed automático · aviso à turma sobre os novos materiais | R28 |
| 3 | Tarefas verificáveis na BIA para M2/M3/M4/M9 · links contextuais BIA → Academy | — |
| 4 | Quebrar M1 e M4 em blocos · painel do instrutor | gravações |

---

## 4. Riscos e cuidados
- **Volume de e-mail:** 15 alunos → sem risco; mas manter descadastro de 1 clique (LGPD) desde o início.
- **Quiz como barreira:** nunca bloquear o conteúdo seguinte por nota — o quiz libera *certificado*, não *acesso*.
- **PDF no Postgres:** adequado para dezenas de arquivos ≤ 40 MB; se passar de ~1 GB total, migrar para R2/Blob.
- **Aulas de leitura ≠ aulas inferiores:** rotular claramente ("Leitura · 15 min") para o aluno não achar que o vídeo "não carregou".
