import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'
import { quayLineZ } from '../../data/scenePositions'
import { QUAY_PICKUP_LANE_Z } from '../../data/quayAgvLoop'
import { simStats } from '../../data/simStats'
import type { BerthChannel } from './AgvFleet'
import { HudBeam } from './HudBeam'

interface Props {
  position: [number, number, number]
  onClick: () => void
  carryContainer?: boolean
  berthX?: number
  berthSignals?: { current: Record<number, BerthChannel> }
}

const DARK_BLUE = THEME.stsBlue
const PORTAL_TROLLEY_X = 1.6 // 세컨드(포탈) 트롤리 — 에이프런 쪽 고정 위치, 더블 트롤리 구조 연출용(장식)
// 대각 트러스 브레이싱 각도/길이 — 다리(x=-0.9~1.8, y=0~4.8)를 잇는 X자 브레이스 기하 계산값
const BRACE_LENGTH = 5.51
const BRACE_ANGLE = 0.512

// 트롤리 로컬 X 목표 — 선박 컨테이너 상공(SHIP_X) <-> AGV 정차 지점 상공(APRON_X)
// TerminalCanvas가 Ship3D를 같은 로컬 X에 배치해 트롤리가 정확히 선박 갑판 위로 스윙하도록 한다.
export const SHIP_X = -3.6
const APRON_X = QUAY_PICKUP_LANE_Z - quayLineZ // AGV 정차선(z)이 안벽 라인 기준 로컬 X로 환산됨
// 호이스트 Y (트롤리 y=4.9 기준 상대값) — 이동 안전고도 / 선박 하역 깊이 / AGV 적재 깊이
const UP_SAFE = -1.0
const DOWN_SHIP = -3.0 // 절대 y≈1.9, 선박 2단 컨테이너 상단(≈1.78) 바로 위
const DOWN_APRON = -3.9 // 절대 y≈1.0, AGV 적재함(y≈0.66) 바로 위

// 양하(Discharge, 배->AGV) 사이클 페이즈 경계 (초) — 하강/집기 -> 상승 -> 이동 -> 하강/안착 -> 대기 -> 상승 -> 복귀
// 에이프런 확장으로 트롤리 스윙 거리(SHIP_X~APRON_X)가 늘어난 만큼 스윙 구간 시간도 비례 연장
const D_SWING_TO_APRON_END = 3.1 // 0.85 -> 3.1 (2.25초)
const D_LOWER_APRON_END = 3.6 // 컨테이너가 AGV 위에 안착하는 순간 — 핸드오프 신호 발화 지점
const D_RELEASE_DWELL_END = 3.85
const D_RAISE2_END = 4.1
const DISCHARGE_CYCLE_END = 6.2
const DISCHARGE_HANDOFF_AT = D_LOWER_APRON_END

// 선적(Load, AGV->배) 사이클 페이즈 경계 (초) — 빈 트롤리 이동 -> 하강/집기(AGV 위 컨테이너) -> 상승 -> 이동 -> 하강/안착(선박) -> 복귀
const L_SWING_TO_APRON_END = 2.25
const L_LOWER_APRON_END = 2.9 // 컨테이너를 AGV에서 들어올리는 순간 — 핸드오프 신호 발화 지점 (AGV는 이 즉시 출발)
const L_RAISE_END = 3.15
const L_SWING_TO_SHIP_END = 5.4
const L_LOWER_SHIP_END = 6.05
const L_RELEASE_DWELL_END = 6.3
const LOAD_CYCLE_END = 6.55
const LOAD_HANDOFF_AT = L_LOWER_APRON_END

function smooth(t: number, a: number, b: number) {
  return THREE.MathUtils.smoothstep(t, a, b)
}

