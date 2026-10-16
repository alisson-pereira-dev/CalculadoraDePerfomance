import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import { SEGMENTS, SEG_HEIGHT, segmentCenterY, type FunnelTween } from './geometry'

const COUNT = 100
/** Mistura de claras e escuras: as claras brilham no escuro, as escuras aparecem no vidro claro. */
const PALETTE = ['#ffffff', '#ffffff', '#b3ecf5', '#0b4f8a', '#073a66'].map((c) => new Color(c))

interface Props {
  tween: MutableRefObject<FunnelTween>
  /** Taxas de conversão (0–100) dos 4 trechos entre etapas. */
  rates: number[]
}

/**
 * Leads descendo pelo funil. A velocidade de cada trecho é proporcional à sua
 * taxa de conversão: fluxo lento = gargalo.
 */
export function Particles({ tween, rates }: Props) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const ratesRef = useRef(rates)
  ratesRef.current = rates

  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        seg: i % SEGMENTS,
        u: Math.random(),
        angle: Math.random() * Math.PI * 2,
        // junto às paredes: o centro fica livre para o número de cada etapa
        radial: 0.5 + Math.random() * 0.32,
        size: 0.7 + Math.random() * 0.6,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      })),
    [],
  )

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    seeds.forEach((p, i) => m.setColorAt(i, p.color))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [seeds])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const { current, intro } = tween.current
    const dt = Math.min(delta, 0.05)

    for (let i = 0; i < COUNT; i++) {
      const p = seeds[i]
      // trecho i usa a taxa que sai dele; o último reaproveita a taxa de venda
      const rate = (ratesRef.current[Math.min(p.seg, ratesRef.current.length - 1)] ?? 0) / 100
      p.u += dt * (0.12 + 0.55 * rate)
      if (p.u > 1) p.u -= 1

      const k = intro[p.seg]
      const top = current[p.seg]
      const bottom = current[p.seg + 1]
      const r = (top + (bottom - top) * p.u) * p.radial * k
      const y = segmentCenterY(p.seg) + (0.5 - p.u) * SEG_HEIGHT * k

      // some suavemente ao entrar/sair do segmento (evita "pop" na emenda)
      const edge = Math.min(1, p.u * 6, (1 - p.u) * 6)

      dummy.position.set(Math.sin(p.angle) * r, y, Math.cos(p.angle) * r)
      dummy.scale.setScalar(k * edge * p.size)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.04, 10, 10]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
    </instancedMesh>
  )
}
