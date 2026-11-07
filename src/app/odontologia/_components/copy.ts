/**
 * BIA · Landing Odontologia — dicionário de textos PT/EN (R31.1)
 *
 * Toda a copy da landing fica aqui para que /odontologia (PT) e
 * /odontologia/en (EN) compartilhem o mesmo layout e os mesmos ativos
 * (fotos reais, PDF da proposta, link de pagamento Asaas).
 */
export type Lang = "pt" | "en"

export const ASAAS_LINK = "https://www.asaas.com/000/c/o2jlmlwo6rxd5y1d"
export const PROPOSTA_PDF = "/odontologia/proposta-quantis-biofabricacao-odontologia.pdf"
export const GUIDE_MOCKUP = { webp: "/odontologia/guia-pratico-espiral.webp", png: "/odontologia/guia-pratico-espiral.png", w: 929, h: 1203 }
export const PRICE_PER_PRO = 4287.5
/**
 * PDF técnico Quantis sobre impressão de scaffolds em PCL (material de envio).
 * Enquanto for "" (arquivo ainda não colocado em public/odontologia/), a landing
 * mostra "Solicitar PDF" via WhatsApp em vez de um link quebrado.
 */
export const PCL_PDF = ""
export const PCL_PDF_REQUEST_MSG: Record<Lang, string> = {
  pt: "Olá! Gostaria de receber o PDF da Quantis sobre impressão de scaffolds em PCL para odontologia.",
  en: "Hello! I'd like to receive Quantis' PDF on PCL scaffold printing for dentistry.",
}
/** Imagem CC-BY 4.0 (Springer, J Biol Eng 2023, doi:10.1186/s13036-023-00401-4) já usada no e-book Ortopedia */
export const PCL_FIGURE = { src: "/library/ebook-assets/lit-pcl-bg-scaffold.jpg", w: 1200, h: 337 }

/** Ícone de cada tópico (resolvido em OdontologiaLanding.tsx) */
export type TopicIcon = "nozzle" | "bonecell" | "scaffold" | "scan" | "implant" | "membrane" | "tooth" | "jaw"
export const PHONE_DISPLAY = "(11) 96863-2231"

export const COUNTRIES: Record<Lang, string[]> = {
  pt: ["Brasil", "Peru", "Colômbia", "Inglaterra", "Portugal"],
  en: ["Brazil", "Peru", "Colombia", "England", "Portugal"],
}

export const INSTITUTIONS = [
  "Fiocruz", "Instituto Butantan", "USP", "Unicamp", "Unesp", "UFABC", "CTI Renato Archer",
  "UFRJ", "UERJ", "UFF", "Einstein", "UFSC", "UTFPR", "UFMG", "UFPE", "UFPA", "UFMA",
  "PUC", "Insper", "Mackenzie", "Unifeso", "Univap", "Universidade Tiradentes", "Unaerp",
]

export const PHOTO_ALTS: Record<Lang, string[]> = {
  pt: [
    "Turma de profissionais acompanhando a bioimpressora em operação no laboratório Quantis",
    "Scaffold ósseo impresso em 3D com arquitetura porosa, na palma da mão",
    "Construto bioimpresso em placa de Petri logo após a deposição da biotinta",
    "Cabeçote da bioimpressora depositando biotinta sobre a mesa de impressão",
    "Participantes preparando biotinta na bancada durante a prática",
    "Profissionais analisando amostras na aula de esferoides celulares",
    "Profissional pipetando biomaterial durante a prática de biofabricação",
    "Instrutora preparando hidrogel no laboratório",
    "Turma em aula prática de preparo de biotintas",
    "Foto oficial de uma turma formada pela Quantis",
  ],
  en: [
    "Group of professionals watching the bioprinter in operation at the Quantis laboratory",
    "3D-printed bone scaffold with porous architecture, held in the palm of a hand",
    "Bioprinted construct in a Petri dish right after bioink deposition",
    "Bioprinter printhead depositing bioink onto the print bed",
    "Participants preparing bioink at the bench during the hands-on session",
    "Professionals analysing samples in the cell spheroid class",
    "Professional pipetting biomaterial during the biofabrication practice",
    "Instructor preparing hydrogel in the laboratory",
    "Group in a hands-on bioink preparation class",
    "Official photo of a cohort trained by Quantis",
  ],
}

