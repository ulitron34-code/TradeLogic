#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_OUTPUT = 'artifacts/manual-pilot-run.json';
const STEPS = [
  ['login', 'Entrar a Vercel con una cuenta piloto real.'],
  ['create-product', 'Crear o abrir un producto piloto.'],
  ['upload-evidence', 'Subir evidencia documental del producto y verla listada.'],
  ['start-classification-case', 'Crear caso de clasificacion desde el producto.'],
  ['submit-analysis', 'Enviar caso a analisis y confirmar que avanza de estado.'],
  ['review-decision', 'Registrar decision humana de revision.'],
  ['download-dossier-pdf', 'Descargar el expediente PDF del caso revisado.'],
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
    steps: STEPS.map(([name, evidence]) => ({ name, status: 'pending', evidence })),
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