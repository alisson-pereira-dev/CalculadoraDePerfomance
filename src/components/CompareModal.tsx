import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { computeFunnel, RATE_KEYS, RATE_LABELS } from '../lib/calculations'
import { formatBRL, formatCount, formatPercent, formatRoas } from '../lib/format'
import { useFunnelStore } from '../store/useFunnelStore'
import { CloseIcon } from './ui/Icons'
import { RateSlider } from './ui/RateSlider'

interface Row {
  label: string
  current: string
  optimized: string
  /** Variação relativa em %; `null` quando não se aplica. */
  delta: number | null
  /** Em CAC, menor é melhor. */
  lowerIsBetter?: boolean
}

const relDelta = (from: number, to: number) =>
  from === 0 ? (to === 0 ? 0 : null) : ((to - from) / from) * 100

export function CompareModal() {
  const open = useFunnelStore((s) => s.compareOpen)
  const close = useFunnelStore((s) => s.closeCompare)
  const result = useFunnelStore((s) => s.result)
  const optimizedRates = useFunnelStore((s) => s.optimizedRates)
  const setOptimizedRate = useFunnelStore((s) => s.setOptimizedRate)
  const dialogRef = useRef<HTMLDivElement>(null)

  const optimized = useMemo(
    () => computeFunnel(result.inputs, optimizedRates),
    [result.inputs, optimizedRates],
  )

  // Fundo da página fica inerte (sem foco/clique) enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return
    const app = document.getElementById('app-root')
    app?.setAttribute('inert', '')
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => {
      app?.removeAttribute('inert')
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, close])

  const rows: Row[] = [
    {
      label: 'Vendas',
      current: formatCount(result.vendas),
      optimized: formatCount(optimized.vendas),
      delta: relDelta(result.vendas, optimized.vendas),
    },
    {
      label: 'Faturamento',
      current: formatBRL(result.faturamento),
      optimized: formatBRL(optimized.faturamento),
      delta: relDelta(result.faturamento, optimized.faturamento),
    },
    {
      label: 'CAC',
      current: result.cac === null ? '—' : formatBRL(result.cac),
      optimized: optimized.cac === null ? '—' : formatBRL(optimized.cac),
      delta:
        result.cac === null || optimized.cac === null ? null : relDelta(result.cac, optimized.cac),
      lowerIsBetter: true,
    },
    {
      label: 'Custo por Consulta',
      current: result.custoPorConsulta === null ? '—' : formatBRL(result.custoPorConsulta),
      optimized: optimized.custoPorConsulta === null ? '—' : formatBRL(optimized.custoPorConsulta),
      delta:
        result.custoPorConsulta === null || optimized.custoPorConsulta === null
          ? null
          : relDelta(result.custoPorConsulta, optimized.custoPorConsulta),
      lowerIsBetter: true,
    },
    {
      label: 'ROAS',
      current: formatRoas(result.roas),
      optimized: formatRoas(optimized.roas),
      delta: relDelta(result.roas, optimized.roas),
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            aria-hidden="true"
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={close}
          />
          {/* No desktop o diálogo fica à direita, acima do funil (z-60), que segue visível com o wireframe. */}
          <motion.div
            key="dialog"
            className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4 lg:justify-items-end lg:pr-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-title"
              tabIndex={-1}
              className="pointer-events-auto w-full max-w-[520px] rounded-[20px] border border-line bg-surface p-6 shadow-modal outline-none"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="compare-title" className="font-display text-xl font-bold">
                    Comparar Cenários
                  </h2>
                  <p className="mt-1 text-sm text-text-2">
                    Ajuste as taxas do cenário otimizado. O funil 3D mostra a diferença em
                    wireframe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fechar"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2"
                >
                  <CloseIcon />
                </button>
              </div>

              <p className="caption mb-4">Cenário Otimizado</p>
              <div className="flex flex-col gap-5">
                {RATE_KEYS.map((key) => (
                  <RateSlider
                    key={key}
                    label={RATE_LABELS[key]}
                    value={optimizedRates[key]}
                    onChange={(v) => setOptimizedRate(key, v)}
                  />
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-line">
                <div className="caption grid grid-cols-[1fr_1fr_1fr] gap-3 bg-surface-2 px-4 py-2.5">
                  <span>Métrica</span>
                  <span className="text-right">Atual</span>
                  <span className="text-right text-brand-text">Otimizado</span>
                </div>
                {rows.map((row) => {
                  const good =
                    row.delta === null ? null : row.lowerIsBetter ? row.delta < 0 : row.delta > 0
                  const neutral = row.delta === null || Math.abs(row.delta) < 0.05
                  return (
                    <div
                      key={row.label}
                      className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-t border-line px-4 py-3 text-sm"
                    >
                      <span className="text-text-2">{row.label}</span>
                      <span className="text-right font-medium">{row.current}</span>
                      <span className="text-right">
                        <span className="font-display font-semibold">{row.optimized}</span>
                        {!neutral && row.delta !== null && (
                          <span
                            className="block text-xs font-medium"
                            style={{ color: good ? 'var(--success)' : 'var(--error)' }}
                          >
                            {row.delta > 0 ? '+' : '−'}
                            {formatPercent(Math.abs(row.delta))}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