const pt = {
  lang: "pt" as Lang,
  htmlLang: "pt-BR",
  langToggleLabel: "English version",
  langToggleShort: "EN",
  langToggleHref: "/odontologia/en",
  whatsappMsg: "Olá! Tenho interesse no curso de Biofabricação e Bioimpressão 3D aplicadas à Odontologia (turma de 5 a 8 profissionais).",
  mailSubject: "Interesse — Biofabricação aplicada à Odontologia (turma fechada)",
  priceFmt: (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }),

  navTagline: "Biofabricação · Odontologia regenerativa",
  nav: { content: "Conteúdo", scaffolds: "Scaffolds PCL", format: "Formato", kit: "Kit didático", gallery: "Laboratório", pricing: "Investimento" },
  navCta: "Falar com a Quantis",
  navCtaShort: "WhatsApp",

  heroBadge: "Proposta institucional · turma fechada",
  heroTitle1: "Biofabricação e Bioimpressão 3D",
  heroTitle2: "aplicadas à Odontologia",
  heroLead1: "Regeneração óssea, biomateriais, scaffolds e planejamento digital — com a mão na bioimpressora, no laboratório da Quantis. Formação técnica e desenvolvimento translacional para turmas de ",
  heroLeadStrong: "5 a 8 profissionais",
  heroLead2: ".",
  heroBullets: [
    "1 aula online prévia + 2 práticas presenciais sequenciais",
    "Kit didático: guia prático impresso, scaffolds, biomateriais, seringas e modelos",
    "6 meses de acesso gratuito à BIA (IA para STL, G-code e protocolos)",
    "Aprofundamento online pela Quantis",
  ],
  ctaAsaas: "Eu quero me capacitar",
  ctaWhatsGroup: "Montar minha turma (WhatsApp)",
  ctaPdf: "Proposta (PDF)",
  heroNote: "Pagamento seguro via Asaas. Vaga individual garantida; turma formada com 5 a 8 profissionais.",
  heroDates: "Datas em aberto — a agenda é definida junto com o grupo. Práticas em São Paulo/SP.",

  proofN: "+4.000",
  proofNDesc: "profissionais capacitados em nossos cursos de biofabricação e bioimpressão 3D",
  proofCountries: "5 países",
  proofInst: "Instituições que já formaram equipes conosco",
  proofInstDesc: "Universidades, institutos de pesquisa, hospitais e empresas.",
  proofInstAria: "Instituições",

  contentKicker: "O que você vai dominar",
  contentTitle: "Do desafio clínico ao projeto de biofabricação",
  contentLead: "Seis eixos que conectam odontologia regenerativa, biomateriais e bioimpressão 3D — com leitura translacional da literatura e prática guiada na bancada.",
  topics: [
    { icon: "nozzle" as TopicIcon, tag: "Tecnologia", t: "Impressão 3D e bioimpressão aplicadas à odontologia", d: "Extrusão de termoplásticos, bioimpressão de hidrogéis e fotopolimerização: equipamentos, limites e quando cada técnica faz sentido na clínica e na pesquisa.", pts: ["Extrusão PCL · bioextrusão · DLP/SLA", "Escolha da técnica por indicação clínica"] },
    { icon: "bonecell" as TopicIcon, tag: "Biologia", t: "Regeneração óssea alveolar e defeitos periodontais", d: "Do defeito ao desenho do enxerto: osteocondução, osteoindução, espaço, estabilidade e vascularização como critérios de projeto.", pts: ["Alvéolo pós-extração · defeitos intraósseos", "Critérios biológicos e mecânicos do enxerto"] },
    { icon: "scaffold" as TopicIcon, tag: "Biomateriais", t: "Scaffolds, biomateriais, hidrogéis e PCL", d: "Seleção, preparo e caracterização de PCL, PCL + hidroxiapatita/β-TCP, GelMA, alginato e colágeno para as práticas.", pts: ["Porosidade, interconectividade e degradação", "Compósitos osteocondutores"] },
    { icon: "scan" as TopicIcon, tag: "Digital", t: "Planejamento digital, modelagem e parâmetros de fabricação", d: "Da tomografia (CBCT) ao STL, fatiamento, G-code e parâmetros que preservam geometria e viabilidade celular.", pts: ["CBCT → segmentação → STL", "Fatiamento e G-code com a BIA"] },
    { icon: "implant" as TopicIcon, tag: "Clínica", t: "Implantodontia, periodontia e cirurgia bucomaxilofacial", d: "Enxertos paciente-específicos, regeneração óssea guiada, levantamento de seio e reconstruções: o que a literatura recente já sustenta.", pts: ["ROG · seio maxilar · reconstrução", "Evidência clínica e pré-clínica"] },
    { icon: "jaw" as TopicIcon, tag: "Método", t: "Raciocínio translacional", d: "Do desafio clínico ao projeto de biofabricação — método para transformar um caso real em protótipo, protocolo e projeto de pesquisa.", pts: ["Caso clínico → requisitos → protótipo", "Caminho regulatório e ética"] },
  ],

  scafKicker: "Foco especial · impressão de scaffolds",
  scafTitle: "Scaffolds de PCL para odontologia regenerativa",
  scafLead: "A policaprolactona (PCL) é o termoplástico mais usado em scaffolds ósseos impressos em 3D: biocompatível, aprovado para dispositivos implantáveis (FDA/CE), funde a ~60 °C e permite imprimir arquiteturas porosas controladas que servem de suporte à regeneração óssea. Na jornada você aprende a projetar, imprimir e caracterizar esses scaffolds — do STL ao protótipo na mão.",
  scafSpecs: [
    { v: "~60 °C", l: "ponto de fusão do PCL" },
    { v: "90–110 °C", l: "temperatura de extrusão" },
    { v: "300–500 µm", l: "poros para osteocondução" },
    { v: "24–36 meses", l: "degradação in vivo" },
  ],
  scafBlocksTitle: "O que você aprende na prática",
  scafBlocks: [
    { icon: "scan" as TopicIcon, t: "Projeto paciente-específico", d: "Da tomografia (CBCT/DICOM) à segmentação do defeito e geração do STL do enxerto; arquiteturas 0/90°, triangular e gyroid (TPMS); porosidade e espessura de filamento." },
    { icon: "nozzle" as TopicIcon, t: "Impressão por extrusão a quente", d: "Parâmetros de temperatura, pressão, velocidade e altura de camada; fatiamento e G-code gerados com a BIA; impressão de scaffolds em PCL puro e PCL + cerâmicas bioativas." },
    { icon: "scaffold" as TopicIcon, t: "Funcionalização e caracterização", d: "PCL + hidroxiapatita/β-TCP, tratamento de superfície (NaOH, plasma) e recobrimento com hidrogéis (GelMA, colágeno); avaliação de porosidade, interconectividade e resistência à compressão." },
    { icon: "membrane" as TopicIcon, t: "Aplicações clínicas em odontologia", d: "Preservação de alvéolo, regeneração óssea guiada (ROG), levantamento de seio maxilar, defeitos periodontais e reconstruções maxilomandibulares com enxertos customizados." },
  ],
  scafFigureCaption: "Scaffold de PCL impresso em 3D com vidro bioativo e hidrogel para regeneração óssea. Fonte: J Biol Eng 2023 (CC-BY 4.0).",
  scafPdfKicker: "Material técnico Quantis",
  scafPdfTitle: "Impressão de scaffolds em PCL",
  scafPdfLead: "PDF técnico da Quantis com fundamentos, parâmetros de impressão e aplicações de scaffolds de PCL — o mesmo material que enviamos para instituições parceiras.",
  scafPdfCta: "Baixar PDF · Scaffolds PCL",
  scafPdfRequestCta: "Solicitar o PDF (WhatsApp)",
  scafPdfNote: "Gratuito · formato PDF · em português",

  formatKicker: "Formato da jornada",
  formatTitle: "Prático, sequencial e no ritmo do seu grupo",
  steps: [
    { t: "Aula online prévia", d: "Período noturno ou sábado, alinhada com o grupo. Nivelamento conceitual e preparação para a bancada." },
    { t: "Duas práticas presenciais sequenciais", d: "Laboratório da Quantis, dentro da Bayer — Rua Domingos Jorge, 1100, São Paulo/SP. Biomateriais, scaffolds, modelagem e bioimpressão 3D." },
    { t: "Aprofundamento online", d: "Continuidade pela plataforma online da Quantis + 6 meses de BIA para gerar STL, G-code e protocolos conforme seu objetivo." },
  ],
  stats: [{ v: "5–8", l: "profissionais" }, { v: "1 + 2", l: "online + práticas" }, { v: "SP", l: "lab Quantis · Bayer" }],

  kitKicker: "Kit didático incluído",
  kitTitle: "Guia Prático de Biofabricação e Bioimpressão",
  kitSubtitle: "Fundamentos, Tecnologia e Protocolos",
  kitLead: "Cada participante recebe o guia impresso em formato espiral — para acompanhar as práticas na bancada e consultar depois, na clínica ou no laboratório. É o mesmo material didático usado nas turmas da Quantis.",
  kitBullets: [
    "Guia prático impresso (espiral) com fundamentos, tecnologias e protocolos passo a passo",
    "Scaffolds e biomateriais para manipulação nas práticas",
    "Seringas, modelos anatômicos e insumos de bancada",
    "Acesso à BIA por 6 meses para gerar STL, G-code e protocolos",
  ],
  kitImgAlt: "Guia Prático de Biofabricação e Bioimpressão — Fundamentos, Tecnologia e Protocolos (Quantis), impresso em espiral",
  kitBadge: "Material impresso · entregue no kit",

  galleryKicker: "Nosso laboratório, nossas turmas",
  galleryTitle: "Registros reais das práticas",

  pricingKicker: "Investimento · por profissional",
  pricePer: "por profissional",
  priceNote1: "Vaga individual, com a turma formada por 5 a 8 profissionais.",
  priceNote2: "Pagamento à vista ou parcelado (com acréscimo de taxas) pelo link seguro da Asaas.",
  priceBullets: ["Kit didático completo, com o guia prático impresso", "6 meses de acesso gratuito à plataforma BIA", "Aula online prévia + 2 práticas presenciais", "Aprofundamento online pela Quantis"],
  pricingAsaas: "Eu quero me capacitar · garantir minha vaga",
  pricingAsaasHint: "Você será direcionado ao link de pagamento Asaas.",
  pricingWhats: "Reservar datas para o meu grupo (WhatsApp)",
  pricingMail: "Prefiro falar por e-mail · suporte@quantis.bio",

  closingKicker: "Fechamento institucional",
  closingTitle: "Formação técnica com visão de futuro",
  closingLead: "Esta proposta foi desenhada para apoiar formação técnica, aplicação clínica, experimentação responsável e futuras agendas de inovação em odontologia regenerativa — conectando capacitação, prática aplicada e desenvolvimento translacional.",
  closingCards: [
    { t: "Equipe científica Quantis", d: "Pesquisadores com publicações e protocolos próprios (QMatrix®, QMicroNiche®)." },
    { t: "BIA incluída", d: "IA especializada em biofabricação: formulação, fatiamento, G-code e protocolos." },
    { t: "Turma fechada", d: "Agenda, nível e exemplos ajustados ao grupo." },
    { t: "Laboratório real", d: "Bioimpressoras, biomateriais e cultivo 3D na bancada." },
  ],
  closingPdf: "Proposta completa em PDF",
  closingAcademy: "Conheça também a BIA Academy Online",

  finalTitle: "Monte sua turma e traga a biofabricação para a sua prática",
  finalLead: "Responda em poucas linhas: tamanho do grupo, cidade e disponibilidade. Nós organizamos a agenda com você.",
  finalAsaas: "Eu quero me capacitar",
  finalWhats: "WhatsApp " + PHONE_DISPLAY,

  footerAddr: "Rua Domingos Jorge, 1100, São Paulo/SP (dentro da Bayer)",
  footerPrivacy: "Privacidade",
  footerTerms: "Termos",
  footerBia: "BIA (plataforma)",
}

