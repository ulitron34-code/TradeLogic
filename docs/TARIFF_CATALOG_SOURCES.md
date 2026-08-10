# Fuentes del catalogo arancelario

## Fuentes primarias seleccionadas

- SNICE, Nueva LIGIE y NICO por capitulo: https://www.snice.gob.mx/cs/avi/snice/nico.ligie.html
- SNICE, modificaciones a la TIGIE: https://www.snice.gob.mx/cs/avi/snice/ligie.info22.mod.html
- Camara de Diputados, texto y reformas de la LIGIE: https://www.diputados.gob.mx/LeyesBiblio/ref/ligie_2022.htm
- SAT, consulta oficial de clasificacion arancelaria y NICO: https://wwwmat.sat.gob.mx/tramites/71719/presenta-tu-consulta-de-clasificacion-arancelaria

## Politica de ingesta

1. El catalogo se ingresa por edicion y fecha de vigencia; nunca se sobreescribe historicamente.
2. Cada registro conserva `sourceVersion`, `sourceUrl`, `validFrom` y, cuando corresponda, `validTo`.
3. Las modificaciones se aplican como una nueva version efectiva, no como un cambio destructivo de la anterior.
4. Los archivos oficiales pueden contener fracciones, NICO, unidad de medida, IGI, IGE y correlaciones. El importador debe rechazar filas ambiguas y conservar el archivo original fuera de la base normalizada.
5. Una tasa ausente, expresada como cuota, exenta o condicionada no se convierte silenciosamente a porcentaje. Se conserva como metadata para reglas posteriores.

## Estado

El modelo y la persistencia versionada ya estan preparados. Falta incorporar al repositorio un archivo oficial descargado y verificado, definir su hash y ejecutar la ingesta en un entorno controlado antes de produccion.
