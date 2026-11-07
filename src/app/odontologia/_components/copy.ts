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
  nav: { content: "Conteúdo", format: "Formato", kit: "Kit didático", gallery: "Laboratório", pricing: "Investimento" },
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

  contentKicker: "Conteúdo central",
  contentTitle: "Do desafio clínico ao projeto de biofabricação",
  contentLead: "Seis eixos que conectam odontologia regenerativa, biomateriais e bioimpressão 3D — com leitura translacional da literatura e prática guiada.",
  topics: [
    { t: "Impressão 3D e bioimpressão aplicadas à odontologia", d: "Técnicas, equipamentos e quando cada uma faz sentido na clínica e na pesquisa." },
    { t: "Regeneração óssea alveolar e defeitos periodontais", d: "Do defeito ao desenho do enxerto: critérios biológicos e mecânicos." },
    { t: "Scaffolds, biomateriais, hidrogéis e PCL", d: "Seleção, preparo e caracterização dos materiais usados nas práticas." },
    { t: "Planejamento digital, modelagem e parâmetros de fabricação", d: "STL, fatiamento, G-code e parâmetros que preservam a viabilidade." },
    { t: "Implantodontia, periodontia e cirurgia bucomaxilofacial", d: "Aplicações reais e o que a literatura recente já sustenta." },
    { t: "Raciocínio translacional", d: "Do desafio clínico ao projeto de biofabricação — método para levar adiante." },
  ],

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
  nav: { content: "Content", format: "Format", kit: "Learning kit", gallery: "Laboratory", pricing: "Investment" },
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

  contentKicker: "Core content",
  contentTitle: "From the clinical challenge to the biofabrication project",
  contentLead: "Six axes connecting regenerative dentistry, biomaterials and 3D bioprinting — with a translational reading of the literature and guided practice.",
  topics: [
    { t: "3D printing and bioprinting applied to dentistry", d: "Techniques, equipment and when each one makes sense in the clinic and in research." },
    { t: "Alveolar bone regeneration and periodontal defects", d: "From the defect to the graft design: biological and mechanical criteria." },
    { t: "Scaffolds, biomaterials, hydrogels and PCL", d: "Selection, preparation and characterisation of the materials used in the sessions." },
    { t: "Digital planning, modelling and fabrication parameters", d: "STL, slicing, G-code and the parameters that preserve viability." },
    { t: "Implantology, periodontics and oral & maxillofacial surgery", d: "Real applications and what the recent literature already supports." },
    { t: "Translational reasoning", d: "From the clinical challenge to the biofabrication project — a method to carry it forward." },
  ],

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
