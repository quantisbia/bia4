#!/usr/bin/env python3
"""
Gera o arquivo Word profissional do descritivo comercial dos 3 produtos BIA.
Formatação com identidade visual Quantis (violeta/fúcsia, tipografia moderna,
tabelas coloridas, sumário automático).

Saída: docs/marketing/descritivo-comercial-3-produtos.docx
"""
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# Paleta oficial Quantis (violeta/fúcsia da BIA)
VIOLET_DARK = RGBColor(0x4C, 0x1D, 0x95)   # violet-900
VIOLET = RGBColor(0x7C, 0x3A, 0xED)         # violet-600
FUCHSIA = RGBColor(0xD9, 0x46, 0xEF)        # fuchsia-500
FUCHSIA_LIGHT = RGBColor(0xE8, 0x79, 0xF0)  # accent
BLACK = RGBColor(0x0F, 0x0A, 0x1F)          # near-black
GRAY_DARK = RGBColor(0x37, 0x41, 0x51)      # gray-700
GRAY_MID = RGBColor(0x6B, 0x72, 0x80)       # gray-500
GRAY_LIGHT = RGBColor(0xE5, 0xE7, 0xEB)     # gray-200
BG_VIOLET = "F5F3FF"                         # violet-50 hex
BG_FUCHSIA = "FDF4FF"                        # fuchsia-50 hex
BG_GREEN = "ECFDF5"                          # emerald-50 hex

FONT_HEADING = "Calibri"   # cabeçalhos (Word default, sempre disponível)
FONT_BODY = "Calibri"      # corpo


def set_cell_shading(cell, hex_color):
    """Aplica cor de fundo em uma célula de tabela."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def set_cell_borders(cell, color="D1D5DB", size="4"):
    """Aplica bordas cinza claro em uma célula."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for border_name in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{border_name}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), size)
        b.set(qn("w:color"), color)
        tcBorders.append(b)
    tc_pr.append(tcBorders)


def add_heading(doc, text, level=1, color=VIOLET_DARK, size=None, space_before=12, space_after=6):
    """Adiciona um heading customizado com cor e tamanho."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = FONT_HEADING
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
    """Adiciona parágrafo de corpo."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = FONT_BODY
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.25
    return p


def add_body_mixed(doc, parts, size=10.5, align=None, space_after=4):
    """
    Adiciona parágrafo com formatação mista.
    parts = lista de tuplas (texto, dict{bold, italic, color, ...})
    """
    p = doc.add_paragraph()
    for text, opts in parts:
        run = p.add_run(text)
        run.font.name = FONT_BODY
        run.font.size = Pt(opts.get("size", size))
        run.font.color.rgb = opts.get("color", GRAY_DARK)
        run.font.bold = opts.get("bold", False)
        run.font.italic = opts.get("italic", False)
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    return p


def add_bullet(doc, text, indent=0.4, bold_prefix=None):
    """Adiciona bullet point."""
    p = doc.add_paragraph(style="List Bullet")
    if bold_prefix:
        run_bold = p.add_run(bold_prefix)
        run_bold.font.name = FONT_BODY
        run_bold.font.size = Pt(10.5)
        run_bold.font.bold = True
        run_bold.font.color.rgb = VIOLET_DARK
        run_rest = p.add_run(text)
    else:
        run_rest = p.add_run(text)
    run_rest.font.name = FONT_BODY
    run_rest.font.size = Pt(10.5)
    run_rest.font.color.rgb = GRAY_DARK
    p.paragraph_format.left_indent = Cm(indent)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.2
    return p


def add_quote(doc, text, color=FUCHSIA):
    """Adiciona citação destacada (elevator pitch)."""
    p = doc.add_paragraph()
    run = p.add_run(f'  "{text}"')
    run.font.name = FONT_BODY
    run.font.size = Pt(11)
    run.font.italic = True
    run.font.color.rgb = color
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.3
    # Borda esquerda violeta
    p_pr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "18")
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), "7C3AED")
    pBdr.append(left)
    p_pr.append(pBdr)
    return p


def add_hr(doc):
    """Adiciona separador horizontal violeta."""
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


def add_table(doc, headers, rows, header_bg="7C3AED", stripe=True, col_widths=None):
    """Cria tabela profissional com cabeçalho violeta e faixas alternadas."""
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_shading(cell, header_bg)
        set_cell_borders(cell, color="7C3AED", size="4")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        run.font.name = FONT_HEADING
        run.font.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.size = Pt(10)
    # Body
    for r_idx, row_data in enumerate(rows):
        row = table.add_row().cells
        bg = "FAF5FF" if stripe and r_idx % 2 == 0 else "FFFFFF"
        for c_idx, cell_text in enumerate(row_data):
            cell = row[c_idx]
            set_cell_shading(cell, bg)
            set_cell_borders(cell, color="E5E7EB", size="4")
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            run = p.add_run(str(cell_text))
            run.font.name = FONT_BODY
            run.font.size = Pt(9.5)
            run.font.color.rgb = GRAY_DARK
            p.paragraph_format.space_after = Pt(2)
    # Col widths
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                if i < len(row.cells):
                    row.cells[i].width = Cm(w)
    return table


