#!/usr/bin/env python3
import csv, re
from pathlib import Path
CSV_PATH = Path("/home/user/uploaded_files/cect-3d-printing-db-todos-os-materiais (1).csv")
DOI_HINT_RE = re.compile(r"^https?://10\.")

def looks_like_needle(s):
    return bool(re.search(r"(cil[íi]ndrico|c[oô]nico|µm|calibre|gauge|\bG\b)", s, re.IGNORECASE))

with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    rows = list(reader)

dropped_no_doi = 0
dropped_no_needle = 0
dropped_short = 0
sample_dropped = []

for i, row in enumerate(rows[1:], 1):
    cells = row[:]
    while cells and cells[-1] == "":
        cells.pop()
    if len(cells) < 8:
        dropped_short += 1
        if len(sample_dropped) < 5:
            sample_dropped.append(("short", i, row))
        continue
    doi = cells[0].strip()
    if not DOI_HINT_RE.match(doi):
        dropped_no_doi += 1
        if len(sample_dropped) < 10:
            sample_dropped.append(("no-doi", i, row))
        continue
    middle = cells[2:-1]
    if not any(looks_like_needle(c) for c in middle):
        dropped_no_needle += 1
        if len(sample_dropped) < 15:
            sample_dropped.append(("no-needle", i, row))

print(f"total data rows: {len(rows) - 1}")
print(f"dropped short (<8 cells): {dropped_short}")
print(f"dropped no DOI: {dropped_no_doi}")
print(f"dropped no needle: {dropped_no_needle}")
print(f"total dropped: {dropped_short + dropped_no_doi + dropped_no_needle}")
print("\nSamples of dropped:")
for kind, idx, row in sample_dropped:
    print(f"  [{kind}] row {idx}: {row[:5]}")
