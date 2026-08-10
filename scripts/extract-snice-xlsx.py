"""Extract tabular rows from an official SNICE .xlsx without third-party packages.

The resulting CSV is an intermediate for the validated TradeLogic catalog
importer. It does not decide legal vigency or merge modifications automatically.
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
    letters = re.match(r"[A-Z]+", cell_ref.upper())
    if not letters:
        raise ValueError(f"Invalid cell reference: {cell_ref}")
    value = 0
    for character in letters.group(0):
        value = value * 26 + ord(character) - ord("A") + 1
    return value


def shared_strings(book: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(node.text or "" for node in item.findall(".//m:t", NS)) for item in root.findall("m:si", NS)]


def first_sheet_path(book: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    sheet = workbook.find("m:sheets/m:sheet", NS)
    if sheet is None:
        raise ValueError("Workbook has no sheets")
    rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
    for relationship in rels:
        if relationship.attrib.get("Id") == relationship_id:
            target = relationship.attrib["Target"]
            return target if target.startswith("xl/") else f"xl/{target}"
    raise ValueError("Sheet relationship not found")


def read_rows(path: Path) -> list[list[str]]:
    with zipfile.ZipFile(path) as book:
        strings = shared_strings(book)
        root = ET.fromstring(book.read(first_sheet_path(book)))
        rows: list[list[str]] = []
        for row in root.findall(".//m:sheetData/m:row", NS):
            values: list[str] = []
            for cell in row.findall("m:c", NS):
                reference = cell.attrib.get("r", "A1")
                index = column_number(reference) - 1
                while len(values) <= index:
                    values.append("")
                value_node = cell.find("m:v", NS)
                value = "" if value_node is None else value_node.text or ""
                if cell.attrib.get("t") == "s" and value:
                    value = strings[int(value)]
                values[index] = value.replace("\xa0", " ").strip()
            rows.append(values)
        return rows


def extract(path: Path, output: Path, source_version: str, source_url: str, valid_from: str) -> int:
    rows = read_rows(path)
    header_row = next((index for index, row in enumerate(rows) if any("CÓDIGO" in cell.upper() or "CODIGO" in cell.upper() for cell in row)), None)
    if header_row is None:
        raise ValueError("Could not find the CÓDIGO header row")

    output.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["countryCode", "code", "nico", "description", "generalRate", "rateUnit", "validFrom", "validTo", "sourceVersion", "sourceUrl"])
        writer.writeheader()
        for row in rows[header_row + 1 :]:
            code = row[2].strip() if len(row) > 2 else ""
            description = row[3].strip() if len(row) > 3 else ""
            if not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}", code) or not description:
                continue
            import_rate = row[5].strip() if len(row) > 5 else ""
            writer.writerow({
                "countryCode": "MX",
                "code": code,
                "nico": "",
                "description": description,
                "generalRate": import_rate if re.fullmatch(r"\d+(?:\.\d+)?", import_rate) else "",
                "rateUnit": "PERCENT" if re.fullmatch(r"\d+(?:\.\d+)?", import_rate) else import_rate,
                "validFrom": valid_from,
                "validTo": "",
                "sourceVersion": source_version,
                "sourceUrl": source_url,
            })
            count += 1
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-version", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--valid-from", required=True)
    args = parser.parse_args()
    print(extract(args.input, args.output, args.source_version, args.source_url, args.valid_from))
