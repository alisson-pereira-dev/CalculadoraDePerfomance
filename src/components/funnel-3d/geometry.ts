import { BufferGeometry, CylinderGeometry, Float32BufferAttribute } from 'three'
import type { Counts } from '../../lib/calculations'

export const SEGMENTS = 5
export const MAX_RADIUS = 2.2
export const MIN_RADIUS = 0.3
export const SEG_HEIGHT = 0.95
export const SEG_GAP = 0.05
export const TOTAL_HEIGHT = SEGMENTS * SEG_HEIGHT + (SEGMENTS - 1) * SEG_GAP

/** Y do centro de cada segmento (Leads no topo). */
export const segmentCenterY = (i: number) =>
  TOTAL_HEIGHT / 2 - SEG_HEIGHT / 2 - i * (SEG_HEIGHT + SEG_GAP)

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/**
 * Raios nas 6 fronteiras (topo do seg. 0 … base do seg. 4).
 * Raio ∝ √contagem para não exagerar a diferença visual entre Leads e Vendas.
 */
export function boundaryRadii(counts: Counts, referenceLeads: number): number[] {
  // Leads agora é sempre inteiro (ver computeFunnel) e pode truncar para 0 quando o
  // investimento é menor que o CPL — sem o guard abaixo isso viraria 0/0 (NaN).
  const safeLeads = Math.max(1, referenceLeads)
  const rad = (c: number) => Math.max(MIN_RADIUS, MAX_RADIUS * Math.sqrt(Math.max(0, c) / safeLeads))
  const r = counts.map(rad)
  r.push(Math.max(MIN_RADIUS * 0.8, r[SEGMENTS - 1] * 0.75))
  return r
}

/**
 * Interpola raios entre estados (lerp ~600ms com easeOutCubic) e controla a
 * animação de entrada: cada segmento sobe do zero com 100ms de stagger.
 */
export class FunnelTween {
  readonly current: Float32Array
  /** Fator de entrada por segmento (0 → 1). */
  readonly intro = new Float32Array(SEGMENTS)
  private from: Float32Array
  private to: Float32Array
  private start = 0

  constructor(
    initial: number[],
    private introStart: number,
    private duration = 0.6,
    private stagger = 0.1,
  ) {
    this.current = Float32Array.from(initial)
    this.from = Float32Array.from(initial)
    this.to = Float32Array.from(initial)
  }

  retarget(target: number[], now: number) {
    this.from = Float32Array.from(this.current)
    this.to = Float32Array.from(target)
    this.start = now
  }

  step(now: number) {
    const e = easeOutCubic(clamp01((now - this.start) / this.duration))
    for (let i = 0; i < this.current.length; i++) {
      this.current[i] = this.from[i] + (this.to[i] - this.from[i]) * e
    }
    for (let i = 0; i < SEGMENTS; i++) {
      this.intro[i] = easeOutCubic(clamp01((now - this.introStart - i * this.stagger) / this.duration))
    }
  }
}

export interface Frustum {
  geometry: BufferGeometry
  /** x,z unitários (sinθ, cosθ) por vértice, para reescalar sem trigonometria. */
  unit: Float32Array
}

/** Tronco de cone de altura 1 e raios mutáveis (atualizados in-place, sem realocar). */
export function createFrustum(): Frustum {
  const geometry = new CylinderGeometry(1, 1, 1, 48, 1, true)
  const pos = geometry.getAttribute('position')
  const unit = new Float32Array(pos.count * 3)
  unit.set(pos.array as Float32Array)
  geometry.setAttribute('normal', new Float32BufferAttribute(new Float32Array(pos.count * 3), 3))
  return { geometry, unit }
}

export function updateFrustum({ geometry, unit }: Frustum, top: number, bottom: number) {
  const pos = geometry.getAttribute('position')
  const nor = geometry.getAttribute('normal')
  const slope = bottom - top
  for (let i = 0; i < pos.count; i++) {
    const ux = unit[i * 3]
    const uy = unit[i * 3 + 1]
    const uz = unit[i * 3 + 2]
    const r = uy > 0 ? top : bottom
    pos.setXYZ(i, ux * r, uy, uz * r)
    // normal do tronco: (sinθ, rb − rt, cosθ) normalizada
    const len = Math.hypot(ux, slope, uz) || 1
    nor.setXYZ(i, ux / len, slope / len, uz / len)
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
  geometry.computeBoundingSphere()
}
