const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const int = new Intl.NumberFormat("pt-BR");

/** R$ 2.521,95 (com espaço normal, sem NBSP, para layout previsível) */
export const formatBRL = (value: number) => brl.format(value).replace(/ /g, " ");

export const formatInt = (value: number) => int.format(value);

export const formatFloat = (value: number) => value.toFixed(6);

export const formatPercent = (value: number) => `${value > 0 ? "-" : "+"}${Math.abs(value)}%`;
