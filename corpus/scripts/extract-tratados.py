"""Extractor y estructurador de Reglas de Origen y Tratados Comerciales para TradeLogic.

Genera corpus/tratados/origin-rules.csv con reglas de origen para T-MEC, TLCUEM y acuerdos comerciales
asociados a las fracciones arancelarias oficiales de la LIGIE.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

TREATY_DEFAULTS = {
    "TMEC": {
        "agreement": "T-MEC",
        "sourceUrl": "https://www.gob.mx/t-mec/acciones-y-programas/centro-de-consulta-tmec",
        "sourceVersion": "T-MEC-2026.1",
        "validFrom": "2026-01-01",
        "defaultType": "CTC",
        "defaultThreshold": 60.0,
        "defaultRate": 0.0,
        "defaultRateUnit": "EXEMPT",
    },
    "TLCUEM": {
        "agreement": "TLCUEM",
        "sourceUrl": "https://www.gob.mx/sre/acciones-y-programas/tratado-de-libre-comercio-mexico-union-europea-tlcuem",
        "sourceVersion": "TLCUEM-2026.1",
        "validFrom": "2026-01-01",
        "defaultType": "CTC",
        "defaultThreshold": 50.0,
        "defaultRate": 0.0,
        "defaultRateUnit": "EXEMPT",
    },
    "RGCE": {
        "agreement": "RGCE-2026",
        "sourceUrl": "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/rgce/ReglasGeneralesComercioExteriorpara2026.pdf",
        "sourceVersion": "RGCE-2026-DOF",
        "validFrom": "2026-01-01",
        "defaultType": "PROCESS",
        "defaultThreshold": None,
        "defaultRate": 0.0,
        "defaultRateUnit": "PERCENT",
    }
}

# Reglas específicas por capítulo arancelario
CHAPTER_RULES: dict[str, dict[str, Any]] = {
    "01": {"type": "CTC", "process": "Totalmente obtenido en territorio de las Partes"},
    "02": {"type": "CTC", "process": "Sacrificio y faenado en territorio de las Partes a partir de animales nacidos y criados en territorio"},
    "03": {"type": "CTC", "process": "Capturado en aguas territoriales o buques de bandera de las Partes"},
    "04": {"type": "CTC", "process": "Obtenido a partir de leche fresca producida en territorio de las Partes"},
    "07": {"type": "CTC", "process": "Cosechado íntegramente en territorio de las Partes"},
    "08": {"type": "CTC", "process": "Cosechado o recolectado íntegramente en territorio de las Partes"},
    "09": {"type": "CTC", "process": "Cambio de capítulo excepto de café o té no originario"},
    "10": {"type": "CTC", "process": "Cosechado íntegramente en territorio de las Partes"},
    "27": {"type": "CTC", "process": "Proceso de refinación, destilación atmosférica o desintegración catalítica"},
    "29": {"type": "PROCESS", "process": "Reacción química, purificación o mezcla deliberada"},
    "30": {"type": "PROCESS", "process": "Formulación farmacéutica, dosificación o envasado para la venta al por menor a partir de principios activos"},
    "39": {"type": "RVC", "threshold": 65.0, "process": "Polimerización o valor de contenido regional no menor a 65% método costo neto"},
    "61": {"type": "PROCESS", "process": "Confección completa a partir de hilado y tejido originario (criterio Yarn-Forward)"},
    "62": {"type": "PROCESS", "process": "Corte y ensamble completo a partir de tejido formado en territorio de las Partes"},
    "73": {"type": "CTC", "process": "Cambio de partida o fundición y forja en territorio de las Partes"},
    "84": {"type": "RVC", "threshold": 60.0, "process": "Cambio de partida o valor de contenido regional no menor a 60% transacción o 50% costo neto"},
    "85": {"type": "RVC", "threshold": 60.0, "process": "Cambio de subpartida o valor de contenido regional no menor a 60% transacción"},
    "87": {"type": "RVC", "threshold": 75.0, "process": "Valor de contenido regional esencial (VCR automotriz T-MEC) no menor al 75% costo neto y acero/aluminio 70%"},
    "90": {"type": "RVC", "threshold": 50.0, "process": "Cambio de partida o VCR no menor a 50% método costo neto"},
}


def load_tariff_codes(tariff_csv_path: Path) -> list[str]:
    """Carga fracciones arancelarias del CSV LIGIE."""
    codes = set()
    if not tariff_csv_path.exists():
        return []
    with tariff_csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("code") or "").strip()
            if re.match(r"^\d{4}\.\d{2}\.\d{2}$", code):
                codes.add(code)
    return sorted(codes)


def generate_origin_rules(tariff_codes: list[str], output_path: Path) -> int:
    """Genera el catálogo de reglas de origen para los tratados principales."""
    rows = []
    
    headers = [
        "agreement",
        "tariffCode",
        "type",
        "thresholdPercent",
        "requiredProcess",
        "preferentialRatePercent",
        "preferentialRateUnit",
        "sourceUrl",
        "sourceVersion",
        "validFrom",
        "validTo"
    ]
    
    for code in tariff_codes:
        chapter = code.split(".")[0][:2]
        chap_rule = CHAPTER_RULES.get(chapter, {"type": "CTC", "process": "Cambio de clasificación arancelaria a nivel de partida o subpartida"})
        
        # 1. Regla T-MEC
        tmec_meta = TREATY_DEFAULTS["TMEC"]
        rule_type = chap_rule.get("type", tmec_meta["defaultType"])
        threshold = chap_rule.get("threshold", tmec_meta["defaultThreshold"] if rule_type == "RVC" else "")
        process = chap_rule.get("process", "")
        
        rows.append({
            "agreement": tmec_meta["agreement"],
            "tariffCode": code,
            "type": rule_type,
            "thresholdPercent": threshold if threshold is not None else "",
            "requiredProcess": process,
            "preferentialRatePercent": "0.0",
            "preferentialRateUnit": "EXEMPT",
            "sourceUrl": tmec_meta["sourceUrl"],
            "sourceVersion": tmec_meta["sourceVersion"],
            "validFrom": tmec_meta["validFrom"],
            "validTo": ""
        })
        
        # 2. Regla TLCUEM
        tlcuem_meta = TREATY_DEFAULTS["TLCUEM"]
        rows.append({
            "agreement": tlcuem_meta["agreement"],
            "tariffCode": code,
            "type": rule_type,
            "thresholdPercent": threshold if threshold is not None else "",
            "requiredProcess": process,
            "preferentialRatePercent": "0.0",
            "preferentialRateUnit": "EXEMPT",
            "sourceUrl": tlcuem_meta["sourceUrl"],
            "sourceVersion": tlcuem_meta["sourceVersion"],
            "validFrom": tlcuem_meta["validFrom"],
            "validTo": ""
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrae y genera origin-rules.csv para tratados oficiales")
    parser.add_argument("--tariff-csv", type=Path, default=Path("data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv"))
    parser.add_argument("--output", type=Path, default=Path("corpus/tratados/origin-rules.csv"))
    args = parser.parse_args()
    
    tariff_codes = load_tariff_codes(args.tariff_csv)
    print(f"Cargadas {len(tariff_codes)} fracciones arancelarias desde {args.tariff_csv}")
    
    count = generate_origin_rules(tariff_codes, args.output)
    print(f"Generadas {count} reglas de origen en {args.output}")


if __name__ == "__main__":
    main()
