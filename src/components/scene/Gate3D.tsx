import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Html } from '@react-three/drei'
import * as THREE from 'three'
import { THEME } from '../../data/theme'
import { HudBeam } from './HudBeam'

interface Props {
  position: [number, number, number]
  delay: number
  color: string
  onClick: () => void
  lanes?: number // 차선 수 — 실제 게이트 사진처럼 다중 차선 캐노피/부스를 구성
  laneWidth?: number // 차선 1개당 폭 — 차선 수가 많을 때(10~15) 좁혀 IN/OUT 게이트끼리 겹치지 않게 조절
  label?: string // IN/OUT 등 동선 라벨 (없으면 표시 안 함)
}

const CANOPY_Y = 3.7 // 캐노피 지붕 높이 — 다중 차선을 덮는 넓고 낮은 철골 구조물
const MAST_TOP = CANOPY_Y + 2.6 // 중앙 격자 마스트(레이더/카메라 타워) 상단

// 차단기 열림/닫힘 + 신호등 사이클 (초) — 차선마다 delay를 살짝 어긋나게 줘 순차 개폐 연출
const CYCLE = 3.4
const LANE_STAGGER = 0.55

// 실제 부산항 신항류 게이트 사진 참고 — 다중 차선을 가로지르는 넓은 철골 캐노피, 차선마다 소형
// 검문소(부스) + 차단기 + 신호등, 중앙에는 카메라/레이더 격자 마스트가 캐노피보다 높게 솟아 있다.
// 기존 단일 차로 구조를 lanes개 차로가 한 캐노피 아래 나란히 배열되는 구조로 확장했다.
export function Gate3D({ position, delay, color, onClick, lanes = 3, laneWidth = 2.7, label }: Props) {
  const laneXs = useMemo(() => {
    const span = lanes * laneWidth
    return Array.from({ length: lanes }, (_, i) => -span / 2 + laneWidth / 2 + i * laneWidth)
  }, [lanes, laneWidth])
  const columnXs = useMemo(() => {
    const span = lanes * laneWidth
    return Array.from({ length: lanes + 1 }, (_, i) => -span / 2 + i * laneWidth)
  }, [lanes, laneWidth])
  const halfSpan = (lanes * laneWidth) / 2

  const barrierRefs = useRef<(THREE.Group | null)[]>([])
  const lightRefs = useRef<(THREE.Mesh | null)[]>([])
  const beacon = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    laneXs.forEach((_, i) => {
      const cycle = CYCLE
      const t = ((clock.getElapsedTime() + delay + i * LANE_STAGGER) % cycle) / cycle
      const open = t > 0.3 && t < 0.75

      const barrier = barrierRefs.current[i]
      if (barrier) {
        const target = open ? -Math.PI / 2.3 : 0
        barrier.rotation.z = THREE.MathUtils.lerp(barrier.rotation.z, target, 0.12)
      }
      const light = lightRefs.current[i]
      if (light) {
        const mat = light.material as THREE.MeshStandardMaterial
        mat.color.set(open ? THEME.ok : THEME.accent)
        mat.emissive.set(open ? THEME.ok : THEME.accent)
      }
    })

    if (beacon.current) {
      const mat = beacon.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.8 + Math.abs(Math.sin(clock.getElapsedTime() * 3)) * 1.2
    }
  })

  return (
    <group position={position} onClick={(e) => (e.stopPropagation(), onClick())}>
      {label && (
        <Html position={[0, CANOPY_Y + 0.5, 0]} center zIndexRange={[10, 0]} occlude={false}>
          <span
            className="pointer-events-none whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
            style={{ borderColor: `${THEME.accent}80`, color: THEME.accent, background: 'rgba(15,28,25,0.85)' }}
          >
            {label}
          </span>
        </Html>
      )}

      {/* 넓은 철골 캐노피 지붕 — 모든 차선을 한 번에 가로지르는 평평한 대형 구조물 */}
      <HudBeam args={[halfSpan * 2 + 1.4, 0.26, 3.6]} position={[0, CANOPY_Y, 0]} color={color} castShadow />
      <HudBeam args={[halfSpan * 2 + 1.0, 0.1, 0.1]} position={[0, CANOPY_Y - 0.32, 1.5]} color={color} />
      <HudBeam args={[halfSpan * 2 + 1.0, 0.1, 0.1]} position={[0, CANOPY_Y - 0.32, -1.5]} color={color} />

      {/* 캐노피를 떠받치는 기둥 — 차선 경계마다 배치 */}
      {columnXs.map((cx) => (
        <group key={`col-${cx}`}>
          <HudBeam args={[0.24, CANOPY_Y, 0.24]} position={[cx, CANOPY_Y / 2, 1.5]} color={color} castShadow />
          <HudBeam args={[0.24, CANOPY_Y, 0.24]} position={[cx, CANOPY_Y / 2, -1.5]} color={color} castShadow />
        </group>
      ))}

      {/* 중앙 격자 마스트 — 캐노피보다 높이 솟은 카메라/레이더 타워, 상단에 점멸 비콘 */}
      <HudBeam args={[0.16, MAST_TOP - CANOPY_Y, 0.16]} position={[0, (CANOPY_Y + MAST_TOP) / 2, 0]} color={THEME.hudPink} />
      <HudBeam args={[0.6, 0.08, 0.08]} position={[0, CANOPY_Y + 1.1, 0]} color={THEME.hudPink} />
      <HudBeam args={[0.6, 0.08, 0.08]} position={[0, CANOPY_Y + 1.9, 0]} color={THEME.hudPink} />
      <mesh ref={beacon} position={[0, MAST_TOP + 0.12, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ff2b2b" emissive="#ff2b2b" emissiveIntensity={1.2} />
      </mesh>

      {/* 바닥 안전지대 — 차단기 앞 사선 해치(빗금) 마킹, 실제 게이트 사진의 노란/검정 경고 구역 재현 */}
      <mesh position={[0, 0.012, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfSpan * 2 + 1.4, 1.0]} />
        <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.25} />
      </mesh>
      {Array.from({ length: Math.round((halfSpan * 2 + 1.4) / 0.55) }).map((_, i) => {
        const sx = -halfSpan - 0.7 + i * 0.55
        return (
          <mesh key={`hatch-${sx}`} position={[sx, 0.02, 1.3]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[0.12, 1.7]} />
            <meshStandardMaterial color="#111214" />
          </mesh>
        )
      })}

      {/* 차선 경계 섬(island) 위 소형 검문소 부스 — 양 끝을 제외한 내부 경계마다 배치 */}
      {columnXs.slice(1, -1).map((cx) => (
        <group key={`booth-${cx}`} position={[cx, 0, 2.0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.9, 1.1, 0.9]} />
            <meshStandardMaterial color={THEME.surface2} transparent opacity={0.55} emissive={THEME.teal} emissiveIntensity={0.2} />
            <Edges color={THEME.teal} />
          </mesh>
          {/* 창 발광 스트립 */}
          <mesh position={[0, 0.75, 0.46]}>
            <boxGeometry args={[0.7, 0.28, 0.03]} />
            <meshStandardMaterial color="#eafffb" emissive={THEME.accent} emissiveIntensity={0.9} />
          </mesh>
          {/* 부스 지붕 캡 */}
          <mesh position={[0, 1.14, 0]}>
            <boxGeometry args={[1.05, 0.08, 1.05]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {laneXs.map((lx, i) => (
        <group key={`lane-${lx}`} position={[lx, 0, 0]}>
          {/* 차단기 — 차선 왼쪽 경계 기둥을 피벗으로 개구부를 가로질러 뻗는다 */}
          <group
            ref={(g) => {
              barrierRefs.current[i] = g
            }}
            position={[-laneWidth / 2, 1.05, 0.9]}
            rotation={[0, 0, 0]}
          >
            <mesh position={[laneWidth / 2 - 0.15, 0, 0]}>
              <boxGeometry args={[laneWidth - 0.3, 0.06, 0.06]} />
              <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.6} />
              <Edges color="#fff3d6" />
            </mesh>
          </group>
          <HudBeam args={[0.14, 1.05, 0.14]} position={[-laneWidth / 2, 0.52, 0.9]} color={color} />

          {/* 신호등 — 캐노피 하단에 매달려 차선 중앙을 비춘다 */}
          <mesh
            ref={(m) => {
              lightRefs.current[i] = m
            }}
            position={[0, CANOPY_Y - 0.55, 1.0]}
          >
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={1} />
          </mesh>
          <HudBeam args={[0.06, 0.5, 0.06]} position={[0, CANOPY_Y - 0.28, 1.0]} color={color} />
        </group>
      ))}
    </group>
  )
}
