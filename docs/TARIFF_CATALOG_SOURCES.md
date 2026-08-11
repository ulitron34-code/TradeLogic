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

El archivo oficial FA/NICO publicado por SNICE ya esta integrado como `data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv`, junto con su manifiesto JSON. El derivado tiene 20,227 registros: 8,183 fracciones, 11,507 NICO y las 185 modificaciones de abril de 2026. Conserva IGI e IGE numericos cuando son porcentajes y el texto de `Ex.`, `Prohibida` o cuotas cuando no son porcentajes. Las filas afectadas cierran su vigencia base el 2026-04-24 antes de iniciar la version modificada.

La integridad del derivado se valida con npm run verify:tariff-source: calcula SHA-256, cuenta filas CSV respetando campos entre comillas y confirma las columnas obligatorias contra el manifiesto.

## Ingesta controlada

Antes de tocar una base de datos, ejecutar el dry-run. Este paso valida el CSV completo y confirma que el conteo coincide con el manifiesto oficial derivado:

```bash
pnpm db:tariff-import -- --input data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv --source-version LIGIE-NICO-2026-04-24 --source-url https://www.snice.gob.mx/~oracle/SNICE_DOCS/FRACCIONESARANCELARIAS-LIGIE_20260420-20260420.xlsx --expected-records 20227
```

Antes de la carga real, validar la entrada versionada sin dependencias de pnpm/tsx ni conexion a base de datos:

```bash
npm run verify:tariff-import-input -- --output artifacts/tariff-import-input.json
```

Si `pnpm`, `tsx`, Prisma o la conexion directa al puerto 5432 fallan desde la PC/USB, generar un SQL idempotente para pegarlo en el SQL editor de Supabase. Este archivo valida el conteo esperado, actualiza claves naturales existentes e inserta las faltantes sin necesitar acceso directo a la base desde la maquina local:

```bash
npm run generate:supabase-tariff-import-sql -- --output artifacts/import_tariff_catalog.sql
```

La carga real debe ejecutarse solo desde el entorno controlado que apunta a Supabase/produccion. El importador abre Prisma unicamente cuando se usa `--apply` y aborta si el conteo validado no es exactamente 20,227:

```bash
pnpm db:tariff-import -- --input data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv --source-version LIGIE-NICO-2026-04-24 --source-url https://www.snice.gob.mx/~oracle/SNICE_DOCS/FRACCIONESARANCELARIAS-LIGIE_20260420-20260420.xlsx --expected-records 20227 --apply
```

Despues de aplicar, pegar `supabase/verify_tariff_catalog.sql` en el SQL editor de Supabase. El SQL es read-only, corre dentro de `begin`/`rollback`, valida conteo total, distribucion por `sourceVersion`, duplicados, NICO invalido y tasas porcentuales fuera de rango, y al final devuelve `tariff_catalog_verification_json`; copiar ese JSON en `artifacts/tariff-catalog-verification.json`.
