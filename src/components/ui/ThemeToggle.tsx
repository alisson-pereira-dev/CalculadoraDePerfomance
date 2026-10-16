import { useFunnelStore } from '../../store/useFunnelStore'
import { MoonIcon, SunIcon } from './Icons'

export function ThemeToggle() {
  const theme = useFunnelStore((s) => s.theme)
  const toggle = useFunnelStore((s) => s.toggleTheme)
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema escuro"
      onClick={toggle}
      className="relative h-9 w-[72px] shrink-0 rounded-full border border-line bg-surface-2 transition-colors"
    >
      <span
        className="absolute top-[3px] grid h-[28px] w-[28px] place-items-center rounded-full bg-ms text-white shadow transition-transform duration-200"
        style={{ transform: `translateX(${dark ? 38 : 4}px)` }}
      >
        {dark ? <MoonIcon width={16} height={16} /> : <SunIcon width={16} height={16} />}
      </span>
      <SunIcon width={14} height={14} className="absolute top-[10px] left-[11px] text-muted" />
      <MoonIcon width={14} height={14} className="absolute top-[10px] right-[11px] text-muted" />
    </button>
  )
}
