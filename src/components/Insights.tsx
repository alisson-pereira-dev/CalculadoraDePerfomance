import type { ReactNode } from 'react'
import { formatBRL, formatBRLFlex, formatCount, formatRoas } from '../lib/format'
import { useFunnelStore } from '../store/useFunnelStore'
import { BarsIcon, BulbIcon, TargetIcon, TrendIcon, UserIcon } from './ui/Icons'

function Item({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-1 py-3 lg:border-l lg:border-line lg:px-5 lg:py-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text">
        {icon}
      </span>
      <p className="text-[13px] leading-snug text-text-2 [&>b]:font-semibold [&>b]:text-fg">
        {children}
      </p>
    </div>
  )
}

/** Resumo em linguagem natural do cenário atual. */
export function Insights() {
  const r = useFunnelStore((s) => s.result)
  const positive = r.roas >= 1

  return (
    <section className="grid h-full gap-2 rounded-xl border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)] lg:items-center lg:gap-0">
      <div className="flex items-center gap-3 pr-4 sm:col-span-2 lg:col-span-1">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text">
          <BulbIcon width={24} height={24} />
        </span>
        <div>
          <h2 className="font-display text-lg leading-6 font-semibold">Insights do Cenário</h2>
          <p className="text-xs leading-snug text-text-2">
            Com base nas suas configurações, aqui está o resumo do cenário:
          </p>
        </div>
      </div>

      <Item icon={<TargetIcon width={20} height={20} />}>
        Cada <b>{formatBRLFlex(r.inputs.cpl)}</b> em mídia gera 1 lead.
      </Item>
      <Item icon={<UserIcon width={20} height={20} />}>
        Ao final, <b>{formatCount(r.vendas)} vendas</b> com ticket médio de{' '}
        {formatBRLFlex(r.inputs.ticketMedio)}.
      </Item>
      <Item icon={<BarsIcon width={20} height={20} />}>
        O faturamento estimado é de <b>{formatBRL(r.faturamento)}</b>.
        {r.receitaConsultas > 0 && <> Inclui {formatBRL(r.receitaConsultas)} de consultas.</>}
      </Item>
      <Item icon={<TrendIcon width={20} height={20} />}>
        {positive ? (
          <>
            O ROAS de <b>{formatRoas(r.roas)}</b> mostra um cenário positivo para o seu
            investimento.
          </>
        ) : (
          <>
            O ROAS de <b>{formatRoas(r.roas)}</b> está abaixo do break-even: o investimento ainda
            não se paga.
          </>
        )}
      </Item>
    </section>
  )
}
