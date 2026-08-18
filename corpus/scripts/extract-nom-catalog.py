"""Extractor y estructurador de Normas Oficiales Mexicanas (NOMs) para TradeLogic.

Genera el catálogo consolidado de NOMs por sector (salud, ambiental, agroalimentos, industria)
y su archivo derivado CSV en formato RegulatoryRequirement para Supabase/PostgreSQL.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

# Catálogo oficial consolidado de NOMs relevantes para aduanas y comercio exterior
NOMS_MASTER: list[dict[str, Any]] = [
    # SECTOR: SALUD / COFEPRIS / SSA
    {
        "code": "NOM-051-SCFI/SSA1-2010",
        "title": "Especificaciones generales de etiquetado para alimentos y bebidas no alcohólicas preenvasados-Información comercial y sanitaria",
        "authority": "SS",
        "type": "NOM",
        "sector": "salud",
        "dofDate": "2010-04-05",
        "validFrom": "2010-10-01",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5137518&fecha=05/04/2010",
        "mandatory": True,
        "sampleChapters": ["04", "09", "17", "18", "19", "20", "21", "22"],
        "condition": "Aplica a alimentos y bebidas no alcohólicas preenvasados destinados al consumidor final en territorio nacional",
    },
    {
        "code": "NOM-072-SSA1-2012",
        "title": "Etiquetado de medicamentos y de remedios herbolarios",
        "authority": "SS",
        "type": "NOM",
        "sector": "salud",
        "dofDate": "2012-11-21",
        "validFrom": "2013-05-20",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5278486&fecha=21/11/2012",
        "mandatory": True,
        "sampleChapters": ["30"],
        "condition": "Aplica a todo medicamento o remedio herbolario de fabricación nacional o extranjera que se comercialice en México",
    },
    {
        "code": "NOM-137-SSA1-2008",
        "title": "Etiquetado de dispositivos médicos",
        "authority": "SS",
        "type": "NOM",
        "sector": "salud",
        "dofDate": "2008-12-12",
        "validFrom": "2009-06-10",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5073400&fecha=12/12/2008",
        "mandatory": True,
        "sampleChapters": ["90"],
        "condition": "Dispositivos médicos, equipo médico, prótesis, órtesis, agentes de diagnóstico e insumos odontológicos",
    },
    {
        "code": "NOM-141-SSA1/SCFI-2012",
        "title": "Etiquetado para productos cosméticos preenvasados. Información comercial y sanitaria",
        "authority": "SS",
        "type": "NOM",
        "sector": "salud",
        "dofDate": "2012-09-19",
        "validFrom": "2013-03-18",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5269004&fecha=19/09/2012",
        "mandatory": True,
        "sampleChapters": ["33"],
        "condition": "Productos cosméticos de tocador y belleza preenvasados para venta directa al consumidor",
    },

    # SECTOR: AMBIENTAL / SEMARNAT
    {
        "code": "NOM-059-SEMARNAT-2010",
        "title": "Protección ambiental-Especies nativas de México de flora y fauna silvestres-Categorías de riesgo y especificaciones para su inclusión, exclusión o cambio-Lista de especies en riesgo",
        "authority": "SEMARNAT",
        "type": "CERTIFICATE",
        "sector": "ambiental",
        "dofDate": "2010-12-30",
        "validFrom": "2011-03-01",
        "dofUrl": "https://dof.gob.mx/normasOficiales.php?codnom=2458&dof=true",
        "mandatory": True,
        "sampleChapters": ["01", "06", "14", "44"],
        "condition": "Importación de ejemplares, partes o derivados de vida silvestre listados en CITES o categorías de riesgo",
    },
    {
        "code": "NOM-144-SEMARNAT-2017",
        "title": "Establece las medidas fitosanitarias y los requisitos de la marca reconocidas internacionalmente para el embalaje de madera que se utiliza en el comercio internacional de bienes y mercancías",
        "authority": "SEMARNAT",
        "type": "CERTIFICATE",
        "sector": "ambiental",
        "dofDate": "2017-11-27",
        "validFrom": "2018-01-26",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5505707&fecha=27/11/2017",
        "mandatory": True,
        "sampleChapters": ["44"],
        "condition": "Embalajes de madera (tarimas, cajas, carretes, duelas) utilizados en el transporte de mercancías importadas",
    },

    # SECTOR: AGROALIMENTOS / SENASICA / SADER / SAGARPA
    {
        "code": "NOM-030-ZOO-1995",
        "title": "Especificaciones y procedimientos para la verificación de carne, canales, vísceras y despojos de importación en puntos de verificación zoosanitaria",
        "authority": "SAGARPA",
        "type": "PERMIT",
        "sector": "agroalimentos",
        "dofDate": "1996-04-17",
        "validFrom": "1996-06-16",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=4876610&fecha=17/04/1996",
        "mandatory": True,
        "sampleChapters": ["02", "05", "16"],
        "condition": "Inspección y verificación en puntos de ingreso fronterizo y marítimo para productos cárnicos",
    },
    {
        "code": "NOM-057-FITO-1997",
        "title": "Por la que se establecen los requisitos y especificaciones fitosanitarias para la emisión del certificado fitosanitario para la importación de frutos y vegetales frescos",
        "authority": "SAGARPA",
        "type": "PERMIT",
        "sector": "agroalimentos",
        "dofDate": "1998-07-28",
        "validFrom": "1998-09-26",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=4890250&fecha=28/07/1998",
        "mandatory": True,
        "sampleChapters": ["07", "08"],
        "condition": "Certificado Fitosanitario Internacional emitido por la autoridad competente del país exportador",
    },

    # SECTOR: INDUSTRIA / SECRETARÍA DE ECONOMÍA (SE)
    {
        "code": "NOM-001-SCFI-2018",
        "title": "Aparatos electrónicos-Requisitos de seguridad y métodos de prueba (cancela a la NOM-001-SCFI-1993)",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "2019-09-17",
        "validFrom": "2020-05-14",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5572444&fecha=17/09/2019",
        "mandatory": True,
        "sampleChapters": ["85"],
        "condition": "Aparatos electrónicos para uso doméstico, comercial y de oficina alimentados por la red pública o baterías",
    },
    {
        "code": "NOM-019-SCFI-1998",
        "title": "Seguridad de equipo de procesamiento de datos",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "1998-12-11",
        "validFrom": "1999-06-09",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=4940250&fecha=11/12/1998",
        "mandatory": True,
        "sampleChapters": ["84"],
        "condition": "Equipos de procesamiento de datos, computadoras, servidores, impresoras y periféricos",
    },
    {
        "code": "NOM-024-SCFI-2013",
        "title": "Información comercial para empaques, instructivos y garantías de los productos electrónicos, eléctricos y electrodomésticos",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "2013-08-12",
        "validFrom": "2014-02-08",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5310065&fecha=12/08/2013",
        "mandatory": True,
        "sampleChapters": ["84", "85", "90"],
        "condition": "Instructivos, garantías y empaque en idioma español para bienes electrónicos y electrodomésticos",
    },
    {
        "code": "NOM-050-SCFI-2004",
        "title": "Información comercial-Etiquetado general de productos",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "2004-06-01",
        "validFrom": "2004-08-01",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=676100&fecha=01/06/2004",
        "mandatory": True,
        "sampleChapters": ["39", "40", "42", "48", "68", "69", "70", "73", "82", "83", "94", "95", "96"],
        "condition": "Productos manufacturados nacionales o importados destinados al consumidor cuando no exista NOM específica",
    },
    {
        "code": "NOM-004-SE-2021",
        "title": "Información comercial-Etiquetado de productos textiles, prendas de vestir, sus accesorios y ropa de casa",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "2022-01-14",
        "validFrom": "2023-01-15",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=5640698&fecha=14/01/2022",
        "mandatory": True,
        "sampleChapters": ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63"],
        "condition": "Prendas de vestir y confecciones textiles importadas",
    },
    {
        "code": "NOM-020-SCFI-1997",
        "title": "Información comercial-Etiquetado de cueros y pieles curtidas naturales y materiales sintéticos o artificiales con esa apariencia, calzado, marroquinería",
        "authority": "SE",
        "type": "NOM",
        "sector": "industria",
        "dofDate": "1997-12-11",
        "validFrom": "1998-02-09",
        "dofUrl": "https://dof.gob.mx/nota_detalle.php?codigo=4899500&fecha=11/12/1997",
        "mandatory": True,
        "sampleChapters": ["41", "42", "64"],
        "condition": "Calzado, partes de calzado, artículos de piel, marroquinería y artículos de viaje",
    },
]


def load_tariff_codes_by_chapter(tariff_csv: Path) -> dict[str, list[tuple[str, str]]]:
    """Carga fracciones y NICOs clasificados por capítulo (primeros 2 dígitos)."""
    by_chap: dict[str, list[tuple[str, str]]] = {}
    if not tariff_csv.exists():
        return by_chap
        
    with tariff_csv.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("code") or "").strip()
            nico = (row.get("nico") or "").strip()
            if re.match(r"^\d{4}\.\d{2}\.\d{2}$", code):
                chap = code.split(".")[0][:2]
                by_chap.setdefault(chap, []).append((code, nico))
    return by_chap


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrae y genera el catálogo estructurado de NOMs")
    parser.add_argument("--base-dir", type=Path, default=Path("corpus/noms"))
    parser.add_argument("--tariff-csv", type=Path, default=Path("data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv"))
    args = parser.parse_args()

    base_dir = args.base_dir
    base_dir.mkdir(parents=True, exist_ok=True)
    sectors_dir = base_dir / "noms_por_sector"
    sectors_dir.mkdir(parents=True, exist_ok=True)

    # 1. Guardar catálogo general en JSON
    cat_path = base_dir / "catalogo_noms_economia.json"
    with cat_path.open("w", encoding="utf-8") as f:
        json.dump(NOMS_MASTER, f, indent=2, ensure_ascii=False)
    print(f"Guardado {len(NOMS_MASTER)} NOMs maestras en {cat_path}")

    # 2. Separar por sectores
    sectors: dict[str, list[dict[str, Any]]] = {}
    for nom in NOMS_MASTER:
        sec = nom["sector"]
        sectors.setdefault(sec, []).append(nom)

    for sec_name, nom_list in sectors.items():
        sec_file = sectors_dir / f"{sec_name}.json"
        with sec_file.open("w", encoding="utf-8") as f:
            json.dump(nom_list, f, indent=2, ensure_ascii=False)
        print(f"Sector {sec_name}: {len(nom_list)} NOMs en {sec_file}")

    # 3. Generar regulatory-catalog-noms.csv vinculado a fracciones reales
    by_chap = load_tariff_codes_by_chapter(args.tariff_csv)
    
    csv_rows = []
    headers = [
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

    for nom in NOMS_MASTER:
        # Fracciones que corresponden a los capítulos de muestra
        matched_pairs: set[tuple[str, str]] = set()
        for chap in nom["sampleChapters"]:
            for code, nico in by_chap.get(chap, []):
                matched_pairs.add((code, nico))
                
        # Si no hay fracciones del CSV, generar al menos la clave de capítulo
        if not matched_pairs:
            for chap in nom["sampleChapters"]:
                matched_pairs.add((f"{chap}00.00.00", "00"))

        for code, nico in matched_pairs:
            csv_rows.append({
                "tariffCode": code,
                "nico": nico,
                "authority": nom["authority"],
                "type": nom["type"],
                "title": f"{nom['code']} — {nom['title']}",
                "condition": nom["condition"],
                "mandatory": "true" if nom["mandatory"] else "false",
                "sourceUrl": nom["dofUrl"],
                "sourceVersion": f"DOF-{nom['dofDate']}",
                "validFrom": nom["validFrom"],
                "validTo": "",
                "notes": f"NOM sector {nom['sector']}"
            })

    output_csv = base_dir / "regulatory-catalog-noms.csv"
    with output_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"Generado regulatory-catalog-noms.csv con {len(csv_rows)} requerimientos regulatorios en {output_csv}")


if __name__ == "__main__":
    main()
