#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_OUTPUT = 'artifacts/manual-pilot-run.json';
const STEPS = [
  { name: 'login', instruction: 'Entrar a Vercel con una cuenta piloto real.', expectedResult: 'La sesion abre dashboard/productos sin redirigir a login.' },
  { name: 'create-product', instruction: 'Crear o abrir un producto piloto.', expectedResult: 'El producto queda visible con ID real y version actual.' },
  { name: 'upload-evidence', instruction: 'Subir evidencia documental del producto y verla listada.', expectedResult: 'El documento aparece listado en el producto y queda asociado al caso.' },
  { name: 'start-classification-case', instruction: 'Crear caso de clasificacion desde el producto.', expectedResult: 'El detalle del caso abre con estado inicial y avance del expediente visible.' },
  { name: 'submit-analysis', instruction: 'Enviar caso a analisis y confirmar que avanza de estado.', expectedResult: 'El caso cambia de estado y muestra candidatos o necesidad de revision.' },
  { name: 'review-decision', instruction: 'Registrar decision humana de revision.', expectedResult: 'La decision queda registrada y el caso queda aprobado/rechazado.' },
  { name: 'download-dossier-pdf', instruction: 'Descargar el expediente PDF del caso revisado.', expectedResult: 'El PDF descarga correctamente y coincide con el caseId del smoke autenticado.' },
];

function usage() {
  return `Usage:
  node scripts/write-pilot-manual-evidence-template.cjs [--output artifacts/manual-pilot-run.json] [--web-base-url https://...] [--api-base-url https://...] [--tester nombre]

Writes a failing manual pilot evidence template. Fill real IDs and set status/steps to ok only after the browser run is complete.
`;
}

function parseArgs(argv) {
  const options = { output: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--output') options.output = value;
    else if (arg === '--web-base-url') options.webBaseUrl = value;
    else if (arg === '--api-base-url') options.apiBaseUrl = value;
    else if (arg === '--tester') options.tester = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const output = path.resolve(options.output);
  mkdirSync(path.dirname(output), { recursive: true });
  const payload = {
    status: 'needs-review',
    checkedAt: new Date().toISOString(),
    tester: options.tester ?? 'PENDIENTE',
    environment: {
      webBaseUrl: options.webBaseUrl ?? 'https://tradelogic-git-main-ulitron34-codes-projects.vercel.app',
      apiBaseUrl: options.apiBaseUrl ?? 'https://tradelogic-api.onrender.com',
      commitSha: 'PENDIENTE',
    },
    scenario: {
      productId: 'PENDIENTE',
      productVersionId: 'PENDIENTE',
      caseId: 'PENDIENTE',
      dossierDownloaded: false,
      dossierFilename: 'tradelogic-PENDIENTE.pdf',
    },
    steps: STEPS.map((step) => ({
      name: step.name,
      status: 'pending',
      checkedAt: 'PENDIENTE',
      instruction: step.instruction,
      expectedResult: step.expectedResult,
      evidence: 'PENDIENTE',
    })),
    blockers: ['Completar recorrido manual en navegador y reemplazar valores PENDIENTE.'],
    notes: 'No cambiar status a ok hasta confirmar cada paso con una cuenta piloto real.',
  };
  writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: 'ok', output }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
