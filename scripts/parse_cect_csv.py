#!/usr/bin/env python3
"""
Parser robusto do CSV CECT 3D printing DB.

Lida com duas variantes de formatação no mesmo arquivo:

  FORMATO A (linhas em inglês, "clean"):
    DOI, Componentes, "6 Bar", "130", "2.5", "Cilíndrico de 400 µm", "", ""
    → 8 células, sem quebras por vírgula decimal.

  FORMATO B (linhas em português, "quebrado"):
    DOI, Componentes, "4", "5 bar", "160", "1", "2", "Cilíndrico de calibre 22", " ", ""
    → 10+ células, com vírgulas decimais quebrando pressão e velocidade.

Estratégia: usa a **agulha** como âncora (única célula facilmente identificável).
Ela sempre tem token de agulha ("Cilíndrico", "Cônico", "µm", "calibre", "G"),
E se não houver, marcamos needle=null e ainda extraímos parâmetros.
"""
import csv
import json
import re
import sys
from pathlib import Path

CSV_PATH = Path("/home/user/uploaded_files/cect-3d-printing-db-todos-os-materiais (1).csv")
OUT_TS = Path("/home/user/webapp/src/lib/bioprint/material-database.ts")
OUT_JSON = Path("/home/user/webapp/scripts/material-database.debug.json")

DOI_RE = re.compile(r"(10\.\d{3,}[\w./\-()]+)")


# ---- Normalizações ----------
def parse_range(txt):
    """Extrai (min, max, unit)."""
    if not txt:
        return None
    t = txt.strip().replace("barras", "bar").replace("Bar", "bar")
    t = re.sub(r"(\d),(\d)", r"\1.\2", t)  # vírgula decimal → ponto
    unit_match = re.search(r"(kPa|bar|MPa|psi|wt%|w/w|w/v|µm|um|mm|calibre|gauge|G|°C)",
                           t, re.IGNORECASE)
    unit = unit_match.group(1) if unit_match else ""
    nums = re.findall(r"[-+]?\d*\.?\d+", t)
    if not nums:
        return None
    nums = [float(n) for n in nums]
    if len(nums) == 1:
        return {"min": nums[0], "max": nums[0], "unit": unit}
    return {"min": min(nums), "max": max(nums), "unit": unit}


def parse_components(comp_str):
    """Parse 'PCL [85% em peso] Hidroxiapatita [15% em peso]' → list."""
    if not comp_str:
        return []
    comp_str = comp_str.strip()
    pattern = re.compile(r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-\+/]+?)\s*\[([^\]]+)\]")
    matches = pattern.findall(comp_str)
    result = []
    for name, spec in matches:
        name = name.strip()
        spec = spec.strip()
        m = re.search(r"([\d\.,]+)\s*(%\s*em\s*peso|%\s*em\s*volume|%\s*w/w|%\s*w/v|wt\s*%|%|mg/mL|mg/ml|M|kDa|Da|)",
                       spec, re.IGNORECASE)
        if m:
            val_str = m.group(1).replace(",", ".")
            try:
                val = float(val_str)
            except ValueError:
                val = None
            unit_raw = m.group(2).lower().replace(" ", "")
            if "peso" in unit_raw or "w/w" in unit_raw or "wt%" in unit_raw or unit_raw == "%":
                unit_norm = "%w"
            elif "volume" in unit_raw or "w/v" in unit_raw:
                unit_norm = "%v"
            elif "mg/ml" in unit_raw:
                unit_norm = "mg/mL"
            else:
                unit_norm = unit_raw or ""
            result.append({"material": name, "value": val, "unit": unit_norm, "spec": spec})
        else:
            result.append({"material": name, "value": None, "unit": "", "spec": spec})
    if not result and comp_str:
        result.append({"material": comp_str, "value": None, "unit": "", "spec": ""})
    return result


def parse_needle(needle_str):
    if not needle_str:
        return None
    t = needle_str.strip()
    if not t:
        return None
    is_conical = bool(re.search(r"c[oô]nico|conical", t, re.IGNORECASE))
    m_gauge = re.search(r"(?:calibre|gauge)\s*(\d+)|(\d+)\s*G\b", t, re.IGNORECASE)
    if m_gauge:
        g = m_gauge.group(1) or m_gauge.group(2)
        return {"kind": "gauge", "gauge": int(g),
                "geometry": "conical" if is_conical else "cylindrical", "raw": t}
    m_um = re.search(r"(\d+(?:[.,]\d+)?)\s*(µm|um|mm)", t, re.IGNORECASE)
    if m_um:
        val = float(m_um.group(1).replace(",", "."))
        u = m_um.group(2).lower()
        if u == "mm":
            val *= 1000
        return {"kind": "diameter_um", "diameter_um": val,
                "geometry": "conical" if is_conical else "cylindrical", "raw": t}
    return {"kind": "unknown", "raw": t}


