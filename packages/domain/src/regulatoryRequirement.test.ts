import { describe, expect, it } from 'vitest';
import { isRegulatoryRequirementEffective, validateRegulatoryRequirement } from './regulatoryRequirement';

const base = {
  tariffCodeId: 'code-1',
  authority: 'COFEPRIS',
  requirementType: 'NOM_PERMIT',
  title: 'Aviso sanitario',
  sourceUrl: 'https://www.gob.mx/cofepris',
  sourceVersion: '2026-01',
  validFrom: '2026-01-01',
};

describe('regulatory requirements', () => {
  it('requires a traceable official source and coherent dates', () => {
    expect(validateRegulatoryRequirement(base)).toEqual({ valid: true, errors: [] });
    expect(validateRegulatoryRequirement({ ...base, sourceUrl: 'invented-source', validTo: '2025-01-01' }).valid).toBe(false);
  });

  it('evaluates effective windows without inventing an expiry', () => {
    expect(isRegulatoryRequirementEffective(base, new Date('2026-06-01'))).toBe(true);
    expect(isRegulatoryRequirementEffective({ ...base, validTo: '2026-05-01' }, new Date('2026-06-01'))).toBe(false);
    expect(isRegulatoryRequirementEffective({ ...base, validFrom: '2027-01-01' }, new Date('2026-06-01'))).toBe(false);
  });
});
