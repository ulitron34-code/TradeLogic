import { execFileSync } from 'node:child_process';

import { buildApp } from './app.js';

function applyProductionMigrations() {
  if (process.env.NODE_ENV !== 'production') return;
  const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  // Previous Render releases recorded migrations 9, 11 and 12 as failed. Resolve
  // only those known markers so Prisma can retry the corrected migrations.
  for (const migration of ['9_add_case_assignments', '11_add_new_table_rls', '12_add_case_review_requests']) {
    try {
      execFileSync(packageManager, ['--filter', '@platform/db', 'exec', 'prisma', 'migrate', 'resolve', '--rolled-back', migration], {
        cwd: process.cwd(),
        stdio: 'ignore',
        env: { ...process.env, DIRECT_URL: process.env.DATABASE_URL },
      });
    } catch {
      // The migration is either not failed or the database has not recorded
      // it; migrate deploy below remains the source of truth.
    }
  }
  execFileSync(packageManager, ['--filter', '@platform/db', 'prisma:deploy'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    // Render/Supabase may expose an old direct connection in DIRECT_URL that
    // is not reachable from the hosting network. Production migrations must
    // use the verified DATABASE_URL pooler endpoint instead.
    env: { ...process.env, DIRECT_URL: process.env.DATABASE_URL },
  });
}

applyProductionMigrations();
const app = await buildApp();
const address = await app.listen({ port: 4000, host: '0.0.0.0' });
console.log('api listening', { address });
