process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.API_BASE_URL ??= 'http://localhost:4000';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_BUCKET ??= 'platform-test';
process.env.S3_ACCESS_KEY ??= 'test';
process.env.S3_SECRET_KEY ??= 'test';
process.env.JWT_ISSUER ??= 'platform-test';
process.env.JWT_AUDIENCE ??= 'platform-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key';
process.env.FX_PROVIDER ??= 'banxico';
process.env.REGULATORY_POLL_CRON ??= '0 * * * 1-5';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.LOG_LEVEL ??= 'silent';

// Import dinamico a proposito: @platform/config valida process.env al ser
// importado por primera vez, y los `import` estaticos se izan por encima de
// las asignaciones de arriba (aunque aparezcan despues en el archivo).
const { AuthError, extractBearerToken } = await import('./auth.js');

import { describe, expect, it } from 'vitest';

describe('extractBearerToken', () => {
  it('rejects a missing Authorization header', () => {
    expect(() => extractBearerToken(undefined)).toThrow(AuthError);
  });

  it('rejects a header without the Bearer scheme', () => {
    expect(() => extractBearerToken('Basic abc123')).toThrow(AuthError);
  });

  it('rejects an empty bearer token', () => {
    expect(() => extractBearerToken('Bearer ')).toThrow(AuthError);
  });

  it('extracts the token from a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });
});
