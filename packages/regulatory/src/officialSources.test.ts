import { describe, expect, it } from 'vitest';
import { findOfficialSource, OFFICIAL_SOURCE_DEFINITIONS } from './officialSources.js';

describe('official source definitions', () => {
  it('contains HTTPS entry points with unique keys', () => {
    expect(new Set(OFFICIAL_SOURCE_DEFINITIONS.map(source => source.key)).size).toBe(OFFICIAL_SOURCE_DEFINITIONS.length);
    expect(OFFICIAL_SOURCE_DEFINITIONS.every(source => source.url.startsWith('https://'))).toBe(true);
  });
  it('resolves the SNICE origin calculator', () => {
    expect(findOfficialSource('origin-calculator')?.authority).toBe('SNICE');
  });
});
