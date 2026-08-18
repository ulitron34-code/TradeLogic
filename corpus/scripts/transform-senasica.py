"""Transforma los CSVs de SENASICA en corpus/senasica/ al formato
RegulatoryCatalogRecord esperado por @platform/domain.

Uso:
  python scripts/transform-senasica.py
  python scripts/transform-senasica.py --output corpus/senasica/regulatory-catalog.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path
from typing import Iterable


NOM_RE = re.compile(r"\bNOM-[A-Z0-9\-]+(?:\s+\d{4})?\b", re.IGNORECASE)
FRACCION_RE = re.compile(r"\b\d{4}\.\d{2}\.\d{2}\b")


def normalize(text: str) -> str:
    return " ".join(text.split())


def extract_noms(text: str) -> str:
    if not text:
        return ""
    found = NOM_RE.findall(text)
    return "; ".join(sorted(set(found))) if found else ""


def extract_fracciones(text: str) -> str:
    if not text:
        return ""
    found = FRACCION_RE.findall(text)
    return "; ".join(sorted(set(found))) if found else ""


def detect_authority(filename: str, row: dict[str, str]) -> str:
    name = filename.lower()
    if "alimenticio" in name:
        return "SENASICA"
    if "biologico" in name:
        return "SENASICA"
    if "regulado" in name:
        return "SENASICA"
    text = " ".join(str(v) for v in row.values()).lower()
    if "cofepris" in text or "salud" in text or "medicamento" in text:
        return "COFEPRIS"
    if "semarnat" in text or "ambiente" in text:
        return "SEMARNAT"
    return "SENASICA"


def detect_requirement_type(filename: str, row: dict[str, str]) -> str:
    name = filename.lower()
    if "alimenticio" in name:
        return "AUTORIZACION_SANITARIA"
    if "biologico" in name:
        return "AUTORIZACION_SANITARIA"
    if "regulado" in name:
        return "REGISTRO_SANITARIO"
    text = " ".join(str(v) for v in row.values()).lower()
    if "medicamento" in text or "farmaco" in text:
        return "REGISTRO_SANITARIO"
    if "plaguicida" in text or "nutriente" in text:
        return "REGISTRO_SANITARIO"
    if "laboratorio" in text or "constatacion" in text:
        return "CERTIFICACION"
    return "REGISTRO_SANITARIO"


def build_title(row: dict[str, str], filename: str) -> str:
    nombre = row.get("nombre_producto") or row.get("nombre") or ""
    empresa = row.get("empresa") or row.get("titular") or ""
    if nombre and empresa:
        return f"{nombre} — {empresa}"
    if nombre:
        return str(nombre)
    return Path(filename).stem


def build_description(row: dict[str, str]) -> str:
    parts = []
    for key in ("uso", "clasificacion", "especie", "indicacion"):
        value = row.get(key)
        if value:
            parts.append(str(value))
    return " | ".join(parts) if parts else ""


def transform_file(path: Path) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        for row in reader:
            authority = detect_authority(path.name, row)
            requirement_type = detect_requirement_type(path.name, row)
            title = build_title(row, path.name)
            description = build_description(row)
            source_url = f"https://www.datos.gob.mx/dataset/{path.stem}"
            notes_parts = []
            for key in ("num_certificado_o_registro", "clave_registro", "registro"):
                value = row.get(key)
                if value:
                    notes_parts.append(f"Registro: {value}")
            for key in ("fecha_registro", "fecha_vigencia"):
                value = row.get(key)
                if value:
                    notes_parts.append(f"{key}: {value}")
            notes = "; ".join(notes_parts) if notes_parts else ""
            records.append({
                "tariffCode": "0000.00.00",
                "authority": authority,
                "requirementType": requirement_type,
                "title": title,
                "description": description or None,
                "sourceUrl": source_url,
                "sourceVersion": f"SENASICA-{path.stem}-2025",
                "validFrom": row.get("fecha_registro") or "2025-01-01",
                "validTo": row.get("fecha_vigencia") or None,
                "mandatory": "true",
                "notes": notes or None,
            })
    return records


def transform_directory(directory: Path) -> dict[str, list[dict[str, str]]]:
    result: dict[str, list[dict[str, str]]] = {}
    for path in sorted(directory.glob("*.csv")):
        if path.name.startswith("."):
            continue
        result[path.name] = transform_file(path)
    return result


def write_output(records: Iterable[dict[str, str]], output: Path) -> int:
    output.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "tariffCode", "authority", "requirementType", "title", "description",
        "sourceUrl", "sourceVersion", "validFrom", "validTo", "mandatory", "notes",
    ]
    count = 0
    with output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(record)
            count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Transforma CSVs de SENASICA a formato regulatory catalog")
    parser.add_argument("--input-dir", type=Path, default=Path("corpus/senasica"))
    parser.add_argument("--output", type=Path, default=Path("corpus/senasica/regulatory-catalog.csv"))
    args = parser.parse_args()

    transformed = transform_directory(args.input_dir)
    total = sum(len(records) for records in transformed.values())
    for filename, records in transformed.items():
        print(f"  {filename}: {len(records)} registros")
    write_output((record for records in transformed.values() for record in records), args.output)
    print(f"Total: {total} registros -> {args.output}")


if __name__ == "__main__":
    main()
