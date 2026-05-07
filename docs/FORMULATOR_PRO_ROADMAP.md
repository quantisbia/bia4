# 🧪 Formulador Pro — Roadmap Estratégico de Evolução

> **Contexto:** O Formulador Pro é hoje o módulo de maior valor percebido da BIA v4. Esta análise foi feita sob a perspectiva de um **Agente de Biofabricação de classe mundial** (cientista sênior + product strategist + engenheiro de IA) para transformar o módulo de "gerador de formulação" em um **co-piloto científico verificável e auditável**.
>
> **Autor:** Janaina Dernowsek / Quantis Biotechnology — Maio 2026
> **Versão:** 1.0 — alinhada ao código v4.3 (commit 011cfc8)

---

## 📊 Diagnóstico atual (o que já é bom)

| Aspecto | Estado atual | Nota |
|---|---|---|
| **Ingestão de dados** | Catálogo + custom, até 8 componentes, 7 papéis funcionais | ⭐⭐⭐⭐ |
| **Inteligência científica** | Templates por objetivo clínico + regras determinísticas de incompatibilidade | ⭐⭐⭐⭐ |
| **Saída estruturada** | JSON com score 0-100, protocolo, propriedades preditas, regulatório | ⭐⭐⭐⭐ |
| **Robustez** | Normalização defensiva, fallback se IA falha | ⭐⭐⭐⭐ |
| **Validação química** | 6 regras hard-coded (alginato/colágeno, GelMA/fotoiniciador, etc.) | ⭐⭐⭐ |
| **Reprodutibilidade** | Resultados não determinísticos (sem seed, sem versão de prompt registrada) | ⭐⭐ |
| **Aprendizado contínuo** | Não há | ⭐ |
| **Verificação independente** | Não há (1 LLM, sem cross-check) | ⭐ |

**Conclusão:** A base é sólida. O salto para "classe mundial" exige **rigor científico verificável, transparência e aprendizado contínuo**.

---

## 🎯 As 12 melhorias priorizadas

Cada melhoria está classificada por:
- 💎 **Valor para o usuário** (1-5)
- ⚙️ **Esforço de engenharia** (1-5, onde 5 = maior)
- 🚀 **Quick win?** (✅ se entrega <2 semanas)

---

### 1. 🧬 Predição quantitativa via modelos físico-químicos (não só LLM)

**Problema:** Hoje a IA "estima" módulo, gel time, swelling em strings ("8–15 kPa"). Um cientista de classe mundial **calcula**.

**Solução:**
- Para cada combinação polímero+crosslinker, aplicar modelos clássicos:
  - **Flory-Rehner** para swelling de hidrogéis
  - **Hagen-Poiseuille** para viscosidade aparente em extrusão (já usado parcialmente no Bioprinting)
  - **Gent / Mooney-Rivlin** para módulo de elastômeros (ex: PGS para implante mamário)
  - **Higuchi / Korsmeyer-Peppas** para cinética de liberação de fármaco
- Criar `src/lib/science/physical-models.ts` com funções puras testáveis
- A IA **revisa e contextualiza** os números calculados, em vez de inventá-los

**Entregáveis técnicos:**
- `physical-models.ts` (~400 linhas, 8-10 funções)
- Testes unitários com valores de literatura (Slaughter 2009, Bryant 2003, Lee 2016)
- Banner na UI: "📐 Calculado por modelo Flory-Rehner — verificável"

**Impacto:** Score "regulatório" e "manufacturability" sobem de "estimado" → "auditável".

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 3 | ✅ (10-14 dias) |

---

### 2. 🔬 Banco de dados de propriedades curado (BIA Property DB)

**Problema:** A IA pode "alucinar" um módulo de 50 kPa para alginato 2% quando a literatura mostra 5-15 kPa.