export type Copy = typeof pt

const en: Copy = {
  lang: "en",
  htmlLang: "en",
  langToggleLabel: "Versão em português",
  langToggleShort: "PT",
  langToggleHref: "/odontologia",
  whatsappMsg: "Hello! I'm interested in the Biofabrication and 3D Bioprinting applied to Dentistry course (group of 5 to 8 professionals).",
  mailSubject: "Interest — Biofabrication applied to Dentistry (closed group)",
  priceFmt: (v: number) => "R$ " + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  navTagline: "Biofabrication · Regenerative dentistry",
  nav: { content: "Content", scaffolds: "PCL scaffolds", format: "Format", kit: "Learning kit", gallery: "Laboratory", pricing: "Investment" },
  navCta: "Talk to Quantis",
  navCtaShort: "WhatsApp",

  heroBadge: "Institutional proposal · closed group",
  heroTitle1: "Biofabrication and 3D Bioprinting",
  heroTitle2: "applied to Dentistry",
  heroLead1: "Bone regeneration, biomaterials, scaffolds and digital planning — hands-on with the bioprinter at the Quantis laboratory. Technical training and translational development for groups of ",
  heroLeadStrong: "5 to 8 professionals",
  heroLead2: ".",
  heroBullets: [
    "1 preparatory online class + 2 sequential in-person hands-on sessions",
    "Learning kit: printed practical guide, scaffolds, biomaterials, syringes and models",
    "6 months of free access to BIA (AI for STL, G-code and protocols)",
    "Online follow-up with Quantis",
  ],
  ctaAsaas: "I want to get trained",
  ctaWhatsGroup: "Build my group (WhatsApp)",
  ctaPdf: "Proposal (PDF, Portuguese)",
  heroNote: "Secure payment via Asaas. Individual seat guaranteed; groups run with 5 to 8 professionals.",
  heroDates: "Open dates — the schedule is set together with the group. Hands-on sessions in São Paulo, Brazil.",

  proofN: "4,000+",
  proofNDesc: "professionals trained in our biofabrication and 3D bioprinting courses",
  proofCountries: "5 countries",
  proofInst: "Institutions that have trained teams with us",
  proofInstDesc: "Universities, research institutes, hospitals and companies.",
  proofInstAria: "Institutions",

  contentKicker: "What you will master",
  contentTitle: "From the clinical challenge to the biofabrication project",
  contentLead: "Six axes connecting regenerative dentistry, biomaterials and 3D bioprinting — with a translational reading of the literature and guided bench practice.",
  topics: [
    { icon: "nozzle" as TopicIcon, tag: "Technology", t: "3D printing and bioprinting applied to dentistry", d: "Thermoplastic extrusion, hydrogel bioprinting and photopolymerisation: equipment, limits and when each technique makes sense in the clinic and in research.", pts: ["PCL extrusion · bioextrusion · DLP/SLA", "Choosing the technique by clinical indication"] },
    { icon: "bonecell" as TopicIcon, tag: "Biology", t: "Alveolar bone regeneration and periodontal defects", d: "From the defect to the graft design: osteoconduction, osteoinduction, space, stability and vascularisation as design criteria.", pts: ["Post-extraction socket · intrabony defects", "Biological and mechanical graft criteria"] },
    { icon: "scaffold" as TopicIcon, tag: "Biomaterials", t: "Scaffolds, biomaterials, hydrogels and PCL", d: "Selection, preparation and characterisation of PCL, PCL + hydroxyapatite/β-TCP, GelMA, alginate and collagen for the sessions.", pts: ["Porosity, interconnectivity and degradation", "Osteoconductive composites"] },
    { icon: "scan" as TopicIcon, tag: "Digital", t: "Digital planning, modelling and fabrication parameters", d: "From CBCT to STL, slicing, G-code and the parameters that preserve geometry and cell viability.", pts: ["CBCT → segmentation → STL", "Slicing and G-code with BIA"] },
    { icon: "implant" as TopicIcon, tag: "Clinical", t: "Implantology, periodontics and oral & maxillofacial surgery", d: "Patient-specific grafts, guided bone regeneration, sinus lift and reconstructions: what the recent literature already supports.", pts: ["GBR · maxillary sinus · reconstruction", "Clinical and preclinical evidence"] },
    { icon: "jaw" as TopicIcon, tag: "Method", t: "Translational reasoning", d: "From the clinical challenge to the biofabrication project — a method to turn a real case into prototype, protocol and research project.", pts: ["Clinical case → requirements → prototype", "Regulatory pathway and ethics"] },
  ],

  scafKicker: "Special focus · scaffold printing",
  scafTitle: "PCL scaffolds for regenerative dentistry",
  scafLead: "Polycaprolactone (PCL) is the most widely used thermoplastic for 3D-printed bone scaffolds: biocompatible, cleared for implantable devices (FDA/CE), melts at ~60 °C and allows controlled porous architectures that support bone regeneration. During the journey you learn to design, print and characterise these scaffolds — from STL to the prototype in your hand.",
  scafSpecs: [
    { v: "~60 °C", l: "PCL melting point" },
    { v: "90–110 °C", l: "extrusion temperature" },
    { v: "300–500 µm", l: "pores for osteoconduction" },
    { v: "24–36 months", l: "in vivo degradation" },
  ],
  scafBlocksTitle: "What you learn hands-on",
  scafBlocks: [
    { icon: "scan" as TopicIcon, t: "Patient-specific design", d: "From CBCT/DICOM to defect segmentation and graft STL; 0/90°, triangular and gyroid (TPMS) architectures; porosity and strand thickness." },
    { icon: "nozzle" as TopicIcon, t: "Hot-melt extrusion printing", d: "Temperature, pressure, speed and layer-height parameters; slicing and G-code generated with BIA; printing scaffolds in pure PCL and PCL + bioactive ceramics." },
    { icon: "scaffold" as TopicIcon, t: "Functionalisation and characterisation", d: "PCL + hydroxyapatite/β-TCP, surface treatment (NaOH, plasma) and hydrogel coating (GelMA, collagen); porosity, interconnectivity and compressive strength assessment." },
    { icon: "membrane" as TopicIcon, t: "Clinical applications in dentistry", d: "Socket preservation, guided bone regeneration (GBR), maxillary sinus lift, periodontal defects and maxillomandibular reconstructions with customised grafts." },
  ],
  scafFigureCaption: "3D-printed PCL scaffold with bioactive glass and hydrogel for bone regeneration. Source: J Biol Eng 2023 (CC-BY 4.0).",
  scafPdfKicker: "Quantis technical material",
  scafPdfTitle: "PCL scaffold printing",
  scafPdfLead: "Quantis technical PDF (in Portuguese) with fundamentals, printing parameters and applications of PCL scaffolds — the same material we send to partner institutions.",
  scafPdfCta: "Download PDF · PCL scaffolds",
  scafPdfRequestCta: "Request the PDF (WhatsApp)",
  scafPdfNote: "Free · PDF · Portuguese",

  formatKicker: "Journey format",
  formatTitle: "Hands-on, sequential and at your group's pace",
  steps: [
    { t: "Preparatory online class", d: "Evening or Saturday, aligned with the group. Conceptual levelling and preparation for the bench." },
    { t: "Two sequential in-person hands-on sessions", d: "Quantis laboratory, inside Bayer — Rua Domingos Jorge, 1100, São Paulo, Brazil. Biomaterials, scaffolds, modelling and 3D bioprinting." },
    { t: "Online follow-up", d: "Continuity through Quantis' online platform + 6 months of BIA to generate STL, G-code and protocols for your goal." },
  ],
  stats: [{ v: "5–8", l: "professionals" }, { v: "1 + 2", l: "online + hands-on" }, { v: "SP", l: "Quantis lab · Bayer" }],

  kitKicker: "Learning kit included",
  kitTitle: "Practical Guide to Biofabrication and Bioprinting",
  kitSubtitle: "Fundamentals, Technology and Protocols",
  kitLead: "Every participant receives the printed, spiral-bound guide (in Portuguese) — to follow the hands-on sessions at the bench and consult later, in the clinic or the lab. It is the same teaching material used in Quantis cohorts.",
  kitBullets: [
    "Printed spiral-bound practical guide with fundamentals, technologies and step-by-step protocols",
    "Scaffolds and biomaterials to handle during the sessions",
    "Syringes, anatomical models and bench supplies",
    "6 months of BIA access to generate STL, G-code and protocols",
  ],
  kitImgAlt: "Practical Guide to Biofabrication and Bioprinting — Fundamentals, Technology and Protocols (Quantis), spiral-bound print",
  kitBadge: "Printed material · delivered in the kit",

  galleryKicker: "Our laboratory, our cohorts",
  galleryTitle: "Real records from the hands-on sessions",

  pricingKicker: "Investment · per professional",
  pricePer: "per professional",
  priceNote1: "Individual seat, with groups of 5 to 8 professionals.",
  priceNote2: "Pay in full or in instalments (fees apply) through the secure Asaas link. Prices in Brazilian reais (BRL).",
  priceBullets: ["Complete learning kit, including the printed practical guide", "6 months of free access to the BIA platform", "Preparatory online class + 2 in-person hands-on sessions", "Online follow-up with Quantis"],
  pricingAsaas: "I want to get trained · secure my seat",
  pricingAsaasHint: "You will be redirected to the Asaas payment link.",
  pricingWhats: "Book dates for my group (WhatsApp)",
  pricingMail: "I'd rather email · suporte@quantis.bio",

  closingKicker: "Institutional closing",
  closingTitle: "Technical training with a forward-looking vision",
  closingLead: "This proposal was designed to support technical training, clinical application, responsible experimentation and future innovation agendas in regenerative dentistry — connecting training, applied practice and translational development.",
  closingCards: [
    { t: "Quantis scientific team", d: "Researchers with publications and proprietary protocols (QMatrix®, QMicroNiche®)." },
    { t: "BIA included", d: "AI specialised in biofabrication: formulation, slicing, G-code and protocols." },
    { t: "Closed group", d: "Schedule, level and examples tailored to the group." },
    { t: "Real laboratory", d: "Bioprinters, biomaterials and 3D culture at the bench." },
  ],
  closingPdf: "Full proposal in PDF (Portuguese)",
  closingAcademy: "Also discover BIA Academy Online",

  finalTitle: "Build your group and bring biofabrication into your practice",
  finalLead: "Reply in a few lines: group size, city and availability. We organise the schedule with you.",
  finalAsaas: "I want to get trained",
  finalWhats: "WhatsApp +55 11 96863-2231",

  footerAddr: "Rua Domingos Jorge, 1100, São Paulo, Brazil (inside Bayer)",
  footerPrivacy: "Privacy",
  footerTerms: "Terms",
  footerBia: "BIA (platform)",
}

export const COPY: Record<Lang, Copy> = { pt, en }
