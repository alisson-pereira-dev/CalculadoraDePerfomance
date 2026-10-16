import { useId, useState, type ReactNode } from 'react'
import { StepperIcon } from './Icons'

interface Props {
  label: string
  icon?: ReactNode
  value: number
  onChange: (value: number) => void
  /** Passo dos botões ▲▼ do campo. */
  step?: number
  /** Texto de apoio abaixo do campo (some quando há erro). */
  hint?: string
  error?: string
}

/** Aceita "1.500,50", "1500.5" e "1500,5". Vazio ou inválido → NaN. */
function parse(text: string): number {
  const t = text.trim()
  if (!t) return NaN
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return /^\d*\.?\d*$/.test(normalized) ? Number(normalized) : NaN
}

export function NumberInput({ label, icon, value, onChange, step = 1, hint, error }: Props) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))

  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0
    const next = Math.max(0, Math.round((base + dir * step) * 100) / 100)
    setDraft(String(next))
    onChange(next)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        {icon && <span className="text-brand-text">{icon}</span>}
        {label}
      </label>
      <div
        className={`flex h-11 items-center rounded-[10px] border bg-surface px-3 transition-colors focus-within:ring-2 focus-within:ring-ms ${
          error ? 'border-error' : 'border-line'
        }`}
      >
        <span className="mr-2 text-sm font-medium text-text-2" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            onChange(parse(e.target.value))
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              bump(e.key === 'ArrowUp' ? 1 : -1)
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
        />
        <div className="ml-1 flex flex-col text-muted">
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Aumentar ${label}`}
            onClick={() => bump(1)}
            className="grid h-4 w-5 place-items-center rounded hover:text-brand-text"
          >
            <StepperIcon dir="up" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Diminuir ${label}`}
            onClick={() => bump(-1)}
            className="grid h-4 w-5 place-items-center rounded hover:text-brand-text"
          >
            <StepperIcon dir="down" />
          </button>
        </div>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-error">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-text-2">{hint}</p>
      )}
    </div>
  )
}
