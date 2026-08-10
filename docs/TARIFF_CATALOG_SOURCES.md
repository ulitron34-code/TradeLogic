# Fuentes del catalogo arancelario

## Fuentes primarias seleccionadas

- SNICE, Nueva LIGIE y NICO por capitulo: https://www.snice.gob.mx/cs/avi/snice/nico.ligie.html
- SNICE, modificaciones a la TIGIE: https://www.snice.gob.mx/cs/avi/snice/ligie.info22.mod.html
- Camara de Diputados, texto y reformas de la LIGIE: https://www.diputados.gob.mx/LeyesBiblio/ref/ligie_2022.htm
- SAT, consulta oficial de clasificacion arancelaria y NICO: https://wwwmat.sat.gob.mx/tramites/71719/presenta-tu-consulta-de-clasificacion-arancelaria
- SNICE, descarga oficial NICO/LIGIE (abril 2024): https://www.snice.gob.mx/~oracle/SNICE_DOCS/NICO-ABRIL24-LIGIE_20240415-20240415.XLSX

## Politica de ingesta

1. El catalogo se ingresa por edicion y fecha de vigencia; nunca se sobreescribe historicamente.
2. Cada registro conserva `sourceVersion`, `sourceUrl`, `validFrom` y, cuando corresponda, `validTo`.
3. Las modificaciones se aplican como una nueva version efectiva, no como un cambio destructivo de la anterior.
4. Los archivos oficiales pueden contener fracciones, NICO, unidad de medida, IGI, IGE y correlaciones. El importador debe rechazar filas ambiguas y conservar el archivo original fuera de la base normalizada.
5. Una tasa ausente, expresada como cuota, exenta o condicionada no se convierte silenciosamente a porcentaje. Se conserva como metadata para reglas posteriores.

## Estado

El archivo oficial NICO/LIGIE de abril de 2024 ya esta incorporado como `data/tariff-sources/2024/NICO-ABRIL24-LIGIE.csv`, extraido desde una copia XLSX cuyo SHA-256 es `86A16096525B0FDBC0D3CD5005AE44FBCBCE356C6A9BA7AD16684AEF956ACD46`. Contiene 11,507 claves unicas de fraccion + NICO, sin tasas arancelarias; por eso el importador conserva `generalRate` vacio y no inventa porcentajes. La ingesta a base de datos debe ejecutarse en un entorno controlado antes de produccion, y las modificaciones 2026 deben cargarse como versiones efectivas separadas.
