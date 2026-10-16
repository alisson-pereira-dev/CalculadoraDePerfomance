import { create } from 'zustand'
import {
  computeFunnel,
  validateInputs,
  type FunnelResult,
  type InputErrors,
  type Inputs,
  type RateKey,
  type Rates,
} from '../lib/calculations'

export type Theme = 'light' | 'dark'

export type KpiId = 'faturamento' | 'cac' | 'consulta' | 'roas'
export const DEFAULT_KPI_ORDER: KpiId[] = ['faturamento', 'cac', 'consulta', 'roas']
const KPI_ORDER_KEY = 'ms-kpi-order'

/** Ordem salva no navegador; qualquer valor que não seja uma permutação válida é ignorado. */
function readKpiOrder(): KpiId[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KPI_ORDER_KEY) ?? 'null')
    if (
      Array.isArray(raw) &&
      raw.length === DEFAULT_KPI_ORDER.length &&
      DEFAULT_KPI_ORDER.every((id) => raw.includes(id))
    ) {
      return raw as KpiId[]
    }
  } catch {
    /* storage indisponível ou JSON inválido: usa a ordem padrão */
  }
  return [...DEFAULT_KPI_ORDER]
}

const DEFAULT_INPUTS: Inputs = { investimento: 10000, cpl: 20, ticketMedio: 2500, precoConsulta: 0 }
const DEFAULT_RATES: Rates = {
  leadMql: 50,
  mqlAgendamento: 44,
  agendamentoComparecimento: 40,
  comparecimentoVenda: 24,
}

/** Cenário otimizado parte das taxas atuais + este bônus (p.p.), limitado a 100. */
const OPTIMIZED_START_BONUS_PP = 5

interface FunnelState {
  inputs: Inputs
  rates: Rates
  errors: InputErrors
  /** Último resultado válido — o funil nunca recebe NaN/Infinity. */
  result: FunnelResult

  compareOpen: boolean
  optimizedRates: Rates

  theme: Theme

  kpiOrder: KpiId[]
  setKpiOrder: (order: KpiId[]) => void
  resetKpiOrder: () => void

  setInput: (key: keyof Inputs, value: number) => void
  setRate: (key: RateKey, value: number) => void
  setOptimizedRate: (key: RateKey, value: number) => void
  openCompare: () => void
  closeCompare: () => void
  toggleTheme: () => void
}

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export const useFunnelStore = create<FunnelState>((set, get) => ({
  inputs: DEFAULT_INPUTS,
  rates: DEFAULT_RATES,
  errors: {},
  result: computeFunnel(DEFAULT_INPUTS, DEFAULT_RATES),

  compareOpen: false,
  optimizedRates: DEFAULT_RATES,

  theme: typeof document === 'undefined' ? 'light' : readTheme(),

  kpiOrder: readKpiOrder(),
  setKpiOrder: (order) => {
    try {
      localStorage.setItem(KPI_ORDER_KEY, JSON.stringify(order))
    } catch {
      /* a ordem só não persiste */
    }
    set({ kpiOrder: order })
  },
  resetKpiOrder: () => get().setKpiOrder([...DEFAULT_KPI_ORDER]),

  setInput: (key, value) => {
    const inputs = { ...get().inputs, [key]: value }
    const errors = validateInputs(inputs)
    const valid = Object.keys(errors).length === 0
    set({
      inputs,
      errors,
      // inválido → congela no último estado válido
      result: valid ? computeFunnel(inputs, get().rates) : get().result,
    })
  },

  setRate: (key, value) => {
    const rates = { ...get().rates, [key]: value }
    const { inputs, errors } = get()
    const valid = Object.keys(errors).length === 0
    set({
      rates,
      result: computeFunnel(valid ? inputs : get().result.inputs, rates),
    })
  },

  setOptimizedRate: (key, value) =>
    set({ optimizedRates: { ...get().optimizedRates, [key]: value } }),

  openCompare: () => {
    const { rates } = get()
    const optimizedRates = Object.fromEntries(
      Object.entries(rates).map(([k, v]) => [k, Math.min(100, v + OPTIMIZED_START_BONUS_PP)]),
    ) as Rates
    set({ compareOpen: true, optimizedRates })
  },

  closeCompare: () => set({ compareOpen: false }),

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('ms-theme', theme)
    } catch {
      /* storage indisponível: o tema só não persiste */
    }
    set({ theme })
  },
}))
