# ADR-001: Monorepo TypeScript

Estado: Aceptado

## Decisión
Usar pnpm y Turborepo con aplicaciones web, API y worker, además de paquetes compartidos de dominio, contratos, configuración y datos.

## Consecuencias
- Contratos y tipos se comparten sin duplicación.
- CI puede ejecutar tareas por dependencia.
- Se exige disciplina en fronteras para evitar un monolito acoplado.
