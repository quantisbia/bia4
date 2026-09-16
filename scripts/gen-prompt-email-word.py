#!/usr/bin/env python3
"""Gera versão Word do prompt de email marketing (mesma identidade visual)."""
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

VIOLET_DARK = RGBColor(0x4C, 0x1D, 0x95)
VIOLET = RGBColor(0x7C, 0x3A, 0xED)
FUCHSIA = RGBColor(0xD9, 0x46, 0xEF)
BLACK = RGBColor(0x0F, 0x0A, 0x1F)
GRAY_DARK = RGBColor(0x37, 0x41, 0x51)
GRAY_MID = RGBColor(0x6B, 0x72, 0x80)
CODE_BG = "F3F0FF"
FONT = "Calibri"
FONT_MONO = "Consolas"


def set_shading(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def set_borders(cell, color="7C3AED", size="4"):
    tc_pr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for b_name in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{b_name}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), size)
        b.set(qn("w:color"), color)
        tcBorders.append(b)
    tc_pr.append(tcBorders)


def add_heading(doc, text, level=1, color=VIOLET_DARK, size=None,
                space_before=12, space_after=6):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = FONT
    run.font.bold = True
    run.font.color.rgb = color
    if size is None:
        size = {1: 22, 2: 16, 3: 13, 4: 11}.get(level, 11)
    run.font.size = Pt(size)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.keep_with_next = True
    return p


def add_body(doc, text, size=10.5, color=GRAY_DARK, bold=False, italic=False, align=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic
    if align:
        p.alignment = align
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.25
    return p


def add_mixed(doc, parts, size=10.5, align=None, space_after=4):
    p = doc.add_paragraph()
    for text, opts in parts:
        run = p.add_run(text)
        run.font.name = opts.get("font", FONT)
        run.font.size = Pt(opts.get("size", size))
        run.font.color.rgb = opts.get("color", GRAY_DARK)
        run.font.bold = opts.get("bold", False)
        run.font.italic = opts.get("italic", False)
    if align:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    return p


def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    if bold_prefix:
        r1 = p.add_run(bold_prefix)
        r1.font.name = FONT
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = VIOLET_DARK
    r2 = p.add_run(text)
    r2.font.name = FONT
    r2.font.size = Pt(10.5)
    r2.font.color.rgb = GRAY_DARK
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.2
    return p


def add_hr(doc):
    p = doc.add_paragraph()
    p_pr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "8")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "7C3AED")
    pBdr.append(bottom)
    p_pr.append(pBdr)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)


def add_code_block(doc, code, label=None):
    """Bloco de código com fundo violeta claro — para copiar/colar."""
    if label:
        add_mixed(doc, [
            (f"📋 {label}", {"bold": True, "color": VIOLET_DARK, "size": 10}),
        ], space_after=2)
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_shading(cell, CODE_BG)
    set_borders(cell, color="C4B5FD", size="6")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP

    # Primeiro parágrafo já existe no cell
    lines = code.strip().split("\n")
    for i, line in enumerate(lines):
        if i == 0:
            p = cell.paragraphs[0]
        else:
            p = cell.add_paragraph()
        run = p.add_run(line if line else " ")
        run.font.name = FONT_MONO
        run.font.size = Pt(9)
        run.font.color.rgb = BLACK
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def add_table_pro(doc, headers, rows, col_widths=None, header_bg="7C3AED"):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        cell = hdr[i]
        set_shading(cell, header_bg)
        set_borders(cell, color="7C3AED", size="4")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        run.font.name = FONT
        run.font.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.size = Pt(10)
    for r_idx, row_data in enumerate(rows):
        row = table.add_row().cells
        bg = "FAF5FF" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, cell_text in enumerate(row_data):
            cell = row[c_idx]
            set_shading(cell, bg)
            set_borders(cell, color="E5E7EB", size="4")
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            run = p.add_run(str(cell_text))
            run.font.name = FONT
            run.font.size = Pt(9.5)
            run.font.color.rgb = GRAY_DARK
            p.paragraph_format.space_after = Pt(2)
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                if i < len(row.cells):
                    row.cells[i].width = Cm(w)
    return table


