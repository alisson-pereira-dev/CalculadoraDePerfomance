import type { ReactNode } from 'react'
import { ArrowIcon } from './Icons'

interface Props {
  icon: ReactNode
  label: string
  badge?: string
  value: string
  footer: ReactNode
  /** Faixa de gráfico no rodapé; sangra até as bordas do card. */
  chart?: ReactNode
  /** Alça de arrastar (reordenação), exibida no canto do cabeçalho. */
  dragHandle?: ReactNode
  loading?: boolean
  /** `success` pinta o ícone de verde (indicadores de resultado positivo). */
  tone?: 'brand' | 'success'
}

export function KpiCard({
  icon,
  label,
  badge,
  value,
  footer,
  chart,
  dragHandle,
  loading,
  tone = 'brand',
}: Props) {
  return (
    <section
      aria-busy={loading}
      className={`flex flex-col justify-between gap-2 rounded-2xl border border-line bg-surface px-5 pt-4 shadow-card ${
        chart ? 'pb-0' : 'pb-4'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={
              tone === 'success'
                ? {
                    color: 'var(--success)',
                    background: 'color-mix(in srgb, var(--success) 14%, transparent)',
                  }
                : { color: 'var(--brand-text)', background: 'var(--brand-soft)' }
            }
          >
            {icon}
          </span>
          <span className="caption font-semibold" style={{ color: 'var(--text)' }}>
            {label}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          {badge && (
            <span className="rounded-full bg-surface-2 px-2 py-1 text-[10.5px] font-medium whitespace-nowrap text-text-2">
              {badge}
            </span>
          )}
          {dragHandle}
        </div>
      </div>

      {loading ? (
        <>
          <div className="skeleton h-9 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          {chart && <div className="skeleton -mx-5 h-[70px] !rounded-none !rounded-b-2xl" />}
        </>
      ) : (
        <>
          <p className="font-display text-[32px] leading-9 font-bold tracking-tight">{value}</p>
          <div className="text-[13px] text-text-2">{footer}</div>
          {chart && <div className="-mx-5 mt-1">{chart}</div>}
        </>
      )}
    </section>
  )
}

export function DeltaChip({ value, text }: { value: number; text: string }) {
  const positive = value >= 0
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color: positive ? 'var(--success)' : 'var(--error)',
        background: `color-mix(in srgb, ${positive ? 'var(--success)' : 'var(--error)'} 14%, transparent)`,
      }}
    >
      <ArrowIcon down={!positive} />
      {text}
    </span>
  )
}