function dischargePhaseValue(timer: number) {
  if (timer < 0.65) return { trolleyX: SHIP_X, hoistY: THREE.MathUtils.lerp(UP_SAFE, DOWN_SHIP, smooth(timer, 0, 0.65)), cargo: false }
  if (timer < 0.85) return { trolleyX: SHIP_X, hoistY: THREE.MathUtils.lerp(DOWN_SHIP, UP_SAFE, smooth(timer, 0.65, 0.85)), cargo: true }
  if (timer < D_SWING_TO_APRON_END)
    return { trolleyX: THREE.MathUtils.lerp(SHIP_X, APRON_X, smooth(timer, 0.85, D_SWING_TO_APRON_END)), hoistY: UP_SAFE, cargo: true }
  if (timer < D_LOWER_APRON_END)
    return {
      trolleyX: APRON_X,
      hoistY: THREE.MathUtils.lerp(UP_SAFE, DOWN_APRON, smooth(timer, D_SWING_TO_APRON_END, D_LOWER_APRON_END)),
      cargo: true,
    }
  if (timer < D_RELEASE_DWELL_END) return { trolleyX: APRON_X, hoistY: DOWN_APRON, cargo: false }
  if (timer < D_RAISE2_END)
    return {
      trolleyX: APRON_X,
      hoistY: THREE.MathUtils.lerp(DOWN_APRON, UP_SAFE, smooth(timer, D_RELEASE_DWELL_END, D_RAISE2_END)),
      cargo: false,
    }
  return { trolleyX: THREE.MathUtils.lerp(APRON_X, SHIP_X, smooth(timer, D_RAISE2_END, DISCHARGE_CYCLE_END)), hoistY: UP_SAFE, cargo: false }
}

function loadPhaseValue(timer: number) {
  if (timer < L_SWING_TO_APRON_END)
    return { trolleyX: THREE.MathUtils.lerp(SHIP_X, APRON_X, smooth(timer, 0, L_SWING_TO_APRON_END)), hoistY: UP_SAFE, cargo: false }
  if (timer < L_LOWER_APRON_END)
    return {
      trolleyX: APRON_X,
      hoistY: THREE.MathUtils.lerp(UP_SAFE, DOWN_APRON, smooth(timer, L_SWING_TO_APRON_END, L_LOWER_APRON_END)),
      cargo: false,
    }
  if (timer < L_RAISE_END)
    return {
      trolleyX: APRON_X,
      hoistY: THREE.MathUtils.lerp(DOWN_APRON, UP_SAFE, smooth(timer, L_LOWER_APRON_END, L_RAISE_END)),
      cargo: true,
    }
  if (timer < L_SWING_TO_SHIP_END)
    return { trolleyX: THREE.MathUtils.lerp(APRON_X, SHIP_X, smooth(timer, L_RAISE_END, L_SWING_TO_SHIP_END)), hoistY: UP_SAFE, cargo: true }
  if (timer < L_LOWER_SHIP_END)
    return {
      trolleyX: SHIP_X,
      hoistY: THREE.MathUtils.lerp(UP_SAFE, DOWN_SHIP, smooth(timer, L_SWING_TO_SHIP_END, L_LOWER_SHIP_END)),
      cargo: true,
    }
  if (timer < L_RELEASE_DWELL_END) return { trolleyX: SHIP_X, hoistY: DOWN_SHIP, cargo: false }
  return {
    trolleyX: SHIP_X,
    hoistY: THREE.MathUtils.lerp(DOWN_SHIP, UP_SAFE, smooth(timer, L_RELEASE_DWELL_END, LOAD_CYCLE_END)),
    cargo: false,
  }
}

type CraneMode = 'DISCHARGE' | 'LOAD'

