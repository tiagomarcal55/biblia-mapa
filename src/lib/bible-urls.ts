/**
 * lib/bible-urls.ts
 *
 * Gera URLs para a Bíblia de Estudo e Biblioteca Online WOL.
 *
 * Padrão:
 *   https://wol.jw.org/pt/wol/l/r5/lp-t?q={query}
 */

export function buildJWStudyBibleUrl(ref: string): string {
  if (!ref) return 'https://wol.jw.org/pt/wol/l/r5/lp-t';
  const q = encodeURIComponent(ref).replace(/%20/g, '+');
  return `https://wol.jw.org/pt/wol/l/r5/lp-t?q=${q}`;
}

export function buildJWUrl(ref: string): string {
  return buildJWStudyBibleUrl(ref);
}
