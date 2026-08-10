import { describe, expect, it } from 'vitest';
import { buildCaseDossierLines, renderCaseDossierPdf } from './caseDossier.js';

const dossier = {
  id: 'case-1', status: 'NEEDS_REVIEW', generatedAt: '2026-08-10T00:00:00Z',
  product: { name: 'Sensor electronico', sku: 'S-1', description: 'Sensor de medicion' },
  candidates: [{ rank: 1, code: '9031.80.99', nico: null, description: 'Instrumentos de medicion', score: 86, sourceVersion: 'LIGIE-2026.1', sourceUrl: 'https://example.test/ligie', regulatoryRequirements: [{ title: 'Permiso', authority: 'SAT', sourceVersion: '2026.1', sourceUrl: 'https://example.test/permiso', mandatory: true }] }],
  evidence: [{ filename: 'ficha.pdf', sha256: 'a'.repeat(64), claimType: 'technical' }],
  reviews: [{ decision: 'CHANGES_REQUESTED', notes: 'Falta evidencia', createdAt: '2026-08-10' }],
  riskAssessment: { score: 55, band: 'HIGH', rulesetVersion: 'risk-1', factors: [{ label: 'Evidencia limitada', points: 10, explanation: 'Falta factura' }] },
  disclaimer: 'No constituye asesoria juridica.',
};

describe('case dossier', () => {
  it('includes source, evidence hash, risk, and review in the snapshot', () => {
    const lines = buildCaseDossierLines(dossier);
    expect(lines.join('\n')).toContain('SHA-256:');
    expect(lines.join('\n')).toContain('https://example.test/permiso');
    expect(lines.join('\n')).toContain('CHANGES_REQUESTED');
  });

  it('renders a valid minimal PDF envelope', () => {
    const pdf = new TextDecoder().decode(renderCaseDossierPdf(dossier));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('%%EOF');
  });
});
