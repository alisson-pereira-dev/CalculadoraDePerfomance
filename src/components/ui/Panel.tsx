import { useId, useState, type ReactNode } from 'react'
import { ChevronIcon } from './Icons'

interface Props {
  title: string
  icon?: ReactNode
  /** Em tablet, o painel vira accordion. */
  collapsible?: boolean
  className?: string
  children: ReactNode
}

export function Panel({ title, icon, collapsible = false, className = '', children }: Props) {
  const [open, setOpen] = useState(true)
  const bodyId = useId()
  const expanded = !collapsible || open

  const heading = (
    <span className="flex items-center gap-2.5">
      {icon && <span className="text-brand-text">{icon}</span>}
      <span className="font-display text-lg font-semibold">{title}</span>
    </span>
  )

  return (
    <section className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          {heading}
          <ChevronIcon className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="p-5 pb-0">{heading}</div>
      )}
      <div id={bodyId} hidden={!expanded} className={collapsible ? 'px-5 pb-5' : 'p-5'}>
        {children}
      </div>
    </section>
  )
}
