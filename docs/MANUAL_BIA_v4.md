# MANUAL COMPLETO — BIA v4
## Biofabrication Intelligent Assistant
### Guia de Uso para Especialistas em Biofabricação

**Versão:** 4.0  
**Desenvolvido por:** Quantis Biotechnology  
**Responsável Técnica:** Janaina Dernowsek  
**Referência:** Estado da Arte 2024–2026

---

> *"BIA não substitui o especialista — ela amplifica sua capacidade técnica e científica para trabalhar na fronteira da biofabricação com velocidade e precisão de elite."*

---

## SUMÁRIO

1. [O que é a BIA v4](#1-o-que-é-a-bia-v4)
2. [Acesso e Autenticação](#2-acesso-e-autenticação)
3. [Dashboard Principal](#3-dashboard-principal)
4. [Módulo 1 — Pipeline de Design de Tecidos](#4-módulo-1--pipeline-de-design-de-tecidos)
5. [Módulo 2 — Biomateriais & Formulação IA](#5-módulo-2--biomateriais--formulação-ia)
6. [Módulo 3 — Bioimpressão 3D Avançada](#6-módulo-3--bioimpressão-3d-avançada)
7. [Módulo 4 — Organoid Builder](#7-módulo-4--organoid-builder)
8. [Módulo 5 — Protocolos GLP/GMP](#8-módulo-5--protocolos-glpgmp)
9. [Módulo 6 — Análises & Dossiês Regulatórios](#9-módulo-6--análises--dossiês-regulatórios)
10. [Módulo 7 — Chat com IA Especializada](#10-módulo-7--chat-com-ia-especializada)
11. [Módulo 8 — Base de Conhecimento Científico](#11-módulo-8--base-de-conhecimento-científico)
12. [Sistema de Créditos e Planos](#12-sistema-de-créditos-e-planos)
13. [Painel Administrativo](#13-painel-administrativo)
14. [Estratégias de Uso Avançado](#14-estratégias-de-uso-avançado)
15. [Glossário Técnico](#15-glossário-técnico)
16. [Casos de Uso Práticos — Fluxos Completos](#16-casos-de-uso-práticos--fluxos-completos)

---

## 1. O que é a BIA v4

A **BIA — Biofabrication Intelligence Agent v4** é uma plataforma de inteligência artificial especializada em biofabricação, desenvolvida pela **Quantis Biotechnology**. Ela integra o estado da arte científico de 2024–2026 em um único ambiente de trabalho para pesquisadores, engenheiros e especialistas em:

- Bioimpressão 3D (EBB, DLP/SLA, Inkjet, LASER/LIFT, FRESH, Coaxial)
- Engenharia de tecidos e órgãos
- Biomateriais, hidrogéis e scaffolds
- Design e produção de organoides
- Regulatório (FDA, ANVISA, EMA/CTD)
- Protocolos laboratoriais GLP/GMP

### Motor de IA

A BIA v4 é alimentada pelo **Google Gemini 2.5 Flash** com um prompt mestre especializado que contém:

| Domínio | Cobertura |
|---------|-----------|
| Bioimpressão 3D | 6 tecnologias, parâmetros completos de slicer e biotinta |
| Biomateriais | 807+ formulações validadas na literatura |
| Reologia | Modelos Herschel-Bulkley, Casson, Power-Law |
| Regulatório | FDA 510(k)/PMA, ANVISA RDC 185/CFR 820, EMA CTD |
| Células-tronco | iPSC, MSC, ESC, células primárias |
| Tecidos | Cartilagem, osso, pele, fígado, coração, rim, pulmão, retina |
| Protocolos | ISO 10993, GLP/GMP, ASTM, ABNT |

### Filosofia da Plataforma

A BIA opera como um **co-especialista técnico** — não como um chatbot genérico. Cada módulo foi treinado para responder com:

- Números exatos (concentrações, temperaturas, pressões, tempos)
- Referências bibliográficas com DOI
- Parâmetros de equipamentos específicos
- Alertas de pontos críticos de controle (CCPs)
- Contexto regulatório aplicado

---

## 2. Acesso e Autenticação

### 2.1 URL de Acesso

```
https://[URL-DA-PLATAFORMA]/auth/login
```

### 2.2 Credenciais

| Tipo | Email | Senha | Observação |
|------|-------|-------|-----------|
| Admin Principal | janaina.dernowsek@quantis.bio | Quantis@2026! | Acesso total, créditos ilimitados |
| Demo | demo@bia.com | demo1234 | Plano FREE, 10 créditos |

### 2.3 Primeiro Acesso

1. Acesse a URL da plataforma
2. Clique em **"Entrar na plataforma"**
3. Após login, você será redirecionado automaticamente ao **Dashboard**
4. Se aparecer tela de login em loop: **limpe os cookies do browser** ou use uma aba anônima (Ctrl+Shift+N)

### 2.4 Criar Nova Conta

1. Na tela de login, clique em **"Criar grátis →"**
2. Preencha nome, email institucional e senha (mínimo 6 caracteres)
3. Conta criada com plano **DISCOVERY** (500 créditos iniciais)

### 2.5 Recuperar Sessão

O JWT tem validade de **30 dias**. Para forçar atualização de créditos/plano:
- Sair e entrar novamente
- Ou acionar o botão de refresh no painel admin (para administradores)

---

## 3. Dashboard Principal

O Dashboard é o centro de comando da BIA v4. Ele exibe em tempo real:

### 3.1 Cards de Métricas

| Card | O que mostra |
|------|-------------|
| **Créditos** | Saldo atual com alerta visual quando ≤ 50 |
| **Pipelines** | Número total de projetos criados |
| **Chats IA** | Sessões de conversa ativas |
| **Protocolos** | Documentos gerados e salvos |

### 3.2 Ações Rápidas

8 atalhos diretos para os módulos principais:

| Ação | Módulo de Destino |
|------|-----------------|
| 🔀 Novo Pipeline | Design de Tecido — 12 etapas |
| 🧪 Formular Biomaterial | Formulação por IA |
| 🖨️ Bioimpressão 3D | Slicer + GCode + Análise |
| ⭕ Organoid Builder | Design de organoides |
| 📄 Protocolos GLP/GMP | Gerador de protocolos |
| 🔬 Análises & Dossiês | Análises científicas e regulatório |
| 💬 Chat com IA | Consulta especializada |
| 📚 Base de Conhecimento | Artigos científicos curados |

### 3.3 Navegação

**Desktop:** Sidebar lateral esquerda com ícones e labels  
**Mobile:** Barra de navegação inferior (bottom nav) + menu hambúrguer

---

## 4. Módulo 1 — Pipeline de Design de Tecidos

**Localização:** `/dashboard/pipeline`  
**Custo:** 5 créditos por etapa analisada  
**Plano mínimo:** DISCOVERY

### 4.1 O que é o Pipeline

O Pipeline é o **módulo mais estratégico** da BIA v4. Ele guia o pesquisador através de **12 etapas sequenciais e interligadas** para o design completo de um tecido biofabricado — desde a definição do tecido alvo até a translação clínica.

É equivalente a ter um **especialista sênior** revisando cada decisão técnica do projeto, apontando parâmetros ideais, riscos e próximos passos.

### 4.2 As 12 Etapas do Pipeline

| # | Etapa | O que a IA analisa |
|---|-------|-------------------|
| 1 | **Definição do Tecido Alvo** | Histologia, biomarcadores, composição ECM, requisitos funcionais |
| 2 | **Estratégia de Scaffolding** | Arquitetura 3D, porosidade, hierarquia de poros, vascularização |
| 3 | **Seleção de Biomateriais** | Compatibilidade mecânica, degradação, biocompatibilidade, crosslinking |
| 4 | **Incorporação Celular** | Tipo celular, fonte, densidade de semeadura, viabilidade pós-impressão |
| 5 | **Fatores de Crescimento** | Concentrações, timing, modo de entrega, sinalização molecular |
| 6 | **Bioimpressão/Fabricação** | Tecnologia, parâmetros de impressão, GCode, fidelidade estrutural |
| 7 | **Cultura em Biorreator** | Tipo de biorreator, perfusão, oxigenação, shear stress |
| 8 | **Caracterização Mecânica** | Módulo de Young, G', G'', DMA, compressão, tração |
| 9 | **Análise Bioquímica** | FTIR, NMR, ELISA, Western Blot, proteômica |
| 10 | **Testes de Viabilidade** | Live/Dead, MTT/CCK-8, ALP, Ki-67, citometria |
| 11 | **Validação Funcional** | Ensaios funcionais específicos do tecido, in vitro, ex vivo |
| 12 | **Translação Clínica** | Regulatório, escalabilidade, GMP, dossiê técnico |

### 4.3 Como Criar um Pipeline

**Passo 1:** Clique em **"+ Novo Pipeline"**

**Passo 2:** Preencha os campos:

```
Nome do projeto:    [ex: Cartilagem Articular — Joelho v1]
Tipo de tecido:     [ex: Cartilagem Hialina]
Aplicação clínica:  [ex: Reparo de lesão articular focal — joelho]
Fonte celular:      [ex: MSC da medula óssea humana] (opcional)
```

> **Dica de especialista:** Seja específico! Em vez de "cartilagem", escreva "cartilagem hialina articular do joelho — lesão focal ICRS grau III". Quanto mais contexto, mais precisa é a análise da IA.

**Passo 3:** Após criar, você verá os **12 estágios** na interface. O Estágio 1 estará em andamento (IN_PROGRESS).

**Passo 4:** Clique em **"Analisar Etapa"** para cada estágio. A IA irá:
- Gerar recomendações técnicas específicas para o seu projeto
- Apontar parâmetros com valores numéricos exatos
- Listar alertas e pontos críticos de controle
- Sugerir os próximos passos

### 4.4 Output de Cada Etapa

Cada análise retorna um JSON estruturado com:

```json
{
  "stage": 3,
  "stageName": "Seleção de Biomateriais",
  "recommendation": "Para cartilagem hialina articular...",
  "parameters": {
    "gelma_concentration": "7-10% w/v",
    "crosslinking_method": "UV 365nm, 30-60s",
    "cell_viability_expected": ">85%",
    "elastic_modulus": "2-10 kPa"
  },
  "warnings": [
    "Concentrações >12% podem reduzir viabilidade pós-impressão",
    "Verificar grau de funcionalização do GelMA (>80% recomendado)"
  ],
  "nextSteps": [
    "Realizar teste reológico antes da bioimpressão",
    "Confirmar compatibilidade com MSC em ensaio Live/Dead 24h"
  ]
}
```

### 4.5 Melhores Práticas do Pipeline

- **Analise em sequência** — cada etapa alimenta a próxima
- **Um projeto por tipo de tecido** — não misture cartilagem com osso no mesmo pipeline
- **Documente as decisões** — use os outputs como base para seu relatório científico
- **Use o histórico** — projetos são salvos permanentemente na sua conta

---

## 5. Módulo 2 — Biomateriais & Formulação IA

**Localização:** `/dashboard/biomaterials`  
**Custo (formulação):** 10 créditos por formulação gerada  
**Custo (busca):** Gratuito  
**Plano mínimo:** DISCOVERY

### 5.1 Funcionalidades

O módulo de biomateriais tem **duas funções principais**:

#### A) Biblioteca de Biomateriais

Banco de dados com biomateriais científicos validados, pesquisável por:
- Nome (ex: "GelMA", "alginato", "fibrina")
- Categoria (Hidrogel, Scaffold, Bioink, Membrana, etc.)
- Aplicação clínica

Cada biomaterial exibe:
- Composição química
- Aplicações clínicas
- Tipos de tecidos compatíveis
- Método de crosslinking
- Tags científicas

#### B) Formulador IA

Gera uma formulação personalizada de biomaterial baseada nos seus requisitos clínicos específicos.

### 5.2 Categorias de Biomateriais

| Categoria | Exemplos |
|-----------|---------|
| **HYDROGEL** | GelMA, Alginato, Fibrina, Colágeno tipo I, HA, Quitosana, PEGDA, Matrigel |
| **SCAFFOLD** | PCL, PLGA, PLLA, TCP, HA sintética, titânio poroso |
| **BIOINK** | GelXA (GelMA+Alginato), CELLINK, dECM, compostos de quitosana |
| **MEMBRANE** | Membranas de diálise, filtros de PVDF, membranas de colágeno |
| **COMPOSITE** | PCL+HA, GelMA+CNT, Alginato+SiNPs |
| **DECELLULARIZED** | dECM de fígado, coração, rim, derme |
| **NANOPARTICLE** | PLGA-NP, lipossomos, quantum dots |

### 5.3 Como Usar o Formulador IA

**Passo 1:** Clique em **"Formular com IA"** (botão com ícone ✨)

**Passo 2:** Preencha o formulário:

```
Aplicação:     [ex: Bioimpressão de cartilagem articular via extrusão]
Tipo de tecido:[ex: Cartilagem hialina — zona superficial]

Requisitos (opcionais):
☑ Biodegradável          ☑ Imprimível (Printable)
☐ Transparente           ☑ Carregado com células (Cell-laden)
Rigidez alvo:  [ex: 2-10 kPa — equivalente à cartilagem hialina nativa]
```

**Passo 3:** A IA retorna uma formulação completa com:

```
Nome da formulação
Categoria
Composição (% w/v, concentrações)
Método de crosslinking
Propriedades mecânicas esperadas
Propriedades biológicas
Aplicações recomendadas
Protocolo de preparação (passo a passo)
Considerações e alertas
Referências bibliográficas com DOI
```

### 5.4 Biomateriais Chave — Referência Rápida

| Biomaterial | Concentração Típica | Crosslinking | G' Típico | Uso Principal |
|-------------|--------------------|-----------|---------|--------------| 
| GelMA | 5–15% w/v | UV 365nm, 30–60s | 0.1–50 kPa | Bioimpressão geral |
| Alginato Na | 1–4% w/v | CaCl₂ 50–200 mM | 0.1–10 kPa | Encapsulamento celular |
| Fibrina | 5–30 mg/mL | Trombina 1–10 U/mL | 0.05–5 kPa | Wound healing, vascular |
| Colágeno I | 1–8 mg/mL | Térmico 37°C | 0.01–1 kPa | Modelos 3D in vitro |
| PCL | 15–25% w/v | Solidificação térmica | >1 MPa | Scaffolds ósseos rígidos |
| HA-MA | 2–4% w/v | UV crosslink | 0.1–20 kPa | Cartilagem, articular |
| PEGDA | 5–20% w/v | UV/vis fotopolim. | 1–100 kPa | Scaffolds modulares |
| Quitosana | 1–3% w/v | pH/TPP | 0.5–20 kPa | Antimicrobiano, pele |
| GelXA | GelMA5%+Alg2% | UV + CaCl₂ (duplo) | 2–20 kPa | Alta fidelidade de impressão |

---

## 6. Módulo 3 — Bioimpressão 3D Avançada

**Localização:** `/dashboard/bioprinting`  
**Custo (análise IA):** 6 créditos por análise  
**Plano mínimo:** DISCOVERY

### 6.1 Visão Geral

O módulo de bioimpressão é o **mais técnico** da plataforma. Ele funciona como um **motor computacional** que integra:

- Configurador de parâmetros de slicer
- Seletor de biotinta com propriedades reológicas
- Gerador de GCode compatível com bioimpressoras
- Estimador de reologia (viscosidade, yield stress, tixotropia)
- Analisador IA de printabilidade
- Consultor regulatório integrado
- Banco de dados com 807 biomateriais

### 6.2 As 6 Abas do Módulo

#### Aba 1: Fatiamento (Slicer)

Configure os parâmetros de impressão:

| Parâmetro | Faixa | Unidade | Impacto |
|-----------|-------|---------|---------|
| Velocidade de impressão | 1–30 | mm/s | Resolução vs. tempo |
| Altura de camada | 50–400 | µm | Resolução vertical |
| Espaçamento entre filamentos | 200–800 | µm | Porosidade interna |
| Pressão de extrusão | 10–600 | kPa | Flowrate e deformação celular |
| Temperatura do bico | 4–37 | °C | Fluidez da biotinta |
| Temperatura da plataforma | 4–37 | °C | Suporte da estrutura |
| Diâmetro do bico | 200–400 | µm | Resolução, viabilidade celular |

**Preenchimento (Infill):**
- Grid (0°/90°) — padrão, alta resistência isotrópica
- Diagonal (45°/–45°) — melhor para tecidos com carga
- Hexagonal — máxima porosidade uniforme
- Concêntrico — ideal para estruturas tubulares

#### Aba 2: Biotinta

Seleção da biotinta com parâmetros pré-configurados:

| Biotinta | Concentração | Temp. | Nota Técnica |
|----------|-------------|-------|-------------|
| GelMA | 5–15% | 37°C | Fotocrosslink UV 365nm 30–60s |
| Alginato de Sódio | 2–4% | 25°C | CaCl₂ 50–200 mM crosslink iônico |
| Fibrina | 10–30 mg/mL | 37°C | Trombina 1–5 U/mL, gelifica 5–10 min |
| Colágeno Tipo I | 1–5 mg/mL | 4°C | Imprimir a 4°C, gelifica a 37°C |
| Quitosana | 1–3% | 25°C | Crosslink pH ou TPP |
| HA-MA (Hialuronato) | 2–4% | 25°C | UV crosslink, G' 100–2000 Pa |
| PCL | 100% puro | 90°C | Extrusão 90–100°C, scaffolds rígidos |
| Formulação Custom | — | — | Parâmetros totalmente personalizados |

#### Aba 3: DB 807

Banco de dados com **807 formulações** de biomateriais validadas na literatura científica. Pesquisa por:
- Nome do material
- Aplicação clínica
- Propriedades mecânicas alvo

#### Aba 4: Reologia

**Estimador computacional de reologia** — calcula em tempo real:

| Propriedade | Significado Prático |
|-------------|---------------------|
| **Viscosidade** (mPa·s) | Fluidez durante a impressão |
| **Yield Stress** (Pa) | Tensão mínima para extrudar |
| **Índice de fluxo (n)** | n<1 = pseudoplástico (ideal para bioimpressão) |
| **Tixotropia** | Capacidade de recuperação após cisalhamento |
| **Printabilidade Score** | 0–100% de adequação para impressão |

O módulo também exibe:
- Gráfico de viscosidade vs. taxa de cisalhamento
- Janela de impressão segura (pressão × velocidade)
- Análise de shear stress sobre as células (μPa → correlação com viabilidade)

#### Aba 5: Análise IA

**Motor completo de análise** integrando todos os parâmetros configurados:

Inputs necessários:
```
Tipo de tecido alvo:     [ex: Cartilagem articular — zona profunda]
Aplicação clínica:       [ex: Implante de reparo focal — joelho adulto]
Composição da biotinta:  [preenchido automaticamente da Aba 2]
Parâmetros de slicer:    [preenchidos automaticamente da Aba 1]
```

A análise retorna:
- Score geral de viabilidade estimada (%)
- Score de fidelidade estrutural (%)
- Parâmetros otimizados sugeridos (com base na literatura)
- Alertas específicos (pressão excessiva, shear stress crítico, temperatura inadequada)
- Protocolo pós-impressão recomendado (crosslinking, lavagem, cultura)
- GCode gerado para a estrutura configurada

#### Aba 6: Regulatório

Consultor regulatório especializado em dispositivos bioimpressos:

| Mercado | Framework | Cobertura |
|---------|-----------|-----------|
| **EUA** | FDA 21 CFR 820, ISO 13485, FDA Additive Manufacturing Guidance 2017 | 510(k), PMA, De Novo |
| **Brasil** | ANVISA RDC 185/2001, RDC 40/2015, IN 08/2021 | Classe II, III, IV |
| **Europa** | MDR (EU) 2017/745, EMA CTD, ISO 14971 | CE Mark, PMS |

### 6.3 GCode Gerado — Exemplo

```gcode
; BIA v4 GCode — GelMA 10%
; Tecido: Cartilagem articular
; Resolução: 200 µm camada, 400 µm espaçamento
; Pressão: 80 kPa | Velocidade: 10 mm/s

G28 ; Home all axes
G1 Z0.2 F300

; Layer 1 — Grid 0°
G1 X10 Y10 F600
M3 S80  ; Pressão ON 80 kPa
G1 X50 Y10
G1 X50 Y12
G1 X10 Y12
...
M5     ; Pressão OFF

; UV Crosslinking pause
M400   ; Wait for moves to finish
G4 P30000 ; Pause 30s for UV exposure

; Layer 2 — Grid 90°
...
```

### 6.4 Tecnologias de Bioimpressão — Guia de Seleção

| Tecnologia | Resolução | Viabilidade Celular | Melhor Para |
|-----------|-----------|---------------------|------------|
| **Extrusão (EBB)** | 100–1000 µm | 60–95% | Scaffolds grandes, alta densidade celular |
| **Inkjet** | 20–100 µm | >90% | Alta resolução, baixa viscosidade |
| **DLP/SLA** | 25–100 µm | 85–95% | Geometrias complexas, GelMA/PEGDA |
| **FRESH** | 200–400 µm | >95% | Biotintas muito macias (colágeno, fibrina) |
| **Laser (LIFT)** | <1 µm | >95% | Micropatterning, biossensores |
| **Coaxial** | 300–500 µm | >90% | Estruturas vasculares (hollow channels) |

---

## 7. Módulo 4 — Organoid Builder

**Localização:** `/dashboard/organoids`  
**Custo:** 15 créditos por design  
**Plano mínimo:** DISCOVERY

### 7.1 O que são Organoides

Organoides são estruturas tridimensionais que mimetizam a arquitetura e função de órgãos reais, derivadas de células-tronco (iPSC, ESC) ou células adultas. A BIA v4 gera protocolos completos de diferenciação e cultura para 7 tipos de organoides.

### 7.2 Tipos de Organoides Disponíveis

| Tipo | Ícone | Modela | Aplicações Principais |
|------|-------|--------|----------------------|
| **Intestinal** | 🫁 | Cripta-vilo, absorção, barreira | Doença de Crohn, microbioma, absorção oral |
| **Hepático** | 🫀 | Metabolismo, detox, bile | Toxicidade, DILI, cirrose, doença metabólica |
| **Neural** | 🧠 | Córtex cerebral, mini-brain | Alzheimer, esquizofrenia, desenvolvimento neural |
| **Cardíaco** | ❤️ | Cardiomiócitos, contratilidade | Cardiotoxicidade, arritmia, IC, doenças raras |
| **Renal** | 🫘 | Néfrons, filtração glomerular | Nefrotoxicidade, DRC, renovascular |
| **Pancreático** | 🔬 | Ilhotas, insulina, glucagon | Diabetes tipo 1, screening de antidiabéticos |
| **Pulmonar** | 🌬️ | Alvéolos, surfactante, barreira | Asma, DPOC, infecções respiratórias, SARS |

### 7.3 Fontes Celulares

| Fonte | Abreviação | Potencial | Vantagens | Limitações |
|-------|-----------|---------|-----------|-----------|
| iPSC humanas | iPSC | Pluripotente | Ilimitado, patient-specific | Tempo longo (2–4 meses) |
| ESC humanas | ESC | Pluripotente | Bem caracterizadas | Questões éticas |
| Células-tronco adultas | Adult_Stem | Multipotente | Fácil acesso, autóloga | Potencial limitado |
| Células primárias | Primary | Diferenciadas | Fisiologicamente relevantes | Disponibilidade limitada |

### 7.4 Como Criar um Organoid Design

**Passo 1:** Selecione o **tipo de organoide** no grid ou no menu mobile

**Passo 2:** Descreva o **propósito** (mínimo 5 caracteres, seja detalhado):

```
Exemplos de propósito bem descritos:
✅ "Modelo de toxicidade hepática para screening de hepatotoxinas DILI — painel FAO/WHO"
✅ "Estudo de diferenciação de iPSC em hepatócitos maduros com função CYP3A4 para metabolismo de fármacos"
✅ "Mini-brain para estudo de progressão do Alzheimer — placas Aβ e fosforilação tau"

✗ "Teste de tóxico" (muito vago — IA não conseguirá ser específica)
```

**Passo 3:** Selecione a **fonte celular**

**Passo 4:** Clique em **"Gerar Design"**

### 7.5 Output do Organoid Builder

A IA gera um plano completo contendo:

**1. Protocolo de diferenciação** (passo a passo com:)
- Meios de cultura e suplementos (concentrações exatas)
- Fatores de crescimento (ng/mL, timing em dias)
- Condições de incubação (temperatura, CO₂, O₂)
- Pontos de controle e coleta de amostras

**2. Materiais e reagentes** (lista completa com fornecedores sugeridos)

**3. Timeline** (dias 0 até o organoide maduro — típicamente 14–60 dias)

**4. Marcadores esperados** (por fase de diferenciação)
```
iPSCs:           OCT4, SOX2, NANOG
Endoderma Def.:  FOXA2, SOX17, CXCR4
Progenitores:    HNF4A, AFP
Hepatócitos:     ALB, AAT, CYP3A4, MRP2
```

**5. Métricas de qualidade** (critérios de aceitação):
- Viabilidade celular (Live/Dead, ensaios de ATP)
- Marcadores específicos por IHC e qPCR
- Funcionalidade (secreção de albumina, produção de bile, atividade CYP)
- Morfologia (microscopia brightfield e confocal)

### 7.6 Histórico de Designs

Todos os designs são salvos automaticamente com:
- Tipo do organoide
- Propósito
- Data de criação
- Protocolo completo acessível a qualquer momento

---

## 8. Módulo 5 — Protocolos GLP/GMP

**Localização:** `/dashboard/protocols`  
**Custo:** 8 créditos por protocolo gerado  
**Plano mínimo:** DISCOVERY

### 8.1 O que são os Protocolos BIA

A BIA v4 gera **Procedimentos Operacionais Padrão (SOPs)** no formato GLP/GMP com rigor equivalente ao de laboratórios certificados ISO 17025 e FDA-compliant. Os protocolos são prontos para uso em ambiente laboratorial.

### 8.2 Tipos de Protocolos

| Tipo | Ícone | Exemplos de Uso |
|------|-------|----------------|
| **Cultura Celular** | 🔬 | SOPs de passagem, manutenção, descongelamento, criopreservação |
| **Síntese de Biomaterial** | 🧪 | Preparação de GelMA, crosslinking de alginato, solubilização de PCL |
| **Caracterização** | ⚗️ | Reologia, FTIR, SEM, ensaios mecânicos (DMA, compressão) |
| **Controle de Qualidade** | ✅ | QC/QA de lotes, critérios de liberação, rastreabilidade |
| **Bioimpressão 3D** | 🖨️ | Calibração, setup de parâmetros, pós-processamento, controles |
| **Esterilização** | 🛡️ | Autoclavagem, filtração, UV, ETO — com validação de ciclo |
| **Eletrofiação** | ⚡ | Scaffolds de fibras nanométricas — PVDF, PCL, colágeno |
| **Documentação Regulatória** | 📋 | Dossiês FDA, ANVISA, EMA — seções específicas por regulação |

### 8.3 Como Gerar um Protocolo

**Passo 1:** Clique em **"+ Novo Protocolo"**

**Passo 2:** Preencha o formulário:

```
Título:          [ex: Protocolo de Síntese de GelMA 10% para Bioimpressão de Cartilagem]
Tipo:            [Síntese de Biomaterial]
Contexto:        [ex: Preparação de biotinta GelMA 10% com fotoiniciador LAP 0.25% 
                  para bioimpressão por extrusão de construtos de cartilagem hialina.
                  Utilização imediata após síntese. Laboratório BSL-1.]
Tecido/Material: [ex: Cartilagem hialina articular]     (opcional)
Aplicação:       [ex: Bioimpressão por extrusão — pressão 80 kPa]  (opcional)
Req. Especiais:  [ex: Protocolo deve incluir validação de grau de funcionalização] (opcional)
```

> **Dica de elite:** Quanto mais contexto no campo "Contexto", mais específico e útil será o protocolo. Inclua: tipo de equipamento disponível, BSL do laboratório, volume esperado, restrições de tempo.

**Passo 3:** Clique em **"Gerar Protocolo"**  
A IA leva 15–30 segundos para gerar o documento completo.

### 8.4 Estrutura do Protocolo Gerado

Todo protocolo segue o formato GLP/GMP com seções obrigatórias:

```markdown
# TÍTULO DO PROTOCOLO

## 1. Objetivo
(2-3 frases sobre o propósito)

## 2. Escopo e Aplicabilidade
(quando e onde aplicar)

## 3. Materiais e Reagentes
| Item | Fornecedor | Catálogo | Concentração | Quantidade |
(tabela completa com fornecedores reais)

## 4. Equipamentos
| Equipamento | Especificações Técnicas |

## 5. Medidas de Segurança e EPI
(riscos específicos + EPIs necessários)

## 6. Procedimento
(passo a passo numerado com:
- Tempos exatos em minutos/horas
- Temperaturas em °C
- Concentrações em g/mL, %, M, mM
- ⚠️ Alertas em pontos críticos de controle)

## 7. Controles de Qualidade
(critérios de aceitação e rejeição)

## 8. Análise e Interpretação de Resultados
## 9. Troubleshooting
## 10. Referências Normativas
(normas ISO, ASTM, ABNT, FDA, ANVISA)
## 11. Registros e Documentação
```

### 8.5 Exportar Protocolo

Após gerar, clique em **"Baixar .md"** para exportar o protocolo em formato Markdown, que pode ser:
- Convertido para PDF via pandoc ou qualquer editor Markdown
- Importado para sistemas de gestão de qualidade (LIMS, ELN)
- Convertido para Word via ferramentas online

### 8.6 Biblioteca de Protocolos

Todos os protocolos são salvos na biblioteca pessoal com:
- Título, tipo e data de criação
- Busca por tipo ou nome
- Acesso ao conteúdo completo a qualquer momento

---

## 9. Módulo 6 — Análises & Dossiês Regulatórios

**Localização:** `/dashboard/analyses`  
**Custo:** 10–20 créditos por análise (varia por tipo)  
**Plano mínimo:** ADVANCED (para laboratório) / ENTERPRISE (para pré-clínico/regulatório)

> **Nota Admin/ACADEMY:** Administradores e usuários ACADEMY têm acesso irrestrito a todos os tipos de análise, independente do plano.

### 9.1 Categorias de Análise

#### Grupo 1: Análises Laboratoriais

| Tipo | Créditos | Plano | O que gera |
|------|---------|-------|-----------|
| **Molecular & Genômica** | 12 | ADVANCED | qRT-PCR (primer design), RNA-seq workflow, Western Blot (anticorpos, concentrações), ELISA, proteômica |
| **Bioquímica & Caracterização** | 10 | ADVANCED | FTIR (bandas esperadas), NMR, GPC (Mn, Mw, PDI), DSC/TGA, MTS/CCK-8, ALP activity |
| **Análise Celular** | 10 | ADVANCED | Live/Dead (concentrações calcein-AM/EthD-1), citometria (painel de anticorpos), Ki-67, MEV, F-actina |
| **Ensaios In Vitro** | 12 | ADVANCED | ISO 10993-5 (citotoxicidade), ISO 10993-12 (extração), degradação in vitro, diferenciação celular |

#### Grupo 2: Estudos Pré-Clínicos & Clínicos

| Tipo | Créditos | Plano | O que gera |
|------|---------|-------|-----------|
| **Estudo In Vivo** | 20 | ENTERPRISE | Modelo animal (rato, coelho, ovino), protocolo CEUA, endpoints, análise histológica H&E + IHC |
| **Estudo Pré-Clínico** | 20 | ENTERPRISE | Pacote completo pré-clínico: farmacocinética, toxicologia (ISO 10993-11), biomarcadores séricos |
| **Ensaio Clínico** | 20 | ENTERPRISE | Protocolo Fase I/II/III, endpoints primários, tamanho amostral, randomização, CONSORT |

#### Grupo 3: Documentação Regulatória

| Tipo | Créditos | Plano | O que gera |
|------|---------|-------|-----------|
| **Dossiê Regulatório** | 20 | ENTERPRISE | Estratégia regulatória geral, vias de aprovação, classificação do dispositivo |
| **POP Regulatório** | 12 | ADVANCED | Procedimento operacional para rastreabilidade, controle de documentos |
| **Dossiê FDA 510(k)** | 20 | ENTERPRISE | Sumário substancial equivalência, testes predicate device, tabelas CDRH |
| **Dossiê ANVISA** | 20 | ENTERPRISE | Dossiê RDC 185, seções obrigatórias, lista de documentos INMETRO/ABNT |
| **Dossiê CTD/EMA** | 20 | ENTERPRISE | Common Technical Document format, módulos M1–M5, requisitos EMA |

### 9.2 Como Gerar uma Análise

**Passo 1:** Clique em **"+ Nova Análise"**

**Passo 2:** Selecione o tipo de análise no grid visual

**Passo 3:** Preencha o formulário:

```
Título:      [ex: Análise Molecular — Diferenciação Condrogênica de MSCs em GelMA 10%]
Contexto:    [ex: MSCs de medula óssea humana encapsuladas em GelMA 10% crosslinkado por UV.
              Cultura em meio condrogênico (TGF-β3, dexametasona) por 21 dias.
              Avaliação da expressão de COL2A1, ACAN, SOX9, COMP.
              Comparação com pellet 3D como controle positivo.]
Objetivo:    [ex: Demonstrar diferenciação condrogênica e deposição de ECM no hidrogel]
Material:    [ex: GelMA 10% w/v, fotoiniciador LAP 0.25%]
Tipo tecido: [ex: Cartilagem hialina]
```

### 9.3 Output das Análises

Cada análise gera um **relatório técnico completo** de 2.000–6.000 palavras contendo:

**Para Análise Molecular:**
- Fundamento científico e justificativa
- Lista de ensaios recomendados com protocolos específicos
- Design experimental (grupos, replicatas, controles)
- Análise estatística (testes recomendados, poder amostral)
- Tabela de primers (qRT-PCR) com sequências e eficiências
- Anticorpos para Western Blot (fornecedor, diluição, MW esperado)
- Interpretação esperada dos resultados
- Referências bibliográficas com DOI

**Para Dossiê FDA 510(k):**
- Classificação do dispositivo e código de produto CDRH
- Identificação do predicate device
- Tabela de substancial equivalência
- Lista de testes obrigatórios (performance testing)
- Biocompatibilidade (ISO 10993)
- Requisitos de rotulagem (21 CFR 801)
- Documentos necessários

---

## 10. Módulo 7 — Chat com IA Especializada

**Localização:** `/dashboard/chat`  
**Custo:** 2 créditos por mensagem  
**Plano mínimo:** DISCOVERY

### 10.1 Modos de Chat

O chat tem 5 modos especializados, cada um com um sistema de prompt diferente:

| Modo | Código | Especialidade |
|------|--------|--------------|
| **Geral** | general | Especialista BIA v4 completo — todas as áreas |
| **Pipeline** | pipeline | Design de tecidos — 12 etapas, parâmetros técnicos |
| **Biomaterial** | biomaterial | Formulações, reologia, crosslinking, propriedades |
| **Organoide** | organoid | Diferenciação celular, cultura 3D, protocolos iPSC |
| **Protocolo** | protocol | SOPs laboratoriais, GLP/GMP, validação, normas |

### 10.2 Como Usar o Chat de Forma Eficiente

#### Perguntas de Alta Qualidade

A diferença entre uma resposta mediana e uma resposta de elite está na qualidade da pergunta.

**Nível Iniciante (evite):**
```
"Qual concentração de GelMA usar?"
```

**Nível Especialista (use):**
```
"Para bioimpressão por extrusão de cartilagem articular do joelho 
usando MSCs de medula óssea humana (5×10⁶ células/mL), qual concentração 
de GelMA recomendam para obter:
1. Viabilidade pós-impressão >85%
2. Módulo elástico G' entre 5–15 kPa
3. Boa printabilidade com bico de 27G (300µm) a 25°C
4. Crosslinking UV (365nm) sem dano celular?
Incluir parâmetros de concentração do fotoiniciador LAP."
```

#### Estrutura da Pergunta Ideal

```
CONTEXTO:   O que está fazendo, com qual material, em qual equipamento
OBJETIVO:   O que quer alcançar (com valores quantitativos quando possível)
RESTRIÇÕES: Limitações de equipamento, reagentes, tempo, BSL
PERGUNTA:   A questão técnica específica
```

### 10.3 Exemplos de Uso por Modo

#### Modo Biomaterial
```
"Preciso formular uma biotinta para impressão coaxial de microcanais 
vasculares com diâmetro interno de 500µm. O núcleo deve ser fugitivo 
(removível) e a casca deve manter as células endoteliais viáveis. 
Qual combinação de materiais recomenda para casca e núcleo? 
Parâmetros de pressão para ambos os inlets coaxiais?"
```

#### Modo Protocolo
```
"Gere um protocolo de calibração de bioimpressora por extrusão 
usando o método FilamentHeight Ratio (FHR) para biotinta de alginato 2%. 
Incluir: procedimento de priming, calibração de pressão, medição do FHR, 
critérios de aceitação e registro no caderno de laboratório (GLP)."
```

#### Modo Pipeline
```
"Estou na Etapa 7 (Cultura em Biorreator) do meu pipeline de pele.
A estrutura foi bioimpresa em GelMA 7% + Fibrina 5 mg/mL com queratinócitos
e fibroblastos dérmicos (4:1). Qual tipo de biorreator e condições 
de perfusão recomenda para maturação da pele artificial em 21 dias? 
Incluir parâmetros de shear stress e gradiente de oxigênio."
```

### 10.4 Gestão de Sessões

- Cada conversa é salva como uma **sessão separada** com título automático
- Sessões são exibidas na sidebar esquerda (desktop) ou no drawer mobile
- Histórico completo de mensagens é preservado por sessão
- Para contexto máximo: mantenha uma sessão por projeto ou assunto

---

## 11. Módulo 8 — Base de Conhecimento Científico

**Localização:** `/dashboard/knowledge`  
**Custo (busca com IA):** 1 crédito por busca com IA  
**Custo (busca simples):** Gratuito  
**Plano mínimo:** DISCOVERY

### 11.1 O que é a Base de Conhecimento

Biblioteca de artigos científicos **curados e verificados** sobre biofabricação, cobrindo os temas mais relevantes para pesquisadores da área. Os artigos incluem:
- Título, autores, abstract
- Revista, ano de publicação
- DOI com link direto
- Tags e palavras-chave
- Categorias temáticas

### 11.2 Categorias de Artigos

| Categoria | Cobertura Temática |
|-----------|-------------------|
| **Biomateriais** | Hidrogéis, scaffolds, propriedades físico-químicas, biocompatibilidade |
| **Eng. Tecidos** | ECM, diferenciação, vascularização, regeneração |
| **Organoides** | Protocolos iPSC, mini-brain, intestinais, hepáticos |
| **Bioimpressão** | Parâmetros de impressão, biotintas, tecnologias |
| **Células-tronco** | iPSC, MSC, diferenciação, reprogramação |
| **Biorreatores** | Perfusão, shear, oxigenação, escalabilidade |

### 11.3 Busca com Inteligência Artificial

Ative a opção **"Busca IA"** para receber além dos artigos um **sumário científico sintetizado pela IA**, conectando os achados dos artigos encontrados com a sua pergunta específica.

```
Exemplo de busca IA:
Query: "GelMA viabilidade celular bioimpressão"
+ IA Summary: "Com base nos artigos encontrados, a literatura 
  demonstra que concentrações de GelMA entre 7-10% (w/v) mantêm 
  viabilidade >85% pós-impressão quando crosslinkadas com LAP 
  0.25% e UV 365nm por 30-60s. GelMA et al. (2010) demonstrou..."
```

---

## 12. Sistema de Créditos e Planos

### 12.1 Tabela de Custos por Ação

| Ação | Créditos | Módulo |
|------|---------|--------|
| Análise de etapa do Pipeline | 5 | Pipeline |
| Formulação de biomaterial IA | 10 | Biomateriais |
| Design de organoide | 15 | Organoid Builder |
| Geração de protocolo GLP/GMP | 8 | Protocolos |
| Análise molecular/bioquímica/celular | 10–12 | Análises |
| Análise in vivo/pré-clínico/regulatório | 20 | Análises |
| Mensagem de chat | 2 | Chat |
| Busca na base de conhecimento (com IA) | 1 | Knowledge |

### 12.2 Planos de Assinatura

| Plano | Créditos/mês | Preço | Acesso |
|-------|-------------|-------|--------|
| **FREE** | 10 | Gratuito | Básico — apenas exploração |
| **DISCOVERY** | 500 | R$ 270/mês | Chat + Pipeline + Biomateriais + Protocolos básicos |
| **ADVANCED** | 1.500 | R$ 490/mês | + Análises laboratoriais (molecular, bioquímica, celular, in vitro) |
| **ENTERPRISE** | 5.000 | R$ 990/mês | + Pré-clínico, Clínico, Regulatório completo |
| **ACADEMY** | 20.000 | R$ 4.970/mês | Acesso total, volume máximo, uso institucional |

### 12.3 Créditos para Administradores

Administradores com role `ADMIN` têm:
- **Bypass total** de créditos — nenhuma ação consome créditos
- **Bypass de plano** — acesso a todos os tipos de análise e funcionalidades
- Painel de administração completo
- Capacidade de recarregar créditos via `/api/admin/self`

---

## 13. Painel Administrativo

**Localização:** `/admin`  
**Acesso:** Apenas usuários com role `ADMIN`

### 13.1 Visão Geral (Overview)

Cards de métricas da plataforma:
- Total de usuários cadastrados
- Usuários ativos nos últimos 30 dias
- Total de pipelines criados
- Total de sessões de chat
- Total de protocolos gerados
- Total de créditos gastos (DEBIT) na plataforma

### 13.2 Distribuição de Planos

Gráfico mostrando quantos usuários estão em cada plano (FREE, DISCOVERY, ADVANCED, ENTERPRISE, ACADEMY).

### 13.3 Gerenciamento de Usuários

Aba **"Usuários"** — tabela com:
- Nome, email, plano atual, créditos
- Pipelines, chats e protocolos criados
- Botão **"Editar"** para cada usuário

**Ações disponíveis por usuário:**

```
1. Alterar role:  USER → RESEARCHER → ADMIN
2. Alterar plano: FREE / DISCOVERY / ADVANCED / ENTERPRISE / ACADEMY
3. Adicionar créditos: quantidade + nota explicativa
```

**Auto-setup do Admin:**
Se seus créditos estiverem baixos, use o botão **"⚡ Setup ACADEMY"** para restaurar automaticamente o plano ACADEMY com 20.000 créditos.

### 13.4 Log de Atividade

Aba **"Atividade"** — log em tempo real de todas as ações críticas:
- Logins de usuários
- Gerações de IA (protocolos, análises, pipelines)
- Alterações de plano
- Concessão de créditos

---

## 14. Estratégias de Uso Avançado

### 14.1 Fluxo de Trabalho para Publicação Científica

Para produzir dados de qualidade publicável usando a BIA v4:

```
1. Pipeline → Defina o projeto completo (todas 12 etapas)
   ↓
2. Biomateriais → Formule e valide a biotinta escolhida
   ↓
3. Protocolos → Gere SOPs para cada procedimento
   ↓
4. Bioimpressão → Configure e valide parâmetros
   ↓
5. Análises → Gere plano analítico completo (celular + bioquímica)
   ↓
6. Análises → Gere plano de validação funcional (in vitro)
   ↓
7. Knowledge → Pesquise artigos de suporte para introdução/discussão
   ↓
8. Chat → Refine interpretações e discuta resultados
```

### 14.2 Maximizando a Especificidade das Respostas

**Princípio:** A IA responde com a precisão do contexto fornecido.

| Entrada vaga | Entrada específica |
|-------------|-------------------|
| "cartilagem" | "cartilagem hialina articular do joelho — zona superficial — modelo de lesão ICRS grau III em paciente adulto 40-60 anos" |
| "células-tronco" | "MSCs isoladas de medula óssea ilíaca humana — P4, viabilidade >90%, criadas em DMEM+10% FBS, prontas para encapsulamento" |
| "impressão 3D" | "bioimpressão por extrusão pneumática com bioimpressora RegenHU BioFactory — bico 27G (300µm) — plataforma aquecida a 37°C" |

### 14.3 Encadeamento de Módulos (Chaining)

A BIA v4 é mais poderosa quando os módulos são usados em **sequência lógica**:

**Exemplo: Projeto completo de pele artificial**

```
1. Pipeline (Pele) → Análise das 12 etapas
   → Output: parâmetros de ECM, composição dérmica/epidérmica

2. Biomateriais → Formulação de biotinta dérmica
   → Input: requisitos das etapas 3-4 do pipeline
   → Output: GelMA 7% + Colágeno 2% + Fibrina 5mg/mL

3. Bioimpressão → Análise da biotinta escolhida
   → Input: formulação do biomaterial
   → Output: parâmetros slicer + GCode + análise reológica

4. Protocolos → SOP de síntese da biotinta
   → Input: formulação validada
   → Output: protocolo GLP-compliant step-by-step

5. Organoid Builder → Design de epiderme (embora seja tecido plano,
   a IA adapta o protocolo de diferenciação para queratinócitos)

6. Análises → Plano de caracterização completo
   → Input: tipo de tecido (pele) + biomateriais usados
   → Output: FTIR, histologia (H&E, Masson), Live/Dead, IHC (pan-citoqueratina, vimentina)
```

### 14.4 Uso do Chat para Interpretação de Dados Experimentais

O chat pode ajudar a **interpretar resultados reais**:

```
"Obtive os seguintes resultados após 21 dias de cultura do meu 
construct de cartilagem em GelMA 10%:
- Viabilidade Live/Dead: 72% (esperado >85%)
- G' por reologia (pós-crosslinking): 3.2 kPa
- GAG (DMMB): 18 µg/mg ww (baixo)
- COL2A1 por qPCR: 2.3x controle

O que pode explicar a baixa viabilidade e o baixo depósito de GAG? 
Que ajustes no protocolo recomendam para a próxima rodada?"
```

### 14.5 Geração de Relatórios Científicos

Para gerar um relatório completo de um projeto:

1. Use o **Pipeline** para documentar todas as decisões técnicas
2. Use as **Análises** para gerar o plano analítico
3. Use o **Chat** para redigir seções de metodologia e interpretação
4. Use o **Knowledge** para buscar referências
5. Exporte os **Protocolos** em formato .md para Material Suplementar

---

## 15. Glossário Técnico

### Biomateriais e Reologia

| Termo | Definição | Relevância BIA |
|-------|-----------|----------------|
| **G'** | Módulo de armazenamento (elastic modulus) | Rigidez do hidrogel crosslinkado |
| **G''** | Módulo de perda (viscous modulus) | Energia dissipada como calor |
| **tan δ** | G''/G' — fator de perda | <1 = material elástico; >1 = viscoso |
| **Yield stress (τy)** | Tensão mínima para fluir | Parâmetro crítico para printabilidade |
| **Tixotropia** | Recuperação de viscosidade após cisalhamento | Essencial para bioimpressão fiel |
| **n** | Índice de fluxo (Power Law) | <1 = pseudoplástico = ideal para EBB |
| **K** | Índice de consistência | Relacionado à viscosidade aparente |
| **FHR** | Filament Height Ratio | Parâmetro de calibração de bioimpressora |
| **LAP** | Litium phenyl-trimethyl-benzoylphosphinate | Fotoiniciador biocompatível para GelMA |
| **GAG** | Glicosaminoglicano | Marcador de matriz cartilaginosa |
| **ECM** | Extracellular Matrix | Matriz extracelular — suporte estrutural |
| **dECM** | Decellularized ECM | ECM decellularizada — biotinta natural |
| **w/v** | Peso/Volume | Forma padrão de expressar concentração de hidrogéis |

### Células e Biologia

| Termo | Definição |
|-------|-----------|
| **iPSC** | Células-tronco pluripotentes induzidas — geradas por reprogramação de células somáticas (Yamanaka) |
| **MSC** | Células-tronco mesenquimais — multipotentes, acessíveis da medula óssea, tecido adiposo, cordão umbilical |
| **ESC** | Células-tronco embrionárias — pluripotentes, derivadas de blastocisto |
| **EBB** | Extrusion-based bioprinting — bioimpressão por extrusão |
| **LIFT/LAB** | Laser-induced forward transfer / Laser-assisted bioprinting |
| **FRESH** | Freeform Reversible Embedding of Suspended Hydrogels |
| **CCP** | Ponto Crítico de Controle — passo onde falha pode comprometer todo o processo |
| **DILI** | Drug-Induced Liver Injury — lesão hepática por medicamentos |
| **ICRS** | International Cartilage Repair Society — classifica grau de lesão cartilaginosa |

### Regulatório

| Termo | Definição |
|-------|-----------|
| **510(k)** | Via de aprovação FDA para dispositivos substancialmente equivalentes |
| **PMA** | Premarket Approval — via para dispositivos Classe III (maior risco) |
| **RDC 185** | Resolução ANVISA para registro de produtos médicos |
| **CTD** | Common Technical Document — formato padronizado EMA/ICH |
| **GLP** | Good Laboratory Practice — normas de boas práticas laboratoriais |
| **GMP** | Good Manufacturing Practice — normas de boas práticas de fabricação |
| **ISO 10993** | Série de normas para biocompatibilidade de dispositivos médicos |
| **ISO 13485** | Sistema de gestão da qualidade para dispositivos médicos |
| **CE Mark** | Marcação de conformidade europeia para dispositivos médicos |
| **BSL** | Biosafety Level — nível de biossegurança do laboratório (1–4) |

---

## 16. Casos de Uso Práticos — Fluxos Completos

### Caso 1: Pesquisadora desenvolvendo scaffold ósseo para mandíbula

**Perfil:** Pesquisadora de doutorado, laboratório BSL-1, bioimpressora por extrusão  
**Objetivo:** Desenvolver scaffold de PCL+HA para reconstrução mandibular

```
PASSO 1 — Pipeline
"Mandíbula PCL+HA — Reconstrução Maxilofacial v1"
Tecido: Osso cortical mandibular
Aplicação: Reconstrução de defeito crítico pós-ressecção tumoral
→ Analisar todas 12 etapas → documentar parâmetros em cada etapa

PASSO 2 — Biomateriais
Formulação: "Scaffold ósseo para mandíbula via bioimpressão extrusão"
Tipo: Osso cortical
Requisitos: ☑ Biodegradável ☑ Printable ☑ Alta rigidez mecânica
→ Output: PCL 15% + nHA 20% wt — temperatura 130°C — compressão >50 MPa

PASSO 3 — Bioimpressão
Biotinta: PCL (100%, 130°C)
Slicer: Velocidade 8 mm/s, infill 60%, grid 0°/90°
Análise IA → validar printabilidade

PASSO 4 — Protocolo
"Síntese e Impressão de Scaffold PCL+HA para Mandíbula"
→ Download .md → Material suplementar do artigo

PASSO 5 — Análises
Tipo: Caracterização Mecânica
"Scaffold PCL+HA 15%/20% para mandíbula — avaliar compressão, DMA, contato celular"

PASSO 6 — Análises (Dossiê)
Tipo: Ensaio In Vitro (ISO 10993)
"Testes de biocompatibilidade para aprovação ANVISA — scaffold PCL+HA classe III"
```

### Caso 2: Empresa desenvolvendo produto para FDA 510(k)

**Perfil:** Startup de bioimpressão, produto Classe II  
**Objetivo:** Submissão 510(k) para pele artificial bioimpresa

```
PASSO 1 — Análises: Dossiê FDA 510(k)
Título: "510(k) — Pele artificial bioimpresa GelMA+Fibrina"
Contexto: "Produto bioimpresso para tratamento de queimaduras grau II/III.
           Material: GelMA 7% + Fibrina 5mg/mL + queratinócitos + fibroblastos.
           Predicate device: [identificar via CDRH Product Code]"
→ Output completo: seções 510(k), testes predicate, tabela substancial equivalência

PASSO 2 — Análises: Ensaio In Vitro (ISO 10993)
"Biocompatibilidade GelMA+Fibrina — ISO 10993-5 citotoxicidade, -12 extração"

PASSO 3 — Análises: Análise Celular
"Viabilidade e morfologia de queratinócitos e fibroblastos no construct de pele"

PASSO 4 — Análises: Molecular
"Expressão de marcadores epiteliais (pan-CK, CK14, E-cadherina) e 
 dérmicos (vimentina, COL1A1) por qRT-PCR e Western Blot"

PASSO 5 — Chat (Modo Geral)
"Com base nas análises geradas, qual é a estratégia de testes recomendada 
 para demonstrar substancial equivalência ao predicate Dermagraft (K030699)?
 Quais performance tests são obrigatórios para esta classificação?"
```

### Caso 3: Professor preparando aula prática de bioimpressão

**Perfil:** Professor de graduação em engenharia biomédica  
**Objetivo:** Preparar protocolo prático de 4 horas para alunos

```
PASSO 1 — Protocolo
Tipo: Bioimpressão 3D
Título: "Prática: Bioimpressão de Cubo 10x10x5mm em Alginato 2% — Nível Iniciante"
Contexto: "Prática para alunos de graduação (4h). Sem experiência prévia.
           Equipamento: [sua bioimpressora]. 
           Objetivo didático: introdução à bioimpressão, calibração, parâmetros básicos.
           Incluir: calibração inicial, checklist de segurança, critérios de avaliação."
Req. especiais: "Formato didático, linguagem acessível, alertas de segurança destacados"

PASSO 2 — Chat (Modo Protocolo)
"Como simplificar este protocolo para alunos de graduação sem experiência?
 Quais etapas podem ser pré-preparadas pelo professor?
 Sugestões para tornar a aula mais visual e interativa?"

PASSO 3 — Biomateriais (busca)
Busca: "alginato bioimpressão iniciante"
→ Artigos de referência para a aula + leituras pré-aula
```

---

## Apêndice A — Atalhos Rápidos

| Ação | Caminho |
|------|---------|
| Novo Pipeline | Dashboard → "Novo Pipeline" ou `/dashboard/pipeline` → "+ Novo Pipeline" |
| Formular biomaterial | `/dashboard/biomaterials` → "Formular com IA" |
| Análise completa | `/dashboard/analyses` → "+ Nova Análise" → selecionar tipo |
| Gerar protocolo | `/dashboard/protocols` → "+ Novo Protocolo" |
| Chat especializado | `/dashboard/chat` → selecionar modo → digitar |
| Admin — ver usuários | `/admin` → aba "Usuários" |
| Admin — recarregar créditos | `/admin` → botão "⚡ Setup ACADEMY" |
| Verificar saldo créditos | `/dashboard/billing` ou barra superior do dashboard |

## Apêndice B — Senhas e Credenciais

| Usuário | Email | Senha | Role | Plano |
|---------|-------|-------|------|-------|
| Admin Principal | janaina.dernowsek@quantis.bio | Quantis@2026! | ADMIN | ACADEMY |
| Demo | demo@bia.com | demo1234 | USER | DISCOVERY |

## Apêndice C — Limites e Capacidades

| Item | Limite/Capacidade |
|------|-----------------|
| Tamanho máximo de protocolo | ~6.000 palavras por geração |
| Histórico de protocolos | Últimos 30 protocolos listados |
| Histórico de análises | Últimos 30 análises listadas |
| Sessões de chat salvas | Ilimitado |
| Projetos de pipeline | Ilimitado |
| Mensagens por sessão de chat | Ilimitado (2 créditos cada) |
| Timeout de sessão JWT | 30 dias |

---

*Manual BIA v4 — Quantis Biotechnology — 2026*  
*Versão 4.0 — Estado da Arte em Biofabricação*
