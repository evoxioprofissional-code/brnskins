/** Cotador do admin: tipos e leitura de linhas coladas. */

/** Item cotável: preço de venda em ¥ na BUFF e na C5 (reconvertido do dólar com a cotação do dia). */
export interface QuoteItem {
  key: string;
  skinId: string;
  name: string;
  image: string;
  wear: string;
  variant: string;
  buffCny: number | null;
  c5Cny: number | null;
  steamBrl: number | null;
}

const WEAR_WORDS: [RegExp, string][] = [
  [/\bfactory[\s-]*new\b|\bfn\b/i, "FN"],
  [/\bminimal[\s-]*wear\b|\bmw\b/i, "MW"],
  [/\bfield[\s-]*tested\b|\bft\b/i, "FT"],
  [/\bwell[\s-]*worn\b|\bww\b/i, "WW"],
  [/\bbattle[\s-]*scarred\b|\bbs\b/i, "BS"],
];

/** "★ Karambit | Tiger Tooth (Factory New)" ou "karambit tiger tooth fn" → busca */
export function parseLine(line: string) {
  let rest = line.replace(/[★™|()]/g, " ").replace(/\s+/g, " ").trim();
  let wear: string | null = null;
  for (const [re, code] of WEAR_WORDS) {
    if (re.test(rest)) {
      wear = code;
      rest = rest.replace(re, " ");
      break;
    }
  }
  let variant = "normal";
  if (/\bstat\s*trak\b|\bst\b/i.test(rest)) {
    variant = "stattrak";
    rest = rest.replace(/\bstat\s*trak\b|\bst\b/gi, " ");
  } else if (/\bsouvenir\b/i.test(rest)) {
    variant = "souvenir";
    rest = rest.replace(/\bsouvenir\b/gi, " ");
  }
  const tokens = rest
    .toLowerCase()
    .replace(/[%_\\,]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 || /\d/.test(t))
    .slice(0, 8);
  return { tokens, wear, variant };
}