def parse_cell_density(cell_str):
    if not cell_str or not cell_str.strip():
        return None
    t = cell_str.strip()
    m = re.search(r"\(([\d.,]+)\)", t)
    density = None
    if m:
        try:
            density = float(m.group(1).replace(",", "."))
        except ValueError:
            pass
    cell_type = re.sub(r"\s*\([^)]*\)", "", t).strip()
    if not cell_type:
        return None
    return {"cellType": cell_type, "density_M_per_mL": density}


# ---- Detecção de campos ----------
def looks_like_pressure(s):
    return bool(re.search(r"(kpa|bar|barras|mpa|psi)", s, re.IGNORECASE))

def looks_like_needle_field(s):
    return bool(re.search(r"(cil[íi]ndrico|c[oô]nico|conical|cylindrical|µm|\bum\b|calibre|gauge|\d+\s*G\b)",
                          s, re.IGNORECASE))

def looks_pure_numeric(s):
    return bool(re.fullmatch(r"\s*\d+(\.\d+)?\s*", s.strip()))


# ---- Reagrupador ----------
def clean_doi(raw):
    """Extrai DOI limpo de 'https://10.xxx/yyy' ou 'https://https://doi.org/10.xxx/yyy'"""
    m = DOI_RE.search(raw)
    return m.group(1) if m else raw.strip()


def parse_row(cells):
    # Remove trailing empty
    while cells and cells[-1] == "":
        cells.pop()
    if len(cells) < 5:
        return None

    doi_raw = cells[0].strip()
    doi = clean_doi(doi_raw)
    if not doi.startswith("10."):
        return None
    components = cells[1].strip()

    # Encontra a agulha por scan reverso — última célula com token de agulha
    needle_idx = None
    for i in range(len(cells) - 1, 1, -1):  # excluir DOI e Componentes
        if looks_like_needle_field(cells[i]):
            needle_idx = i
            break

    if needle_idx is not None:
        needle_str = cells[needle_idx].strip()
        before_needle = cells[2:needle_idx]
        after_needle = cells[needle_idx + 1:]
    else:
        # Sem agulha detectada — assume que colunas 2..N-2 são pressão/temp/vel
        # e cells[-1] são notas (mesmo layout 8 colunas: pressão, temp, vel, agulha_vazia, celulas, notas)
        needle_str = ""
        before_needle = cells[2:-2] if len(cells) >= 4 else cells[2:]
        after_needle = cells[-2:-1] if len(cells) >= 3 else []

    # Notas geralmente na última posição (com aspas)
    notes = ""
    if cells and cells[-1].strip():
        notes = cells[-1].strip().strip('"')
        # Se needle é anterior, `after_needle` inclui notes — remover para não duplicar
        if after_needle and after_needle[-1].strip().strip('"') == notes:
            after_needle = after_needle[:-1]

    # ---- Reagrupamento de vírgula decimal em pressão e velocidade ----
    tokens = [t.strip() for t in before_needle]
    merged = []
    i = 0
    while i < len(tokens):
        cur = tokens[i]
        # Fusão decimal com unidade pressão: "5" + "5 bar" → "5.5 bar"
        if (i + 1 < len(tokens)
            and re.fullmatch(r"\d+", cur)
            and re.match(r"^\d+\s*(kpa|bar|barras|mpa|psi)\b", tokens[i + 1], re.IGNORECASE)):
            merged.append(f"{cur}.{tokens[i + 1]}")
            i += 2
            continue
        merged.append(cur)
        i += 1

    # Agora `merged` deveria ter 3 elementos ideais: [pressão, temperatura, velocidade]
    # Mas velocidade pode ainda ter sido dividida ("1", "67" → "1.67")
    # Trata de trás pra frente: se 4 elementos e os dois últimos são puramente numéricos, funde
    if len(merged) == 4:
        if looks_like_pressure(merged[0]) and looks_like_pressure(merged[1]):
            # Range de pressão dividido: "50 kPa" + "80 kPa" + temp + vel
            merged = [f"{merged[0]} - {merged[1]}", merged[2], merged[3]]
        elif looks_pure_numeric(merged[2]) and looks_pure_numeric(merged[3]):
            # Fusão de velocidade: "1" + "67" → "1.67"
            merged = [merged[0], merged[1], f"{merged[2]}.{merged[3]}"]
    elif len(merged) >= 5:
        # Muitos campos: heurística — junta pressão dividida se ambos têm unidade
        if looks_like_pressure(merged[0]) and looks_like_pressure(merged[1]):
            merged = [f"{merged[0]} - {merged[1]}"] + merged[2:]
        # E se velocidade tem dois numéricos no final
        if len(merged) >= 4 and looks_pure_numeric(merged[-1]) and looks_pure_numeric(merged[-2]):
            merged = merged[:-2] + [f"{merged[-2]}.{merged[-1]}"]

    while len(merged) < 3:
        merged.append("")

    pressure_str = merged[0] if len(merged) > 0 else ""
    temp_str = merged[1] if len(merged) > 1 else ""
    speed_str = merged[2] if len(merged) > 2 else ""

    cells_str = " ".join([c for c in after_needle if c.strip()]).strip()

    return {
        "doi": doi,
        "components_raw": components,
        "pressure_raw": pressure_str,
        "temperature_raw": temp_str,
        "speed_raw": speed_str,
        "needle_raw": needle_str,
        "cells_raw": cells_str,
        "notes": notes,
    }


