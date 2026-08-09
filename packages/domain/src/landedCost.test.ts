import { describe, expect, it } from 'vitest';
import { calculateLandedCost, LANDED_COST_RULESET_VERSION } from './index.js';

describe('calculateLandedCost', () => {
  it('computes duty, DTA, and IVA on top of customs value plus freight and insurance', () => {
    const result = calculateLandedCost({
      customsValue: 10000,
      freight: 500,
      insurance: 100,
      dutyRatePercent: 15,
    });

    // Base = 10000 + 500 + 100 = 10600
    expect(result.customsValueBase).toBe(10600);
    // Arancel = 15% de 10600 = 1590
    expect(result.dutyAmount).toBe(1590);
    // DTA = 0.8% de 10600 = 84.8
    expect(result.dta).toBe(84.8);
    // Base IVA = 10600 + 1590 + 84.8 = 12274.8
    expect(result.ivaBase).toBe(12274.8);
    // IVA 16% de 12274.8 = 1963.968 -> redondeado 1963.97
    expect(result.ivaAmount).toBe(1963.97);
    expect(result.otherFees).toBe(0);
    // Total = 10600 + 1590 + 84.8 + 1963.97 + 0 = 14238.77
    expect(result.totalLandedCost).toBe(14238.77);
    expect(result.rulesetVersion).toBe(LANDED_COST_RULESET_VERSION);
  });

  it('applies a custom IVA rate when provided', () => {
    const result = calculateLandedCost({
      customsValue: 1000,
      freight: 0,
      insurance: 0,
      dutyRatePercent: 0,
      ivaRatePercent: 8,
    });

    expect(result.dutyAmount).toBe(0);
    expect(result.dta).toBe(8);
    expect(result.ivaAmount).toBe(80.64);
    expect(result.totalLandedCost).toBe(1088.64);
  });

  it('includes other fees in the total but not in the IVA base', () => {
    const result = calculateLandedCost({
      customsValue: 1000,
      freight: 0,
      insurance: 0,
      dutyRatePercent: 0,
      otherFees: 50,
    });

    expect(result.ivaBase).toBe(1008);
    expect(result.ivaAmount).toBe(161.28);
    expect(result.otherFees).toBe(50);
    expect(result.totalLandedCost).toBe(1000 + 0 + 8 + 161.28 + 50);
  });

  it('rejects negative inputs', () => {
    expect(() =>
      calculateLandedCost({ customsValue: -1, freight: 0, insurance: 0, dutyRatePercent: 0 }),
    ).toThrow('non-negative');
  });

  it('handles a zero-value shipment without dividing by zero or producing NaN', () => {
    const result = calculateLandedCost({ customsValue: 0, freight: 0, insurance: 0, dutyRatePercent: 10 });
    expect(result.totalLandedCost).toBe(0);
  });
});
