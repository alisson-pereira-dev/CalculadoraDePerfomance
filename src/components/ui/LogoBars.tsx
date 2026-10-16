import logoBlue from '../../assets/logo-azul.png'
import iconBlue from '../../assets/icone-azul.png'
import logoWhite from '../../assets/logo-branco.png'
import iconWhite from '../../assets/icone-branco.png'

const HEIGHTS = [8, 14, 22, 32]
const OPACITIES = [0.35, 0.55, 0.78, 1]

interface Props {
  /** Escala do motivo (1 = 32px de altura máxima). */
  scale?: number
  /** Pulsa as barras em sequência (loading). */
  animated?: boolean
  color?: string
  className?: string
}

/** Motivo de 4 barras crescentes do logo MindSight. */
export function LogoBars({ scale = 1, animated = false, color = 'var(--ms-primary)', className }: Props) {
  return (
    <span
      className={`inline-flex items-end ${className ?? ''}`}
      style={{ gap: 3 * scale, height: 32 * scale }}
      role={animated ? 'status' : undefined}
      aria-label={animated ? 'Carregando' : undefined}
      aria-hidden={animated ? undefined : true}
    >
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          style={{
            width: 6 * scale,
            height: h * scale,
            borderRadius: 2 * scale,
            background: color,
            opacity: OPACITIES[i],
            transformOrigin: 'bottom',
            animation: animated ? `bar-rise 1s ease-in-out ${i * 100}ms infinite` : undefined,
          }}
        />
      ))}
    </span>
  )
}

/** Logo oficial: azul no tema claro, branco no escuro. `iconOnly` força só o ícone. */
export function Logo({ iconOnly = false }: { iconOnly?: boolean }) {
  const wordmark = iconOnly ? 'hidden' : 'hidden sm:block'
  const icon = iconOnly ? '' : 'sm:hidden'
  return (
    <div className="flex items-center">
      <img src={logoBlue} alt="MindSight Company" className={`${wordmark} h-12 w-auto dark:hidden`} />
      <img src={logoWhite} alt="" aria-hidden="true" className={`hidden h-12 w-auto ${iconOnly ? '' : 'dark:sm:block'}`} />
      <img src={iconBlue} alt="MindSight" className={`h-10 w-auto ${icon} dark:hidden`} />
      <img src={iconWhite} alt="" aria-hidden="true" className={`hidden h-10 w-auto dark:block ${icon ? 'dark:sm:hidden' : ''}`} />
    </div>
  )
}
