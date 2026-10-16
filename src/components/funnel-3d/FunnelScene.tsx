import { Html, OrbitControls, useCursor } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  DoubleSide,
  Vector3,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
  type PerspectiveCamera,
} from 'three'
import {
  RATE_KEYS,
  STAGE_NAMES,
  type FunnelMode,
  type FunnelResult,
} from '../../lib/calculations'
import { formatCount, formatPercent } from '../../lib/format'
import { STAGE_ICONS } from '../ui/Icons'
import {
  SEGMENTS,
  SEG_HEIGHT,
  FunnelTween,
  boundaryRadii,
  createFrustum,
  segmentCenterY,
  updateFrustum,
  type Frustum,
} from './geometry'
import type { OverlayHandles } from './ConversionOverlay'
import { Particles } from './Particles'

const AUTO_ROTATE_SPEED = 0.05 // rad/s
/** Quanto (em unidades da cena) o usuário pode afastar o centro de rotação ao mover. */
const MAX_PAN = 5

/** Nomes curtos para os cards de uma linha do mobile. */
const SHORT_NAMES = ['Leads', 'MQLs', 'Agend.', 'Compar.', 'Vendas']

/** Do topo (mais claro) à base (mais denso). */
const SEGMENT_COLORS = ['#62dcea', '#34c0e6', '#1fa0de', '#1581c8', '#0d5fa5']

const nowSeconds = () => performance.now() / 1000

function useFrustums(): Frustum[] {
  const frustums = useMemo(() => Array.from({ length: SEGMENTS }, createFrustum), [])
  useEffect(() => () => frustums.forEach((f) => f.geometry.dispose()), [frustums])
  return frustums
}

/** Mantém um FunnelTween estável e o redireciona quando os raios-alvo mudam. */
function useFunnelTween(targets: number[]): MutableRefObject<FunnelTween> {
  const ref = useRef<FunnelTween>(null as unknown as FunnelTween)
  if (!ref.current) ref.current = new FunnelTween(targets, nowSeconds())
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current.retarget(targets, nowSeconds())
  }, [targets])
  return ref
}

interface MainProps {
  result: FunnelResult
  autoRotate: boolean
  mode: FunnelMode
  compact: boolean
  overlay: MutableRefObject<OverlayHandles>
}

const _v = new Vector3()

