/**
 * R13.14.8 · Conteúdo denso do Módulo 03 — Biotintas
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "biotintas",
    lessonSlug: "biotintas-aula-completa",
    order: 1,
    title: "Biotintas — formulação, reologia e printabilidade",
    durationMin: 90,
    level: "intermediate",
    biaHook: {
      tool: "formulator-pro",
      label: "Formular biotinta na BIA (Formulator Pro)",
      params: { preset: "bioink-starter" },
    },

    objective: `Dominar o design e a formulação de biotintas — desde a seleção dos componentes até a validação reológica para extrusão com viabilidade celular preservada.

Ao final desta aula você será capaz de:
1. Diferenciar tinta (ink) de biotinta (bioink) e explicar por que confundi-las custa caro.
2. Formular uma biotinta a partir de 3 componentes: polímero estrutural, agente de reticulação, aditivos funcionais.
3. Interpretar curvas de viscosidade (shear thinning), G' e G" (ensaio oscilatório) e saber a janela de printabilidade.
4. Escolher a estratégia de reticulação adequada (iônica, foto, enzimática, térmica) para cada aplicação.
5. Reconhecer e corrigir os 5 modos de falha típicos: biotinta espalha, não extrude, mata células, não gelifica, contamina.`,

    summary: `## Contexto

**Biotinta (bioink)** é a formulação específica para bioimpressão: um biomaterial (geralmente hidrogel) encapsulando células vivas, formulado para passar por um bico de extrusão **sem matar as células** e manter a estrutura 3D depois de depositado.

A diferença entre uma **tinta** (ink) e uma **biotinta** (bioink) é fundamental e foi padronizada por [Groll et al. (2019)](https://doi.org/10.1088/1758-5090/aaec52) no Biofabrication: *"a bioink is a formulation of cells suitable for processing by an automated biofabrication technology that may also contain biologically active components and biomaterials"*. O ponto-chave é a **presença de células durante a impressão** — isso muda tudo:
- Viscosidade precisa ser compatível com viabilidade (não pode esmagar células no bico)
- Tempo de preparo é curto (células não sobrevivem horas no estado líquido)
- Temperatura é limitada a 4-37°C
- Esterilidade é obrigatória
- A reticulação precisa ser citocompatível (sem produtos tóxicos, sem UV de alta intensidade)

A biotinta é o **componente mais crítico** da cadeia de bioimpressão. Impressora cara + modelo 3D perfeito + biotinta mal formulada = constructo morto em 24h.

## Conceitos-chave

Uma biotinta "boa" tem **5 características simultâneas**, difíceis de conciliar:

1. **Printability** — manter forma depois de depositada (sem espalhar, sem colapsar entre camadas)
2. **Shape fidelity** — reproduzir fielmente o STL/G-code (resolução, bordas definidas)
3. **Cell viability** — >90% das células sobrevivem à impressão (medido em 24h)
4. **Biocompatibility** — compatível com cultura celular por semanas
5. **Bioactivity** — promove adesão, proliferação e diferenciação correta

A tensão permanente é entre **(1-2)** e **(3)**: aumentar viscosidade melhora printability mas aumenta shear stress que mata células. Esse trade-off é o coração da formulação de biotintas.

### Componentes de uma biotinta

| Componente | Função | Exemplos |
|---|---|---|
| **Polímero estrutural** | Dá a forma e a rede 3D | GelMA, alginato, colágeno, HA |
| **Agente de reticulação** | Fixa a estrutura após deposição | CaCl₂ (iônico), LAP (foto), transglutaminase (enzimática) |
| **Células** | Componente biológico ativo | 1-20 × 10⁶ células/mL |
| **Aditivos funcionais (opcionais)** | Melhoram propriedades específicas | Nanocelulose (reforço), peptídeos RGD, fatores de crescimento, dECM |
| **Veículo / meio** | Mantém osmolaridade e pH | PBS, DMEM sem soro |

### Estratégias de reticulação

| Tipo | Mecanismo | Prós | Contras | Exemplos |
|---|---|---|---|---|
| **Iônica** | Cátions reticulam cadeias (Ca²⁺) | Rápido, barato, atóxico | Reversível, baixa resistência | Alginato + CaCl₂ |
| **Foto (UV/visível)** | Radicais formados por luz | Preciso espacialmente, rápido | UV danifica DNA (preferir 405 nm) | GelMA + LAP + 405 nm |
| **Enzimática** | Enzimas ligam cadeias covalentemente | Suave, específica | Lenta (minutos-horas), cara | HA-tiramina + HRP + H₂O₂ |
| **Térmica (sol-gel)** | Mudança de T° induz gelificação | Simples, reversível | Gel instável a 37°C | Pluronic F-127, agarose |
| **Click chemistry** | Reações bio-ortogonais | Alta especificidade | Reagentes caros | PEG-tetrazina + norborneno |

### A ciência da reologia (sem pavor)

Reologia é a ciência que estuda o fluxo e deformação de materiais. Para biotintas, 3 medidas são indispensáveis:

**1. Viscosidade dinâmica (η)** — resistência ao fluxo. Unidade: Pa·s. Um fluido ideal para extrusão é **shear-thinning** (pseudoplástico): viscoso em repouso (mantém forma no bico), fluido sob stress (passa pela agulha). Lei de potência: η = K·γ̇^(n-1), onde n < 1 é shear thinning.

**2. G' (storage modulus)** e **G" (loss modulus)** — ensaio oscilatório mede resposta elástica (G') e viscosa (G") a pequenas deformações. **G' > G"** → gel estruturado. **G' < G"** → líquido viscoso.

**3. Yield stress (σy)** — tensão mínima para o material começar a fluir. Biotintas com yield stress alto mantêm forma após extrusão.

**Janela de printabilidade para extrusão** (regra de bolso):
- Viscosidade aparente a 10 s⁻¹: **10-1000 Pa·s**
- G' pré-impressão: **100-5000 Pa**
- Shear thinning index (n): **0,2-0,8**
- Yield stress: **10-200 Pa**

## Distinções que geram confusão (atenção!)

| Termo | Significado | Exemplo típico |
|---|---|---|
| **Tinta (ink)** | Material imprimível SEM células | PLA, PCL, cerâmica para scaffold rígido |
| **Biotinta (bioink)** | Material imprimível COM células | GelMA 10% + L929 (5M/mL) + LAP |
| **Material carrier** | Hidrogel suporte, sem papel biológico | Pluronic F-127 (sacrificial) |
| **Material de sacrifício** | Impresso e depois removido para criar canais | Carboidrato, Pluronic resfriado |
| **Hidrogel estruturado** | Rede polimérica com água | Qualquer gel reticulado |

**Erro clássico:** vender "bioink" sem células inclusas. **Biotinta verdadeira contém células** — se é só o polímero, chame de "ink" ou "hydrogel precursor".

### Shear thinning ≠ baixa viscosidade

Material shear-thinning é viscoso em repouso E fluido sob stress. Não é "material pouco viscoso". Alginato 2% é shear-thinning MAS tem viscosidade a 10 s⁻¹ de ~200 Pa·s. É isso que permite imprimir — vira água só dentro do bico.

### Reticulação pré vs. pós-impressão

- **Pré-crosslinking** (crosslinking parcial antes da impressão) — aumenta yield stress, melhora shape fidelity. Risco: entupir o bico.
- **In situ crosslinking** (durante extrusão) — material começa líquido e gelifica ao sair do bico. Ex: alginato + bath de CaCl₂.
- **Pós-impressão** — material fica mole após deposição, é curado em etapa separada (ex: UV depois de todas as camadas). Risco: a estrutura colapsa antes de curar.

## Desafios técnicos

1. **Trade-off printabilidade × viabilidade** — o grande desafio do campo. Blaeser et al. (Advanced Healthcare Materials, 2016) mostrou que shear stress acima de 5 kPa reduz viabilidade de L929 em >20%. Soluções: usar bicos cônicos (menor shear que cilíndricos), aumentar diâmetro do bico, baixar velocidade de impressão, pré-reticular parcialmente.

2. **Sedimentação de células durante impressão** — células >1 h no reservatório vão para o fundo (densidade ~1,05 g/mL). Em biotintas pouco viscosas, isso cria gradientes de densidade. Solução: biotinta mais viscosa, impressão rápida, misturar reservatório, usar carrier com densidade similar (Percoll, OptiPrep).

3. **Reprodutibilidade batch-to-batch** — mesma marca de gelatina com propriedades diferentes entre lotes. Caracterizar reologicamente cada lote antes de experimentos.

4. **Esterilização sem destruir o material** — autoclave desnatura proteínas; filtração 0,22 μm não funciona para hidrogéis viscosos; EtO deixa resíduos. Melhor: preparar em fluxo laminar com reagentes esterilizados separadamente.

5. **Pegada de bioink é tridimensional** — material deposita com largura MAIOR que o diâmetro do bico (die swell). Projete G-code considerando essa expansão (~20-30% típico).

6. **Interação biotinta-bico** — alguns materiais aderem ao bico (metal vs. plástico), outros formam filme. Testar antes com placas vazias.

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros que arruínam a impressão:**

1. **Preparar biotinta na véspera e usar no dia seguinte** — células morrem no estado líquido. Prepare biotinta no máximo 1-2h antes de usar.

2. **Usar GelMA sem fotoiniciador** — GelMA só reticula com LAP (ou Irgacure 2959) + luz na faixa certa (365 nm para Irgacure, 405 nm para LAP). Sem fotoiniciador, o material fica mole para sempre.

3. **Usar UV de alta intensidade / tempo longo** — >10 mW/cm² ou >60s pode gerar ROS que danificam DNA celular. Preferir **405 nm visível + LAP** (menos tóxico que 365 nm + Irgacure).

4. **Encapsular células antes de pré-aquecer biotinta** — se misturar células em biotinta gelada (4°C) e imprimir sem equilibrar, choque térmico mata >30%.

5. **Esperar que mesma biotinta funcione em bicos diferentes** — bico cônico 25G ≠ cilíndrico 25G. Shear rate muda, otimização muda.

6. **Não medir reologia e tentar formular "no olho"** — sem reômetro, não há como caracterizar G', shear thinning, yield stress. Alternativa barata: viscosímetro rotacional (mais limitado, mas melhor que nada).

7. **Tratar biotinta como "receita universal"** — biotinta ideal para pele (mole, rápida degradação) é horrível para osso (rígido, degradação lenta). Formulação é tecido-específica.

## Artigos recomendados

**Groll J et al. · 2019**
A definition of bioinks and their distinction from biomaterial inks.
📰 *Biofabrication*
DOI: [10.1088/1758-5090/aaec52](https://doi.org/10.1088/1758-5090/aaec52)

**Blaeser A et al. · 2016**
Controlling shear stress in 3D bioprinting is a key factor to balance printing resolution and stem cell integrity.
📰 *Advanced Healthcare Materials*
DOI: [10.1002/adhm.201500677](https://doi.org/10.1002/adhm.201500677)

**Schwab A et al. · 2020**
Printability and shape fidelity of bioinks in 3D bioprinting.
📰 *Chemical Reviews*
DOI: [10.1021/acs.chemrev.0c00084](https://doi.org/10.1021/acs.chemrev.0c00084)

**Chimene D et al. · 2020**
Nanoengineered Ionic–Covalent Entanglement (NICE) Bioinks for 3D Bioprinting.
📰 *ACS Applied Materials & Interfaces*
DOI: [10.1021/acsami.0c04344](https://doi.org/10.1021/acsami.0c04344)

**Hölzl K et al. · 2016**
Bioink properties before, during and after 3D bioprinting.
📰 *Biofabrication*
DOI: [10.1088/1758-5090/8/3/032002](https://doi.org/10.1088/1758-5090/8/3/032002)

**Ouyang L et al. · 2016**
Effect of bioink properties on printability and cell viability for 3D bioplotting of embryonic stem cells.
📰 *Biofabrication*
DOI: [10.1088/1758-5090/8/3/035020](https://doi.org/10.1088/1758-5090/8/3/035020)

## Principais pesquisadores do campo

- **Jürgen Groll** (Universität Würzburg, Alemanha) — autor da definição consensual de bioink; liderança da ISBF
- **Horst Fischer** (RWTH Aachen) — reologia de biotintas e impressão de alta resolução
- **Jennifer Lewis** (Harvard) — DIW (Direct Ink Writing) e bioinks funcionais multimateriais
- **Ali Khademhosseini** (Terasaki Institute) — GelMA e bioinks fotorreticulados
- **Tim Woodfield** (University of Otago, Nova Zelândia) — bioinks para cartilagem e osso
- **Marcy Zenobi-Wong** (ETH Zürich) — bioinks e bioimpressão para cartilagem articular

## Congressos e sociedades científicas

**Internacionais:**
- **International Conference on Biofabrication (ISBF)** — foco direto em biotintas, anual
- **TERMIS World Congress** — trienal, sessões específicas de bioinks
- **IEEE EMBC** — anual, trilha de bioprinting
- **Material Research Society (MRS) Spring/Fall** — sessões de biomateriais e bioinks

**Nacionais:**
- **Encontro Anual da SBB (Sociedade Brasileira de Biomateriais)** — Brasil
- **SLABO Latam** — rotativo entre países latinos

**Workshops e cursos essenciais:**
- **CELLINK Workshops** — gratuitos online, tutoriais práticos
- **Allevi Bioprinting Academy** — vídeos técnicos
- **BICO Education** — Masterclasses pagas (mas de alto nível)

## Próximos passos de estudo

1. Ler o paper de Groll et al. (2019) — padrão de ouro definindo o campo.
2. Abrir o **Formulator Pro** na BIA e formular sua primeira biotinta (preset "bioink-starter"): GelMA 10% + LAP 0,25% + L929 (5×10⁶/mL).
3. Explorar os 20+ templates clínicos do Formulator Pro na BIA (cartilagem, osso, pele, cornea, vaso).
4. Baixar o white paper **QMatrix** da biblioteca para ver uso de dECM como aditivo funcional em biotintas.
5. Avançar para o Módulo 4 (Bioimpressão 3D) — onde a biotinta encontra a impressora.
`,
  })

  console.log(`✓ M03 Biotintas (${r.action}, ${r.summaryChars} chars)`)
}

main().catch(e => { console.error(e); process.exit(1) })
