import { execFileSync } from 'node:child_process';

import { buildApp } from './app.js';

function applyProductionMigrations() {
  if (process.env.NODE_ENV !== 'production') return;
  const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  execFileSync(packageManager, ['--filter', '@platform/db', 'prisma:deploy'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
}

applyProductionMigrations();
const app = await buildApp();
const address = await app.listen({ port: 4000, host: '0.0.0.0' });
console.log('api listening', { address });