export function QuayCrane3D({ position, onClick, carryContainer = false, berthX, berthSignals }: Props) {
  const trolley = useRef<THREE.Group>(null)
  const portalTrolley = useRef<THREE.Group>(null)
  const hoist = useRef<THREE.Mesh>(null)
  const rope = useRef<THREE.Mesh>(null)
  const cargo = useRef<THREE.Mesh>(null)
  const cycleTimer = useRef<number | null>(null)
  const mode = useRef<CraneMode>('DISCHARGE')
  const handoffFired = useRef(false)
  const wasAgvPresent = useRef(false)

  useFrame(({ clock }, delta) => {
    if (portalTrolley.current) portalTrolley.current.position.y = 4.9 + Math.sin(clock.getElapsedTime() * 0.7) * 0.06
    const channel = berthSignals && berthX !== undefined ? berthSignals.current[berthX] : undefined
    const agvPresent = !!channel?.agvPresent

    if (cycleTimer.current === null) {
      // AGV 도착(rising edge) 시점의 적재 상태로 이번 사이클이 양하(빈 AGV)인지 선적(적재 AGV)인지 결정
      if (agvPresent && !wasAgvPresent.current) {
        cycleTimer.current = 0
        mode.current = channel?.agvCarrying ? 'LOAD' : 'DISCHARGE'
        handoffFired.current = false
      }
    } else {
      cycleTimer.current += delta
      const handoffAt = mode.current === 'LOAD' ? LOAD_HANDOFF_AT : DISCHARGE_HANDOFF_AT
      const cycleEnd = mode.current === 'LOAD' ? LOAD_CYCLE_END : DISCHARGE_CYCLE_END
      // 안착(양하) / 들어올림(선적) 순간에 정확히 한 번만 핸드오프 신호를 세운다 — AGV는 이 즉시 출발
      if (!handoffFired.current && cycleTimer.current >= handoffAt) {
        if (channel) channel.handoffDone = true
        handoffFired.current = true
      }
      if (cycleTimer.current >= cycleEnd) cycleTimer.current = null
    }
    wasAgvPresent.current = agvPresent
    // Berth Occupancy KPI — 이 크레인이 지금 하역 사이클을 진행 중인지 보고
    if (berthX !== undefined) simStats.activeCraneXs[berthX] = cycleTimer.current !== null

    const { trolleyX, hoistY, cargo: cargoVisible } =
      cycleTimer.current === null
        ? { trolleyX: SHIP_X, hoistY: UP_SAFE, cargo: false }
        : mode.current === 'LOAD'
          ? loadPhaseValue(cycleTimer.current)
          : dischargePhaseValue(cycleTimer.current)

    if (trolley.current) trolley.current.position.x = trolleyX
    if (hoist.current) hoist.current.position.y = hoistY
    if (rope.current) {
      const ropeLength = Math.abs(hoistY)
      rope.current.scale.y = ropeLength
      rope.current.position.y = hoistY / 2
    }
    if (cargo.current) cargo.current.visible = carryContainer && cargoVisible
  })

  return (
    <group position={position} onClick={(e) => (e.stopPropagation(), onClick())}>
      {/* portal legs — 묵직한 다크 블루 갠트리 (DGT 스타일) */}
      <HudBeam args={[0.32, 4.8, 0.32]} position={[-0.9, 2.4, -2.1]} color={DARK_BLUE} castShadow />
      <HudBeam args={[0.32, 4.8, 0.32]} position={[-0.9, 2.4, 2.1]} color={DARK_BLUE} castShadow />
      <HudBeam args={[0.32, 4.8, 0.32]} position={[1.8, 2.4, -2.1]} color={DARK_BLUE} castShadow />
      <HudBeam args={[0.32, 4.8, 0.32]} position={[1.8, 2.4, 2.1]} color={DARK_BLUE} castShadow />
      {/* 다리 밑동 비비드 핑크 포인트 스트라이프 — 실제 터미널 크레인 하부 도장 참고 */}
      {[
        [-0.9, -2.1],
        [-0.9, 2.1],
        [1.8, -2.1],
        [1.8, 2.1],
      ].map(([lx, lz]) => (
        <mesh key={`${lx}-${lz}`} position={[lx, 0.55, lz]}>
          <boxGeometry args={[0.34, 0.3, 0.34]} />
          <meshStandardMaterial color={THEME.hudPink} emissive={THEME.hudPink} emissiveIntensity={0.35} />
        </mesh>
      ))}

      {/* X자 대각 브레이싱 — 트러스 구조 디테일 (양쪽 다리 사이) */}
      <HudBeam args={[0.12, BRACE_LENGTH, 0.12]} position={[0.45, 2.4, -2.1]} rotation={[0, 0, -BRACE_ANGLE]} color={DARK_BLUE} />
      <HudBeam args={[0.12, BRACE_LENGTH, 0.12]} position={[0.45, 2.4, -2.1]} rotation={[0, 0, BRACE_ANGLE]} color={DARK_BLUE} />
      <HudBeam args={[0.12, BRACE_LENGTH, 0.12]} position={[0.45, 2.4, 2.1]} rotation={[0, 0, -BRACE_ANGLE]} color={DARK_BLUE} />
      <HudBeam args={[0.12, BRACE_LENGTH, 0.12]} position={[0.45, 2.4, 2.1]} rotation={[0, 0, BRACE_ANGLE]} color={DARK_BLUE} />

      {/* 하단 타이 브레이스 — 거대한 갠트리 구조감을 강조하는 두 번째 수평 연결보 */}
      <HudBeam args={[9.0, 0.2, 0.2]} position={[0, 1.2, -2.1]} color={DARK_BLUE} />
      <HudBeam args={[9.0, 0.2, 0.2]} position={[0, 1.2, 2.1]} color={DARK_BLUE} />

      {/* boom (fixed beam spanning ship->yard side) — 확장된 에이프런 폭(APRON_X)까지 닿도록 연장 */}
      <HudBeam args={[9.0, 0.24, 0.24]} position={[0, 4.9, 0]} color={DARK_BLUE} castShadow />

      {/* 세컨드 포탈 트롤리 + 인계 플랫폼 — DGT 스타일 더블 트롤리 외형 연출(장식, 실제 이송은 메인 트롤리가 수행) */}
      <group ref={portalTrolley} position={[PORTAL_TROLLEY_X, 4.9, 0]}>
        <mesh>
          <boxGeometry args={[0.45, 0.2, 0.45]} />
          <meshStandardMaterial color={DARK_BLUE} transparent opacity={0.5} emissive={THEME.hudPink} emissiveIntensity={0.3} />
          <Edges color={THEME.hudPink} />
        </mesh>
      </group>
      <mesh position={[PORTAL_TROLLEY_X, 1.75, 0]}>
        <boxGeometry args={[1.3, 0.08, 2.0]} />
        <meshStandardMaterial color={DARK_BLUE} transparent opacity={0.55} emissive={DARK_BLUE} emissiveIntensity={0.4} />
        <Edges color={THEME.teal} />
      </mesh>

      {/* trolley + hoist */}
      <group ref={trolley} position={[0, 4.9, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.22, 0.5]} />
          <meshStandardMaterial color={THEME.teal} transparent opacity={0.35} emissive={THEME.teal} emissiveIntensity={0.6} />
          <Edges color={THEME.teal} />
        </mesh>
        <mesh ref={rope}>
          <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
          <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.8} />
        </mesh>
        <mesh ref={hoist} castShadow>
          {/* 스프레더 프레임 */}
          <boxGeometry args={[0.7, 0.14, 1.6]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.7} />
          <Edges color="#fff3d6" />
          {/* 4개 코너 트위스트락 핀 */}
          {[
            [-0.32, -0.75],
            [0.32, -0.75],
            [-0.32, 0.75],
            [0.32, 0.75],
          ].map(([px, pz]) => (
            <mesh key={`${px}-${pz}`} position={[px, -0.14, pz]}>
              <cylinderGeometry args={[0.025, 0.025, 0.14, 6]} />
              <meshStandardMaterial color="#fff3d6" emissive="#fff3d6" emissiveIntensity={0.8} />
            </mesh>
          ))}
          {/* 이송 컨테이너 — 배 -> 에이프런 구간에서만 표시 */}
          <mesh ref={cargo} position={[0, -0.4, 0]} visible={false}>
            <boxGeometry args={[0.62, 0.42, 1.4]} />
            <meshStandardMaterial color={CONTAINER_COLORS[1]} roughness={0.7} />
            <Edges color="#fff3d6" />
          </mesh>
        </mesh>
      </group>
    </group>
  )
}
