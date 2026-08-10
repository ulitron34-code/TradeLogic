# Fuentes del catalogo arancelario

## Fuentes primarias seleccionadas

- SNICE, Nueva LIGIE y NICO por capitulo: https://www.snice.gob.mx/cs/avi/snice/nico.ligie.html
- SNICE, modificaciones a la TIGIE: https://www.snice.gob.mx/cs/avi/snice/ligie.info22.mod.html
- Camara de Diputados, texto y reformas de la LIGIE: https://www.diputados.gob.mx/LeyesBiblio/ref/ligie_2022.htm
- SAT, consulta oficial de clasificacion arancelaria y NICO: https://wwwmat.sat.gob.mx/tramites/71719/presenta-tu-consulta-de-clasificacion-arancelaria
- SNICE, descarga oficial NICO/LIGIE (abril 2024): https://www.snice.gob.mx/~oracle/SNICE_DOCS/NICO-ABRIL24-LIGIE_20240415-20240415.XLSX
- SNICE, fracciones arancelarias oficial (FA/NICO, archivo publicado en abril de 2026): https://www.snice.gob.mx/~oracle/SNICE_DOCS/FRACCIONESARANCELARIAS-LIGIE_20260420-20260420.xlsx

## Politica de ingesta

1. El catalogo se ingresa por edicion y fecha de vigencia; nunca se sobreescribe historicamente.
2. Cada registro conserva `sourceVersion`, `sourceUrl`, `validFrom` y, cuando corresponda, `validTo`.
3. Las modificaciones se aplican como una nueva version efectiva, no como un cambio destructivo de la anterior.
4. Los archivos oficiales pueden contener fracciones, NICO, unidad de medida, IGI, IGE y correlaciones. El importador debe rechazar filas ambiguas y conservar el archivo original fuera de la base normalizada.
5. Una tasa ausente, expresada como cuota, exenta o condicionada no se convierte silenciosamente a porcentaje. Se conserva como metadata para reglas posteriores.

## Estado

El archivo oficial FA/NICO publicado por SNICE ya esta integrado como `data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv`, junto con su manifiesto JSON. El derivado tiene 20,227 registros: 8,183 fracciones, 11,507 NICO y las 185 modificaciones de abril de 2026. Conserva IGI e IGE numericos cuando son porcentajes y el texto de `Ex.`, `Prohibida` o cuotas cuando no son porcentajes. Las filas afectadas cierran su vigencia base el 2026-04-24 antes de iniciar la version modificada. La ingesta a base de datos debe ejecutarse en un entorno controlado antes de produccion.
