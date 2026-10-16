import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { computeFunnel, type FunnelMode } from '../lib/calculations'
import { formatBRL } from '../lib/format'
import { hasWebGL, usePrefersReducedMotion, useViewport } from '../hooks/useEnvironment'
import { useFunnelStore } from '../store/useFunnelStore'
import { Funnel2D } from './funnel-2d/Funnel2D'
import { BarsIcon, TargetIcon } from './ui/Icons'
import { LogoBars } from './ui/LogoBars'

// three.js só é baixado quando o canvas 3D realmente vai ser usado.
const FunnelCanvas = lazy(() => import('./funnel-3d/FunnelCanvas'))

class Boundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Funil 3D indisponível, usando versão 2D.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const CANVAS_HEIGHT = { mobile: 330, tablet: 420, desktop: 540 } as const

const MODES: { id: FunnelMode; label: string }[] = [
  { id: 'quantidade', label: 'Quantidade' },
  { id: 'conversao', label: 'Conversão %' },
]

export function FunnelCard() {
  const result = useFunnelStore((s) => s.result)
  const compareOpen = useFunnelStore((s) => s.compareOpen)
  const optimizedRates = useFunnelStore((s) => s.optimizedRates)
  const viewport = useViewport()
  const reducedMotion = usePrefersReducedMotion()
  const [mode, setMode] = useState<FunnelMode>('quantidade')

  const optimized = useMemo(
    () => (compareOpen ? computeFunnel(result.inputs, optimizedRates) : null),
    [compareOpen, result.inputs, optimizedRates],
  )

  const use3D = !reducedMotion && hasWebGL()
  const flat = <Funnel2D result={result} optimized={optimized} mode={mode} />

  return (
    <section
      // Com o modal aberto no desktop, o funil sobe acima do backdrop para o wireframe ficar visível.
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card ${
        compareOpen && viewport === 'desktop' ? 'relative z-[60]' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-brand-text">
            <BarsIcon width={24} height={24} />
          </span>
          <div>
            <h2 className="font-display text-xl leading-7 font-semibold">Visualização do Funil</h2>
            <p className="text-[13px] text-text-2">
              Veja como o seu investimento se transforma em resultados.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Modo de exibição do funil"
          className="flex rounded-full bg-surface-2 p-1"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                mode === m.id ? 'bg-ms text-white shadow-sm' : 'text-text-2 hover:text-fg'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* A versão 2D tem altura natural; o canvas 3D ocupa o espaço disponível (mínimo fixo). */}
      <div
        style={use3D ? { minHeight: CANVAS_HEIGHT[viewport] } : undefined}
        className="relative grow"
      >
        {use3D ? (
          <Boundary fallback={flat}>
            <div className="absolute inset-0">
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center">
                    <LogoBars scale={1.2} animated />
                  </div>
                }
              >
                <FunnelCanvas
                  result={result}
                  optimized={optimized}
                  mode={mode}
                  interactive={viewport !== 'mobile'}
                  compact={viewport === 'mobile'}
                />
              </Suspense>
            </div>
          </Boundary>
        ) : (
          flat
        )}
      </div>

      <div className="m-5 mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-brand-soft px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ms/15 text-brand-text">
            <TargetIcon width={24} height={24} />
          </span>
          <div>
            <p className="caption font-semibold" style={{ color: 'var(--text)' }}>
              Previsão de Faturamento
            </p>
            <p className="text-xs text-text-2">
              {result.inputs.precoConsulta > 0
                ? 'Vendas × Ticket + Consultas × Preço'
                : 'Vendas × Ticket Médio'}
            </p>
          </div>
        </div>
        <p className="font-display text-2xl font-bold tracking-tight text-brand-text sm:text-[28px]">
          {formatBRL(result.faturamento)}
        </p>
      </div>
    </section>
  )
}