function MainFunnel({ result, autoRotate, mode, compact, overlay }: MainProps) {
  const targets = useMemo(() => boundaryRadii(result.counts, result.leads), [result])
  const tween = useFunnelTween(targets)
  const frustums = useFrustums()

  const group = useRef<Group>(null)
  const lid = useRef<Mesh>(null)
  const meshes = useRef<(Mesh | null)[]>([])
  const callouts = useRef<(Group | null)[]>([])
  const hoverRef = useRef<number | null>(null)
  const autoRef = useRef(autoRotate)
  autoRef.current = autoRotate

  const [hovered, setHovered] = useState<number | null>(null)
  useCursor(hovered !== null)

  useFrame(({ camera, size }, delta) => {
    const t = tween.current
    t.step(nowSeconds())
    // Direção horizontal "para a direita" da câmera: os callouts acompanham o orbit
    // e ficam sempre ao lado da silhueta, nunca na frente do funil.
    const e = camera.matrixWorld.elements
    const len = Math.hypot(e[0], e[2]) || 1
    const dirX = e[0] / len
    const dirZ = e[2] / len
    if (group.current && autoRef.current) group.current.rotation.y += delta * AUTO_ROTATE_SPEED

    const reach: number[] = []
    for (let i = 0; i < SEGMENTS; i++) {
      const k = t.intro[i]
      const top = t.current[i] * k
      const bottom = t.current[i + 1] * k
      reach[i] = (top + bottom) / 2 + 0.04
      updateFrustum(frustums[i], top, bottom)

      const mesh = meshes.current[i]
      if (mesh) {
        mesh.scale.y = Math.max(k, 0.0001) * SEG_HEIGHT
        mesh.visible = k > 0.001
        const mat = mesh.material as MeshPhysicalMaterial
        const goal = hoverRef.current === i ? 0.7 : 0.1
        mat.emissiveIntensity += (goal - mat.emissiveIntensity) * Math.min(1, delta * 12)
      }
      const callout = callouts.current[i]
      if (callout) {
        // o ponto do callout fica na borda da etapa, na altura do seu centro
        callout.position.set(dirX * reach[i], segmentCenterY(i), dirZ * reach[i])
      }
    }

    // Lado esquerdo: seta da etapa de cima para a de baixo, com a taxa no meio.
    // Projeta os dois pontos de borda para pixels e redesenha o caminho.
    const toPx = (x: number, y: number, z: number): [number, number] => {
      _v.set(x, y, z).project(camera)
      return [(_v.x * 0.5 + 0.5) * size.width, (-_v.y * 0.5 + 0.5) * size.height]
    }
    const gap = compact ? 30 : 56
    for (let i = 1; i < SEGMENTS; i++) {
      const path = overlay.current.paths[i - 1]
      const dot = overlay.current.dots[i - 1]
      const chip = overlay.current.chips[i - 1]
      if (!path || !dot || !chip) continue
      const [xu, yu] = toPx(-dirX * reach[i - 1], segmentCenterY(i - 1), -dirZ * reach[i - 1])
      const [xl, yl] = toPx(-dirX * reach[i], segmentCenterY(i), -dirZ * reach[i])
      const xm = Math.min(xu, xl) - gap
      const r = Math.max(0, Math.min(8, (yl - yu) / 4))
      path.setAttribute(
        'd',
        `M${xu},${yu} H${xm + r} Q${xm},${yu} ${xm},${yu + r} V${yl - r} Q${xm},${yl} ${xm + r},${yl} H${xl}`,
      )
      dot.setAttribute('cx', String(xu))
      dot.setAttribute('cy', String(yu))
      chip.style.transform = `translate(${xm}px, ${(yu + yl) / 2}px) translate(-50%, -50%)`
    }

    // tampa do topo (Leads)
    if (lid.current) {
      const k = t.intro[0]
      lid.current.scale.set(t.current[0] * k, t.current[0] * k, 1)
      lid.current.position.y = segmentCenterY(0) + (SEG_HEIGHT * k) / 2
      lid.current.visible = k > 0.001
    }
  })

  /** % de conversão vindo da etapa anterior (Leads = 100%). */
  const conv = (i: number) => (i === 0 ? 100 : result.rates[RATE_KEYS[i - 1]])
  const countText = (i: number) => formatCount(result.counts[i])
  const convText = (i: number) => formatPercent(conv(i))

  return (
    <>
      <group ref={group}>
        {frustums.map((f, i) => (
          <mesh
            key={i}
            ref={(m) => {
              meshes.current[i] = m
            }}
            geometry={f.geometry}
            position={[0, segmentCenterY(i), 0]}
            onPointerOver={(e) => {
              e.stopPropagation()
              hoverRef.current = i
              setHovered(i)
            }}
            onPointerOut={() => {
              hoverRef.current = null
              setHovered((h) => (h === i ? null : h))
            }}
          >
            <meshPhysicalMaterial
              color={SEGMENT_COLORS[i]}
              emissive={SEGMENT_COLORS[i]}
              emissiveIntensity={0.1}
              transparent
              opacity={0.78 + 0.22 * (i / (SEGMENTS - 1))}
              transmission={0.1}
              thickness={0.6}
              roughness={0.16}
              clearcoat={0.6}
              clearcoatRoughness={0.2}
              ior={1.3}
              side={DoubleSide}
              // sem escrever profundidade, o que está dentro do vidro (partículas) continua visível
              depthWrite={false}
            />
          </mesh>
        ))}
        <mesh ref={lid} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial
            color="#c4f1f8"
            emissive="#62dcea"
            emissiveIntensity={0.35}
            transparent
            opacity={0.85}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <Particles tween={tween} rates={RATE_KEYS.map((k) => result.rates[k])} />
      </group>

      {/* Número dentro de cada etapa (sempre virado para a câmera). */}
      {STAGE_NAMES.map((name, i) => (
        <group key={`in-${name}`} position={[0, segmentCenterY(i), 0]}>
          <Html center className="funnel-inner" zIndexRange={[5, 0]}>
            {mode === 'quantidade' ? countText(i) : convText(i)}
          </Html>
        </group>
      ))}

      {/* Callouts ficam fora do grupo rotativo, ancorados à borda da silhueta (ver useFrame). */}
      {STAGE_NAMES.map((name, i) => {
        const Icon = STAGE_ICONS[i]
        return (
          <group
            key={name}
            ref={(g) => {
              callouts.current[i] = g
            }}
            position={[0, segmentCenterY(i), 0]}
          >
            <Html
              className={`callout${compact ? ' compact' : ''}${hovered === i ? ' active' : ''}`}
              zIndexRange={[10, 0]}
            >
              <span className="callout-icon">
                <Icon width={22} height={22} />
              </span>
              <div className="callout-text">
                <span>{compact ? SHORT_NAMES[i] : name}</span>
                <strong>{countText(i)}</strong>
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

/** Malha wireframe do cenário otimizado, sobreposta ao funil atual. */
function OptimizedOverlay({
  optimized,
  referenceLeads,
}: {
  optimized: FunnelResult
  referenceLeads: number
}) {
  const targets = useMemo(
    () => boundaryRadii(optimized.counts, referenceLeads),
    [optimized, referenceLeads],
  )
  const tween = useFunnelTween(targets)
  const frustums = useFrustums()
  const meshes = useRef<(Mesh | null)[]>([])

  useFrame(() => {
    const t = tween.current
    t.step(nowSeconds())
    for (let i = 0; i < SEGMENTS; i++) {
      const k = t.intro[i]
      updateFrustum(frustums[i], t.current[i] * k * 1.02, t.current[i + 1] * k * 1.02)
      const mesh = meshes.current[i]
      if (mesh) {
        mesh.scale.y = Math.max(k, 0.0001) * SEG_HEIGHT
        mesh.visible = k > 0.001
      }
    }
  })

  return (
    <group>
      {frustums.map((f, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          geometry={f.geometry}
          position={[0, segmentCenterY(i), 0]}
          raycast={() => null}
        >
          <meshBasicMaterial color="#0aa9d1" wireframe transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

const FUNNEL_UNITS_WIDE = 4.4 // diâmetro do funil (2 × MAX_RADIUS)
const FUNNEL_UNITS_TALL = 4.95
/**
 * Folga reservada de cada lado do funil: conversões à esquerda, quantidades à direita.
 * O conjunto é quase simétrico (≈ 50px de cada lado no funil padrão), então o funil fica
 * no centro do canvas e a mesma folga vale para os dois lados.
 */
const SIDE_PX = { normal: 130, compact: 92 }

/** Parte dos OrbitControls que usamos fora da cena. */
type ControlsLike = { target: Vector3; update(): void; saveState(): void; reset(): void }

/**
 * Enquadra o funil no centro do canvas: escolhe a maior escala que cabe em altura e deixa
 * folga dos dois lados para os cards, e ajusta a distância da câmera. Esse enquadramento
 * é o que o botão "Centralizar" restaura.
 */
function Framing({
  compact,
  resetView,
}: {
  compact: boolean
  resetView: MutableRefObject<(() => void) | null>
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  // Só largura/altura: o `size` do R3F ganha um novo objeto a cada rolagem da página (muda `top`),
  // e reagir a isso zerava o zoom/pan do usuário ao rolar para fora do funil e voltar.
  const w = useThree((s) => s.size.width)
  const h = useThree((s) => s.size.height)
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  useEffect(() => {
    const side = SIDE_PX[compact ? 'compact' : 'normal']
    const pxPerUnit = Math.max(
      20,
      Math.min((0.86 * h) / FUNNEL_UNITS_TALL, (w - 2 * side) / FUNNEL_UNITS_WIDE),
    )
    const dist = h / (2 * pxPerUnit * Math.tan((camera.fov * Math.PI) / 360))
    camera.position.setLength(dist)
    camera.updateProjectionMatrix()
    // Salva como "padrão" do Centralizar (com pan/zoom do usuário zerados).
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
      controls.saveState()
    }
    resetView.current = () => controls?.reset()
    return () => {
      resetView.current = null
    }
  }, [camera, w, h, compact, controls, resetView])
  return null
}

interface SceneProps {
  result: FunnelResult
  optimized: FunnelResult | null
  mode: FunnelMode
  /** false no mobile: só rotação automática, sem OrbitControls. */
  interactive: boolean
  hovering: boolean
  compact: boolean
  overlay: MutableRefObject<OverlayHandles>
  /** Preenchido com uma função que volta ao enquadramento original. */
  resetView: MutableRefObject<(() => void) | null>
}

export function FunnelScene({
  result,
  optimized,
  mode,
  interactive,
  hovering,
  compact,
  overlay,
  resetView,
}: SceneProps) {
  return (
    <>
      <Framing compact={compact} resetView={resetView} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} />
      <pointLight position={[-5, -2, 4]} intensity={30} color="#0dc0e0" />

      <group>
        <MainFunnel
          result={result}
          autoRotate={!hovering || !interactive}
          mode={mode}
          compact={compact}
          overlay={overlay}
        />
        {optimized && <OptimizedOverlay optimized={optimized} referenceLeads={result.leads} />}
      </group>

      {interactive && (
        <OrbitControls
          makeDefault
          // Botão direito / Shift + arrastar / dois dedos movem a cena; o zoom segue o cursor.
          enablePan
          zoomToCursor
          // sem inércia: o "Centralizar" volta exatamente ao enquadramento salvo
          enableDamping={false}
          // não deixa o funil sair de vez da tela ao mover
          onChange={(e) => e?.target.target.clampLength(0, MAX_PAN)}
          minDistance={6}
          maxDistance={24}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.62}
        />
      )}
    </>
  )
}
