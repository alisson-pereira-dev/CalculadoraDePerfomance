import { CompareModal } from './components/CompareModal'
import { ConfigPanel } from './components/ConfigPanel'
import { FunnelCard } from './components/FunnelCard'
import { Header } from './components/Header'
import { Insights } from './components/Insights'
import { KpiPanel } from './components/KpiPanel'
import { TipCard } from './components/TipCard'
import { useViewport } from './hooks/useEnvironment'

export default function App() {
  const viewport = useViewport()
  const tablet = viewport === 'tablet'

  return (
    <>
      {/* `inert` é aplicado aqui quando o modal abre */}
      <div id="app-root" className="min-h-screen">
        <Header />
        <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 pb-6 sm:px-6 lg:grid-cols-12 xl:px-8">
          <aside className="lg:col-span-3">
            <ConfigPanel collapsible={tablet} />
          </aside>
          <div className="lg:col-span-6">
            <FunnelCard />
          </div>
          <aside className="lg:col-span-3">
            <KpiPanel collapsible={tablet} />
          </aside>
          <div className="lg:col-span-9">
            <Insights />
          </div>
          <div className="lg:col-span-3">
            <TipCard />
          </div>
        </main>
      </div>
      <CompareModal />
    </>
  )
}
