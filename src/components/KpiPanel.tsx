import { Reorder, useDragControls, type DragControls } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { breakEvenCpl, computeFunnel, type FunnelResult } from '../lib/calculations'
import {
  formatBRL,
  formatBRLCompact,
  formatBRLFlex,
  formatPercent,
  formatRoas,
} from '../lib/format'
import { DEFAULT_KPI_ORDER, useFunnelStore, type KpiId } from '../store/useFunnelStore'
import { AreaChart, type ChartPoint } from './ui/AreaChart'
import { CoinIcon, DatabaseIcon, GripIcon, TrendIcon } from './ui/Icons'
import { DeltaChip, KpiCard } from './ui/KpiCard'
import { Panel } from './ui/Panel'

/** Duração do skeleton inicial (alinhado ao tempo da animação de entrada do funil). */
const SKELETON_MS = 700

/** Sensibilidade ao CPL: amostras entre `lo` e `hi` vezes o CPL atual, sempre incluindo 1× exato. */
const HALF = 12
const CPL_LO = 0.5
const CPL_HI = 1.5
/** O ROAS estica o eixo até o CPL de equilíbrio (limitado a 4× o atual). */
const MAX_STRETCH = 4

const linspace = (from: number, to: number, n: number) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1))

function sensitivity(
  result: FunnelResult,
  pick: (r: FunnelResult) => number | null,
  hi = CPL_HI,
): { points: ChartPoint[]; currentIndex: number } {
  const multipliers = [...linspace(CPL_LO, 1, HALF + 1), ...linspace(1, hi, HALF + 1).slice(1)]
  const points = multipliers.map((m) => {
    const cpl = result.inputs.cpl * m
    const r = computeFunnel({ ...result.inputs, cpl }, result.rates)
    return { x: cpl, y: pick(r) ?? 0 }
  })
  return { points, currentIndex: HALF }
}

const KPI_LABELS: Record<KpiId, string> = {
  faturamento: 'Faturamento Estimado',
  cac: 'CAC',
  consulta: 'Custo por Consulta',
  roas: 'ROAS',
}

/**
 * Alça de arrastar. Só ela inicia o drag (assim o hover dos gráficos e a seleção de texto
 * não brigam com o arrasto). Com o foco nela, ↑/↓ movem o card — acessível por teclado.
 */
function DragHandle({
  controls,
  label,
  onMove,
}: {
  controls: DragControls
  label: string
  onMove: (dir: -1 | 1) => void
}) {
  return (
    <button
      type="button"
      aria-label={`Reordenar ${label}. Arraste, ou use as setas para cima e para baixo.`}
      title="Arraste para reordenar"
      onPointerDown={(e) => controls.start(e)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          onMove(e.key === 'ArrowUp' ? -1 : 1)
          // o card é re-renderizado em outra posição; devolve o foco à alça
          const btn = e.currentTarget
          requestAnimationFrame(() => btn.focus())
        }
      }}
      className="grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
    >
      <GripIcon />
    </button>
  )
}

function SortableKpi({
  id,
  children,
}: {
  id: KpiId
  children: (controls: DragControls) => ReactNode
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      className="relative flex flex-1 flex-col [&>section]:flex-1"
      whileDrag={{ scale: 1.02, zIndex: 30, cursor: 'grabbing' }}
      transition={{ duration: 0.2 }}
    >
      {children(controls)}
    </Reorder.Item>
  )
}

