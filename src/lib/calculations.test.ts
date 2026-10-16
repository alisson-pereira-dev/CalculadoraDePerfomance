import { describe, expect, it } from 'vitest'
import {
  breakEvenCpl,
  computeFunnel,
  findBestOpportunity,
  rateImpacts,
  validateInputs,
  type Inputs,
  type Rates,
} from './calculations'

const inputs: Inputs = { investimento: 10000, cpl: 20, ticketMedio: 2500, precoConsulta: 0 }
const rates: Rates = {
  leadMql: 30,
  mqlAgendamento: 40,
  agendamentoComparecimento: 60,
  comparecimentoVenda: 20,
}

describe('computeFunnel', () => {
  it('encadeia as etapas e calcula as métricas de topo', () => {
    const r = computeFunnel(inputs, rates)
    expect(r.counts[0]).toBeCloseTo(500)
    expect(r.counts[1]).toBeCloseTo(150)
    expect(r.counts[2]).toBeCloseTo(60)
    expect(r.counts[3]).toBeCloseTo(36)
    expect(r.vendas).toBeCloseTo(7.2)
    expect(r.faturamento).toBeCloseTo(18000)
    expect(r.cac).toBeCloseTo(10000 / 7.2)
    expect(r.custoPorConsulta).toBeCloseTo(10000 / 36)
    expect(r.roas).toBeCloseTo(1.8)
  })

  it('CAC é null quando não há vendas', () => {
    const r = computeFunnel(inputs, { ...rates, comparecimentoVenda: 0 })
    expect(r.cac).toBeNull()
    expect(computeFunnel(inputs, { ...rates, agendamentoComparecimento: 0 }).custoPorConsulta).toBeNull()
    expect(r.roas).toBe(0)
  })
})

describe('validateInputs', () => {
  it('aceita entradas válidas', () => {
    expect(validateInputs(inputs)).toEqual({})
  })
  it('rejeita CPL zero e NaN', () => {
    expect(validateInputs({ ...inputs, cpl: 0 }).cpl).toBeDefined()
    expect(validateInputs({ ...inputs, investimento: NaN }).investimento).toBeDefined()
  })
})

describe('findBestOpportunity', () => {
  it('escolhe a taxa com maior impacto marginal', () => {
    const best = findBestOpportunity(inputs, rates)
    // 20% → 30% é +50% relativo, o maior salto entre as quatro taxas
    expect(best?.key).toBe('comparecimentoVenda')
    expect(best?.newFaturamento).toBeCloseTo(27000)
    expect(best?.newRoas).toBeCloseTo(2.7)
  })

  it('limita o aumento a 100% e retorna null quando tudo está no teto', () => {
    const capped = findBestOpportunity(inputs, {
      leadMql: 100,
      mqlAgendamento: 100,
      agendamentoComparecimento: 100,
      comparecimentoVenda: 95,
    })
    expect(capped?.appliedPp).toBe(5)
    const maxed = findBestOpportunity(inputs, {
      leadMql: 100,
      mqlAgendamento: 100,
      agendamentoComparecimento: 100,
      comparecimentoVenda: 100,
    })
    expect(maxed).toBeNull()
  })
})

describe('rateImpacts', () => {
  it('retorna as 4 taxas ordenadas da maior para a menor alavanca', () => {
    const impacts = rateImpacts(inputs, rates)
    expect(impacts).toHaveLength(4)
    expect(impacts[0].key).toBe('comparecimentoVenda')
    for (let i = 1; i < impacts.length; i++) {
      expect(impacts[i - 1].gainFaturamento).toBeGreaterThanOrEqual(impacts[i].gainFaturamento)
    }
  })

  it('taxa no teto tem ganho zero', () => {
    const impacts = rateImpacts(inputs, { ...rates, leadMql: 100 })
    expect(impacts.find((o) => o.key === 'leadMql')?.gainFaturamento).toBe(0)
  })
})

describe('breakEvenCpl', () => {
  it('é o CPL em que o ROAS vale 1x', () => {
    const be = breakEvenCpl(inputs, rates)
    expect(be).toBeCloseTo(36) // 0,3 × 0,4 × 0,6 × 0,2 × 2500
    expect(computeFunnel({ ...inputs, cpl: be }, rates).roas).toBeCloseTo(1)
  })
})

describe('preço da consulta', () => {
  const withPrice: Inputs = { ...inputs, precoConsulta: 100 }

  it('soma comparecimentos × preço ao faturamento', () => {
    const r = computeFunnel(withPrice, rates)
    expect(r.receitaConsultas).toBeCloseTo(3600) // 36 comparecimentos × R$ 100
    expect(r.faturamento).toBeCloseTo(18000 + 3600)
    expect(r.roas).toBeCloseTo(2.16)
  })

  it('com preço 0 nada muda', () => {
    const r = computeFunnel(inputs, rates)
    expect(r.receitaConsultas).toBe(0)
    expect(r.faturamento).toBeCloseTo(18000)
  })

  it('o CPL de equilíbrio considera a receita das consultas', () => {
    const be = breakEvenCpl(withPrice, rates)
    expect(be).toBeCloseTo(36 + 0.3 * 0.4 * 0.6 * 100) // 36 + 7,2
    expect(computeFunnel({ ...withPrice, cpl: be }, rates).roas).toBeCloseTo(1)
  })

  it('valida preço negativo ou inválido; 0 é aceito', () => {
    expect(validateInputs({ ...inputs, precoConsulta: -1 }).precoConsulta).toBeDefined()
    expect(validateInputs({ ...inputs, precoConsulta: NaN }).precoConsulta).toBeDefined()
    expect(validateInputs({ ...inputs, precoConsulta: 0 })).toEqual({})
  })
})