def build():
    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(2.0)
        s.bottom_margin = Cm(2.0)
        s.left_margin = Cm(2.2)
        s.right_margin = Cm(2.2)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = GRAY_DARK

    # ===== CAPA =====
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(60)
    run = p.add_run("📧")
    run.font.size = Pt(52)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run("Prompt Master")
    run.font.name = FONT
    run.font.size = Pt(30)
    run.font.bold = True
    run.font.color.rgb = VIOLET_DARK

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(30)
    run = p.add_run("Email Marketing — 3 Modalidades BIA")
    run.font.name = FONT
    run.font.size = Pt(18)
    run.font.color.rgb = FUCHSIA
    run.font.italic = True

    add_hr(doc)

    for label, val in [
        ("Documento:", "Prompt estruturado + 5 exemplos + 3 templates prontos"),
        ("Uso:", "Colar em IA (ChatGPT, Claude) ou ESP (Mailchimp, Brevo, RD Station)"),
        ("Autoridade:", "Janaina Dernowsek — CEO Quantis Biotechnology"),
        ("Última atualização:", "16/09/2026"),
        ("Versão:", "1.0"),
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        rl = p.add_run(f"{label}  ")
        rl.font.name = FONT
        rl.font.size = Pt(10)
        rl.font.bold = True
        rl.font.color.rgb = VIOLET_DARK
        rv = p.add_run(val)
        rv.font.name = FONT
        rv.font.size = Pt(10)
        rv.font.color.rgb = GRAY_DARK

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(80)
    run = p.add_run("Quantis Biotechnology  ·  biaquantis.bio")
    run.font.name = FONT
    run.font.size = Pt(10)
    run.font.color.rgb = GRAY_MID

    doc.add_page_break()

    # ===== COMO USAR =====
    add_heading(doc, "Como usar este documento", level=1, size=22)

    add_body(doc, "Este documento tem 4 seções úteis, dependendo do seu momento:",
             size=11, bold=True, color=BLACK)

    add_bullet(doc,
        "Cole o bloco de código violeta abaixo em qualquer IA (ChatGPT, "
        "Claude, Gemini) junto com um dos 5 exemplos de parâmetros. A IA "
        "vai gerar o email completo pronto para disparar.",
        bold_prefix="1) Quer gerar email personalizado com IA? → "
    )
    add_bullet(doc,
        "Use os 3 templates prontos (Plataforma / Academy Online / "
        "Corporativo) sem passar por IA. Só substitua {{nome}} e "
        "{{instituicao}} e dispare.",
        bold_prefix="2) Quer email pronto AGORA? → "
    )
    add_bullet(doc,
        "Use a tabela de segmentação para escolher qual template combina "
        "com cada lista da sua ferramenta de email marketing.",
        bold_prefix="3) Não sabe para quem enviar? → "
    )
    add_bullet(doc,
        "Consulte KPIs esperados, horários ótimos de envio e compliance "
        "LGPD na última seção.",
        bold_prefix="4) Quer otimizar entregabilidade? → "
    )

    doc.add_page_break()

    # ===== PROMPT MASTER =====
    add_heading(doc, "🎯 PROMPT MASTER", level=1, size=22)
    add_body(doc, "Copie tudo dentro do bloco violeta abaixo e cole na IA "
                  "de sua preferência (ChatGPT, Claude, Gemini). Depois "
                  "acrescente um dos 5 exemplos de parâmetros da seção "
                  "seguinte.", size=10.5, italic=True, color=GRAY_MID)

    prompt_master = """Você é copywriter especialista em email marketing científico B2B/B2C
para o setor de biotecnologia e biofabricação. Escreva em português
brasileiro, tom técnico-empático (respeita o pesquisador sem ser
hermético), sem jargão de marketing vazio.

# CONTEXTO DA MARCA

Empresa: Quantis Biotechnology
Produto: BIA (Biomaterial Intelligent Assistant) — plataforma de IA
científica para biofabricação, bioimpressão 3D, esferoides e organoides.
Site: biaquantis.bio
Fundadora/CEO: Janaina Dernowsek

# 3 MODALIDADES COMERCIAIS (nunca confundir)

## 1) BIA PLATAFORMA — "Guia Inteligente em Biofabricação 3D"
- Formato: SaaS (software por assinatura)
- Preço: R$ 507/mês em assinatura recorrente via Asaas
- Créditos: 1.500 renovados TODO mês (reset, NÃO acumula)
- Cancele quando quiser, sem multa
- Checkout: https://www.asaas.com/c/qsnp08rvpuwlj8ip
- Para quem: pesquisadores individuais e times de P&D que JÁ SABEM
  o que fazer e precisam da ferramenta profissional
- Inclui: Formulator Pro com 807 biomateriais, Slicer 3D com 11
  algoritmos, Bioprinting, Organoid Builder, Pipeline científico
  12 estágios, SOPs GLP/GMP em formato ANVISA, Chat IA, Knowledge
  Engine (30+ papers, 20+ patentes), Notebook do Pesquisador com
  versionamento V1/V2/V3
- NÃO inclui: o curso Academy

## 2) BIA ACADEMY ONLINE — Curso Individual
- Formato: curso online EAD auto-ritmo
- Preço: R$ 2.375 pagamento único (ou 12x de R$ 197,92 sem juros)
- Duração: 12 meses de acesso
- Checkout: https://www.asaas.com/c/iu7ym1dp93cei9zk
- Landing: biaquantis.bio/academy
- Para quem: profissionais que querem APRENDER do zero ou consolidar
  conhecimento no ritmo próprio
- Inclui: 12 módulos técnicos completos + 12 MESES DA PLATAFORMA BIA
  inclusos (20.000 créditos) + 3 encontros ao vivo com equipe Quantis
  + projeto de biofabricação próprio publicável + certificado oficial
- NÃO inclui: práticas presenciais em laboratório

## 3) BIA ACADEMY CORPORATIVO — Turma Fechada / In-Company
- Formato: programa executivo sob medida para instituições
- Preço: sob consulta (proposta customizada, NF para CNPJ, aceita
  empenho público)
- Canal: WhatsApp (11) 96863-2231 · https://wa.me/11968632231
- Para quem: universidades, hospitais, centros de pesquisa, empresas
  farmacêuticas/cosméticas/dispositivos, órgãos públicos, startups.
  Grupos de 5 a 30 pessoas
- Inclui: currículo customizado + PRÁTICAS PRESENCIAIS reais no
  laboratório Quantis (diferencial exclusivo) + plataforma BIA para
  todos os alunos + certificação institucional + suporte pedagógico
- Diferencial exclusivo: prática presencial com bioprinter real

# ORDEM DE ADOÇÃO NATURAL

Academy (aprender) → Plataforma (aplicar mensalmente) → Corporativo
(escalar para a instituição inteira). Os 3 produtos NÃO se substituem
— se complementam.

# DORES REAIS DO CLIENTE (usar como gatilho)

- "Alterno entre 8 softwares diferentes que não conversam entre si"
- "Software profissional custa > US$ 3.000/ano — inacessível"
- "Estudei biofabricação na teoria mas nunca imprimi"
- "Meus protocolos não são reprodutíveis"
- "Preciso de SOP GLP/GMP mas escrever manualmente leva semanas"
- "Não tenho onde consultar 807 biomateriais com reologia"
- "Meu time de P&D não tem formação estruturada em bioimpressão"

# VOZ E TOM (regras obrigatórias)

✓ Técnica sem ser hermética — termos científicos com 1 frase explicativa
✓ Confiante com DADOS (807 biomateriais, 11 algoritmos, 30+ papers)
✓ Empática — reconhecer dor real antes de vender
✓ Direta — preço, escopo, canal de compra sempre claros
✓ Brasileira sem colonialismo científico

✗ EVITE: "revolucionário", "único do mundo", "primeiro do universo"
✗ EVITE: comparações depreciativas nominando concorrentes
✗ EVITE: promessas médicas absolutas — use "auxilia", "sugere", "estima"
✗ EVITE: emojis em excesso em canais B2B (LinkedIn, propostas)

# ESTRUTURA OBRIGATÓRIA

1. Subject line (máx 55 caracteres, valor claro, sem clickbait)
2. Preheader (máx 100 caracteres, complementa o subject)
3. Saudação personalizada ({{nome}} ou neutro)
4. Abertura em 1-2 frases (conecta com a dor)
5. Corpo (150-350 palavras conforme objetivo)
6. CTA único e claro (1 botão + no máx 1 link secundário)
7. PS opcional (reforço técnico ou prova social)
8. Assinatura (Equipe Quantis Biotechnology · biaquantis.bio)

# REGRAS ANTI-SPAM

- NUNCA "GRÁTIS!!!", "OFERTA IMPERDÍVEL", "COMPRE JÁ" em caps
- NUNCA mais de 3 pontos de exclamação no email inteiro
- SEMPRE link de descadastro no rodapé
- Preço em número (R$ 507) não em texto extenso
- Máximo 2 emojis no subject, máximo 5 no corpo

# LINKS OFICIAIS (usar SEMPRE estes)

- Site: https://biaquantis.bio
- Landing Academy: https://biaquantis.bio/academy
- Checkout Plataforma R$ 507/mês: https://www.asaas.com/c/qsnp08rvpuwlj8ip
- Checkout Academy R$ 2.375: https://www.asaas.com/c/iu7ym1dp93cei9zk
- WhatsApp Corporativo: https://wa.me/11968632231
- Cadastro grátis: https://biaquantis.bio/auth/register

# INSTRUÇÃO

Escreva o email conforme os PARÂMETROS abaixo. Se algum estiver ausente,
use padrão sensato e sinalize entre colchetes no final.

PARÂMETROS DA CAMPANHA:
- Modalidade: [PLATAFORMA / ACADEMY_ONLINE / CORPORATIVO / JORNADA_COMPLETA]
- Público: [nome do segmento]
- Objetivo: [AWARENESS / CONSIDERATION / CONVERSION / RETENTION / WINBACK]
- Tom: [DIRETO / EDUCATIVO / STORYTELLING / TÉCNICO_PROFUNDO]
- Comprimento: [CURTO 100-150w / MÉDIO 200-300w / LONGO 350-500w]
- CTA principal: [ASSINAR / MATRICULAR / WHATSAPP / TESTAR_GRÁTIS / AGENDAR]
- Contexto adicional: [info específica da campanha]

Ao final do email, entregue TAMBÉM:
1. 3 variações de subject line (A/B/C)
2. 1 preheader alinhado com o melhor subject
3. Sugestão de segmentação (quem receber este email)
4. Sugestão de horário/dia de envio"""

    add_code_block(doc, prompt_master, label="Prompt Master (copie tudo abaixo)")

    doc.add_page_break()

    # ===== 5 EXEMPLOS =====
    add_heading(doc, "🎁 5 exemplos de uso do prompt", level=1, size=22)
    add_body(doc, "Cada bloco abaixo é um preenchimento pronto dos parâmetros. "
                  "Copie o Prompt Master + um dos exemplos e cole na IA.",
             size=10.5, italic=True, color=GRAY_MID)

    examples = [
        ("Exemplo 1 — Lançamento da Plataforma (frio · awareness)",
"""PARÂMETROS:
- Modalidade: PLATAFORMA
- Público: pesquisadores em biofabricação que se cadastraram grátis
  mas nunca assinaram
- Objetivo: CONVERSION
- Tom: DIRETO
- Comprimento: MÉDIO (200-300w)
- CTA principal: ASSINAR
- Contexto adicional: lançamento do novo formato de assinatura R$ 507/mês.
  Antes o preço só existia como pacote de crédito único; agora é
  assinatura recorrente com renovação mensal de 1.500 créditos."""),

        ("Exemplo 2 — Convite para Academy (morno · consideration)",
"""PARÂMETROS:
- Modalidade: ACADEMY_ONLINE
- Público: alunos de pós-graduação e profissionais que baixaram
  algum material gratuito da Quantis nos últimos 6 meses
- Objetivo: CONSIDERATION
- Tom: EDUCATIVO
- Comprimento: LONGO (350-500w)
- CTA principal: MATRICULAR
- Contexto adicional: destacar que os 12 meses da plataforma vêm
  inclusos (economia de R$ 6.084 vs assinatura mensal). Mencionar que
  Módulo 1 já está 100% publicado com 5 aulas."""),

        ("Exemplo 3 — Prospecção Corporativa (frio · B2B)",
"""PARÂMETROS:
- Modalidade: CORPORATIVO
- Público: coordenadores de laboratório e diretores de P&D em
  universidades federais e centros de pesquisa (FAPESP, CNPq)
- Objetivo: CONSIDERATION
- Tom: TÉCNICO_PROFUNDO
- Comprimento: MÉDIO (200-300w)
- CTA principal: AGENDAR (call de 30 min)
- Contexto adicional: enfatizar diferencial exclusivo das práticas
  presenciais com bioprinter real. Aceita empenho público, NF para
  instituição, parceria com fundação. Turmas de 5 a 30 alunos."""),

        ("Exemplo 4 — Recuperação de Carrinho Abandonado (Academy)",
"""PARÂMETROS:
- Modalidade: ACADEMY_ONLINE
- Público: leads que clicaram no checkout Asaas mas não concluíram
  o pagamento nos últimos 3 dias
- Objetivo: CONVERSION
- Tom: DIRETO
- Comprimento: CURTO (100-150w)
- CTA principal: MATRICULAR
- Contexto adicional: lembrar que aceita boleto, Pix ou cartão em
  12x sem juros. Oferecer resposta pelo WhatsApp caso tenha dúvida
  antes de finalizar."""),

        ("Exemplo 5 — Jornada Completa (sequência de 3 emails · nurturing)",
"""PARÂMETROS:
- Modalidade: JORNADA_COMPLETA
- Público: novos cadastros grátis nos últimos 7 dias
- Objetivo: NURTURING → CONVERSION
- Tom: STORYTELLING
- Comprimento: MÉDIO (200-300w cada)
- CTA principal: TESTAR_GRÁTIS (email 1) → MATRICULAR (email 2) →
  ASSINAR (email 3)
- Contexto adicional: escrever 3 emails em sequência:
  Email 1 (Dia 0): apresentar a Plataforma, convite para usar os
    10 créditos iniciais fazendo 1 formulação com o Formulator Pro
  Email 2 (Dia 4): apresentar a Academy Online como caminho de
    aprofundamento
  Email 3 (Dia 10): apresentar a assinatura da Plataforma R$ 507/mês
    para quem já testou e quer usar mensalmente"""),
    ]

    for title, code in examples:
        add_heading(doc, title, level=2, color=FUCHSIA, size=13)
        add_code_block(doc, code)

    doc.add_page_break()

    # ===== 3 TEMPLATES PRONTOS =====
    add_heading(doc, "📬 3 Templates prontos para copiar", level=1, size=22)
    add_body(doc, "Se você quer emails prontos AGORA sem passar por IA, use os "
                  "3 abaixo. Só substituir {{nome}} e {{instituicao}}.",
             size=10.5, italic=True, color=GRAY_MID)

    templates = [
        {
            "title": "Template 1 — Plataforma (assinatura R$ 507/mês)",
            "subjects": [
                "A) Sua bancada digital de biofabricação, por R$ 507/mês",
                "B) 1.500 créditos por mês para formular, imprimir e publicar",
                "C) A plataforma BIA agora é assinatura — cancele quando quiser",
            ],
            "preheader": "807 biomateriais, Slicer 3D, Chat IA, SOPs GLP/GMP. Tudo num só lugar.",
            "body": """Olá {{nome}},

Se você trabalha com biofabricação, já viveu isso: abre um software para modelar, outro para formular, uma planilha para acompanhar viabilidade, um Word para escrever o SOP. E nenhum deles conversa entre si.

A BIA foi criada para acabar com isso. Numa única plataforma:

🧪 Formulator Pro com 807 biomateriais e análise reológica em tempo real
🖨️ Slicer 3D com 11 algoritmos biomédicos (extrusão, gyroid, TPMS)
🔮 Organoid Builder para esferoides e organoides (7 tipos)
📄 SOPs GLP/GMP em formato ANVISA/ISO 17025 exportados em PDF
🤖 Chat IA treinado em biofabricação avançada
📓 Notebook com versionamento V1/V2/V3 automático

Novo formato de assinatura:
R$ 507/mês · 1.500 créditos que renovam todo mês · cancele quando quiser direto no Asaas, sem multa.

👉 Assinar agora: https://www.asaas.com/c/qsnp08rvpuwlj8ip

Ou crie sua conta grátis em biaquantis.bio/auth/register — 10 créditos iniciais para testar.

Qualquer dúvida, é só responder este email.

— Equipe Quantis Biotechnology
🔗 biaquantis.bio

PS. Se você prefere formação estruturada com curso + plataforma incluída, conheça a BIA Academy (R$ 2.375 · 12 meses) em biaquantis.bio/academy."""
        },
        {
            "title": "Template 2 — Academy Online (R$ 2.375 · curso individual)",
            "subjects": [
                "A) Aprenda bioimpressão 3D com a plataforma ao lado",
                "B) 12 módulos + plataforma BIA por 12 meses inclusa",
                "C) Você não estuda biofabricação. Você imprime.",
            ],
            "preheader": "R$ 2.375 · 12x de R$ 197,92 sem juros · certificado + projeto próprio.",
            "body": """Olá {{nome}},

Se você já pesquisou "curso de bioimpressão 3D" no Brasil, provavelmente encontrou o mesmo problema: muita teoria, pouca prática, e o software profissional custa mais que seu bolsa-doutorado.

A BIA Academy foi criada para resolver isso.

É o primeiro programa online brasileiro que ensina biofabricação com a plataforma profissional já incluída no valor. Você não estuda "sobre" bioimpressão — você formula uma biotinta enquanto assiste à aula sobre reologia.

O que você recebe:
🎓 12 módulos técnicos — do fundamento à translação clínica
💻 12 meses de acesso à plataforma BIA (20.000 créditos inclusos — equivalente a R$ 6.084 se pagasse mensal)
🎥 3 encontros ao vivo com a equipe Quantis
📄 Projeto de biofabricação próprio publicável (PDF/DOCX)
📜 Certificado oficial ao completar 100%

Investimento: R$ 2.375 à vista ou 12x de R$ 197,92 sem juros no cartão.

👉 Matricular agora: https://www.asaas.com/c/iu7ym1dp93cei9zk

Ou veja o programa completo em biaquantis.bio/academy antes de decidir.

— Equipe Quantis Biotechnology
🔗 biaquantis.bio/academy

PS. As turmas atuais têm preço travado — vai subir no próximo lote."""
        },
        {
            "title": "Template 3 — Corporativo (WhatsApp · proposta B2B)",
            "subjects": [
                "A) Formação em biofabricação para seu laboratório",
                "B) Turma fechada com práticas presenciais na Quantis",
                "C) Programa executivo em bioimpressão para sua instituição",
            ],
            "preheader": "Currículo customizado · Práticas reais no lab · NF para CNPJ.",
            "body": """Prezada equipe {{instituicao}},

Vocês estão avaliando formação profissional em biofabricação e bioimpressão 3D para o time?

A Quantis Biotechnology oferece o BIA Academy Corporativo — programa executivo sob medida para instituições, com um diferencial que nossos formatos online não têm: práticas presenciais reais no nosso laboratório.

O que está incluso:
🎓 Currículo customizado ao contexto do cliente (foco no tecido/aplicação, ajuste de nível, cronograma adaptado)
🧪 Práticas presenciais com bioprinter profissional — manuseio de biomateriais, execução completa da formulação ao pós-processamento
🏛️ Modalidades flexíveis: in-company (nós vamos até vocês), no laboratório Quantis, parceria acadêmica ou híbrido
💻 Acesso à plataforma BIA para todos os alunos da turma
📜 Certificação institucional — declarações para RH / DP acadêmico
🤝 Suporte pedagógico dedicado

Facilidades comerciais:
- NF de serviço para CNPJ
- Aceita empenho público, licitações, parceria com fundação
- Pagamento parcelado ou por marco
- Descontos progressivos por volume (5 a 30 alunos por turma)

Vamos marcar 30 minutos para desenhar uma proposta sob medida?

👉 Falar no WhatsApp: https://wa.me/11968632231 · (11) 96863-2231

Resposta em até 1 dia útil.

— Janaina Dernowsek
CEO, Quantis Biotechnology
🔗 biaquantis.bio"""
        },
    ]

    for t in templates:
        add_heading(doc, t["title"], level=2, color=FUCHSIA, size=13)
        add_mixed(doc, [("Subject lines A/B/C:", {"bold": True, "size": 10, "color": VIOLET_DARK})], space_after=2)
        for s in t["subjects"]:
            add_body(doc, f"  {s}", size=10, color=BLACK)
        add_mixed(doc, [
            ("Preheader:  ", {"bold": True, "size": 10, "color": VIOLET_DARK}),
            (t["preheader"], {"size": 10, "italic": True}),
        ], space_after=6)
        add_code_block(doc, t["body"], label="Corpo do email")

    doc.add_page_break()

    # ===== TABELA DE SEGMENTAÇÃO =====
    add_heading(doc, "📊 Dicas de segmentação", level=1, size=22)
    add_body(doc, "Escolha o template certo para cada lista da sua ferramenta de email:",
             size=10.5, color=GRAY_DARK)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    add_table_pro(doc,
        headers=["Segmento", "Modalidade", "Template"],
        rows=[
            ["Cadastros grátis inativos > 30 dias", "Plataforma", "Template 1"],
            ["Cadastros grátis ativos com 0 créditos", "Plataforma", "Template 1 (foco em créditos mensais)"],
            ["Leads de webinar / material rico", "Academy Online", "Template 2"],
            ["Alunos de pós-graduação", "Academy Online", "Template 2"],
            ["Carrinho Asaas abandonado (Academy)", "Academy Online", "Exemplo 4 — recuperação"],
            ["Diretores de P&D em CNPJ > 10 pessoas", "Corporativo", "Template 3"],
            ["Coordenadores de lab em universidade", "Corporativo", "Template 3"],
            ["Ex-alunos Academy (12 meses vencendo)", "Plataforma (upsell)", "Template 1"],
            ["Assinantes Plataforma que cancelaram", "Plataforma (winback)", "Template 1 personalizado"],
        ],
        col_widths=[6.5, 4.0, 6.5]
    )

    # ===== HORÁRIOS =====
    add_heading(doc, "⏰ Horários sugeridos de envio (Brasil)", level=1, size=20, space_before=20)
    add_bullet(doc,
        "Terça, Quarta ou Quinta às 10h ou 19h",
        bold_prefix="B2C individual (pesquisadores, alunos):  ")
    add_bullet(doc,
        "Terça ou Quarta às 09h ou 14h (horário comercial)",
        bold_prefix="B2B institucional (Corporativo):  ")
    add_mixed(doc, [
        ("Nunca:  ", {"bold": True, "color": FUCHSIA}),
        ("Segunda de manhã (inbox lotado), Sexta à tarde (baixa atenção), fim de semana", {}),
    ], space_after=6)

    # ===== COMPLIANCE =====
    add_heading(doc, "🔒 Compliance LGPD (rodapé obrigatório)", level=1, size=20, space_before=16)
    add_body(doc, "Todo email da Quantis deve conter no rodapé:",
             size=10.5, color=GRAY_DARK)
    add_code_block(doc,
"""Você está recebendo este email porque se cadastrou em biaquantis.bio,
baixou um material gratuito ou entrou em contato com nossa equipe.

[Descadastrar] · [Preferências] · Quantis Biotechnology · CNPJ XX.XXX.XXX/0001-XX"""
    )
    add_mixed(doc, [
        ("⚠️  ", {"color": FUCHSIA}),
        ("Substituir o CNPJ acima pelo real da Quantis Biotechnology antes de disparar.",
         {"bold": True, "color": BLACK}),
    ])

    # ===== KPIs =====
    add_heading(doc, "🎯 KPIs para acompanhar", level=1, size=20, space_before=16)
    add_table_pro(doc,
        headers=["Métrica", "Meta B2C", "Meta B2B"],
        rows=[
            ["Taxa de abertura", "25-35%", "20-30%"],
            ["Taxa de clique (CTR)", "3-6%", "4-8%"],
            ["Taxa de conversão", "1-3%", "2-5%"],
            ["Descadastro por envio", "< 0.5%", "< 0.3%"],
            ["Bounce", "< 2%", "< 2%"],
        ],
        col_widths=[6.0, 5.5, 5.5]
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_heading(doc, "Diagnóstico rápido", level=2, color=VIOLET, size=13)
    add_bullet(doc, "revise SUBJECT LINE + PREHEADER",
               bold_prefix="Se abertura < 20%:  ")
    add_bullet(doc, "revise CTA + estrutura do corpo do email",
               bold_prefix="Se CTR < 2%:  ")
    add_bullet(doc, "revise a OFERTA + landing de destino",
               bold_prefix="Se conversão < 1%:  ")

    # ===== RODAPÉ =====
    add_hr(doc)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(20)
    run = p.add_run("Quantis Biotechnology  ·  biaquantis.bio  ·  Documento interno confidencial")
    run.font.name = FONT
    run.font.size = Pt(9)
    run.font.italic = True
    run.font.color.rgb = GRAY_MID

    # Salvar
    output = "docs/marketing/prompt-email-marketing.docx"
    doc.save(output)
    import os
    print(f"✅ Word gerado: {output}")
    print(f"   Tamanho: {os.path.getsize(output)/1024:.1f} KB")


if __name__ == "__main__":
    build()
