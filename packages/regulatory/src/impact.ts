// T-042 (alcance acotado): deteccion deterministica de fracciones
// arancelarias mencionadas en el texto de una provision regulatoria. La
// correlacion contra codigos ya usados por alguna organizacion (la otra
// mitad de la regla) requiere la base de datos y vive en el worker, no aqui
// — este modulo se mantiene puro para poder probarlo sin DB. Sin IA, como se
// acordo en el plan.
const TARIFF_FRACTION_PATTERN = /\b\d{4}\.\d{2}(?:\.\d{2})?\b/g;

export function extractTariffFractionMentions(text: string): string[] {
  const matches = text.match(TARIFF_FRACTION_PATTERN) ?? [];
  return Array.from(new Set(matches));
}
