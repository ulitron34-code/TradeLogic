"""Extract the official SNICE FA/NICO workbook into the versioned catalog CSV.

The workbook has a fraccion sheet with IGI/IGE and a NICO sheet with the
statistical suffixes. The extractor joins both sheets and can apply a separate
official tariff-modification CSV by closing the affected base versions.
"""

from __future__ import annotations

import argparse
import csv
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def column_number(cell_ref: str) -> int:
    match = re.match(r"[A-Z]+", cell_ref.upper())
    if not match:
        raise ValueError(f"Invalid cell reference: {cell_ref}")
    value = 0
    for character in match.group(0):
        value = value * 26 + ord(character) - ord("A") + 1
    return value


def normalized(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper().replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U").replace("Ñ", "N"))


def shared_strings(book: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(node.text or "" for node in item.findall(".//m:t", NS)) for item in root.findall("m:si", NS)]


def sheet_paths(book: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    relationships = {item.attrib["Id"]: item.attrib["Target"] for item in rels}
    result: dict[str, str] = {}
    for sheet in workbook.findall("m:sheets/m:sheet", NS):
        target = relationships[sheet.attrib[f"{{{REL_NS}}}id"]]
        result[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
    return result


def read_sheet(path: Path, name: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as book:
        strings = shared_strings(book)
        paths = sheet_paths(book)
        if name not in paths:
            raise ValueError(f"Workbook does not contain sheet {name!r}")
        root = ET.fromstring(book.read(paths[name]))
        rows: list[list[str]] = []
        for row in root.findall(".//m:sheetData/m:row", NS):
            values: list[str] = []
            for cell in row.findall("m:c", NS):
                index = column_number(cell.attrib.get("r", "A1")) - 1
                while len(values) <= index:
                    values.append("")
                value_node = cell.find("m:v", NS)
                value = "" if value_node is None else value_node.text or ""
                if cell.attrib.get("t") == "s" and value:
                    value = strings[int(value)]
                values[index] = value.replace("\xa0", " ").strip()
            rows.append(values)
        return rows


def first_header(rows: list[list[str]], required: set[str]) -> tuple[int, list[str]]:
    for index, row in enumerate(rows):
        headers = [normalized(value) for value in row]
        if required.issubset(set(headers)):
            return index, headers
    raise ValueError(f"Could not find header with {sorted(required)}")


def cell(row: list[str], index: int | None) -> str:
    return row[index].strip() if index is not None and index < len(row) else ""


def rate_fields(value: str) -> tuple[str, str]:
    value = value.strip()
    if re.fullmatch(r"\d+(?:[.,]\d+)?", value):
        return value.replace(",", "."), "PERCENT"
    return "", value


def read_fa(path: Path) -> dict[str, dict[str, str]]:
    rows = read_sheet(path, "FA")
    header_row, headers = first_header(rows, {"FRACCIONARANCELARIA", "DESCRIPCION"})
    code_index = headers.index("FRACCIONARANCELARIA")
    description_index = headers.index("DESCRIPCION")
    unit_index = headers.index("UNIDADDEMEDIDA") if "UNIDADDEMEDIDA" in headers else None
    next_headers = [normalized(value) for value in rows[header_row + 1]] if header_row + 1 < len(rows) else []
    import_index = next_headers.index("IMP") if "IMP" in next_headers else (headers.index("ARANCEL") if "ARANCEL" in headers else None)
    export_index = next_headers.index("EXP") if "EXP" in next_headers else None
    result: dict[str, dict[str, str]] = {}
    for row in rows[header_row + 2 :]:
        code = cell(row, code_index)
        if not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}", code):
            continue
        if code in result:
            raise ValueError(f"Duplicate FA code {code}")
        igi, igi_unit = rate_fields(cell(row, import_index))
        ige, ige_unit = rate_fields(cell(row, export_index))
        result[code] = {"description": cell(row, description_index), "unitOfMeasure": cell(row, unit_index), "generalRate": igi, "rateUnit": igi_unit, "exportRate": ige, "exportRateUnit": ige_unit}
    return result


def read_nico(path: Path) -> list[dict[str, str]]:
    rows = read_sheet(path, "NICO")
    header_row, headers = first_header(rows, {"FRACCIONARANCELARIA", "NICO", "DESCRIPCION"})
    code_index = headers.index("FRACCIONARANCELARIA")
    nico_index = headers.index("NICO")
    description_index = headers.index("DESCRIPCION")
    result: list[dict[str, str]] = []
    for row in rows[header_row + 1 :]:
        code = cell(row, code_index)
        nico = cell(row, nico_index)
        description = cell(row, description_index)
        if re.fullmatch(r"\d{4}\.\d{2}\.\d{2}", code) and re.fullmatch(r"\d{2}", nico) and description:
            result.append({"code": code, "nico": nico, "description": description})
    return result


def read_modifications(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as stream:
        rows = list(csv.DictReader(stream))
    result: dict[str, dict[str, str]] = {}
    for row in rows:
        code = (row.get("code") or "").strip()
        if not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}", code):
            raise ValueError(f"Invalid modification code {code!r}")
        if code in result:
            raise ValueError(f"Duplicate modification code {code}")
        result[code] = row
    return result


def extract(input_path: Path, output_path: Path, source_version: str, source_url: str, valid_from: str, base_valid_to: str, modifications_path: Path | None) -> int:
    fa = read_fa(input_path)
    nico = read_nico(input_path)
    modifications = read_modifications(modifications_path) if modifications_path else {}
    rows: list[dict[str, str]] = []
    for code, tariff in fa.items():
        rows.append({"countryCode": "MX", "code": code, "nico": "", "description": tariff["description"], **tariff, "validFrom": valid_from, "validTo": base_valid_to if code in modifications else "", "sourceVersion": source_version, "sourceUrl": source_url})
    for item in nico:
        tariff = fa[item["code"]]
        rows.append({"countryCode": "MX", **item, "unitOfMeasure": tariff["unitOfMeasure"], "generalRate": tariff["generalRate"], "rateUnit": tariff["rateUnit"], "exportRate": tariff["exportRate"], "exportRateUnit": tariff["exportRateUnit"], "validFrom": valid_from, "validTo": base_valid_to if item["code"] in modifications else "", "sourceVersion": source_version, "sourceUrl": source_url})
    for code, modification in modifications.items():
        tariff = fa.get(code)
        if tariff is None:
            raise ValueError(f"Modification code {code} is absent from the base FA sheet")
        rows.append({"countryCode": "MX", "code": code, "nico": "", "description": modification.get("description", ""), "unitOfMeasure": tariff["unitOfMeasure"], "generalRate": modification.get("generalRate", ""), "rateUnit": modification.get("rateUnit", ""), "exportRate": tariff["exportRate"], "exportRateUnit": tariff["exportRateUnit"], "validFrom": modification.get("validFrom", ""), "validTo": "", "sourceVersion": modification.get("sourceVersion", ""), "sourceUrl": modification.get("sourceUrl", "")})
        for item in nico:
            if item["code"] != code:
                continue
            rows.append({"countryCode": "MX", "code": code, "nico": item["nico"], "description": item["description"], "unitOfMeasure": tariff["unitOfMeasure"], "generalRate": modification.get("generalRate", ""), "rateUnit": modification.get("rateUnit", ""), "exportRate": tariff["exportRate"], "exportRateUnit": tariff["exportRateUnit"], "validFrom": modification.get("validFrom", ""), "validTo": "", "sourceVersion": modification.get("sourceVersion", ""), "sourceUrl": modification.get("sourceUrl", "")})
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["countryCode", "code", "nico", "description", "unitOfMeasure", "generalRate", "rateUnit", "exportRate", "exportRateUnit", "validFrom", "validTo", "sourceVersion", "sourceUrl"]
    with output_path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-version", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--valid-from", required=True)
    parser.add_argument("--base-valid-to", required=True)
    parser.add_argument("--modifications", type=Path)
    args = parser.parse_args()
    print(extract(args.input, args.output, args.source_version, args.source_url, args.valid_from, args.base_valid_to, args.modifications))
