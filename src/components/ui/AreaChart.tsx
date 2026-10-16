import { useId, useMemo, useState, type PointerEvent } from 'react'

export interface ChartPoint {
  /** Valor do eixo X (posiciona o ponto e aparece no tooltip). Em ordem crescente. */
  x: number
  y: number
}

export interface ChartReference {
  y: number
  label: string
}

interface Props {
  points: ChartPoint[]
  /** Índice do ponto "atual", sempre marcado. */
  currentIndex: number
  formatX: (x: number) => string
  formatY: (y: number) => string
  /** Rótulos das extremidades do eixo X, desenhados dentro da faixa. */
  axisLabels: [string, string]
  /** Linha horizontal tracejada (ex.: ponto de equilíbrio). */
  reference?: ChartReference
  label: string
}

const W = 300
const H = 70
/** Faixa inferior reservada para os rótulos do eixo. */
const AXIS_H = 15
const PLOT_H = H - AXIS_H
const PAD_TOP = 0.2
const PAD_BOTTOM = 0.1

/** Catmull-Rom → Bézier: curva suave passando por todos os pontos. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

/**
 * Faixa de gráfico de área com degradê, pensada para sangrar até as bordas do card
 * (o pai aplica margens negativas). Ponto atual marcado e, no hover, linha tracejada
 * vertical com tooltip. Sem dependências externas.
 */
export function AreaChart({
  points,
  currentIndex,
  formatX,
  formatY,
  axisLabels,
  reference,
  label,
}: Props) {
  const gradId = `area-${useId().replace(/:/g, '')}`
  const [hover, setHover] = useState<number | null>(null)

  const { line, area, coords, refY } = useMemo(() => {
    const x0 = points[0].x
    const span = points[points.length - 1].x - x0 || 1
    const ys = points.map((p) => p.y)
    if (reference) ys.push(reference.y)
    const min = Math.min(...ys)
    const max = Math.max(...ys)
    const range = max - min || Math.abs(max) || 1
    const lo = min - range * PAD_BOTTOM
    const hi = max + range * PAD_TOP
    const toY = (y: number) => PLOT_H - ((y - lo) / (hi - lo)) * PLOT_H
    const c = points.map((p): [number, number] => [((p.x - x0) / span) * W, toY(p.y)])
    const l = smoothPath(c)
    return {
      line: l,
      area: `${l} L${W},${H} L0,${H} Z`,
      coords: c,
      refY: reference ? toY(reference.y) : null,
    }
  }, [points, reference])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * W
    let best = 0
    for (let i = 1; i < coords.length; i++) {
      if (Math.abs(coords[i][0] - t) < Math.abs(coords[best][0] - t)) best = i
    }
    setHover(best)
  }

  const active = hover ?? currentIndex
  const [ax, ay] = coords[active]
  const [cx, cy] = coords[currentIndex]
  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  return (
    <div
      className="relative touch-pan-y"
      style={{ height: H }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={label}
    >
      {/* Área recortada nos cantos do card; ponto e tooltip ficam fora do recorte. */}
      <div className="absolute inset-0 overflow-hidden rounded-b-2xl">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ms-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--ms-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          {refY !== null && (
            <line
              x1={0}
              x2={W}
              y1={refY}
              y2={refY}
              stroke="var(--warning)"
              strokeWidth="1.25"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={line}
            fill="none"
            stroke="var(--ms-600)"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {hover !== null && (
            <line
              x1={ax}
              x2={ax}
              y1={0}
              y2={H}
              stroke="var(--text-2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-x-5 bottom-1 flex justify-between text-[10px] text-muted">
          <span>{axisLabels[0]}</span>
          <span>{axisLabels[1]}</span>
        </div>
      </div>

      {reference && refY !== null && (
        <span
          className="pointer-events-none absolute left-5 rounded bg-surface/85 px-1 text-[10px] font-medium whitespace-nowrap"
          style={{ top: `calc(${pct(refY, H)} - 15px)`, color: 'var(--warning)' }}
        >
          {reference.label}
        </span>
      )}

      {/* Ponto atual (sempre visível) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ms-600"
        style={{ left: pct(cx, W), top: pct(cy, H) }}
      />

      {hover !== null && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ms-700 shadow"
            style={{ left: pct(ax, W), top: pct(ay, H) }}
          />
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center whitespace-nowrap shadow-card"
            style={{
              left: `${Math.min(78, Math.max(22, (ax / W) * 100))}%`,
              top: `calc(${pct(ay, H)} - 10px)`,
            }}
          >
            <p className="font-display text-[13px] leading-4 font-semibold">
              {formatY(points[active].y)}
            </p>
            <p className="text-[10.5px] leading-4 text-text-2">
              {formatX(points[active].x)}
              {active === currentIndex && ' · atual'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
