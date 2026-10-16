import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { RATE_KEYS, type FunnelMode, type FunnelResult } from '../../lib/calculations'
import { CrosshairIcon } from '../ui/Icons'
import { LogoBars } from '../ui/LogoBars'
import { ConversionOverlay, createOverlayHandles } from './ConversionOverlay'
import { FunnelScene } from './FunnelScene'

interface Props {
  result: FunnelResult
  optimized: FunnelResult | null
  mode: FunnelMode
  interactive: boolean
  /** Callouts enxutos (só nome e valor) para telas estreitas. */
  compact: boolean
}

export default function FunnelCanvas({ result, optimized, mode, interactive, compact }: Props) {
  const [hovering, setHovering] = useState(false)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const overlay = useRef(createOverlayHandles())
  const resetView = useRef<(() => void) | null>(null)

  // Mantém o loading visível por um instante para a animação de entrada ser percebida.
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setLoaded(true), 350)
    return () => window.clearTimeout(t)
  }, [ready])

  return (
    <div
      className="relative h-full w-full"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onDoubleClick={() => interactive && resetView.current?.()}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.4, 9.6], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: interactive ? 'none' : 'pan-y' }}
        aria-label="Visualização 3D do funil de conversão"
        onCreated={() => setReady(true)}
      >
        <FunnelScene
          result={result}
          optimized={optimized}
          mode={mode}
          interactive={interactive}
          hovering={hovering}
          compact={compact}
          overlay={overlay}
          resetView={resetView}
        />
      </Canvas>
      <ConversionOverlay
        handles={overlay}
        rates={RATE_KEYS.map((k) => result.rates[k])}
        compact={compact}
      />

      {interactive && (
        <div className="absolute bottom-3 left-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => resetView.current?.()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-text-2 shadow-card transition-colors hover:text-brand-text"
          >
            <CrosshairIcon width={14} height={14} />
            Centralizar
          </button>
          <p className="hidden text-[11px] text-muted lg:block">
            Arraste: girar · Botão direito ou Shift: mover · Scroll: zoom · Duplo clique:
            centralizar
          </p>
        </div>
      )}

      <div
        aria-hidden={loaded}
        className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <LogoBars scale={1.2} animated />
      </div>
    </div>
  )
}
