import {
  RATE_KEYS,
  STAGE_NAMES,
  type FunnelMode,
  type FunnelResult,
} from '../../lib/calculations'
import { formatCount, formatPercent } from '../../lib/format'

interface Props {
  result: FunnelResult
  optimized: FunnelResult | null
  mode: FunnelMode
}

/** Largura relativa de uma etapa — mesma escala √contagem da versão 3D. */
const width = (count: number, leads: number) =>
  Math.max(10, 100 * Math.sqrt(Math.max(0, count) / leads))

/**
 * Fallback 2D (sem WebGL ou prefers-reduced-motion): blocos planos decrescentes.
 * Consome o mesmo FunnelResult da cena 3D; só a camada visual muda.
 */
export function Funnel2D({ result, optimized, mode }: Props) {
  return (
    <ol
      className="flex h-full flex-col justify-center gap-3 px-5 py-4"
      aria-label="Funil de conversão"
    >
      {STAGE_NAMES.map((name, i) => {
        const w = width(result.counts[i], result.leads)
        const ow = optimized ? width(optimized.counts[i], result.leads) : null
        const conv = i === 0 ? 100 : result.rates[RATE_KEYS[i - 1]]
        const count = formatCount(result.counts[i])
        const pct = formatPercent(conv)
        return (
          <li key={name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="caption">{name}</span>
              <span className="text-xs text-text-2">
                {mode === 'quantidade' ? `${pct} da etapa anterior` : `${count} no total`}
              </span>
            </div>
            <div className="relative flex h-11 justify-center">
              {ow !== null && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 rounded-xl border-2 border-dashed border-ms-600 transition-[width] duration-500"
                  style={{ width: `${ow}%` }}
                />
              )}
              <div
                className="flex h-full items-center justify-center rounded-xl font-display text-sm font-semibold text-[#0f172a] transition-[width] duration-500"
                style={{
                  width: `${w}%`,
                  // opacidade só no fundo, para o número manter o contraste
                  background: `color-mix(in srgb, var(--ms-primary) ${Math.round(35 + 65 * (i / (STAGE_NAMES.length - 1)))}%, transparent)`,
                }}
              >
                {mode === 'quantidade' ? count : pct}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
