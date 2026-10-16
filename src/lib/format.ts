const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const one = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const two = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatBRL = (v: number) => brl.format(v)
/** R$ 20 ou R$ 12,50 — sem casas decimais só quando o valor é inteiro. */
export const formatBRLFlex = (v: number) => (Number.isInteger(v) ? brl0.format(v) : brl.format(v))
export const formatBRLCompact = (v: number) => brl0.format(v)
export const formatRoas = (v: number) => `${two.format(v)}x`
export const formatPercent = (v: number) => `${one.format(v)}%`

/** Contagens: inteiro a partir de 10; uma casa decimal abaixo disso (ex.: 7,2 vendas). */
export const formatCount = (v: number) => (v >= 10 ? int.format(v) : one.format(v))
