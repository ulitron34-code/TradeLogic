export type ConfidenceBand = 'HIGH'|'MEDIUM'|'LOW'|'CONFLICT';
export function confidenceBand(score:number, contradictions:number):ConfidenceBand {
  if (contradictions > 0 && score < 85) return 'CONFLICT';
  if (score >= 90) return 'HIGH';
  if (score >= 70) return 'MEDIUM';
  return 'LOW';
}
export function requiresHumanReview(score:number, contradictions:number, critical:boolean):boolean {
  return critical || contradictions > 0 || score < 90;
}
