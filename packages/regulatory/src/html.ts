// Entidades HTML encontradas en las paginas del DOF (declaran UTF-8 en el
// Content-Type; los acentos van como entidades &aacute; etc., no como bytes
// crudos ni mojibake latin1/windows-1252).
const NAMED_ENTITIES: Record<string, string> = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º',
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

export function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function htmlToPlainText(html: string): string {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(html)));
}
