import { useId, type MutableRefObject } from 'react'
import { formatPercent } from '../../lib/format'

/** Elementos que a cena reposiciona a cada frame (a câmera pode orbitar). */
export interface OverlayHandles {
  paths: (SVGPathElement | null)[]
  dots: (SVGCircleElement | null)[]
  chips: (HTMLDivElement | null)[]
}

export const createOverlayHandles = (): OverlayHandles => ({ paths: [], dots: [], chips: [] })

interface Props {
  handles: MutableRefObject<OverlayHandles>
  /** Taxa de conversão (0–100) de cada transição: Leads→MQLs … Comparecimentos→Vendas. */
  rates: number[]
  compact: boolean
}

/**
 * Lado esquerdo do funil: para cada transição, uma seta que sai da etapa de cima e aponta
 * para a de baixo, com a taxa de conversão em destaque no meio. Só renderiza o DOM; as
 * posições vêm de `MainFunnel` (projeção da cena 3D → pixels), via `handles`.
 */
export function ConversionOverlay({ handles, rates, compact }: Props) {
  const markerId = `arrow-${useId().replace(/:/g, '')}`

  return (
    <div aria-hidden="true" className="conv-overlay pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M1 1.5 L9 5 L1 8.5 Z" fill="var(--ms-primary)" />
          </marker>
        </defs>
        {rates.map((_, i) => (
          <g key={i}>
            <path
              ref={(el) => {
                handles.current.paths[i] = el
              }}
              d=""
              fill="none"
              stroke="var(--ms-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={`url(#${markerId})`}
            />
            <circle
              ref={(el) => {
                handles.current.dots[i] = el
              }}
              r="3.5"
              fill="var(--ms-primary)"
            />
          </g>
        ))}
      </svg>

      {rates.map((rate, i) => (
        <div
          key={i}
          ref={(el) => {
            handles.current.chips[i] = el
          }}
          title={`Conversão: ${formatPercent(rate)}`}
          className={`conv-chip${compact ? ' compact' : ''}`}
        >
          <strong>{formatPercent(rate)}</strong>
        </div>
      ))}
    </div>
  )
}
