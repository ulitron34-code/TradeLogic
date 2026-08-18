"""Consolida todos los catálogos regulatorios (SENASICA, NOMs, COFEPRIS) en un único catálogo maestro oficial.

Genera: corpus/regulatory-catalog-master.csv
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

SOURCES = [
    Path("corpus/senasica/regulatory-catalog.csv"),
    Path("corpus/noms/regulatory-catalog-noms.csv"),
    Path("corpus/cofepris/regulatory-catalog-cofepris.csv"),
]

HEADERS = [
    "tariffCode",
    "nico",
    "authority",
    "type",
    "title",
    "condition",
    "mandatory",
    "sourceUrl",
    "sourceVersion",
    "validFrom",
    "validTo",
    "notes"
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Consolida catálogos regulatorios")
    parser.add_argument("--output", type=Path, default=Path("corpus/regulatory-catalog-master.csv"))
    args = parser.parse_args()

    total_rows = []
    seen_keys = set()
    
    for src in SOURCES:
        if not src.exists():
            print(f"Advertencia: {src} no existe, omitiendo.")
            continue
        with src.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                key = (
                    row.get("tariffCode", "").strip(),
                    row.get("nico", "").strip(),
                    row.get("authority", "").strip(),
                    row.get("type", "").strip(),
                    row.get("title", "").strip()[:50],
                    row.get("sourceVersion", "").strip()
                )
                if key not in seen_keys:
                    seen_keys.add(key)
                    total_rows.append({h: (row.get(h) or "").strip() for h in HEADERS})
                    count += 1
            print(f"Cargados {count} registros desde {src}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(total_rows)

    print(f"\nConsolidado final: {len(total_rows)} requerimientos regulatorios únicos guardados en {args.output}")


if __name__ == "__main__":
    main()