def add_product_header_card(doc, emoji, title, subtitle, bg_hex, accent_color):
    """Cria um "card" de cabeçalho de produto — tabela 1x1 com cor de fundo."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_shading(cell, bg_hex)
    set_cell_borders(cell, color=accent_color.replace("#", ""), size="12")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    p1 = cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_emoji = p1.add_run(f"{emoji}  ")
    run_emoji.font.size = Pt(20)
    run_title = p1.add_run(title)
    run_title.font.name = FONT_HEADING
    run_title.font.bold = True
    run_title.font.size = Pt(18)
    run_title.font.color.rgb = VIOLET_DARK
    p1.paragraph_format.space_after = Pt(2)

    p2 = cell.add_paragraph()
    run_sub = p2.add_run(subtitle)
    run_sub.font.name = FONT_BODY
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = FUCHSIA
    p2.paragraph_format.space_after = Pt(0)

    # Espaço depois do card
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def build_document():
    doc = Document()

    # Configurar margens
    for section in doc.sections:
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(2.2)

    # Definir estilo padrão
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT_BODY
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = GRAY_DARK

    # ═══════════════════════════════════════════════════════════════
    # CAPA
    # ═══════════════════════════════════════════════════════════════
    # Título grande
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(60)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run("BIA")
    run.font.name = FONT_HEADING
    run.font.size = Pt(60)
    run.font.bold = True
    run.font.color.rgb = VIOLET_DARK

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(24)
    run = p.add_run("Biomaterial Intelligent Assistant")
    run.font.name = FONT_BODY
    run.font.size = Pt(14)
    run.font.italic = True
    run.font.color.rgb = FUCHSIA

    # Subtítulo
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run("Descritivo Comercial Oficial")
    run.font.name = FONT_HEADING
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = BLACK

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(40)
    run = p.add_run("Plataforma · Curso Online · Programa Corporativo")
    run.font.name = FONT_BODY
    run.font.size = Pt(13)
    run.font.color.rgb = VIOLET
    run.font.italic = True

    # Linha separadora
    add_hr(doc)

    # Bloco de metadados centralizado
    meta_lines = [
        ("Documento:", "Descritivo comercial dos 3 produtos BIA"),
        ("Autoridade:", "Janaina Dernowsek — CEO Quantis Biotechnology"),
        ("Uso:", "Material de marketing, propostas comerciais, treinamento de vendas"),
        ("Última atualização:", "16/09/2026"),
        ("Versão:", "1.0"),
    ]
    for label, value in meta_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        run_l = p.add_run(f"{label}  ")
        run_l.font.name = FONT_BODY
        run_l.font.size = Pt(10)
        run_l.font.bold = True
        run_l.font.color.rgb = VIOLET_DARK
        run_v = p.add_run(value)
        run_v.font.name = FONT_BODY
        run_v.font.size = Pt(10)
        run_v.font.color.rgb = GRAY_DARK

    # Footer da capa
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(80)
    run = p.add_run("Quantis Biotechnology  ·  biaquantis.bio")
    run.font.name = FONT_BODY
    run.font.size = Pt(10)
    run.font.color.rgb = GRAY_MID

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # RESUMO EXECUTIVO
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Resumo executivo em 30 segundos", level=1, size=22)
    add_body(doc,
        "A Quantis oferece 3 produtos complementares em biofabricação, cada um "
        "para um perfil de cliente diferente. Os 3 produtos NÃO se substituem — "
        "se complementam. A ordem natural de adoção é:",
        size=11)

    add_body_mixed(doc, [
        ("Academy", {"bold": True, "color": VIOLET_DARK}),
        (" (aprender) → ", {}),
        ("Plataforma", {"bold": True, "color": VIOLET_DARK}),
        (" (aplicar mensalmente) → ", {}),
        ("Corporativo", {"bold": True, "color": VIOLET_DARK}),
        (" (levar para minha instituição inteira).", {}),
    ], size=11)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Tabela executiva
    add_table(doc,
        headers=["Produto", "O que é", "Para quem", "Preço"],
        rows=[
            ["🧭 BIA Plataforma\n(Guia Inteligente)",
             "Software SaaS de IA científica para tecidos, esferoides e organoides",
             "Pesquisadores individuais e times que já sabem o que fazer",
             "R$ 507/mês\nassinatura\ncancele quando quiser"],
            ["🎓 BIA Academy Online\n(Curso Individual)",
             "Programa de 12 módulos + 12 meses de plataforma incluída",
             "Quem quer aprender do zero ou consolidar no ritmo próprio",
             "R$ 2.375\npagamento único\n12 meses de acesso"],
            ["🏢 BIA Academy Corporativo\n(Turma Fechada)",
             "Formação sob medida com práticas presenciais no lab Quantis",
             "Universidades, hospitais, centros de pesquisa, empresas",
             "Sob consulta\nWhatsApp comercial"],
        ],
        col_widths=[4.2, 5.5, 4.5, 3.0]
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # PRODUTO 1 — PLATAFORMA
    # ═══════════════════════════════════════════════════════════════
    add_product_header_card(doc,
        emoji="🧭",
        title="BIA Plataforma",
        subtitle="Guia Inteligente em Biofabricação 3D",
        bg_hex=BG_VIOLET,
        accent_color="7C3AED"
    )

    add_heading(doc, "O que é", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("A ", {}),
        ("plataforma profissional de IA científica", {"bold": True, "color": BLACK}),
        (" que reúne todo o fluxo de trabalho de biofabricação num só lugar. "
         "O pesquisador entra, formula uma biotinta, desenha um scaffold, cultiva "
         "esferoides, projeta organoides, gera o SOP em formato ANVISA e sai com "
         "o protocolo pronto — ", {}),
        ("sem precisar de 8 softwares diferentes.", {"bold": True, "color": VIOLET_DARK}),
    ], size=11)

    add_heading(doc, "Para quem é", level=2, color=VIOLET, size=14)
    for item in [
        "Pesquisadores em biofabricação, bioimpressão 3D e engenharia tecidual",
        "Times de P&D em cosméticos, farmacêutica e dispositivos médicos",
        "Dentistas e médicos regenerativos",
        "Engenheiros de biomateriais",
        "Alunos de mestrado e doutorado que precisam de ferramenta profissional",
        "Startups do setor de biotecnologia",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "O que está incluso", level=2, color=VIOLET, size=14)

    add_heading(doc, "🖨️  Bioimpressão 3D", level=3, color=FUCHSIA, size=12)
    for item in [
        "Modelo 3D: 5 categorias (upload STL, geração por IA, biblioteca)",
        "Formulator Pro: combine até 8 biomateriais com 807 opções catalogadas",
        "Biotinta: análise reológica em tempo real, viscosidade, printabilidade",
        "Slicer: G-code engine com 11 algoritmos biomédicos (extrusão, gyroid, TPMS, Schwarz P, Diamond)",
        "Execução: live control com feasibility, crosslink, pós-processamento",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🔮  Esferoides e Organoides", level=3, color=FUCHSIA, size=12)
    for item in [
        "Design de esferoides multicelulares scaffold-free",
        "Protocolos QMicroNiche™",
        "Moldes não-adesivos QMatrix™",
        "Templates: organoides intestinais, hepáticos, neurais, cardíacos, renais, pancreáticos e pulmonares",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🧬  Pipeline científico (12 estágios)", level=3, color=FUCHSIA, size=12)
    add_body(doc, "Do problema clínico ao protocolo validado, guiado por IA.", size=10.5)

    add_heading(doc, "📄  GLP/GMP & Regulação", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Geração de SOPs em formato ABNT NBR ISO/IEC 17025 e ANVISA RDC. "
        "Cultura celular, esterilização, criopreservação, controle de qualidade. "
        "Exporta PDF assinável.", size=10.5)

    add_heading(doc, "📚  Knowledge Engine", level=3, color=FUCHSIA, size=12)
    for item in [
        "30+ artigos científicos com DOI (2020-2025)",
        "20+ patentes WIPO/USPTO",
        "15+ metodologias com links para PubMed / Nature / JoVE",
        "Upload de documentos próprios — a IA usa como contexto",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🤖  Chat IA científico", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Converse em linguagem natural. Faça perguntas técnicas, valide hipóteses, "
        "peça revisão de protocolo. Treinada em biofabricação avançada.", size=10.5)

    add_heading(doc, "📓  Notebook do Pesquisador", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Diário digital com versionamento automático V1/V2/V3, biblioteca de imagens, "
        "gerador de papers e métodos científicos com IA, rastreabilidade GLP.", size=10.5)

    add_heading(doc, "📑  Exportação universal", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Todos os módulos exportam em 7 formatos (PDF, DOCX, Markdown, JSON, CSV, XLSX, ZIP) "
        "com preservação de decisões.", size=10.5)

    add_heading(doc, "Modelo comercial", level=2, color=VIOLET, size=14)
    for item, prefix in [
        ("em assinatura recorrente", "R$ 507/mês  "),
        ("renovados todo mês (reset — não acumula)", "1.500 créditos  "),
        ("direto no Asaas · Sem multa", "Cancele quando quiser  "),
        ("até o fim do ciclo já pago", "Acesso permanece ativo  "),
        ("via boleto, Pix ou cartão de crédito", "Cobrança automática  "),
        ("— plataforma pura", "Não inclui o curso Academy  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    add_heading(doc, "Onde comprar", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("Site: ", {"bold": True}),
        ("biaquantis.bio ", {}),
        ("(banner destacado na home)", {"italic": True, "color": GRAY_MID}),
    ])
    add_body_mixed(doc, [
        ("Checkout direto: ", {"bold": True}),
        ("https://www.asaas.com/c/qsnp08rvpuwlj8ip", {"color": VIOLET}),
    ])

    add_heading(doc, "Discurso de venda em 1 linha", level=2, color=VIOLET, size=14)
    add_quote(doc,
        "Você não precisa mais alternar entre 8 softwares para bioimprimir "
        "um tecido. A BIA reúne formulação, design 3D, slicing, cultura de "
        "esferoides e SOP regulatório em uma plataforma só — R$ 507/mês, "
        "cancele quando quiser."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # PRODUTO 2 — ACADEMY ONLINE
    # ═══════════════════════════════════════════════════════════════
    add_product_header_card(doc,
        emoji="🎓",
        title="BIA Academy Online",
        subtitle="Curso Individual em Biofabricação e Bioimpressão 3D",
        bg_hex=BG_FUCHSIA,
        accent_color="D946EF"
    )

    add_heading(doc, "O que é", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("O ", {}),
        ("primeiro programa online brasileiro", {"bold": True, "color": BLACK}),
        (" que ensina biofabricação e bioimpressão 3D com a ", {}),
        ("plataforma profissional já incluída no valor", {"bold": True, "color": VIOLET_DARK}),
        (". O aluno não estuda \"sobre\" biofabricação — ele ", {}),
        ("formula uma biotinta enquanto assiste à aula sobre reologia", {"bold": True, "color": FUCHSIA}),
        (", desenha um scaffold enquanto aprende TPMS, gera G-code enquanto "
         "aprende bioimpressão.", {}),
    ], size=11)

    add_heading(doc, "Para quem é", level=2, color=VIOLET, size=14)
    for item in [
        "Pesquisadores que querem aprender do zero de forma estruturada",
        "Profissionais que trabalham no setor mas nunca fizeram um curso formal",
        "Alunos de graduação e pós-graduação interessados em biofabricação",
        "Dentistas, médicos, farmacêuticos, engenheiros e cosmetólogos migrando para medicina regenerativa",
        "Quem quer sair do \"estudei, mas nunca imprimi\" e virar autor de protocolos reprodutíveis",
        "Empreendedores validando um projeto de biofabricação",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "O que está incluso", level=2, color=VIOLET, size=14)

    add_heading(doc, "🎓  12 módulos técnicos completos (~12 meses)", level=3, color=FUCHSIA, size=12)
    modules = [
        ("1", "Introdução à Biofabricação", "Engenharia tecidual · Bioimpressão · Aplicações · Limitações"),
        ("2", "Biomateriais", "Polímeros naturais/sintéticos · Hidrogéis · MEC · FDA/ANVISA"),
        ("3", "Biotintas", "Formulação · Reologia · Reticulação · Printabilidade"),
        ("4", "Bioimpressão 3D", "Extrusão · Pressão · Velocidade · Parâmetros ideais"),
        ("5", "Arquitetura 3D", "Scaffold · TPMS · STL · G-code · Canais vasculares"),
        ("6", "Células", "Primárias · iPSC · MSC · Viabilidade pós-impressão"),
        ("7", "Tecidos", "Pele · Osso · Cartilagem · Tecidos moles · Vasos"),
        ("8", "Esferoides e Organoides", "Building blocks · Organoides · Modelos de doença"),
        ("9", "Avaliação pós-impressão", "Viabilidade · Histologia · Análise estatística"),
        ("10", "Translação", "GMP · Escalabilidade · Regulação clínica"),
        ("11", "Desenvolvimento de Projeto", "Estruture seu projeto pessoal"),
        ("12", "Projeto Final", "Protocolo experimental completo exportável"),
    ]
    add_table(doc,
        headers=["#", "Módulo", "Escopo"],
        rows=modules,
        col_widths=[1.0, 4.2, 10.8],
        header_bg="D946EF"
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    add_heading(doc, "💻  12 meses de acesso à plataforma BIA (incluídos)", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "O aluno recebe automaticamente plano ACADEMY com 20.000 créditos "
        "para experimentar e aplicar tudo o que aprender.", size=10.5)

    add_heading(doc, "🎥  3 encontros ao vivo com a equipe Quantis", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Data marcada por trimestre. Espaço para perguntas técnicas, revisão de "
        "projetos e networking com outros alunos.", size=10.5)

    add_heading(doc, "📄  Projeto de biofabricação próprio", level=3, color=FUCHSIA, size=12)
    add_body_mixed(doc, [
        ("O aluno sai do curso com ", {}),
        ("um documento pronto", {"bold": True, "color": VIOLET_DARK}),
        (" para submissão ou publicação (exportável em PDF/DOCX). Não é um "
         "trabalho hipotético — é o protocolo de bancada dele.", {}),
    ])

    add_heading(doc, "📜  Certificado oficial", level=3, color=FUCHSIA, size=12)
    add_body(doc, "Emitido ao completar 100% do curso e entregar o projeto final.", size=10.5)

    add_heading(doc, "O que NÃO tem", level=2, color=VIOLET, size=14)
    for item in [
        "Práticas presenciais (isso é exclusivo do formato Corporativo)",
        "Renovação automática de créditos (é pacote único de 12 meses)",
        "Turma fechada / horário fixo (o aluno estuda no ritmo próprio)",
    ]:
        add_bullet(doc, item, bold_prefix="✗  ")

    add_heading(doc, "Modelo comercial", level=2, color=VIOLET, size=14)
    for item, prefix in [
        ("à vista", "R$ 2.375,00  "),
        ("de R$ 197,92 sem juros no cartão", "Ou 12x  "),
        ("(não é assinatura)", "Pagamento único  "),
        ("após confirmação", "Liberação em até 24h úteis  "),
        ("por 12 meses", "Inclui 20.000 créditos da plataforma BIA  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    add_heading(doc, "Onde comprar", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("Landing dedicada: ", {"bold": True}),
        ("biaquantis.bio/academy", {}),
    ])
    add_body_mixed(doc, [
        ("Checkout direto: ", {"bold": True}),
        ("https://www.asaas.com/c/iu7ym1dp93cei9zk", {"color": VIOLET}),
    ])

    add_heading(doc, "Discurso de venda em 1 linha", level=2, color=VIOLET, size=14)
    add_quote(doc,
        "Você não estuda sobre biofabricação. Você formula, imprime, publica — "
        "na mesma tela em que assiste às aulas. R$ 2.375, 12 meses de curso com "
        "a plataforma profissional inclusa.",
        color=FUCHSIA
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # PRODUTO 3 — CORPORATIVO
    # ═══════════════════════════════════════════════════════════════
    add_product_header_card(doc,
        emoji="🏢",
        title="BIA Academy Corporativo",
        subtitle="Turma Fechada / In-Company com Práticas Presenciais",
        bg_hex=BG_GREEN,
        accent_color="10B981"
    )

    add_heading(doc, "O que é", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("Formação profissional ", {}),
        ("sob medida para instituições", {"bold": True, "color": BLACK}),
        (" que querem levar biofabricação para o time inteiro, com ", {}),
        ("práticas presenciais reais no laboratório Quantis", {"bold": True, "color": VIOLET_DARK}),
        (" ou na estrutura do cliente. Não é um curso gravado — é um ", {}),
        ("programa executivo desenhado com o cliente", {"bold": True, "color": FUCHSIA}),
        (".", {}),
    ], size=11)

    add_heading(doc, "Para quem é", level=2, color=VIOLET, size=14)
    for item in [
        "Universidades e centros de pesquisa que querem oferecer disciplina ou capacitação de laboratório",
        "Hospitais e institutos de medicina regenerativa treinando equipes clínicas e de pesquisa",
        "Empresas farmacêuticas, cosméticas e de dispositivos médicos com P&D interno",
        "Startups de biotecnologia formando o time fundador ou científico",
        "Órgãos públicos e agências (ANVISA, FAPESP, CNPq) em programas de capacitação",
        "Grupos fechados de 5 a 30 profissionais",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "O que está incluso", level=2, color=VIOLET, size=14)

    add_heading(doc, "🎓  Programa curricular customizado", level=3, color=FUCHSIA, size=12)
    add_body(doc, "O currículo dos 12 módulos é adaptado ao contexto do cliente:", size=10.5)
    for item in [
        "Foco no tecido/aplicação de interesse (ex: só osso, só pele, só neural)",
        "Ajuste de nível (básico, intermediário, avançado)",
        "Cronograma adaptado à agenda da instituição",
        "Casos de estudo com base nos projetos reais do time",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🧪  Práticas presenciais no laboratório Quantis ⭐", level=3, color=FUCHSIA, size=12)
    for item in [
        "Bancada real com bioprinter profissional",
        "Manuseio de biomateriais e biotintas",
        "Execução completa: da formulação ao pós-processamento",
        "Análise de viabilidade celular em tempo real",
        "Diferencial exclusivo do formato Corporativo — não disponível no curso online individual",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🏛️  Modalidades disponíveis", level=3, color=FUCHSIA, size=12)
    for item, prefix in [
        ("equipe da Quantis se desloca até o cliente", "In-company  "),
        ("turma vai até nosso laboratório", "No laboratório Quantis  "),
        ("convênio de longo prazo com universidade/centro", "Parceria acadêmica  "),
        ("teoria online + práticas presenciais em módulos concentrados", "Híbrido  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    add_heading(doc, "💻  Acesso à plataforma BIA para todos os alunos", level=3, color=FUCHSIA, size=12)
    for item in [
        "Duração e escopo negociados na proposta",
        "Suporte técnico dedicado durante o programa",
        "Onboarding coletivo com nossa equipe",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "📜  Certificação institucional", level=3, color=FUCHSIA, size=12)
    for item in [
        "Certificado emitido pela Quantis Biotechnology",
        "Emissão de declarações para RH / DP acadêmico",
        "Possibilidade de reconhecimento como disciplina/extensão",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "🤝  Suporte pedagógico dedicado", level=3, color=FUCHSIA, size=12)
    add_body(doc,
        "Ponto de contato único para a instituição, gestão de calendário, "
        "relatórios de progresso da turma.", size=10.5)

    add_heading(doc, "O que NÃO tem", level=2, color=VIOLET, size=14)
    for item in [
        "Preço fixo publicado (é proposta customizada por escopo)",
        "Auto-compra online (passa obrigatoriamente pelo time comercial)",
        "Turma aberta ao público — é sempre grupo fechado",
    ]:
        add_bullet(doc, item, bold_prefix="✗  ")

    add_heading(doc, "Modelo comercial", level=2, color=VIOLET, size=14)
    for item, prefix in [
        ("proposta comercial customizada", "Sob consulta —  "),
        ("número de alunos, carga horária, modalidade (presencial/híbrida), duração, deslocamento, adaptação de currículo",
         "Variáveis:  "),
        ("de serviço para instituição (CNPJ)", "Faturamento por NF  "),
        ("licitações e parcerias com fundação", "Aceita empenho público,  "),
        ("(à vista, parcelado, por marco)", "Formas de pagamento flexíveis  "),
        ("por volume de alunos", "Descontos progressivos  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    add_heading(doc, "Onde solicitar proposta", level=2, color=VIOLET, size=14)
    add_body_mixed(doc, [
        ("WhatsApp comercial: ", {"bold": True}),
        ("(11) 96863-2231", {"color": VIOLET_DARK, "bold": True}),
    ])
    add_body_mixed(doc, [
        ("Link direto: ", {"bold": True}),
        ("https://wa.me/11968632231", {"color": VIOLET}),
    ])
    add_body_mixed(doc, [
        ("Resposta em até ", {}),
        ("1 dia útil", {"bold": True, "color": FUCHSIA}),
        (".", {}),
    ])

    add_heading(doc, "Discurso de venda em 1 linha", level=2, color=VIOLET, size=14)
    add_quote(doc,
        "Sua instituição pode formar 20 pesquisadores em biofabricação com "
        "práticas reais no nosso laboratório, currículo adaptado ao projeto de "
        "vocês, e cada aluno saindo com um protocolo próprio publicável. "
        "Vamos conversar?"
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # TABELA COMPARATIVA
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Tabela comparativa dos 3 produtos", level=1, size=20)
    add_body(doc,
        "Use esta tabela como referência rápida ao responder clientes que "
        "hesitam entre os produtos.", size=10.5, italic=True, color=GRAY_MID)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    add_table(doc,
        headers=["Critério", "🧭 Plataforma", "🎓 Academy Online", "🏢 Corporativo"],
        rows=[
            ["Formato", "Software SaaS", "Curso EAD auto-ritmo", "Turma executiva"],
            ["Duração", "Enquanto pagar", "12 meses", "Customizado"],
            ["Preço", "R$ 507/mês", "R$ 2.375 único", "Sob consulta"],
            ["Pagamento", "Assinatura recorrente", "Pagamento único", "NF instituição"],
            ["Aulas gravadas", "—", "✓ 12 módulos", "✓ Customizado"],
            ["Encontros ao vivo", "—", "✓ 3 online", "✓ Presencial"],
            ["Plataforma BIA inclusa", "✓ (o produto)", "✓ 12 meses/20k cred", "✓ negociado"],
            ["Práticas presenciais", "—", "—", "✓ EXCLUSIVO"],
            ["Currículo customizado", "—", "—", "✓ EXCLUSIVO"],
            ["Projeto de biofabricação", "Você faz sozinho", "✓ acompanhado", "✓ acompanhado"],
            ["Certificado", "—", "✓ individual", "✓ institucional"],
            ["Créditos", "1.500 renováveis/mês", "20.000 (12 meses)", "Negociado"],
            ["Cancelamento", "A qualquer momento", "Não se aplica", "Contratual"],
            ["Cliente-alvo", "Individual / PJ", "Individual", "Instituição"],
            ["Canal de compra", "Site (auto-serviço)", "Site (auto-serviço)", "WhatsApp"],
            ["Público mínimo", "1 pessoa", "1 pessoa", "5 pessoas"],
            ["Público máximo", "Ilimitado", "Ilimitado", "30/turma"],
        ],
        col_widths=[4.0, 4.0, 4.2, 4.2]
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # GUIA DE POSICIONAMENTO
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Guia de posicionamento para vendas", level=1, size=20)

    add_heading(doc, "Se o cliente pergunta \"Qual eu escolho?\"", level=2, color=VIOLET, size=14)
    add_body(doc, "Faça 3 perguntas em ordem:", size=11, bold=True)

    # Pergunta 1
    add_heading(doc, "1. \"Você já sabe o que quer fazer com biofabricação, ou está aprendendo?\"",
                level=3, color=FUCHSIA, size=12)
    add_body_mixed(doc, [
        ("Já sabe → recomende ", {}),
        ("Plataforma", {"bold": True, "color": VIOLET_DARK}),
        (" (R$ 507/mês)", {}),
    ])
    add_body_mixed(doc, [
        ("Está aprendendo → passe para a pergunta 2", {}),
    ])

    # Pergunta 2
    add_heading(doc, "2. \"É para você individualmente ou para um time / instituição?\"",
                level=3, color=FUCHSIA, size=12)
    add_body_mixed(doc, [
        ("Individual → recomende ", {}),
        ("Academy Online", {"bold": True, "color": VIOLET_DARK}),
        (" (R$ 2.375)", {}),
    ])
    add_body_mixed(doc, [
        ("Time (5+ pessoas) → recomende ", {}),
        ("Academy Corporativo", {"bold": True, "color": VIOLET_DARK}),
        (" (proposta)", {}),
    ])

    # Pergunta 3
    add_heading(doc, "3. \"Você precisa fazer prática em laboratório real com bioprinter?\"",
                level=3, color=FUCHSIA, size=12)
    add_body_mixed(doc, [
        ("Não, teoria + plataforma virtual me servem → ", {}),
        ("Academy Online", {"bold": True, "color": VIOLET_DARK}),
    ])
    add_body_mixed(doc, [
        ("Sim, preciso manusear equipamento → ", {}),
        ("Academy Corporativo", {"bold": True, "color": VIOLET_DARK}),
    ])

    # Objeções
    add_heading(doc, "Objeções comuns e como responder", level=2, color=VIOLET, size=14, space_before=20)

    objections = [
        ("\"R$ 507/mês é caro só pela plataforma\"",
         "São 1.500 créditos que renovam todo mês — o equivalente a formular ~150 "
         "biotintas ou gerar ~250 G-codes com IA. Em software equivalente, só o "
         "solver reológico profissional custa mais de US$ 3.000/ano. E aqui você "
         "cancela quando quiser."),
        ("\"R$ 2.375 pelo curso é muito\"",
         "Você recebe 12 meses da plataforma inclusos (equivalente a R$ 6.084 se "
         "pagasse mensal) + 12 módulos + 3 encontros ao vivo + certificado + "
         "projeto próprio. O curso individualmente já compensa; a plataforma vem "
         "de bônus."),
        ("\"Prefiro esperar promoção\"",
         "A promoção é o formato online — o presencial custava R$ 4.970 no mesmo "
         "escopo. E o preço atual está travado para as primeiras turmas."),
        ("\"Preciso de nota fiscal para minha instituição\"",
         "Perfeito, esse é exatamente o caso do formato Corporativo. Emitimos NF "
         "de serviço para CNPJ, aceitamos empenho e parceria com fundação. Vamos "
         "marcar 30 min para desenhar a proposta."),
        ("\"Não sei se a plataforma serve pro meu projeto\"",
         "Cria conta grátis em biaquantis.bio/auth/register — você ganha 10 créditos "
         "iniciais e pode testar todos os módulos antes de assinar."),
    ]
    for obj, resp in objections:
        add_body_mixed(doc, [
            ("Objeção:  ", {"bold": True, "color": FUCHSIA}),
            (obj, {"italic": True, "color": BLACK}),
        ], space_after=2)
        add_body_mixed(doc, [
            ("Resposta:  ", {"bold": True, "color": VIOLET_DARK}),
            (resp, {}),
        ], space_after=10)

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════════════
    # VOZ E TOM
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Voz e tom da marca", level=1, size=20)

    add_heading(doc, "Como a BIA fala", level=2, color=VIOLET, size=14)
    for item, prefix in [
        ("Usa termos científicos corretos mas sempre explica em 1 frase.", "✓ Técnica sem ser hermética.  "),
        ("Mostra dados (807 biomateriais, 11 algoritmos, 30+ papers) sem inflar.", "✓ Confiante sem ser arrogante.  "),
        ("Reconhece a dor real (fragmentação de ferramentas, custo alto de software, isolamento do laboratório).", "✓ Empática com o pesquisador.  "),
        ("Preço claro, o que está incluso, o que não está, como comprar.", "✓ Direta na venda.  "),
        ("Não trata \"gringo é melhor\". Nossa ciência é competitiva.", "✓ Brasileira, sem colonialismo.  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    add_heading(doc, "O que evitar", level=2, color=VIOLET, size=14)
    for item, prefix in [
        ("Adjetivos vazios sem substância técnica.", "✗ \"Revolucionário\", \"único do mundo\", \"primeiro do universo\".  "),
        ("Ao invés disso, mostrar o diferencial concreto.", "✗ Comparação depreciativa com concorrentes nominados.  "),
        ("Usar \"estima\", \"auxilia\", \"sugere\" — nunca \"cura\", \"aprova\", \"garante\".", "✗ Promessas médicas/regulatórias absolutas.  "),
        ("Manter formalidade em canais formais.", "✗ Emojis em excesso em email, LinkedIn, propostas B2B.  "),
    ]:
        add_bullet(doc, item, bold_prefix=prefix)

    # ═══════════════════════════════════════════════════════════════
    # LINKS OFICIAIS
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Links oficiais para uso em materiais", level=1, size=20, space_before=20)

    add_table(doc,
        headers=["Recurso", "Link"],
        rows=[
            ["Site principal", "https://biaquantis.bio"],
            ["Landing Academy", "https://biaquantis.bio/academy"],
            ["Checkout Guia Inteligente (assinatura mensal)", "https://www.asaas.com/c/qsnp08rvpuwlj8ip"],
            ["Checkout Academy Online (pagamento único)", "https://www.asaas.com/c/iu7ym1dp93cei9zk"],
            ["WhatsApp comercial (Corporativo)", "https://wa.me/11968632231  ·  (11) 96863-2231"],
            ["Login (alunos e assinantes)", "https://biaquantis.bio/auth/login"],
            ["Cadastro grátis (10 créditos iniciais)", "https://biaquantis.bio/auth/register"],
        ],
        col_widths=[6.5, 10.5]
    )

    # ═══════════════════════════════════════════════════════════════
    # ERROS COMUNS
    # ═══════════════════════════════════════════════════════════════
    add_heading(doc, "Erros de comunicação que travam venda", level=1, size=20, space_before=20)
    add_body(doc, "Aprendidos em campo — atenção especial no atendimento comercial:",
             size=10.5, italic=True, color=GRAY_MID)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    errors = [
        ("Confundir Plataforma com Academy",
         "\"Compre a Academy que a plataforma vem junto por 12 meses\" está OK, "
         "mas NUNCA \"a Plataforma substitui o curso\" (são produtos diferentes)."),
        ("Prometer prática presencial no curso online",
         "O online NÃO tem prática presencial. Só Corporativo tem."),
        ("Ofertar preço da Plataforma para grupos",
         "Grupo é sempre Corporativo, negociado. Nunca \"R$ 507 x N pessoas\" — "
         "perde-se a proposta de valor."),
        ("Prometer renovação automática da Academy",
         "Academy NÃO renova. Passa 12 meses e acaba. O aluno precisa assinar "
         "a Plataforma (R$ 507/mês) se quiser continuar depois."),
        ("Confundir créditos",
         "Plataforma tem 1.500 que RESETAM (não acumula). Academy tem 20.000 "
         "TOTAIS nos 12 meses (uso livre)."),
    ]
    for i, (title, desc) in enumerate(errors, 1):
        add_body_mixed(doc, [
            (f"{i}. ", {"bold": True, "color": VIOLET_DARK}),
            (title, {"bold": True, "color": BLACK}),
        ], space_after=2)
        add_body(doc, desc, size=10.5)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ═══════════════════════════════════════════════════════════════
    # RODAPÉ FINAL
    # ═══════════════════════════════════════════════════════════════
    add_hr(doc)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(20)
    run = p.add_run("Quantis Biotechnology  ·  biaquantis.bio  ·  Documento interno confidencial")
    run.font.name = FONT_BODY
    run.font.size = Pt(9)
    run.font.italic = True
    run.font.color.rgb = GRAY_MID

    # Salvar
    output_path = "docs/marketing/descritivo-comercial-3-produtos.docx"
    doc.save(output_path)
    print(f"✅ Word gerado: {output_path}")
    import os
    size_kb = os.path.getsize(output_path) / 1024
    print(f"   Tamanho: {size_kb:.1f} KB")


if __name__ == "__main__":
    build_document()
