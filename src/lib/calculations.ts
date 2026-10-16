/**
 * Fórmulas puras do funil — sem efeitos colaterais, consumidas pelo painel de
 * KPIs e pela cena 3D. Taxas são percentuais (0–100).
 */

export type RateKey =
  | 'leadMql'
  | 'mqlAgendamento'
  | 'agendamentoComparecimento'
  | 'comparecimentoVenda'

export const RATE_KEYS: RateKey[] = [
  'leadMql',
  'mqlAgendamento',
  'agendamentoComparecimento',
  'comparecimentoVenda',
]

export const RATE_LABELS: Record<RateKey, string> = {
  leadMql: 'Lead → MQL',
  mqlAgendamento: 'MQL → Agendamento',
  agendamentoComparecimento: 'Agendamento → Comparecimento',
  comparecimentoVenda: 'Comparecimento → Venda',
}

export const STAGE_NAMES = ['Leads', 'MQLs', 'Agendamentos', 'Comparecimentos', 'Vendas'] as const

export type Rates = Record<RateKey, number>

/** O que o funil destaca: contagens absolutas ou % de conversão vindo da etapa anterior. */
export type FunnelMode = 'quantidade' | 'conversao'

export interface Inputs {
  investimento: number
  cpl: number
  ticketMedio: number
  /** Valor cobrado por consulta realizada (comparecimento). Opcional: 0 = não cobra. */
  precoConsulta: number
}

export type Counts = [number, number, number, number, number]

export interface FunnelResult {
  inputs: Inputs
  rates: Rates
  /** Contagem por etapa: Leads, MQLs, Agendamentos, Comparecimentos, Vendas. */
  counts: Counts
  leads: number
  vendas: number
  /** Vendas × ticket + comparecimentos × preço da consulta. */
  faturamento: number
  /** Parte do faturamento vinda das consultas (comparecimentos × preço). */
  receitaConsultas: number
  /** `null` quando não há vendas (divisão por zero). */
  cac: number | null
  /** Investimento ÷ comparecimentos. `null` quando ninguém compareceu. */
  custoPorConsulta: number | null
  roas: number
}

export type InputErrors = Partial<Record<keyof Inputs, string>>

export function validateInputs(inputs: Inputs): InputErrors {
  const errors: InputErrors = {}
  if (!Number.isFinite(inputs.investimento) || inputs.investimento <= 0)
    errors.investimento = 'Informe um investimento maior que zero.'
  if (!Number.isFinite(inputs.cpl) || inputs.cpl <= 0) errors.cpl = 'O CPL deve ser maior que zero.'
  if (!Number.isFinite(inputs.ticketMedio) || inputs.ticketMedio <= 0)
    errors.ticketMedio = 'Informe um ticket médio maior que zero.'
  if (!Number.isFinite(inputs.precoConsulta) || inputs.precoConsulta < 0)
    errors.precoConsulta = 'O preço da consulta não pode ser negativo.'
  return errors
}

export function computeFunnel(inputs: Inputs, rates: Rates): FunnelResult {
  const leads = inputs.investimento / inputs.cpl
  const mqls = leads * (rates.leadMql / 100)
  const agendamentos = mqls * (rates.mqlAgendamento / 100)
  const comparecimentos = agendamentos * (rates.agendamentoComparecimento / 100)
  const vendas = comparecimentos * (rates.comparecimentoVenda / 100)
  const receitaConsultas = comparecimentos * inputs.precoConsulta
  const faturamento = vendas * inputs.ticketMedio + receitaConsultas

  return {
    inputs,
    rates,
    counts: [leads, mqls, agendamentos, comparecimentos, vendas],
    leads,
    vendas,
    faturamento,
    receitaConsultas,
    cac: vendas > 0 ? inputs.investimento / vendas : null,
    custoPorConsulta: comparecimentos > 0 ? inputs.investimento / comparecimentos : null,
    roas: inputs.investimento > 0 ? faturamento / inputs.investimento : 0,
  }
}

export interface Opportunity {
  key: RateKey
  /** Aumento aplicado, em pontos percentuais (< 10 se a taxa bater em 100%). */
  appliedPp: number
  gainFaturamento: number
  newFaturamento: number
  newRoas: number
}

export const OPPORTUNITY_STEP_PP = 10

/**
 * Para cada taxa, simula +10 p.p. isolado e recalcula a cadeia inteira.
 * Retorna as 4, da maior para a menor alavanca (empate mantém a ordem do funil).
 */
export function rateImpacts(inputs: Inputs, rates: Rates): Opportunity[] {
  const base = computeFunnel(inputs, rates)
  return RATE_KEYS.map((key) => {
    const next = Math.min(100, rates[key] + OPPORTUNITY_STEP_PP)
    const sim = computeFunnel(inputs, { ...rates, [key]: next })
    return {
      key,
      appliedPp: next - rates[key],
      gainFaturamento: sim.faturamento - base.faturamento,
      newFaturamento: sim.faturamento,
      newRoas: sim.roas,
    }
  }).sort((a, b) => b.gainFaturamento - a.gainFaturamento)
}

/** A maior alavanca, ou `null` se nenhuma taxa pode subir. */
export function findBestOpportunity(inputs: Inputs, rates: Rates): Opportunity | null {
  return rateImpacts(inputs, rates).find((o) => o.gainFaturamento > 0) ?? null
}

/**
 * CPL de equilíbrio: o CPL máximo em que o ROAS ainda é 1x.
 * ROAS = (conversão total × ticket + conversão até a consulta × preço da consulta) ÷ CPL,
 * logo ROAS = 1 quando CPL = esse numerador.
 */
export function breakEvenCpl(inputs: Inputs, rates: Rates): number {
  const upToConsulta =
    (rates.leadMql / 100) * (rates.mqlAgendamento / 100) * (rates.agendamentoComparecimento / 100)
  const total = upToConsulta * (rates.comparecimentoVenda / 100)
  return total * inputs.ticketMedio + upToConsulta * inputs.precoConsulta
}
