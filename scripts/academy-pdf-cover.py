#!/usr/bin/env python3
"""
BIA · Academy · Gera capa A4 (identidade BIA Academy) + miolo (markdown → HTML → PDF) para os
materiais de reforço e complementos. Idempotente.

  python3 scripts/academy-pdf-cover.py                # todos os reforços (M00–M07, M09)
  python3 scripts/academy-pdf-cover.py M03            # só um

Requer: pandoc, weasyprint, pypdf (já no sandbox). Saída em docs/academy/pdf/<nome>.pdf
"""
import re, subprocess, sys, tempfile
from pathlib import Path
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs/academy"
PDFS = DOCS / "pdf"
CAPA_TEMPLATE = PDFS / "capa-complemento-M01.html"

# code → (arquivo md, kicker, título (HTML; <em> = destaque), subtítulo forte, descrição, bullets, rodapé esq.)
REFORCOS = {
    "M00": dict(md="reforco-M00-curso-pratico.md", kicker="Reforço de aprendizagem · Módulo 0",
        title="Antes de ligar a <em>bioimpressora</em>",
        strong="Aulas introdutórias do curso prático.",
        desc="As 5 ideias que evitam 90 % dos problemas da primeira impressão: ordem das fases, zeragem (G92), E-steps do êmbolo, pré-carga e fluxo (M221).",
        bullets=["<b>5 ideias</b> para levar à bancada", "<b>Checklist de 5 minutos</b> para colar na bancada", "<b>Faça agora na BIA</b> — Fase 4 · Calibrar E-steps · FlowCheck", "<b>Teste de aprendizagem</b> — 8 questões"],
        foot="Módulo 0 · Aulas introdutórias do curso prático", leitura="15 min", nivel="Básico"),
    "M01": dict(md="reforco-M01-introducao.md", kicker="Reforço de aprendizagem · Módulo 1",
        title="Introdução à <em>Biofabricação</em>",
        strong="O que é, o que não é, e por que a automação é o cerne do campo.",
        desc="Definição de Groll et al., tríade da engenharia tecidual, as 4 famílias de bioimpressão e as aplicações clínicas que já existem.",
        bullets=["<b>Conceitos-chave</b> em linguagem direta", "<b>Distinções que confundem</b> — biofabricação × TE × bioimpressão; tinta × biotinta", "<b>Ferramenta BIA</b> — Knowledge Engine", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 1 · Introdução à Biofabricação", leitura="12 min", nivel="Básico"),
    "M02": dict(md="reforco-M02-biomateriais.md", kicker="Reforço de aprendizagem · Módulo 2",
        title="Biomateriais para <em>biofabricação</em>",
        strong="Naturais, sintéticos, dECM e compósitos — como escolher.",
        desc="Propriedades que importam (degradação, rigidez, bioatividade), famílias de materiais e critérios de seleção por aplicação.",
        bullets=["<b>Mapa das famílias</b> de biomateriais", "<b>Critérios de escolha</b> por tecido-alvo", "<b>Ferramenta BIA</b> — Fase 2 · Formulador / Biblioteca de biomateriais", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 2 · Biomateriais", leitura="15 min", nivel="Básico"),
    "M03": dict(md="reforco-M03-biotintas.md", kicker="Reforço de aprendizagem · Módulo 3",
        title="Biotintas — formulação, reologia e <em>printabilidade</em>",
        strong="O trade-off que todo operador sente na bancada.",
        desc="Shear-thinning, recuperação, módulo de armazenamento, janela de gelificação e como traduzir reologia em parâmetros de impressão.",
        bullets=["<b>Reologia sem susto</b> — o que medir e por quê", "<b>Printabilidade</b> — métricas e armadilhas", "<b>Ferramenta BIA</b> — Fase 2 · Formulador", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 3 · Biotintas", leitura="15 min", nivel="Intermediário"),
    "M04": dict(md="reforco-M04-bioimpressao.md", kicker="Reforço de aprendizagem · Módulo 4",
        title="Bioimpressão 3D — modelagem, fatiamento e <em>parâmetros</em>",
        strong="Do STL ao G-code com decisões conscientes.",
        desc="Agulha, altura de camada, velocidade, fator de extrusão, retração e preenchimento — o que cada parâmetro faz e como ajustá-lo pelo resultado.",
        bullets=["<b>Fatiamento</b> — cada parâmetro explicado", "<b>Erros comuns</b> e como diagnosticá-los", "<b>Ferramenta BIA</b> — Fase 3 · BioSlicer", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 4 · Bioimpressão 3D", leitura="15 min", nivel="Intermediário"),
    "M05": dict(md="reforco-M05-arquitetura-3d.md", kicker="Reforço de aprendizagem · Módulo 5",
        title="Arquitetura 3D — scaffolds, porosidade e <em>TPMS</em>",
        strong="A forma interna decide a biologia.",
        desc="Porosidade, interconectividade, tamanho de poro por tecido, gradientes e superfícies mínimas (gyroid, Schwarz) — e como projetá-las.",
        bullets=["<b>Porosidade</b> — números por tecido", "<b>TPMS</b> — por que e quando usar", "<b>Ferramenta BIA</b> — Fase 1 · Modelo de tecido / Studio", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 5 · Arquitetura 3D", leitura="12 min", nivel="Intermediário"),
    "M06": dict(md="reforco-M06-celulas.md", kicker="Reforço de aprendizagem · Módulo 6",
        title="Células — cultivo 2D/3D e <em>esferoides</em>",
        strong="Da placa ao agregado: o que muda e por quê.",
        desc="Fontes celulares, cultivo 3D, formação e uso de esferoides como blocos de construção, viabilidade e densidade para bioimpressão.",
        bullets=["<b>Fontes celulares</b> — primárias, linhagens, iPSC, MSC", "<b>Esferoides</b> — formação, tamanho, núcleo necrótico", "<b>Ferramenta BIA</b> — Organoid Builder / Chat", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 6 · Células", leitura="15 min", nivel="Básico → intermediário"),
    "M07": dict(md="reforco-M07-tecidos.md", kicker="Reforço de aprendizagem · Módulo 7",
        title="Tecidos — pele, osso, cartilagem, tecidos moles e <em>vasos</em>",
        strong="Um tecido, uma estratégia.",
        desc="Requisitos de cada tecido-alvo (células, material, arquitetura, maturação) e o que já chegou à clínica.",
        bullets=["<b>Fichas por tecido</b> — pele, osso, cartilagem, moles, vasos", "<b>O que já é clínico</b> e o que é horizonte", "<b>Ferramenta BIA</b> — Fase 1 · Modelo de tecido + Pipeline", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 7 · Tecidos", leitura="15 min", nivel="Intermediário"),
    "M09": dict(md="reforco-M09-avaliacao.md", kicker="Reforço de aprendizagem · Módulo 9",
        title="Avaliação pós-impressão — viabilidade, morfologia, mecânica e <em>histologia</em>",
        strong="Imprimiu. E agora: como provar que funcionou?",
        desc="Live/dead, metabolismo, fidelidade de forma, ensaios mecânicos, histologia e imunofluorescência — o que medir, quando e como relatar.",
        bullets=["<b>Painel mínimo</b> de avaliação por objetivo", "<b>Relato padronizado</b> — o que o campo pede", "<b>Ferramenta BIA</b> — Fase 5 · Análise + Tabela de Aprendizado", "<b>Teste de aprendizagem</b>"],
        foot="Módulo 9 · Avaliação pós-impressão", leitura="15 min", nivel="Intermediário"),
}

BODY_CSS = (Path("/tmp/bia.css").read_text() if Path("/tmp/bia.css").exists() else "") + """
hr { page-break-after: auto; }
h2 { page-break-after: avoid; } h3 { page-break-after: avoid; }
table { font-size: 8.5pt; } th, td { padding: 3px 5px; } tr { page-break-inside: avoid; }
blockquote { page-break-inside: avoid; } p { orphans: 3; widows: 3; }
"""

def strip_frontmatter(md: str) -> str:
    m = re.match(r"^---\n.*?\n---\n", md, flags=re.S)
    return md[m.end():] if m else md

def fluid_layout(h: str) -> str:
    """Troca posições absolutas de h1/.sub/.meta/.box por fluxo vertical a partir de 72mm (títulos de qualquer tamanho)."""
    h = re.sub(r"h1 \{[^}]*\}", "h1 { position:relative; margin:0 20mm 0 0; font-size:40pt; line-height:1.08; font-weight:800; color:#fff; letter-spacing:-0.5px; }", h, count=1)
    h = re.sub(r"\.sub \{[^}]*\}", ".sub { position:relative; margin:9mm 30mm 0 0; font-size:13pt; line-height:1.45; color:#c7bfe6; }", h, count=1)
    h = re.sub(r"\.meta \{[^}]*\}", ".meta { position:relative; margin-top:9mm; display:flex; gap:5mm; }", h, count=1)
    h = re.sub(r"\.box \{[^}]*\}", ".box { position:relative; margin-top:9mm; border-left:3px solid #a855f7; padding:4mm 6mm; background:rgba(255,255,255,0.03); border-radius:0 3mm 3mm 0; }", h, count=1)
    h = h.replace("</style>", ".flow { position:absolute; top:72mm; left:0; right:0; }\n</style>")
    h = re.sub(r"(<h1>.*?</h1>)(.*?)(<div class=\"foot\">)", r'<div class="flow">\1\2</div>\3', h, count=1, flags=re.S)
    return h

def build_cover(cfg: dict, out: Path):
    h = CAPA_TEMPLATE.read_text(encoding="utf-8")
    h = re.sub(r'<div class="kicker">.*?</div>', f'<div class="kicker">{cfg["kicker"]}</div>', h, count=1, flags=re.S)
    h = re.sub(r"<h1>.*?</h1>", f"<h1>{cfg['title']}</h1>", h, count=1, flags=re.S)
    h = re.sub(r'<div class="sub">.*?</div>\s*<div class="meta">',
               f'<div class="sub"><b style="color:#fff">{cfg["strong"]}</b><br>{cfg["desc"]}</div>\n  <div class="meta">', h, count=1, flags=re.S)
    h = re.sub(r'<div class="chip"><b>Leitura</b>.*?</div>', f'<div class="chip"><b>Leitura</b>{cfg["leitura"]}</div>', h, count=1, flags=re.S)
    h = re.sub(r'<div class="chip"><b>Nível</b>.*?</div>', f'<div class="chip"><b>Nível</b>{cfg["nivel"]}</div>', h, count=1, flags=re.S)
    h = re.sub(r'<div class="chip"><b>Referências</b>.*?</div>', '<div class="chip"><b>Formato</b>Leitura + checklist + teste</div>', h, count=1, flags=re.S)
    bullets = "".join(f"<li>{b}</li>" for b in cfg["bullets"])
    h = re.sub(r"<ul>.*?</ul>", f"<ul>{bullets}</ul>", h, count=1, flags=re.S)
    h = re.sub(r'<div class="foot">\s*<div><div class="big">.*?</div>.*?</div>',
               f'<div class="foot">\n    <div><div class="big">{cfg["foot"]}</div>Material de reforço · leia após a aula e faça o teste</div>', h, count=1, flags=re.S)
    # título longo → fonte menor
    plain = re.sub(r"<.*?>", "", cfg["title"])
    h = fluid_layout(h)
    if len(plain) > 56: h = h.replace("font-size:40pt;", "font-size:27pt;")
    elif len(plain) > 44: h = h.replace("font-size:40pt;", "font-size:31pt;")
    elif len(plain) > 36: h = h.replace("font-size:40pt;", "font-size:34pt;")
    tmp = out.with_suffix(".cover.html"); tmp.write_text(h, encoding="utf-8")
    subprocess.run(["weasyprint", str(tmp), str(out)], check=True, capture_output=True)
    tmp.unlink()

def build_body(md_path: Path, title_html: str, kicker: str, out: Path):
    md = strip_frontmatter(md_path.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as td:
        css = Path(td) / "bia.css"; css.write_text(BODY_CSS)
        src = Path(td) / "body.md"; src.write_text(md, encoding="utf-8")
        html = Path(td) / "body.html"
        subprocess.run(["pandoc", str(src), "-f", "markdown", "-t", "html5", "--standalone", "--css", str(css),
                        "--metadata", "title=x", "-o", str(html)], check=True, capture_output=True)
        h = html.read_text(encoding="utf-8")
        h = re.sub(r'<header id="title-block-header">.*?</header>\n?', "", h, flags=re.S)
        plain = re.sub(r"<.*?>", "", title_html)
        h = h.replace("<body>", f'<body><div class="title-block"><div class="subtitle">{kicker} · BIA Academy · Quantis Biotechnology</div><h1>{plain}</h1></div>'
                      f'<div class="footer">BIA Academy · Quantis Biotechnology · biaquantis.bio · {kicker}</div>', 1)
        html.write_text(h, encoding="utf-8")
        subprocess.run(["weasyprint", str(html), str(out)], check=True, capture_output=True)

def merge(cover: Path, body: Path, out: Path, title: str, subject: str):
    w = PdfWriter()
    for p in PdfReader(str(cover)).pages: w.add_page(p)
    for p in PdfReader(str(body)).pages: w.add_page(p)
    w.add_metadata({"/Title": f"{title} · BIA Academy", "/Author": "BIA Academy · Quantis Biotechnology", "/Subject": subject})
    w.write(str(out)); return len(w.pages)

def main():
    only = sys.argv[1:] or list(REFORCOS)
    for code in only:
        cfg = REFORCOS[code]; md = DOCS / cfg["md"]; out = PDFS / md.with_suffix(".pdf").name
        cover = PDFS / f".{code}.cover.pdf"; body = PDFS / f".{code}.body.pdf"
        build_cover(cfg, cover); build_body(md, cfg["title"], cfg["kicker"], body)
        n = merge(cover, body, out, re.sub(r"<.*?>", "", cfg["title"]), cfg["kicker"])
        cover.unlink(); body.unlink()
        print(f"✓ {code} · {out.name} · {n} p. · {out.stat().st_size // 1024} KB")

if __name__ == "__main__":
    main()
