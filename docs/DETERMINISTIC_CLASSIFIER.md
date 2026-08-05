# Clasificador deterministico inicial

Este modulo es una primera etapa de MVP. No emite resoluciones vinculantes ni sustituye revision de un especialista.

## Entrada

- Descripcion de la version del producto.
- Atributos estructurados del producto.
- Catalogo `TariffCode` vigente para `MX`.

## Salida

El worker genera hasta cinco `ClassificationCandidate` ordenados por score, con:

- Fraccion y NICO candidato.
- Score deterministico 0-96.
- Terminos coincidentes.
- Reglas deterministicas aplicadas.
- Contradicciones basicas detectadas.

## Politica de estado

- Si no hay version de producto o catalogo, el caso pasa a `NEEDS_INFORMATION`.
- Si el mejor candidato tiene score menor a 90 o hay contradicciones, el caso pasa a `NEEDS_REVIEW`.
- Si el mejor candidato tiene score 90+ y no hay contradicciones, el caso pasa a `APPROVED` y se fija `selectedCodeId`.

## Limitaciones deliberadas

- El catalogo semilla es pequeno y solo sirve para pruebas de flujo.
- El scoring es explicable pero simple; debe reemplazarse por recuperacion regulatoria completa.
- La jurisprudencia, notas explicativas y validacion de citas aun no estan conectadas.
- Toda salida debe conservar disclaimer y revision humana en casos de baja confianza o contradiccion.