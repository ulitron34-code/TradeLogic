"""Crea un respaldo comprimido .zip de TradeLogic y lo copia a la USB y al Escritorio.

Destinos:
1. E:/ADUANA/TradeLogic/backups/
2. C:/Users/ulitr/OneDrive/Escritorio/Respaldo Negocios/ADUANA/TradeLogic/
"""

from __future__ import annotations

import argparse
import datetime
import shutil
import zipfile
from pathlib import Path

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".next",
    ".turbo",
    "dist",
    ".pnpm-store",
    "__pycache__",
}


def create_backup(source_dir: Path, usb_dir: Path, desktop_dir: Path, label: str) -> Path:
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    zip_name = f"TradeLogic-{timestamp}-{label}.zip"
    
    usb_dir.mkdir(parents=True, exist_ok=True)
    desktop_dir.mkdir(parents=True, exist_ok=True)
    
    usb_target = usb_dir / zip_name
    desktop_target = desktop_dir / zip_name
    
    print(f"Comprimiendo {source_dir} -> {zip_name}...")
    
    file_count = 0
    with zipfile.ZipFile(usb_target, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in source_dir.rglob("*"):
            if file_path.is_file():
                # Verificar exclusiones
                parts = set(file_path.parts)
                if any(excluded in parts for excluded in EXCLUDE_DIRS):
                    continue
                rel_path = file_path.relative_to(source_dir)
                zip_file.write(file_path, str(rel_path))
                file_count += 1

    size_mb = round(usb_target.stat().st_size / (1024 * 1024), 2)
    print(f"[USB] Respaldo creado ({file_count} archivos, {size_mb} MB): {usb_target}")
    
    # Copiar al escritorio
    shutil.copy2(usb_target, desktop_target)
    print(f"[ESCRITORIO] Copiado a: {desktop_target}")
    
    return usb_target


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera respaldo ZIP de TradeLogic")
    parser.add_argument("--source", type=Path, default=Path("E:/ADUANA/MVP_Tecnico"))
    parser.add_argument("--usb", type=Path, default=Path("E:/ADUANA/TradeLogic/backups"))
    parser.add_argument("--desktop", type=Path, default=Path("C:/Users/ulitr/OneDrive/Escritorio/Respaldo Negocios/ADUANA/TradeLogic"))
    parser.add_argument("--label", type=str, default="corpus-complete")
    args = parser.parse_args()
    
    create_backup(args.source, args.usb, args.desktop, args.label)
    print("Respaldo completado exitosamente en ambas ubicaciones.")


if __name__ == "__main__":
    main()
