import { useMemo } from 'react'
import { findBestOpportunity, RATE_LABELS } from '../lib/calculations'
import { formatBRLCompact, formatRoas } from '../lib/format'
import { useFunnelStore } from '../store/useFunnelStore'
import { ChevronRightIcon, TrendIcon } from './ui/Icons'

export function TipCard() {
  const result = useFunnelStore((s) => s.result)
  const tip = useMemo(() => findBestOpportunity(result.inputs, result.rates), [result])

  return (
    <section className="flex h-full gap-3 rounded-2xl border border-ms-200/70 bg-brand-soft p-5 shadow-card dark:border-ms/25">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ms/15 text-brand-text">
        <TrendIcon width={24} height={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-1.5 font-display text-base font-semibold">Dica de Performance</h2>
        {tip ? (
          <p className="text-[13px] leading-relaxed text-text-2 [&>strong]:text-fg">
            Sua maior alavanca é <strong>{RATE_LABELS[tip.key]}</strong>. Subir {tip.appliedPp} p.p.
            nessa taxa leva o ROAS de <strong>{formatRoas(result.roas)}</strong> para{' '}
            <strong className="!text-brand-text">{formatRoas(tip.newRoas)}</strong>, cerca de{' '}
            {formatBRLCompact(tip.gainFaturamento)} a mais em faturamento.
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-text-2">
            Nenhum ajuste isolado de taxa aumenta o faturamento agora. Para crescer, reduza o CPL
            ou aumente o investimento ou o ticket médio.
          </p>
        )}
      </div>
      <ChevronRightIcon className="shrink-0 text-brand-text" />
    </section>
  )
}
