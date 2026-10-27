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
    // 36 comparecimentos × 20% = 7,2 → trunca para 7 (não existe "venda parcial")
    expect(r.counts).toEqual([500, 150, 60, 36, 7])
    expect(r.vendas).toBe(7)
    expect(r.faturamento).toBeCloseTo(17500) // 7 × 2500
    expect(r.cac).toBeCloseTo(10000 / 7)
    expect(r.custoPorConsulta).toBeCloseTo(10000 / 36)
    expect(r.roas).toBeCloseTo(1.75)
  })

  it('CAC é null quando não há vendas', () => {
    const r = computeFunnel(inputs, { ...rates, comparecimentoVenda: 0 })
    expect(r.cac).toBeNull()
    expect(computeFunnel(inputs, { ...rates, agendamentoComparecimento: 0 }).custoPorConsulta).toBeNull()
    expect(r.roas).toBe(0)
  })
})

describe('contagens inteiras (sem números picados)', () => {
  // Mesmo cenário do bug relatado: 19 leads, taxas 50/44/40/24 — gerava "9,4 MQLs",
  // "1,7 comparecimentos", "0,4 vendas". Cada etapa deve truncar para um inteiro.
  const funnelInputs: Inputs = { investimento: 950, cpl: 50, ticketMedio: 2500, precoConsulta: 0 }
  const funnelRates: Rates = {
    leadMql: 50,
    mqlAgendamento: 44,
    agendamentoComparecimento: 40,
    comparecimentoVenda: 24,
  }

  it('cada etapa trunca para um inteiro, independentemente das taxas', () => {
    const r = computeFunnel(funnelInputs, funnelRates)
    // 19 → 9,5 → 3,96 → 1,2 → 0,24, truncados: 19, 9, 3, 1, 0
    expect(r.counts).toEqual([19, 9, 3, 1, 0])
    r.counts.forEach((c) => expect(Number.isInteger(c)).toBe(true))
  })

  it('sem pelo menos 1 venda completa, o faturamento não conta', () => {
    const r = computeFunnel(funnelInputs, funnelRates)
    expect(r.vendas).toBe(0)
    expect(r.faturamento).toBe(0)
    expect(r.roas).toBe(0)
  })

  it('com 1+ venda, o faturamento é proporcional ao número de vendas', () => {
    // Investimento maior garante ao menos 1 venda completa nesse mesmo funil.
    const moreInputs: Inputs = { ...funnelInputs, investimento: funnelInputs.investimento * 4 }
    const r = computeFunnel(moreInputs, funnelRates)
    expect(r.vendas).toBeGreaterThanOrEqual(1)
    expect(r.faturamento).toBe(r.vendas * moreInputs.ticketMedio)
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
    expect(best?.newFaturamento).toBeCloseTo(25000) // 10 vendas × 2500
    expect(best?.newRoas).toBeCloseTo(2.5)
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
  it('é o CPL em que o ROAS vale 1x (fórmula algébrica)', () => {
    const be = breakEvenCpl(inputs, rates)
    expect(be).toBeCloseTo(36) // 0,3 × 0,4 × 0,6 × 0,2 × 2500
  })

  it('em alto volume, o ROAS no CPL de equilíbrio converge para 1x', () => {
    // breakEvenCpl é uma aproximação contínua; em baixo volume o truncamento de cada
    // etapa (computeFunnel) desvia o ROAS real do equilíbrio teórico. Em alto volume
    // esse desvio fica desprezível.
    const bigInputs: Inputs = { ...inputs, investimento: 10_000_000 }
    const be = breakEvenCpl(bigInputs, rates)
    expect(computeFunnel({ ...bigInputs, cpl: be }, rates).roas).toBeCloseTo(1, 2)
  })
})

describe('preço da consulta', () => {
  const withPrice: Inputs = { ...inputs, precoConsulta: 100 }

  it('soma comparecimentos × preço ao faturamento', () => {
    const r = computeFunnel(withPrice, rates)
    expect(r.receitaConsultas).toBeCloseTo(3600) // 36 comparecimentos × R$ 100
    expect(r.faturamento).toBeCloseTo(17500 + 3600) // 7 vendas × 2500 + consultas
    expect(r.roas).toBeCloseTo(2.11)
  })

  it('com preço 0 nada muda', () => {
    const r = computeFunnel(inputs, rates)
    expect(r.receitaConsultas).toBe(0)
    expect(r.faturamento).toBeCloseTo(17500)
  })

  it('sem venda, a receita de consultas também não conta', () => {
    const r = computeFunnel(withPrice, { ...rates, comparecimentoVenda: 0 })
    expect(r.vendas).toBe(0)
    expect(r.receitaConsultas).toBe(0)
    expect(r.faturamento).toBe(0)
  })

  it('o CPL de equilíbrio considera a receita das consultas', () => {
    const be = breakEvenCpl(withPrice, rates)
    expect(be).toBeCloseTo(36 + 0.3 * 0.4 * 0.6 * 100) // 36 + 7,2
    // Idem ao teste de breakEvenCpl isolado: precisa de alto volume para o ROAS
    // truncado convergir ao equilíbrio teórico.
    const bigWithPrice: Inputs = { ...withPrice, investimento: 10_000_000 }
    const bigBe = breakEvenCpl(bigWithPrice, rates)
    expect(computeFunnel({ ...bigWithPrice, cpl: bigBe }, rates).roas).toBeCloseTo(1, 2)
  })

  it('valida preço negativo ou inválido; 0 é aceito', () => {
    expect(validateInputs({ ...inputs, precoConsulta: -1 }).precoConsulta).toBeDefined()
    expect(validateInputs({ ...inputs, precoConsulta: NaN }).precoConsulta).toBeDefined()
    expect(validateInputs({ ...inputs, precoConsulta: 0 })).toEqual({})
  })
})
