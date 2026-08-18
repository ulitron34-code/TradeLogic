# NOMs — Normas Oficiales Mexicanas

Fuente: DOF / PLATIICA (Secretaría de Economía)
Portal: https://platiica.economia.gob.mx/normalizacion/normas-oficiales-mexicanas

## Estructura

```
noms/
  catalogo_noms_economia.json     ← Catálogo completo parseado de PLATIICA
  noms_por_sector/
    salud.json                    ← NOMs SSA/COFEPRIS
    ambiental.json                ← NOMs SEMARNAT
    agroalimentos.json            ← NOMs SENASICA/SADER
    industria.json                ← NOMs SECOFIPE/ECONOMÍA
  pdfs/
    [cada NOM individual descargada del DOF]
```

## Estrategia de descarga

1. Parsear `https://platiica.economia.gob.mx/normalizacion/normas-oficiales-mexicanas` para obtener el catálogo completo.
2. Filtrar por sector (salud, ambiental, agroalimentos, industria).
3. Para cada NOM aplicable, construir la URL del DOF y parsear el PDF.
4. Indexar en corpus.

**Nota**: Hay ~2,500–3,000 NOMs vigentes. No se descargan en bulk oficialmente; requieren parsing del catálogo + requests individuales al DOF.
