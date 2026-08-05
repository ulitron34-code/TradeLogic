import { describe, expect, it } from 'vitest';
import { rankTariffCandidates, requiresHumanReview } from './index.js';

const tariffCodes = [
  {
    id: '00000000-0000-4000-8000-000000000851',
    code: '8536.50.99',
    nico: '99',
    description: 'Interruptores, conectores, sensores y aparatos electricos para corte o conexion de circuitos.',
    sourceVersion: 'LIGIE-MX-2026-seed',
  },
  {
    id: '00000000-0000-4000-8000-000000000392',
    code: '3926.90.99',
    nico: '99',
    description: 'Las demas manufacturas de plastico y articulos de polimeros.',
    sourceVersion: 'LIGIE-MX-2026-seed',
  },
  {
    id: '00000000-0000-4000-8000-000000000620',
    code: '6204.62.99',
    nico: '99',
    description: 'Prendas textiles para mujer o nina de algodon.',
    sourceVersion: 'LIGIE-MX-2026-seed',
  },
];

describe('rankTariffCandidates', () => {
  it('ranks electronic circuit products above generic plastic candidates', () => {
    const ranked = rankTariffCandidates(
      {
        description: 'Sensor electronico para conexion de circuitos electricos.',
        attributes: { material: 'plastico con circuito electronico', function: 'sensor electrico' },
      },
      tariffCodes,
    );

    const top = ranked[0]!;
    const second = ranked[1]!;
    expect(top.code).toBe('8536.50.99');
    expect(top.score).toBeGreaterThan(second.score);
    expect(top.matchedTerms).toContain('sensor');
  });

  it('flags contradiction when a textile candidate matches a circuit product poorly', () => {
    const ranked = rankTariffCandidates(
      {
        description: 'Circuito electronico de control.',
        attributes: { component: 'circuito' },
      },
      [tariffCodes[2]!],
    );

    const top = ranked[0]!;
    expect(top.contradictions).toContain('La fraccion describe textil pero el producto declara circuito/electronica.');
    expect(requiresHumanReview(top.score, top.contradictions.length, false)).toBe(true);
  });
});