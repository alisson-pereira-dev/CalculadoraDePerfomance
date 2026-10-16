import { useFunnelStore } from '../store/useFunnelStore'
import { CompareIcon } from './ui/Icons'
import { Logo } from './ui/LogoBars'
import { ThemeToggle } from './ui/ThemeToggle'

export function Header() {
  const openCompare = useFunnelStore((s) => s.openCompare)

  return (
    <header className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-6">
        <Logo />
        <div className="hidden min-w-0 border-l border-line pl-6 md:block">
          <h1 className="font-display text-xl leading-6 font-semibold">Calculadora de Performance</h1>
          <p className="text-sm text-text-2">Simulador de Funil</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openCompare}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-ms-600 bg-surface px-5 text-sm font-medium text-brand-text transition-colors hover:bg-brand-soft"
        >
          <CompareIcon width={18} height={18} />
          <span className="hidden sm:inline">Comparar Cenários</span>
          <span className="sm:hidden">Comparar</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
