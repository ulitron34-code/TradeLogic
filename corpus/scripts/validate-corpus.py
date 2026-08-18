"""Verifica la integridad del corpus regulatorio descargado.

Uso:
  python scripts/validate-corpus.py
  python scripts/validate-corpus.py --base E:/ADUANA/MVP_Tecnico/corpus
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

EXPECTED_FILES = {
    "ligie/fracciones_arancelarias_20260420.xlsx": {"min_size_kb": 500, "ext": ".xlsx"},
    "ligie/nico_20240404.xlsx": {"min_size_kb": 500, "ext": ".xlsx"},
    "ligie/arancel_cupos_20240423.xlsx": {"min_size_kb": 100, "ext": ".xlsx"},
    "ligie/niveles_arancelarios_20240423.xlsx": {"min_size_kb": 200, "ext": ".xlsx"},
    "ligie/tablas_correlacion_20240404.xlsx": {"min_size_kb": 400, "ext": ".xlsx"},
    "ligie/modificaciones_abril2026_20260427.xlsx": {"min_size_kb": 50, "ext": ".xlsx"},
    "ligie/ligie_unificada_20250728.pdf": {"min_size_kb": 10_000, "ext": ".pdf"},
    "tratados/rgce_2026.pdf": {"min_size_kb": 500, "ext": ".pdf"},
    "tratados/rgce_compilada_2026.pdf": {"min_size_kb": 1_000, "ext": ".pdf"},
    "tratados/origin-rules.csv": {"min_size_kb": 500, "ext": ".csv"},
    "senasica/productos_regulados.csv": {"min_size_kb": 10, "ext": ".csv"},
    "senasica/productos_alimenticios.csv": {"min_size_kb": 100, "ext": ".csv"},
    "senasica/productos_biologicos.csv": {"min_size_kb": 10, "ext": ".csv"},
    "senasica/regulatory-catalog.csv": {"min_size_kb": 500, "ext": ".csv"},
    "noms/catalogo_noms_economia.json": {"min_size_kb": 2, "ext": ".json"},
    "noms/regulatory-catalog-noms.csv": {"min_size_kb": 500, "ext": ".csv"},
    "cofepris/registros_medicamentos.csv": {"min_size_kb": 0.2, "ext": ".csv"},
    "cofepris/regulatory-catalog-cofepris.csv": {"min_size_kb": 100, "ext": ".csv"},
    "scjn/tesis_supremacorte.json": {"min_size_kb": 1, "ext": ".json"},
    "scjn/jurisprudencia-catalog.csv": {"min_size_kb": 5, "ext": ".csv"},
    "regulatory-catalog-master.csv": {"min_size_kb": 1_000, "ext": ".csv"},
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_csv(path: Path) -> dict[str, Any]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)
    return {
        "rows": len(rows) - 1 if rows else 0,
        "headers": rows[0] if rows else [],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Valida el corpus regulatorio")
    parser.add_argument("--base", type=Path, default=Path("corpus"))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    results: dict[str, Any] = {
        "base": str(args.base),
        "files": {},
        "summary": {"ok": 0, "missing": 0, "errors": 0},
    }

    for rel_path, spec in EXPECTED_FILES.items():
        full_path = args.base / rel_path
        entry: dict[str, Any] = {"status": "ok", "size_kb": 0}
        if not full_path.exists():
            entry["status"] = "missing"
            results["summary"]["missing"] += 1
        else:
            size_kb = full_path.stat().st_size / 1024
            entry["size_kb"] = round(size_kb, 1)
            if size_kb < spec["min_size_kb"]:
                entry["status"] = "too_small"
                entry["expected_min_kb"] = spec["min_size_kb"]
                results["summary"]["errors"] += 1
            else:
                results["summary"]["ok"] += 1
            if spec["ext"] == ".csv":
                try:
                    entry["csv"] = validate_csv(full_path)
                except Exception as exc:
                    entry["csv_error"] = str(exc)
                    entry["status"] = "error"
                    results["summary"]["errors"] += 1
        results["files"][rel_path] = entry

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        for rel_path, entry in results["files"].items():
            status_icon = {"ok": "OK", "missing": "FALTA", "too_small": "CHICO", "error": "ERROR"}.get(entry["status"], entry["status"])
            size = f"{entry['size_kb']} KB" if entry["size_kb"] else "—"
            print(f"[{status_icon}] {rel_path} ({size})")
            if "csv" in entry:
                csv_info = entry["csv"]
                print(f"       CSV: {csv_info['rows']} filas, headers: {', '.join(csv_info['headers'][:5])}...")
        print("")
        print(f"Resumen: {results['summary']['ok']} OK, {results['summary']['missing']} faltantes, {results['summary']['errors']} errores")


if __name__ == "__main__":
    main()