**Solução:**
- Tabela Prisma `MaterialProperty` com:
  - 100+ biomateriais comuns
  - Faixas de concentração (1%, 2%, 5%, 10% w/v)
  - 12 propriedades-chave (Young's modulus, swelling, gel time, viscosidade @ 1s⁻¹, etc.)
  - Faixa min/max + valor típico + DOI da fonte
- Antes da chamada à IA, fazer **lookup** por componente
- Injetar no prompt: `"Alginato 2% w/v: módulo 5-15 kPa (Lee 2016, DOI:10.xxx)"`
- IA não pode mais inventar → ela **interpola e contextualiza**

**Fontes para popular o DB:**
- Polymer Handbook (Brandrup, Immergut)
- Reviews da Nature Reviews Materials, Acta Biomaterialia (2018-2025)
- BioPrinting Database (UCD, 2023)
- Datasheets de fornecedores (CELLINK, Allevi, Sigma)

**Entregáveis técnicos:**
- Schema Prisma + migration
- Seed CSV com 100 entries iniciais (quitosana, alginato, GelMA, HA, PCL, PLGA, fibrina, colágeno I/II/IV, gelatina, agarose, PEG-DA, PEG-NB, dextrano, celulose, PVA, PLA, PGS, silk fibroin, decellularized ECMs)
- API interna `getKnownProperties(name, concentration)` injetada no prompt builder

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 4 | ❌ (3-4 semanas) |

---

### 3. 🧠 Cross-check multi-LLM (Gemini + GPT-4o + Claude 3.5)

**Problema:** Decisão crítica de saúde dependente de 1 LLM = risco. Médicos nucleares usam dois leitores independentes; nós deveríamos também.

**Solução:**
- Modo **"Consenso Científico"** (cobra 3× créditos): roda os 3 LLMs em paralelo
- Compara as 3 respostas em 5 dimensões:
  - Concentrações sugeridas (±20% = match)
  - Crosslinking method (categoria)
  - Módulo predito (overlap de faixa)
  - Warnings críticos (interseção de set)
  - DOIs citados (verificáveis no CrossRef)
- Mostra **"Score de consenso" 0-100** + destaca divergências em UI
- Se consenso ≥80%: "✅ Validado por 3 modelos"
- Se consenso <50%: alerta "⚠️ Modelos discordam — revise manualmente"

**Entregáveis:**
- `src/lib/ai/consensus.ts` (orquestrador)
- Adapters: `gemini.ts` (já existe), `openai.ts`, `claude.ts`
- UI: novo badge "Consenso 87/100" + tabela comparativa colapsável

**ROI:** Diferencial competitivo gigante. Nenhum concorrente faz isso para biomateriais.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 4 | ❌ (3-4 semanas) |

---

### 4. 📚 Verificação automática de DOIs (anti-alucinação)

**Problema:** Hoje a IA cita DOIs que **podem não existir**. Se um cientista usa em um artigo, queima a credibilidade.

**Solução:**
- Após resposta da IA, validar cada DOI via **CrossRef API** (gratuita, sem key):
  - `https://api.crossref.org/works/{doi}` → retorna metadados se válido
- Substituir DOIs inválidos por `[DOI não verificado — revisar]` em vermelho
- Para os válidos, mostrar título oficial, autores, ano, journal (puxa do CrossRef)
- Cache por 30 dias em KV/Redis (ou Prisma)

**Entregáveis:**
- `src/lib/science/doi-verifier.ts` (~80 linhas)
- Integração no fim de `formulateProfessional`
- UI: ícone ✅ (verificado) / ⚠️ (não verificado) ao lado de cada referência

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 1 | ✅ (3-5 dias) — **MAIOR ROI** |

---

### 5. 🔄 Iteração e refinamento (chat-mode)

**Problema:** Hoje é "one-shot". O usuário recebe uma fórmula e se quiser ajustar, refaz tudo.

**Solução:**
- Após primeira formulação, abrir um **painel de chat contextual**
- Comandos sugeridos como chips:
  - "🧪 Aumentar módulo em 2×"
  - "🌱 Trocar componente animal por sintético"
  - "💉 Tornar injetável (viscosidade <1 Pa·s a 0.1 s⁻¹)"
  - "🩸 Reduzir custo em 30%"
  - "📈 Otimizar para impressão extrusão"
- Cada iteração custa apenas 3 créditos (vs 10 da formulação inicial)
- Histórico das iterações como timeline visual
- Botão "📊 Comparar v1 vs v2 vs v3" → tabela lado-a-lado

**Entregáveis:**
- Endpoint `POST /api/biomaterials/refine-pro` com `previousResult + userInstruction`
- Componente `<RefinementPanel>` com chat + chips
- Tabela de comparação (Tailwind grid)

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 3 | ✅ (2 semanas) |

---

### 6. 🧮 Otimização Bayesiana de concentrações

**Problema:** Para casos com 4+ componentes, há um **espaço de design enorme** (combinações de %). O usuário quer "a melhor", não "uma".

**Solução:**
- Modo **"Exploração Bayesiana"** (cobra 30 créditos):
  - Define função objetivo: ex. "minimizar desvio de módulo alvo + maximizar viabilidade"
  - Roda 8-12 iterações de **Gaussian Process + Expected Improvement** (em JS puro com `bayesian-optimization` ou implementação custom)
  - Cada iteração = 1 chamada à IA (estimação de propriedades) + 1 cálculo físico
  - Output: superfície de design 2D (heatmap das 2 variáveis mais sensíveis) + 3 candidatos Pareto-ótimos
- Linka com a literatura: "Esta região do espaço de design ainda não foi reportada → potencial novidade"

**Entregáveis:**
- `src/lib/science/bayesian-opt.ts` (~300 linhas, GP + EI puros em TS)
- Job assíncrono (background) com SSE/polling para o cliente
- Visualização heatmap com Plotly.js ou Observable Plot

**Impacto:** Transforma o usuário de "consumidor de fórmulas" em **"explorador de design space"** — categoria nova de produto.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 4 | 5 | ❌ (4-6 semanas) |

---

### 7. 🏛️ Compliance regulatório auditável (FDA/ANVISA/EMA)

**Problema:** Hoje retorna `regulatory.estimatedClass = "Classe IIa"` sem fundamentação. Auditor / regulatório não aceita.

**Solução:**
- Decisão por **árvore de regras explícita** com base em:
  - **FDA 21 CFR 860.7** (classification rule)
  - **MDR 2017/745 Annex VIII** (classification rules 1-22)
  - **ANVISA RDC 751/2022 Anexo I**
- Cada decisão referencia o regulamento específico:
  - "Classe IIa por **MDR Rule 7** (invasivo, uso transitório)"
- Sugestão automática de:
  - **Predicate device (510k)** se houver match no banco FDA Premarket
  - **CER essential safety requirements** aplicáveis (ISO 14971 risk-MOI)
  - Path provável: 510(k), De Novo, PMA, ou registro de pesquisa
- Exportação como **anexo regulatório PDF** (para submissão real)

**Entregáveis:**
- `src/lib/regulatory/classifier.ts` (decisão árvore, 200 linhas)
- Tabela de predicates (importar 510k FDA OpenData, ~1000 entries de implantes/scaffolds)
- Geração de PDF via `@react-pdf/renderer`

**Diferencial:** Único módulo no mundo que liga formulação científica → predicate FDA em <30s.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 4 | ❌ (4 semanas) |

---

### 8. 🗂️ Reprodutibilidade total: snapshot + versionamento

**Problema:** Mesmo input pode dar outputs diferentes (LLMs não-determinísticos). Inviabiliza reprodução em artigos.

**Solução:**
- Cada formulação salva no DB grava:
  - `inputHash` (SHA-256 do input)
  - `promptVersion` (ex: "pro-v4.3.1")
  - `modelVersion` (ex: "gemini-2.0-flash-001")
  - `temperature` (sempre 0.3 atualmente)
  - `seed` (passar seed = hash mod 2³² ao Gemini quando suportar)
  - `physicalModels` usados
  - `referenceDB snapshot` (versão do property DB)
- Endpoint `GET /api/formulations/{id}/reproduce` → mostra **exatamente como reproduzir**
- Botão "📋 Citar BIA na metodologia" → copia: 
  > "Formulation generated by BIA v4.3 Formulator Pro (prompt v4.3.1, gemini-2.0-flash-001, T=0.3, seed=12345, property DB v2024-12)"

**Entregáveis:**
- Migration Prisma: adicionar 6 colunas em `Formulation`
- `src/lib/audit/snapshot.ts`
- UI: aba "Reprodutibilidade" no resultado

**Impacto:** Aceito por journals (PLOS, Biomaterials, ACS Biomaterials) que exigem reprodutibilidade computacional.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 4 | 2 | ✅ (1 semana) |

---

### 9. 🔍 RAG sobre 120+ artigos científicos da BIA

**Problema:** Hoje o conhecimento está "encapsulado" no LLM. Artigos novos (2025-2026) podem não estar treinados.

**Solução:**
- Pipeline RAG (Retrieval-Augmented Generation):
  - Indexar abstracts + figures-text de 120 artigos curados (já mencionados no roadmap)
  - Embeddings com `text-embedding-3-small` (OpenAI) ou `embedding-001` (Gemini)
  - Vector store: **Cloudflare Vectorize** (se deploy CF) ou pgvector (Postgres)
  - Antes da formulação, retrieve top-5 chunks relevantes
  - Injetar no prompt como "EVIDÊNCIA-BASE:"
- Diferencial: **toda afirmação da IA agora vem com chunk citado** + DOI verificável

**Entregáveis:**
- Script de ingestão `scripts/ingest-papers.ts`
- `src/lib/rag/retrieve.ts`
- Modificação no `buildContextBlock` para incluir evidências
- UI: dropdown "Ver evidências usadas" mostra os chunks com hyperlinks

**Diferencial competitivo:** Posiciona BIA como "Perplexity para biomateriais".

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 5 | 4 | ❌ (3-4 semanas) |

---

### 10. 📊 Dashboard de comparação de fórmulas (workspace)

**Problema:** Usuários geram 5-10 fórmulas e perdem o controle. Falta visão "labbook digital".

**Solução:**
- Página `/dashboard/formulator-pro/workspace`:
  - Grid de cards (todas suas formulações), filtros (objetivo, score, data)
  - Selecionar 2-4 → "Comparar" → tabela lado-a-lado:
    - Componentes (com diff highlight)
    - Score radial (radar chart)
    - Custo estimado (se DB de preços implementado)
    - Propriedades preditas (faixas overlapped)
- "Estrelizar" favoritas, criar tags ("Tese MS", "Projeto X")
- Exportação consolidada (CSV/Excel) para análise externa

**Entregáveis:**
- Nova página + queries Prisma
- Componente `<ComparisonTable>` com Radar via Recharts
- Sistema de tags simples (m2m table)

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 4 | 3 | ✅ (2 semanas) |

---

### 11. 🎨 Visualização 3D do scaffold previsto

**Problema:** Resultado é texto. Cientistas e clientes querem **ver**.

**Solução:**
- Para cada formulação com `printable=true`:
  - Inferir geometria sugerida pela combinação (ex: GelMA+HA+osso → bone block com gyroid 70% porosidade)
  - Reusar o **STL Generator** (já melhorado!) automaticamente
  - Mostrar preview 3D embedded com Three.js (canvas leve)
  - Botão "✏️ Customizar geometria" → leva para `/dashboard/stl` com pré-config
- Conectar `predictedProperties.youngsModulusKPa` ao infill recomendado:
  - <10 kPa → infill 30-50% (alta porosidade)
  - 10-100 kPa → infill 50-70%
  - >100 kPa → infill 70-90%

**Entregáveis:**
- `src/lib/integration/stl-suggest.ts` (mapeamento goal → geometry preset)
- Componente `<ScaffoldPreview3D>` (~150 linhas com Three.js / react-three-fiber)
- Lazy load Three.js (só quando entrar na seção)

**Impacto:** "Wow factor" para fechar venda. Demo visual 100× mais convincente.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 4 | 3 | ✅ (2 semanas) — **alta visibilidade** |

---

### 12. 🤝 Aprendizado contínuo (RLHF leve)

**Problema:** Cada formulação gerada é "esquecida". Não aprendemos do uso real.

**Solução:**
- Após cada resultado, perguntar:
  - 👍/👎 "Esta formulação faria sentido no seu lab?"
  - Se 👎: campo livre "O que está errado?" + escolha rápida (concentração, crosslink, custo, regulatório)
- Acumular feedback em DB
- A cada 100 feedbacks, gerar **prompt patches**:
  - "Em formulações para BONE_REGENERATION, evitar gelatina pura sem reforço (5 reportes negativos)"
- Adicionar como `LEARNED_PATTERNS` ao system prompt (versionado)
- Métrica pública: "BIA aprende: 247 melhorias incorporadas em 6 meses"

**Entregáveis:**
- Tabela `FormulationFeedback` (Prisma)
- API `POST /api/biomaterials/feedback`
- Processo (cron) de extração de padrões → manual approval → injection
- UI: thumbs + dialog opcional

**Diferencial:** Único produto que **fica mais inteligente com o uso da comunidade**. Network effect real.

| 💎 Valor | ⚙️ Esforço | 🚀 Quick win? |
|---|---|---|
| 4 | 3 | ✅ (2 semanas) |

---

## 🛣️ Plano de execução sugerido (3 sprints)

### Sprint 1 — "Confiança & Transparência" (2 semanas) — quick wins máximos
- ✅ #4 Verificação de DOIs via CrossRef (3-5 dias)
- ✅ #8 Snapshot e versionamento (1 semana)
- ✅ #11 Preview 3D do scaffold (2 semanas, paralelo)
- ✅ #12 Feedback 👍👎 (em paralelo)

**Resultado:** Cada formulação vira "auditável + reproduzível + visualizável" → diferencial imediato em demos.

### Sprint 2 — "Inteligência Verificável" (4 semanas)
- 🔬 #2 Property DB curado (3-4 semanas)
- 📐 #1 Modelos físico-químicos (paralelo, 10-14 dias)
- 🔄 #5 Modo iteração/chat (2 semanas, paralelo)

**Resultado:** A IA passa de "estimadora" → "calculadora científica auditável".

### Sprint 3 — "Diferenciação Competitiva" (6-8 semanas)
- 🧠 #3 Cross-check multi-LLM
- 🔍 #9 RAG sobre artigos
- 🏛️ #7 Compliance regulatório auditável
- 📊 #10 Workspace de comparação
- 🧮 #6 Otimização Bayesiana

**Resultado:** Posicionamento como **único agente científico de classe mundial em biofabricação**.

---

## 💰 Modelo de monetização sugerido

| Funcionalidade | Plano sugerido | Créditos |
|---|---|---|
| Formulação Pro básica | Discovery (free 30 cred) | 10 |
| Verificação DOI + Score reproduzível | Incluído (sem custo extra) | 0 |
| Preview 3D | Discovery+ | 2 |
| Modo iteração (chat) | Discovery+ | 3 |
| Consenso multi-LLM | Pro | 30 |
| Otimização Bayesiana | Pro / Lab | 50 |
| Compliance regulatório PDF | Lab / Enterprise | 20 |
| Workspace ilimitado | Lab / Enterprise | — |

---

## 🎯 Métricas de sucesso (KPIs propostos)

1. **Taxa de retomada** (`retention_d7`): usuários que voltam em 7 dias após primeira fórmula. **Meta: ≥40%**
2. **Score médio de feedback** (👍 / 👍+👎). **Meta: ≥85%**
3. **DOIs válidos** (% verificados no CrossRef). **Meta: ≥95%**
4. **Tempo médio até primeira fórmula útil** (do signup até 1ª fórmula com 👍). **Meta: ≤8 minutos**
5. **NPS do Formulador Pro** (survey trimestral). **Meta: ≥60**
6. **Reprodutibilidade** (% de execuções com snapshot completo). **Meta: 100%**
7. **Conversão demo → pago**: usuários free que compram após usar Formulador Pro. **Meta: ≥12%**

---

## 🚧 Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Custo de chamadas LLM explode com multi-LLM | Cache agressivo por inputHash (90 dias); modo single como default |
| DOIs CrossRef rate-limit | Cache 30 dias + retry exponential; usar User-Agent identificável |
| Property DB desatualizado | Job mensal de scraping de PubMed reviews; flag "última atualização" na UI |
| LLM adicional (GPT-4o, Claude) requer keys | Variáveis env separadas; gracefully degradar para single-LLM se faltar key |
| Feedback enviesado (poucos usuários respondem) | Gamification leve (selo "Contribuiu para 10 melhorias") |

---

## 📌 Próximo passo concreto (esta semana)

**Implementar agora:** #4 (DOI verifier) + #8 (snapshot) — total ~7 dias, **eliminam o maior risco de credibilidade científica** com mínimo esforço.

Após esses dois, o Formulador Pro estará **cientificamente auditável** — pré-requisito para todos os demais avanços.

---

**FIM DO DOCUMENTO**

> Este roadmap é vivo. Atualizar a cada sprint com aprendizados de campo (feedback de Janaina + early users).