def main():
    entries_raw = []
    skipped = []
    with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)

    for i, row in enumerate(rows[1:], 1):
        parsed = parse_row(row[:])
        if parsed:
            entries_raw.append(parsed)
        else:
            skipped.append((i, row))

    print(f"[parser] extraídas: {len(entries_raw)} / {len(rows) - 1}", file=sys.stderr)
    print(f"[parser] descartadas: {len(skipped)}", file=sys.stderr)

    # Normalizar
    entries = []
    for i, e in enumerate(entries_raw):
        comps = parse_components(e["components_raw"])
        press = parse_range(e["pressure_raw"])
        temp = parse_range(e["temperature_raw"])
        speed = parse_range(e["speed_raw"])
        needle = parse_needle(e["needle_raw"])
        cells = parse_cell_density(e["cells_raw"])

        entries.append({
            "id": f"cect_{i:04d}",
            "doi": e["doi"],
            "components": comps,
            "pressure": press,
            "temperatureC": temp["max"] if temp else None,
            "temperatureRange": temp,
            "speed_mm_s": speed,
            "needle": needle,
            "cells": cells,
            "notes": e["notes"][:200],  # limita para não inflar TS
        })

    OUT_JSON.write_text(json.dumps(entries, ensure_ascii=False, indent=2))

    # ---- Deduplicação de nomes de material (aliases PT/EN) ----
    ALIASES = {
        "gelatina metacrilada": "GelMA",
        "gelatin methacrylated": "GelMA",
        "gelma": "GelMA",
        "alginato": "Alginate",
        "alginate": "Alginate",
        "poliestireno": "Polystyrene",
        "polystyrene": "Polystyrene",
        "poliuretano": "Polyurethane",
        "polyurethane": "Polyurethane",
        "gelatina": "Gelatin",
        "gelatin": "Gelatin",
        "colágeno": "Collagen",
        "colageno": "Collagen",
        "collagen": "Collagen",
        "fibrinogênio": "Fibrinogen",
        "fibrinogenio": "Fibrinogen",
        "fibrinogen": "Fibrinogen",
        "ácido hialurônico": "Hyaluronic Acid",
        "acido hialuronico": "Hyaluronic Acid",
        "hyaluronic acid": "Hyaluronic Acid",
        "quitosana": "Chitosan",
        "chitosan": "Chitosan",
        "hidroxiapatita": "Hydroxyapatite",
        "hydroxyapatite": "Hydroxyapatite",
        "fosfato tricálcico beta": "β-TCP",
        "fosfato tricalcico beta": "β-TCP",
        "β-tcp": "β-TCP",
        "beta-tcp": "β-TCP",
        "beta tcp": "β-TCP",
        "açúcar de vidro": "Sugar Glass",
        "acucar de vidro": "Sugar Glass",
        "sugar glass": "Sugar Glass",
        "pcl": "PCL",
        "pla": "PLA",
        "plga": "PLGA",
        "plcl": "PLCL",
        "pcu": "PCU",
        "pva": "PVA",
        "peg": "PEG",
    }

    def canon(name):
        n = re.sub(r"\s+", " ", name).strip()
        return ALIASES.get(n.lower(), n)

    # Índice por material principal canonicalizado
    material_index = {}
    for e in entries:
        if e["components"]:
            main_mat = canon(e["components"][0]["material"])
            material_index.setdefault(main_mat, []).append(e["id"])

    def range_agg(rlist, to_unit=None):
        if not rlist:
            return None
        all_min = []
        all_max = []
        for r in rlist:
            u = (r.get("unit") or "").lower()
            minv, maxv = r["min"], r["max"]
            if to_unit == "kPa":
                if u in ("bar", "barras"):
                    minv *= 100
                    maxv *= 100
                elif u == "mpa":
                    minv *= 1000
                    maxv *= 1000
                elif u == "psi":
                    minv *= 6.895
                    maxv *= 6.895
            all_min.append(minv)
            all_max.append(maxv)
        return {"min": round(min(all_min), 2), "max": round(max(all_max), 2), "unit": to_unit or (rlist[0].get("unit") or "")}

    material_summary = []
    for mat, ids in sorted(material_index.items(), key=lambda kv: -len(kv[1])):
        entries_of = [entries[int(iid.split("_")[1])] for iid in ids]
        pressures = [e["pressure"] for e in entries_of if e["pressure"]]
        temps = [e["temperatureRange"] for e in entries_of if e["temperatureRange"]]
        speeds = [e["speed_mm_s"] for e in entries_of if e["speed_mm_s"]]

        material_summary.append({
            "material": mat,
            "count": len(ids),
            "entryIds": ids,
            "pressureKPa": range_agg(pressures, to_unit="kPa"),
            "temperatureC": range_agg(temps),
            "speedMmS": range_agg(speeds),
        })

    # ---- Emit TypeScript compacto ----
    # Para não ficar 500KB, emitimos apenas os SUMMARIES + top-N entries por material
    # (evita bloatar o bundle Cloudflare Workers 10MB)
    # Cada material principal → guarda até 3 entries "canônicas" (uma por concentração distinta)

    # Reduzir entries: por material, deduplicar por (material principal + %) mantendo a de menor gauge
    compact_entries = []
    seen_keys = set()
    for mat, ids in material_index.items():
        for iid in ids:
            e = entries[int(iid.split("_")[1])]
            if not e["components"]:
                continue
            first = e["components"][0]
            key = (canon(first["material"]), first.get("value"))
            if key in seen_keys:
                continue
            seen_keys.add(key)
            # Copia enxuta
            compact_entries.append({
                "id": e["id"],
                "doi": e["doi"],
                "components": [{"material": canon(c["material"]), "value": c["value"], "unit": c["unit"]}
                                for c in e["components"]],
                "pressure": e["pressure"],
                "temperatureC": e["temperatureC"],
                "speed_mm_s": e["speed_mm_s"],
                "needle": {"kind": e["needle"]["kind"], "diameter_um": e["needle"].get("diameter_um"),
                            "gauge": e["needle"].get("gauge"), "geometry": e["needle"].get("geometry")}
                          if e["needle"] else None,
                "cells": e["cells"],
            })

    ts_summary = json.dumps(material_summary, ensure_ascii=False, indent=2)
    ts_entries = json.dumps(compact_entries, ensure_ascii=False, indent=2)

    ts_source = f'''/**
 * material-database.ts
 * Catálogo de materiais de bioimpressão extraído da CECT 3D Printing DB.
 *
 * Gerado automaticamente por scripts/parse_cect_csv.py a partir de
 * cect-3d-printing-db-todos-os-materiais.csv (808 linhas)
 *
 * NÃO EDITAR MANUALMENTE. Rode `python scripts/parse_cect_csv.py` para regenerar.
 *
 * Total de entradas parseadas:  {len(entries)}
 * Total de entradas únicas (dedupe por material+%):  {len(compact_entries)}
 * Total de materiais únicos (canônicos):  {len(material_index)}
 *
 * R12.55 — Motor Básico usa este catálogo para popular presets e validar faixas.
 */

// ============================================================================
// Types
// ============================================================================

export interface MaterialComponent {{
  material: string
  value: number | null
  unit: string  // '%w' | 'mg/mL' | 'kDa' | ''
}}

export interface RangeValue {{
  min: number
  max: number
  unit: string
}}

export interface NeedleSpec {{
  kind: 'gauge' | 'diameter_um' | 'unknown'
  gauge?: number | null
  diameter_um?: number | null
  geometry?: 'cylindrical' | 'conical' | null
}}

export interface CellSpec {{
  cellType: string
  density_M_per_mL: number | null
}}

export interface MaterialEntry {{
  id: string
  doi: string
  components: MaterialComponent[]
  pressure: RangeValue | null
  temperatureC: number | null
  speed_mm_s: RangeValue | null
  needle: NeedleSpec | null
  cells: CellSpec | null
}}

export interface MaterialSummary {{
  material: string
  count: number
  entryIds: string[]
  pressureKPa: RangeValue | null
  temperatureC: RangeValue | null
  speedMmS: RangeValue | null
}}

// ============================================================================
// Data (compacto — dedupe por material+% para reduzir bundle size)
// ============================================================================

export const MATERIAL_DATABASE: MaterialEntry[] = {ts_entries}

export const MATERIAL_SUMMARY: MaterialSummary[] = {ts_summary}

// ============================================================================
// Helpers
// ============================================================================

export function listUniqueMaterials(): string[] {{
  return MATERIAL_SUMMARY.map(m => m.material)
}}

export function findMaterialSummary(name: string): MaterialSummary | undefined {{
  const n = name.toLowerCase().trim()
  return MATERIAL_SUMMARY.find(m => m.material.toLowerCase() === n)
}}

export function findEntriesByComponent(componentName: string): MaterialEntry[] {{
  const n = componentName.toLowerCase().trim()
  return MATERIAL_DATABASE.filter(e =>
    e.components.some(c => c.material.toLowerCase().includes(n))
  )
}}

export function pressureToKPa(range: RangeValue | null): RangeValue | null {{
  if (!range) return null
  const u = range.unit.toLowerCase()
  if (u === 'kpa') return range
  if (u === 'bar' || u === 'barras') return {{ min: range.min * 100, max: range.max * 100, unit: 'kPa' }}
  if (u === 'mpa') return {{ min: range.min * 1000, max: range.max * 1000, unit: 'kPa' }}
  if (u === 'psi') return {{ min: range.min * 6.895, max: range.max * 6.895, unit: 'kPa' }}
  return range
}}

const GAUGE_TO_UM: Record<number, number> = {{
  14: 1600, 15: 1370, 16: 1194, 17: 1067, 18: 838, 19: 686, 20: 603,
  21: 514, 22: 413, 23: 337, 24: 311, 25: 260, 26: 260, 27: 210, 28: 184,
  29: 184, 30: 159, 31: 133, 32: 108, 33: 108, 34: 82,
}}

export function gaugeToDiameterUm(gauge: number): number {{
  return GAUGE_TO_UM[gauge] ?? 400
}}

export function needleToDiameterUm(needle: NeedleSpec | null): number | null {{
  if (!needle) return null
  if (needle.kind === 'diameter_um' && needle.diameter_um) return needle.diameter_um
  if (needle.kind === 'gauge' && needle.gauge) return gaugeToDiameterUm(needle.gauge)
  return null
}}

export interface RecommendedParams {{
  pressureKPa: RangeValue | null
  temperatureC: RangeValue | null
  speedMmS: RangeValue | null
  entryCount: number
  sourceDois: string[]
}}

export function getRecommendedParams(materialName: string): RecommendedParams | null {{
  const summary = findMaterialSummary(materialName)
  if (!summary) return null
  const sourceDois = summary.entryIds
    .slice(0, 5)
    .map(id => MATERIAL_DATABASE.find(e => e.id === id)?.doi)
    .filter((d): d is string => Boolean(d))
  return {{
    pressureKPa: summary.pressureKPa,
    temperatureC: summary.temperatureC,
    speedMmS: summary.speedMmS,
    entryCount: summary.count,
    sourceDois,
  }}
}}

/**
 * Retorna a top-N lista de materiais mais frequentes (por # de entradas na base).
 * Útil para popular dropdown de UI ordenado por relevância.
 */
export function topMaterials(n: number = 20): MaterialSummary[] {{
  return MATERIAL_SUMMARY.slice(0, n)
}}
'''

    OUT_TS.parent.mkdir(parents=True, exist_ok=True)
    OUT_TS.write_text(ts_source, encoding="utf-8")
    print(f"[parser] TS emitido: {OUT_TS} ({len(ts_source)} bytes)", file=sys.stderr)
    print(f"[parser] Entradas TS compactas: {len(compact_entries)}", file=sys.stderr)
    print(f"[parser] Materiais únicos (canônicos): {len(material_index)}", file=sys.stderr)
    top15 = material_summary[:15]
    print("[parser] Top 15 materiais:", file=sys.stderr)
    for m in top15:
        p = m["pressureKPa"]
        t = m["temperatureC"]
        s = m["speedMmS"]
        pstr = f"P={p['min']:.0f}-{p['max']:.0f} kPa" if p else "P=?"
        tstr = f"T={t['min']:.0f}-{t['max']:.0f} C" if t else "T=?"
        sstr = f"v={s['min']:.1f}-{s['max']:.1f} mm/s" if s else "v=?"
        print(f"  {m['count']:4d}× {m['material']:30s} {pstr:20s} {tstr:15s} {sstr}", file=sys.stderr)


if __name__ == "__main__":
    main()
