import { describe, expect, it } from 'vitest';
import { assessLegalRisk, evaluateOrigin } from './tradeCompliance.js';

describe('trade compliance', () => {
  it('raises transparent risk for missing mandatory requirements and evidence', () => {
    const result = assessLegalRisk({
      classificationScore: 62,
      contradictions: 1,
      documentaryEvidenceCount: 0,
      regulatoryChecks: [{ title: 'Permiso', mandatory: true, satisfied: false, sourceUrl: 'https://example.test/permiso' }],
      hasHumanReview: false,
      hasOriginEvidence: false,
      hasValuationEvidence: false,
    });
    expect(result.band).toBe('CRITICAL');
    expect(result.requiresHumanReview).toBe(true);
    expect(result.factors.map((factor) => factor.code)).toContain('MISSING_MANDATORY_REQUIREMENTS');
    expect(result.disclaimer).toContain('no constituye');
  });

  it('evaluates an RVC rule with source and version preserved', () => {
    const result = evaluateOrigin({
      rule: { id: 'tmec-1', tariffCode: '8501.10.01', agreement: 'T-MEC', type: 'RVC', thresholdPercent: 60, sourceUrl: 'https://example.test/tmec', sourceVersion: '2026.1', validFrom: '2026-01-01' },
      finishedGoodValue: 1000,
      nonOriginatingValue: 300,
      evidenceCount: 2,
    });
    expect(result.status).toBe('ELIGIBLE');
    expect(result.qualifyingValuePercent).toBe(70);
    expect(result.sourceVersion).toBe('2026.1');
  });

  it('does not call origin eligibility proven when evidence is absent', () => {
    const result = evaluateOrigin({
      rule: { id: 'tmec-2', tariffCode: '6109.10.01', agreement: 'T-MEC', type: 'CTC', sourceUrl: 'https://example.test/tmec', sourceVersion: '2026.1', validFrom: '2026-01-01' },
      finishedGoodValue: 100,
      nonOriginatingValue: 10,
      tariffShiftSatisfied: true,
      evidenceCount: 0,
    });
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.reasons).toContain('No hay evidencia documental de origen.');
  });
});