export function KpiPanel({ collapsible }: { collapsible: boolean }) {
  const result = useFunnelStore((s) => s.result)
  const order = useFunnelStore((s) => s.kpiOrder)
  const setOrder = useFunnelStore((s) => s.setKpiOrder)
  const resetOrder = useFunnelStore((s) => s.resetKpiOrder)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), SKELETON_MS)
    return () => window.clearTimeout(t)
  }, [])

  const series = useMemo(() => {
    const breakEven = breakEvenCpl(result.inputs, result.rates)
    const stretch =
      breakEven > 0
        ? Math.min(MAX_STRETCH, Math.max(CPL_HI, (breakEven / result.inputs.cpl) * 1.12))
        : CPL_HI
    return {
      faturamento: sensitivity(result, (r) => r.faturamento),
      cac: sensitivity(result, (r) => r.cac),
      consulta: sensitivity(result, (r) => r.custoPorConsulta),
      roas: sensitivity(result, (r) => r.roas, stretch),
      breakEven,
      roasHi: stretch,
    }
  }, [result])

  // Retorno sobre o investimento: o mesmo que (ROAS − 1), em %.
  const returnPct = (result.roas - 1) * 100
  const invest = formatBRLCompact(result.inputs.investimento)

  const chart = (
    s: { points: ChartPoint[]; currentIndex: number },
    name: string,
    fmt: (y: number) => string,
    opts: { hi?: number; reference?: { y: number; label: string } } = {},
  ) => (
    <AreaChart
      points={s.points}
      currentIndex={s.currentIndex}
      formatX={(x) => `CPL ${formatBRLFlex(x)}`}
      formatY={fmt}
      axisLabels={['CPL −50%', `CPL +${Math.round(((opts.hi ?? CPL_HI) - 1) * 100)}%`]}
      reference={opts.reference}
      label={`${name} conforme o CPL, de −50% a +${Math.round(((opts.hi ?? CPL_HI) - 1) * 100)}% do valor atual`}
    />
  )

  /** Props de cada KPI; a alça é injetada por quem renderiza. */
  const cards: Record<KpiId, Omit<Parameters<typeof KpiCard>[0], 'dragHandle'>> = {
    faturamento: {
      icon: <TrendIcon width={22} height={22} />,
      tone: 'success',
      label: KPI_LABELS.faturamento,
      badge: 'Projeção mensal',
      value: formatBRL(result.faturamento),
      chart: chart(series.faturamento, 'Faturamento estimado', formatBRL),
      footer: (
        <span className="flex items-center gap-2">
          <DeltaChip value={returnPct} text={formatPercent(Math.abs(returnPct))} />
          sobre o investimento
        </span>
      ),
    },
    cac: {
      icon: <DatabaseIcon width={22} height={22} />,
      label: KPI_LABELS.cac,
      value: result.cac === null ? '—' : formatBRL(result.cac),
      chart: chart(series.cac, 'CAC', formatBRL),
      footer: `Investimento ${invest} ÷ Vendas`,
    },
    consulta: {
      icon: <CoinIcon width={22} height={22} />,
      label: KPI_LABELS.consulta,
      value: result.custoPorConsulta === null ? '—' : formatBRL(result.custoPorConsulta),
      chart: chart(series.consulta, 'Custo por consulta', formatBRL),
      footer:
        result.inputs.precoConsulta > 0 && result.custoPorConsulta !== null ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <DeltaChip
              value={result.inputs.precoConsulta - result.custoPorConsulta}
              text={formatBRL(Math.abs(result.inputs.precoConsulta - result.custoPorConsulta))}
            />
            {result.inputs.precoConsulta >= result.custoPorConsulta ? 'de margem' : 'de prejuízo'}{' '}
            por consulta
          </span>
        ) : (
          `Investimento ${invest} ÷ Comparecimentos`
        ),
    },
    roas: {
      icon: <TrendIcon width={22} height={22} />,
      label: KPI_LABELS.roas,
      value: formatRoas(result.roas),
      chart: chart(series.roas, 'ROAS', formatRoas, {
        hi: series.roasHi,
        reference:
          series.breakEven > 0
            ? { y: 1, label: `Equilíbrio · ${formatBRLFlex(series.breakEven)}` }
            : undefined,
      }),
      footer: (
        <span className="flex items-center gap-2">
          <DeltaChip value={result.roas - 1} text={formatRoas(Math.abs(result.roas - 1))} />
          {result.roas >= 1 ? 'acima' : 'abaixo'} do break-even
        </span>
      ),
    },
  }

  const move = (id: KpiId, dir: -1 | 1) => {
    const from = order.indexOf(id)
    const to = from + dir
    if (to < 0 || to >= order.length) return
    const next = [...order]
    next.splice(to, 0, next.splice(from, 1)[0])
    setOrder(next)
  }

  const customized = order.some((id, i) => id !== DEFAULT_KPI_ORDER[i])

  const list = (
    <div className="flex h-full flex-col gap-2">
      <Reorder.Group
        as="div"
        axis="y"
        values={order}
        onReorder={setOrder}
        className="flex flex-1 flex-col gap-4"
      >
        {order.map((id) => (
          <SortableKpi key={id} id={id}>
            {(controls) => (
              <KpiCard
                {...cards[id]}
                loading={loading}
                dragHandle={
                  <DragHandle
                    controls={controls}
                    label={KPI_LABELS[id]}
                    onMove={(dir) => move(id, dir)}
                  />
                }
              />
            )}
          </SortableKpi>
        ))}
      </Reorder.Group>
      {customized && (
        <button
          type="button"
          onClick={resetOrder}
          className="self-center text-xs text-text-2 underline-offset-2 hover:text-brand-text hover:underline"
        >
          Restaurar ordem padrão
        </button>
      )}
    </div>
  )

  // Em tablet, KPIs viram accordion; em outros breakpoints, os cards ficam soltos.
  return collapsible ? (
    <Panel title="Resultados" collapsible>
      {list}
    </Panel>
  ) : (
    list
  )
}
