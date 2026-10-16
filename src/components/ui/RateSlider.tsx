import { useEffect, useId, useRef, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  /** Atraso antes de propagar a mudança (evita jitter na animação 3D). */
  debounceMs?: number
}

export function RateSlider({ label, value, onChange, debounceMs = 50 }: Props) {
  const id = useId()
  const [local, setLocal] = useState(value)
  const timer = useRef<number | undefined>(undefined)

  // Sincroniza com mudanças externas (ex.: reabrir o modal), mas nunca durante um arrasto.
  useEffect(() => {
    if (timer.current === undefined) setLocal(value)
  }, [value])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handle = (next: number) => {
    setLocal(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      onChange(next)
    }, debounceMs)
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-medium text-brand-text">
          {local}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={local}
        onChange={(e) => handle(Number(e.target.value))}
        className="ms-range"
        style={{ ['--fill' as string]: `${local}%` }}
      />
    </div>
  )
}
