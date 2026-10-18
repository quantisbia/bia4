/**
 * R13.14.8 · Conteúdo denso do Módulo 07 — Tecidos
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "tecidos",
    lessonSlug: "tecidos-bioimpressao-aplicacoes",
    order: 1,
    title: "Tecidos — bioimpressão de pele, osso, cartilagem, tecidos moles e vasos",
    durationMin: 85,
    level: "intermediate",
    biaHook: { tool: "pipeline", label: "Projetar protocolo tecido-específico (BIA Pipeline)", params: { context: "tissues" } },

    objective: `Dominar os parâmetros específicos para bioimpressão dos 5 principais tecidos trabalhados em pesquisa clínica — pele, osso, cartilagem, tecidos moles e vasos — reconhecendo trade-offs mecânicos, biológicos e regulatórios de cada aplicação.

Ao final desta aula você será capaz de:
1. Mapear os requisitos específicos de pele (barreira, elasticidade), osso (rigidez, osteocondução), cartilagem (viscoelasticidade, hipóxia), tecidos moles (vascularização, inervação) e vasos (perfusão, hemocompatibilidade).
2. Escolher biomaterial + célula + arquitetura adequados para cada tecido-alvo.
3. Reconhecer os casos clínicos de referência (bexiga de Atala, traqueia de Macchiarini, orelha da Cornell).
4. Identificar os maiores desafios por tecido (vascularização, inervação, maturação, integração).
5. Projetar roadmap experimental: in vitro → animal pequeno → animal grande → clínica.`,

    summary: `## Contexto

Depois de dominar biomateriais (M2), biotintas (M3), impressão (M4), arquitetura (M5) e células (M6), chegamos ao ponto onde esses componentes convergem para o produto final: **o tecido vivo bioimpresso**. Cada tecido do corpo tem requisitos únicos que determinam todos os passos anteriores — não existe "protocolo universal" de bioimpressão. Pele é mole, elástica, barreira. Osso é rígido, mineralizado, vascularizado. Cartilagem é viscoelástica, hipóxica, avascular. Essa aula dá o framework para pensar tecido-específico.

A história começou com [Anthony Atala em 1999](https://doi.org/10.1016/S0140-6736(06)68438-9) — primeiro tecido bioengenheirado implantado em humanos foi uma bexiga autóloga em pacientes com bexiga neurogênica. Desde então, vimos avanços concretos: pele bioimpressa com Integra (hoje padrão para queimados), scaffolds de PCL para calota craniana (Instituto Gandu, Brasil), cartilagem de orelha impressa 3D (Cornell + 3DBio Therapeutics). Mas também vimos fracassos retumbantes — a traqueia sintética de Macchiarini (2008-2016) matou 7 pacientes e virou um dos maiores escândalos científicos do século, documentado em [The Lancet (2016)](https://doi.org/10.1016/S0140-6736(16)31675-1).

O cenário atual: tecidos simples (pele, cartilagem auricular, pequenos vasos) estão chegando à clínica. Tecidos complexos vascularizados (fígado, rim, coração) continuam a 10-20 anos de uso clínico — o gargalo é a vascularização de constructos espessos (regra dos 200 μm). Resto da aula: um panorama dos 5 tecidos mais estudados.

## Conceitos-chave

### 1. Pele — o tecido mais maduro clinicamente

**Arquitetura in vivo**: epiderme (queratinócitos estratificados, 50-150 μm) + derme (fibroblastos + MEC + folículos pilosos + glândulas, 1-4 mm) + hipoderme (adipócitos). Vascularização via plexo dérmico.

**Requisitos de bioimpressão**:
- Camada dérmica: colágeno + fibrina + fibroblastos (densidade 1-5x10⁶/mL)
- Camada epidérmica: queratinócitos (3-5x10⁶/mL) aplicados sobre derme pré-maturada
- Mecânica: módulo 2-20 kPa (muito mole, comparado a músculo)
- Vascularização: HUVEC + pericitos para redes capilares
- Pigmentação (opcional): melanócitos

**Estado da arte**:
- **Integra® (Integra Life Sciences)** — matriz dérmica acelular com camada superior de silicone (padrão para queimados graves, FDA desde 1996)
- **Pele bioimpressa in situ** — [Albanna et al. (2019)](https://doi.org/10.1038/s41598-018-38366-w) demonstrou impressora móvel que escaneia a ferida e deposita bioink in situ (bancada → clínica em 2024)
- **Poieskin®** — pele vascularizada bioimpressa (Universidade de Bordeaux + Poietis)

**Desafios abertos**: folículos pilosos funcionais, glândulas sudoríparas, inervação sensorial, pigmentação uniforme.

### 2. Osso — rigidez + bioatividade + vascularização

**Arquitetura in vivo**: cortical denso (porosidade <10%, módulo 15-20 GPa) + trabecular esponjoso (porosidade 50-90%, módulo 0,1-2 GPa) + canal medular. Vascularização via canais de Havers.

**Requisitos de bioimpressão**:
- Biomaterial: PCL ou PLA + hidroxiapatita/β-TCP (bioativo), ou cerâmicas puras (CaP, biovidro)
- Células: MSC (medula óssea ou adiposo) + osteoblastos ou pré-osteoblastos
- Fatores: BMP-2/7, VEGF, PDGF
- Arquitetura: TPMS Gyroid 60-70% porosidade (biomimético do trabecular)
- Mecânica: módulo ≥100 MPa (polímero) ou GPa (cerâmica)

**Estado da arte**:
- **Scaffolds de PCL + nano-HA** — Universidade de São Paulo (IFSC), impressos para defeitos ósseos até 5 cm³
- **BoneCad® (Osteobio)** — scaffold ortopédico brasileiro, PCL impresso 3D, aprovação ANVISA
- **CT-Bone (Xilloc, Holanda)** — hidroxiapatita impressa, personalizada por tomografia

**Desafios abertos**: vascularização de constructos >1 cm³, integração com osso nativo em defeitos críticos, resistência à carga mecânica imediata.

### 3. Cartilagem — avascular, hipóxica, viscoelástica

**Arquitetura in vivo**: 4 zonas (superficial, média, profunda, calcificada), condrócitos esparsos (3-5% volume), matriz rica em colágeno II + agrecana. Avascular, aneural, alinfática. Nutrição por difusão do líquido sinovial.

**Requisitos de bioimpressão**:
- Biomaterial: GelMA, HAMA, alginato, dECM cartilaginoso
- Células: condrócitos primários (biópsia) ou MSC diferenciadas condrogênicamente (TGF-β3, dexametasona, insulina)
- Densidade: 15-30x10⁶ células/mL (alta — cartilagem é células-dependente)
- Hipóxia: 2-5% O₂ in vitro (mimético do ambiente nativo)
- Mecânica: módulo 0,5-2 MPa, viscoelasticidade

**Estado da arte**:
- **AuriNovo® (3DBio Therapeutics)** — orelha bioimpressa com cartilagem autóloga, implantada em paciente com microtia (2022, primeira do mundo)
- **CARTIGEL (Universidade de Twente)** — cartilagem articular bioimpressa
- **TissueTinted (CELLINK)** — construct de GelMA + condrócitos para joelho

**Desafios abertos**: integração com cartilagem nativa (interface defeito-tecido), zona calcificada, resistência à carga cíclica.

### 4. Tecidos moles — a fronteira da vascularização

Inclui: fígado, rim, coração, músculo esquelético, nervo, mama, pele profunda.

**O gargalo universal**: a **regra dos 200 μm** (Jain, 2005) — células >200 μm de um capilar necrosam por hipóxia. Qualquer tecido mole bioimpresso >1 mm precisa de rede vascular embebida.

**Estratégias de vascularização**:
1. **Co-cultura (self-assembly)** — HUVEC + pericitos + células parenquimatosas → vasos emergem espontaneamente em 7-14 dias (Lewis Lab, Harvard)
2. **Canais pré-impressos sacrificiais** — Pluronic F-127 ou carboidrato impresso + removido → canais vazios → endotelialização posterior (Kolesky et al. 2016)
3. **Angiogênese induzida por VEGF** — gradientes de VEGF no scaffold atraem vasos do hospedeiro após implante
4. **Pré-vascularização in vivo** — scaffold implantado em sítio ectópico (tecido subcutâneo) por 2-4 semanas → ganha vasos → transplantado para sítio alvo

**Estado da arte**:
- **Coração parcial** — Feinberg Lab (CMU) imprimiu componentes cardíacos funcionais em colágeno via FRESH (2019)
- **Mini-fígado** — Lewis Lab bioimprimiu organoides hepáticos vascularizados mantendo função por 30 dias in vitro
- **Nervo periférico** — PCL + Schwann cells para gaps de 1-5 cm (fase clínica)
- **Músculo esquelético** — Atala Lab regenerou músculo de ratos com defeito volumétrico (VML) usando bioscaffold ECM

**Desafios abertos**: tudo. Fígado funcional in vivo, rim completo, coração batendo. Previsão realista: 20-30 anos.

### 5. Vasos sanguíneos — da pequena à grande

**Classes de vasos por diâmetro**:
- **Macrovasos** (>5 mm) — aorta, carotídea, femoral. Fácil fabricar com polímeros (Dacron, ePTFE). Problema: trombogenicidade de pequeno diâmetro.
- **Médios** (1-5 mm) — coronárias, poplíteas. Enxerto autólogo (safena, mamária) é padrão. Alternativa bioimpressa: TEVG (tissue-engineered vascular grafts).
- **Microvasos** (<100 μm) — capilares. Impossível de fabricar; precisa emergir por angiogênese.

**Requisitos de bioimpressão** (foco em TEVG, 2-6 mm):
- Biomaterial: PCL + fibrina ou dECM vascular (SIS, aorta descelularizada)
- Células: HUVEC (lúmen) + SMC vascular (média) + fibroblastos (adventícia)
- Mecânica: resistência à pressão arterial (120 mmHg), compliance similar ao vaso nativo
- Hemocompatibilidade: superfície luminal não-trombogênica

**Estado da arte**:
- **Lifeline Vascular Access (Humacyte)** — vasos bioengenheirados para pacientes dialíticos, >400 implantados (fase 3)
- **CARDIAX (Universidade de Yokohama)** — bioimpressão de coronárias
- **Freeform FRESH (CMU)** — impressão de árvores vasculares completas

**Desafios abertos**: estabilidade long-term (>5 anos), vasos de muito pequeno diâmetro, interface com vaso nativo (anastomose).

## Distinções que geram confusão (atenção!)

### Tecido-engenheirado ≠ órgão-engenheirado

**Tecido** — unidade funcional (pele, cartilagem, segmento vascular). Objetivo: substituir função específica.
**Órgão** — sistema complexo (fígado inteiro, coração, rim). Requer vascularização macro + sistema biliar/urinário/elétrico + inervação + múltiplos tipos celulares organizados.

Hoje: tecidos simples **chegaram à clínica**. Órgãos completos **estão a décadas** de uso clínico (exceto bexiga, que é mais tecido que órgão).

### Autólogo ≠ alogênico ≠ xenogênico

- **Autólogo** — células do próprio paciente (ex: condrócitos de biópsia de cartilagem). Zero rejeição, mas demorado e caro.
- **Alogênico** — células de outro humano (ex: MSC de banco de medula). Mais rápido, mas risco imunológico.
- **Xenogênico** — células de outra espécie (ex: Matrigel murino, SIS porcino). Imunogenicidade alta, questões regulatórias.

### Scaffold-based ≠ scaffold-free

**Scaffold-based** — células semeadas em estrutura 3D pré-fabricada (PCL impresso). Vantagem: suporte mecânico. Desvantagem: material estranho pode gerar fibrose.

**Scaffold-free** — tecido formado só com células + MEC endógena (esferoides fundidos via Kenzan, por exemplo). Vantagem: 100% biológico. Desvantagem: mecânica frágil, difícil escalar.

## Desafios técnicos (os 5 que definem a área)

1. **Vascularização de constructos espessos** — regra dos 200 μm. Até resolver, não teremos órgãos completos.

2. **Inervação funcional** — tecidos impressos sem nervos têm função reduzida. Pele sem nervos = pacientes queimados sem sensibilidade.

3. **Maturação pós-impressão** — construct recém-impresso ≠ tecido funcional. Precisa semanas-meses em biorreator para desenvolver propriedades mecânicas e metabólicas.

4. **Integração com tecido nativo** — interface defeito-tecido é zona de alta tensão mecânica e inflamação. Falha de integração = soltura do implante.

5. **Escalabilidade e GMP** — fazer 1 constructo é diferente de fazer 10.000 em qualidade farmacêutica. Boas práticas de fabricação (GMP) para biofabricação ainda estão em formação (ver Módulo 10 — Translação).

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros que custam anos de pesquisa:**

1. **Pular etapas do roadmap** — ir direto para animal grande sem validar em pequeno. Normal: in vitro (3-6 meses) → ratos/camundongos (6-12 meses) → coelhos/porcos (12-24 meses) → humanos (fase clínica).

2. **Não considerar vascularização desde o design** — bioimprimir "bloco" de hepatócitos de 2 cm e descobrir que necrosa em 3 dias.

3. **Comparar mecânica com tecido CADÁVER, não com NATIVO** — tecido cadáver é mais rígido que vivo (sem perfusão, sem metabolismo). Dados in vivo são padrão-ouro.

4. **Ignorar a interface defeito-tecido** — scaffold perfeito, interface péssima = soltura em 6 meses.

5. **Esquecer de patentear antes de publicar** — publicar em journal destrói possibilidade de patente em muitos países. Procurar escritório de inovação da sua instituição antes de submeter.

6. **Não envolver clínico desde o início** — pesquisador faz coisa impressionante que o cirurgião jamais implantaria. Co-design com médico é obrigatório.

## Artigos recomendados

**Atala A et al. · 2006**
Tissue-engineered autologous bladders for patients needing cystoplasty.
📰 *The Lancet*
DOI: [10.1016/S0140-6736(06)68438-9](https://doi.org/10.1016/S0140-6736(06)68438-9)

**Lee A et al. · 2019**
3D bioprinting of collagen to rebuild components of the human heart.
📰 *Science*
DOI: [10.1126/science.aav9051](https://doi.org/10.1126/science.aav9051)

**Kolesky DB et al. · 2016**
Three-dimensional bioprinting of thick vascularized tissues.
📰 *PNAS*
DOI: [10.1073/pnas.1521342113](https://doi.org/10.1073/pnas.1521342113)

**Albanna M et al. · 2019**
In Situ Bioprinting of Autologous Skin Cells Accelerates Wound Healing of Extensive Excisional Full-Thickness Wounds.
📰 *Scientific Reports*
DOI: [10.1038/s41598-018-38366-w](https://doi.org/10.1038/s41598-018-38366-w)

**Pati F et al. · 2014**
Printing three-dimensional tissue analogues with decellularized extracellular matrix bioink.
📰 *Nature Communications*
DOI: [10.1038/ncomms4935](https://doi.org/10.1038/ncomms4935)

**Jain RK · 2005**
Normalization of tumor vasculature: an emerging concept in antiangiogenic therapy.
📰 *Science*
DOI: [10.1126/science.1104819](https://doi.org/10.1126/science.1104819) (regra dos 200 μm)

## Principais pesquisadores do campo

- **Anthony Atala** (Wake Forest) — primeiro implante clínico; bexiga, vagina, uretra
- **Jennifer Lewis** (Harvard Wyss) — órgãos vascularizados, rim-on-chip, fígado
- **Adam Feinberg** (CMU) — FRESH, coração humano, válvulas
- **Dong-Woo Cho** (POSTECH, Coreia) — dECM bioinks, orelha, pele
- **Lijie Grace Zhang** (George Washington) — tecidos neurais, vasculares
- **Juvenal Kahl** (Instituto Gandu, Brasil) — bioimpressão clínica de calota craniana
- **Luiz Felipe Marcon** (Octomed Osteobio, Brasil) — scaffolds BoneCad®, aprovação ANVISA

## Congressos e sociedades científicas

**Internacionais:**
- **TERMIS World Congress** — maior evento de tecido engenharia
- **International Conference on Biofabrication (ISBF)** — foco bioprint
- **IEEE EMBC** — anual, sessões clínicas
- **ESBB (European Society for Biomaterials)** — Europa
- **Military Health System Research Symposium (MHSRS)** — EUA, tecidos para trauma

**Nacionais:**
- **SBB (Sociedade Brasileira de Biomateriais)** — anual
- **Congresso Brasileiro de Ortopedia e Traumatologia (CBOT)** — anual, interesse clínico em bioimpressão

**Periódicos específicos:**
- *Tissue Engineering Part A/B/C* (Mary Ann Liebert)
- *Journal of Tissue Engineering* (SAGE)
- *Biofabrication* (IOP)
- *Acta Biomaterialia*
- *Lancet* / *Nature Medicine* (quando chega à clínica)

## Próximos passos de estudo

1. Ler o paper de Atala (2006) — primeiro caso clínico, define o padrão para publicação de tissue-engineered implants.
2. Explorar o **BIA Pipeline** (biofabrication pipeline) e projetar o roadmap de um tecido do seu interesse.
3. Baixar o white paper QMatrix (biblioteca) — ver como dECM muda a formação de tecidos.
4. Avançar para o Módulo 8 (Esferoides e Organoides) — mergulho profundo em scaffold-free.
5. Em paralelo, acompanhar a trajetória regulatória do seu tecido-alvo (classe de risco ANVISA/FDA).
`,
  })
  console.log('✓ M07 Tecidos (' + r.action + ', ' + r.summaryChars + ' chars)')
}

main().catch(e => { console.error(e); process.exit(1) })
