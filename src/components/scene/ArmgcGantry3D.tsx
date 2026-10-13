import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'
import { yardBlockHalfLength, seaSideTpZ, yardBlockHalfWidth } from '../../data/scenePositions'
import { LAND_TP_LANE_Z } from '../../data/landTruckLoop'
import { simStats } from '../../data/simStats'
import type { BerthChannel } from './AgvFleet'
import type { FailoverState } from './FailoverController'

export type GantryHalf = 'SEA' | 'LAND'

interface Props {
  position: [number, number, number]
  half: GantryHalf
  channelKey?: number
  channel?: { current: Record<number, BerthChannel> }
  // Overpassing 커버리지 전용 — half='SEA'(더 크고 넓은 개체) 인스턴스에만 의미가 있다. 자신과
  // 같은 channelKey(블록 X)의 육측 채널과 전역 고장 신호를 함께 받아, 육측 RMGC가 고장난 구간
  // 동안 육측 절반을 물리적으로 "넘어 지나가"(overpass) LSTP 인계까지 대신 처리한다.
  landChannel?: { current: Record<number, BerthChannel> }
  failoverRef?: { current: FailoverState }
  onClick?: () => void
}

interface TrussBeamProps {
  args: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  color?: string
}

// 실제 BPA 신항 RMGC 사진 참고 — 범용 HudBeam(반투명 HUD 스타일, opacity 0.22)을 그대로 쓰면
// 얇고 옅은 유리 같은 선으로 보여 "얇은 노란 선" 문제가 생긴다. RMGC 철골 트러스 전용으로
// 완전 불투명 + 금속 재질(roughness/metalness)의 육중한 산업용 오렌지 빔을 별도로 둔다.
function TrussBeam({ args, position, rotation, castShadow, color = THEME.rmgcOrange }: TrussBeamProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.35} emissive={color} emissiveIntensity={0.12} />
      <Edges color="#3a1f08" threshold={5} />
    </mesh>
  )
}

// ── 듀얼 RMGC 크기 차별화 (Overpassing / Crossing Gantry) ──────────────
// 해측(SEA) 크레인을 육측(LAND) 크레인보다 더 높고(archY) 다리 간격이 더 넓게(legTopX/legBaseX,
// cantileverTip) 설계한다. 두 크레인은 같은 레일 축(동일 블록 X)을 공유하며 Z축으로만 이동하므로,
// 다리 X오프셋 자체가 서로 다르면(SEA 다리가 LAND 캔틸레버 끝보다 항상 바깥쪽) 같은 Z에 있어도
// 메쉬가 겹치지 않는다 — 실제 자동화항만의 이중 게이트(포탈-인-포탈) 구조와 동일한 원리.
// 즉 "교차 통과"는 특별한 회피 로직이 아니라 두 크레인의 물리적 치수 차이 자체로 항상 성립한다.
//
// 모든 X오프셋을 "yardBlockHalfWidth(scenePositions.ts, 야드 열 수 YARD_COL_COUNT가 결정) + 고정
// 여유 간격"의 덧셈식으로 산출한다 — 블록 열 수가 나중에 다시 바뀌어도 다리가 항상 own 블록
// 스택 바깥쪽에 같은 여유로 자동 추종해(클리핑 방지) 블록 폭과 크레인 스팬이 항상 동기화되고,
// SEA/LAND 두 개체 간 상대 여유 차이(margin)도 두 식에서 halfWidth가 상쇄돼 그대로 유지되므로
// 오버패싱 성립 조건이 절대 깨지지 않는다.
interface CraneSize {
  archY: number // 트롤리 레일(상단 거더) 높이
  legTopX: number // 다리 상단 X오프셋 (다리 사이 간격의 좁은 쪽)
  legBaseX: number // 다리 바닥 X오프셋 (A자형 다리의 넓은 쪽)
  cantileverTip: number // 캔틸레버(상단 빔) 오버행 끝단 X오프셋 — 크레인의 실루엣 최대 폭
}

// 육측 RMGC 여유 간격 — legTop이 own 블록 스택 가장자리(yardBlockHalfWidth)보다 얼마나 바깥쪽인지
const LAND_LEG_TOP_CLEARANCE = 0.675
const LAND_LEG_SPREAD = 0.35 // legBaseX - legTopX (A자형 다리 벌어짐)
const LAND_CANTILEVER_OVERHANG = 1.05 // cantileverTip - legTopX

// 해측 RMGC 여유 간격 — legTop이 LAND의 cantileverTip보다 항상 바깥쪽(margin 0.6 고정)에 오도록
// 육측보다 훨씬 크게 잡는다.
const SEA_LEG_TOP_CLEARANCE = 2.325
const SEA_LEG_SPREAD = 0.4
const SEA_CANTILEVER_OVERHANG = 1.2

// 육측 RMGC — 기존 표준 규격(더 작고 낮음). 고장 시 해측의 더 큰 개체가 이 위/옆으로 넘어와 대신 처리한다.
const LAND_SIZE: CraneSize = {
  archY: 5.5,
  legTopX: yardBlockHalfWidth + LAND_LEG_TOP_CLEARANCE,
  legBaseX: yardBlockHalfWidth + LAND_LEG_TOP_CLEARANCE + LAND_LEG_SPREAD,
  cantileverTip: yardBlockHalfWidth + LAND_LEG_TOP_CLEARANCE + LAND_CANTILEVER_OVERHANG,
}
// 해측 RMGC — 더 높고 다리 간격이 훨씬 넓다. 육측 RMGC의 최대 폭(cantileverTip)보다 다리 상단이
// 항상 바깥쪽이라, 육측 크레인이 어떤 Z에 있어도 해측 크레인의 다리 "터널" 안쪽을 자유롭게 지나다닐 수 있다.
const SEA_SIZE: CraneSize = {
  archY: 7.6,
  legTopX: yardBlockHalfWidth + SEA_LEG_TOP_CLEARANCE,
  legBaseX: yardBlockHalfWidth + SEA_LEG_TOP_CLEARANCE + SEA_LEG_SPREAD,
  cantileverTip: yardBlockHalfWidth + SEA_LEG_TOP_CLEARANCE + SEA_CANTILEVER_OVERHANG,
}

const STACK_TOP_ABS = 2.48 // 5단 적재 스택의 물리적 상단 높이 (YardBlock3D 5-tier 계산과 동일 값)
const TP_HANDOFF_ABS = 1.0 // AGV/트럭 적재함 인계 높이 (불변 — 크레인 개체 크기와 무관)
const TRAVEL_CLEARANCE = 1.0 // 화물을 매단 채 주행할 때 스택 상단 위로 확보하는 최소 여유고도
// 블록 자체의 스택 보관 한계(중앙 기준) — half별 storageZ 산출에만 쓰인다 (TP 좌표와는 별개)
const STACK_EDGE = yardBlockHalfLength - 0.7
const CENTER_BUFFER = 0.5 // 중앙 완충 구간 — 두 크레인의 "자기 담당" 가동 범위가 이 지점을 넘지 않음
// half별 스택 중심 로컬 Z — position에 무관한 상수라 SEA/LAND 어느 인스턴스에서든 재사용 가능
// (SEA 인스턴스가 Overpassing으로 육측 절반을 커버할 때 LAND_STORAGE_Z를 그대로 가져다 쓴다)
const SEA_STORAGE_Z = -(CENTER_BUFFER + (STACK_EDGE - CENTER_BUFFER) * 0.4)
const LAND_STORAGE_Z = CENTER_BUFFER + (STACK_EDGE - CENTER_BUFFER) * 0.4

function computeTpZ(half: GantryHalf, posZ: number) {
  return half === 'SEA' ? seaSideTpZ - posZ : LAND_TP_LANE_Z - posZ
}

const SWING_RATE = 0.3 // 초/월드유닛 — STS 크레인 스윙 속도와 동일한 기준으로 스윙 시간을 거리비례 산출

interface CraneGeometry extends CraneSize {
  legLength: number
  legAngle: number
  legMidX: number
  archBraceLength: number
  archBraceAngle: number
  cantileverSpan: number
  cantileverStrutLength: number
  cantileverStrutAngle: number
  cantileverDy: number
  // 호이스트 Y (트롤리 y=archY 기준 상대값) — 절대 좌표는 물리적 높이(스택 상단/TP)에 고정하고,
  // archY가 개체마다 달라도(SEA/LAND 크기 차이) 실제 픽업/드롭 깊이는 항상 동일하도록 역산한다.
  upSafe: number
  downStack: number
  downTp: number
}

// 개체별(SEA=크다/LAND=작다) 치수로부터 다리·브레이싱·캔틸레버 각도/길이와 호이스트 깊이를 산출.
function buildGeometry(size: CraneSize): CraneGeometry {
  const legDx = size.legBaseX - size.legTopX
  const legLength = Math.sqrt(legDx * legDx + size.archY * size.archY)
  const legAngle = Math.asin(legDx / legLength)
  const legMidX = (size.legTopX + size.legBaseX) / 2
  const archBraceDx = size.legTopX * 2 // 다리 사이 폭 (X자 브레이스가 잇는 구간)
  const archBraceLength = Math.sqrt(archBraceDx * archBraceDx + size.archY * size.archY)
  const archBraceAngle = Math.atan2(archBraceDx, size.archY)
  const cantileverDx = size.cantileverTip - size.legTopX
  const cantileverDy = 0.5
  const cantileverStrutLength = Math.sqrt(cantileverDx * cantileverDx + cantileverDy * cantileverDy)
  const cantileverStrutAngle = Math.asin(cantileverDx / cantileverStrutLength)
  return {
    ...size,
    legLength,
    legAngle,
    legMidX,
    archBraceLength,
    archBraceAngle,
    cantileverSpan: size.cantileverTip * 2,
    cantileverStrutLength,
    cantileverStrutAngle,
    cantileverDy,
    upSafe: STACK_TOP_ABS + TRAVEL_CLEARANCE + 0.5 - size.archY,
    downStack: STACK_TOP_ABS + 0.02 - size.archY,
    downTp: TP_HANDOFF_ABS - size.archY,
  }
}

function smooth(t: number, a: number, b: number) {
  return THREE.MathUtils.smoothstep(t, a, b)
}

interface Schedule {
  swing: number
  g1: number
  g2: number
  g3: number
  g4: number
  g5: number
  g6: number
  dispatchEnd: number
  dispatchHandoffAt: number
  r1: number
  r2: number
  r3: number
  r4: number
  r5: number
  r6: number
  receiveEnd: number
  receiveHandoffAt: number
}

// storageZ<->tpZ 실제 거리에 비례해 스윙 구간 시간을 산출 — half/블록마다 거리가 달라도 일정한 체감 속도 유지
function buildSchedule(storageZ: number, tpZ: number): Schedule {
  const swing = Math.max(1, Math.abs(tpZ - storageZ)) * SWING_RATE
  const g1 = 0.65
  const g2 = 0.85
  const g3 = g2 + swing
  const g4 = g3 + 0.65 // DISPATCH: TP 안착 (핸드오프 발화)
  const g5 = g4 + 0.25
  const g6 = g5 + 0.25
  const dispatchEnd = g6 + swing

  const r1 = swing
  const r2 = r1 + 0.65 // RECEIVE: TP에서 들어올림 (핸드오프 발화)
  const r3 = r2 + 0.25
  const r4 = r3 + swing
  const r5 = r4 + 0.65
  const r6 = r5 + 0.25
  const receiveEnd = r6 + 0.25

  return {
    swing,
    g1,
    g2,
    g3,
    g4,
    g5,
    g6,
    dispatchEnd,
    dispatchHandoffAt: g4,
    r1,
    r2,
    r3,
    r4,
    r5,
    r6,
    receiveEnd,
    receiveHandoffAt: r2,
  }
}

// DISPATCH: 스택에서 집어 TP(AGV/트럭)에 내려주는 사이클 — STS의 양하(Discharge) 사이클과 동일 구조
function dispatchPhaseValue(timer: number, storageZ: number, tpZ: number, s: Schedule, g: CraneGeometry) {
  if (timer < s.g1) return { z: storageZ, hoistY: THREE.MathUtils.lerp(g.upSafe, g.downStack, smooth(timer, 0, s.g1)), cargo: false }
  if (timer < s.g2) return { z: storageZ, hoistY: THREE.MathUtils.lerp(g.downStack, g.upSafe, smooth(timer, s.g1, s.g2)), cargo: true }
  if (timer < s.g3) return { z: THREE.MathUtils.lerp(storageZ, tpZ, smooth(timer, s.g2, s.g3)), hoistY: g.upSafe, cargo: true }
  if (timer < s.g4) return { z: tpZ, hoistY: THREE.MathUtils.lerp(g.upSafe, g.downTp, smooth(timer, s.g3, s.g4)), cargo: true }
  if (timer < s.g5) return { z: tpZ, hoistY: g.downTp, cargo: false }
  if (timer < s.g6) return { z: tpZ, hoistY: THREE.MathUtils.lerp(g.downTp, g.upSafe, smooth(timer, s.g5, s.g6)), cargo: false }
  return { z: THREE.MathUtils.lerp(tpZ, storageZ, smooth(timer, s.g6, s.dispatchEnd)), hoistY: g.upSafe, cargo: false }
}

// RECEIVE: TP(AGV/트럭)에서 집어 스택에 적재하는 사이클 — STS의 선적(Load) 사이클과 동일 구조
function receivePhaseValue(timer: number, storageZ: number, tpZ: number, s: Schedule, g: CraneGeometry) {
  if (timer < s.r1) return { z: THREE.MathUtils.lerp(storageZ, tpZ, smooth(timer, 0, s.r1)), hoistY: g.upSafe, cargo: false }
  if (timer < s.r2) return { z: tpZ, hoistY: THREE.MathUtils.lerp(g.upSafe, g.downTp, smooth(timer, s.r1, s.r2)), cargo: false }
  if (timer < s.r3) return { z: tpZ, hoistY: THREE.MathUtils.lerp(g.downTp, g.upSafe, smooth(timer, s.r2, s.r3)), cargo: true }
  if (timer < s.r4) return { z: THREE.MathUtils.lerp(tpZ, storageZ, smooth(timer, s.r3, s.r4)), hoistY: g.upSafe, cargo: true }
  if (timer < s.r5) return { z: storageZ, hoistY: THREE.MathUtils.lerp(g.upSafe, g.downStack, smooth(timer, s.r4, s.r5)), cargo: true }
  if (timer < s.r6) return { z: storageZ, hoistY: g.downStack, cargo: false }
  return { z: storageZ, hoistY: THREE.MathUtils.lerp(g.downStack, g.upSafe, smooth(timer, s.r6, s.receiveEnd)), cargo: false }
}

interface ExtendedSchedule {
  core: Schedule
  transit: number // 홈(home)<->작업위치(work) 편도 이동 시간 — 둘이 같으면(own 작업) 0
}

// COVER(오버패싱) 사이클 전용 — 크레인의 "집"(home, 자기 own storageZ)과 실제 작업이 벌어지는
// 스택 위치(workZ, 커버 대상 블록의 storageZ)가 다르므로, 기존 스케줄(core) 앞뒤에 홈<->작업위치를
// 오가는 편도 이동 구간(transit)을 이어 붙인다. homeZ===workZ(own 작업)이면 transit=0이라 기존
// 동작과 완전히 동일하다.
function buildExtendedSchedule(homeZ: number, workZ: number, tpZ: number): ExtendedSchedule {
  return {
    core: buildSchedule(workZ, tpZ),
    transit: homeZ === workZ ? 0 : Math.max(1, Math.abs(workZ - homeZ)) * SWING_RATE,
  }
}

type CraneMode = 'DISPATCH' | 'RECEIVE'

// 사이클 진행 시간(t)을 [접근 이동 -> 스택/TP 작업 -> 복귀 이동] 3단 연속 구간으로 해석해 크레인의
// z/호이스트/화물 표시 상태를 산출하는 단일 상태 머신. 어떤 구간에서도 좌표를 강제로 초기화(reset)
// 하지 않고 이전 구간의 끝 값에서 다음 구간이 이어지므로 스냅이 발생하지 않는다 — Overpassing 이후
// "원래 자리로 순간 이동"하던 버그는 접근/복귀 이동 구간 자체가 없어서 생겼던 것이었다.
function resolveCyclePosition(
  t: number,
  mode: CraneMode,
  homeZ: number,
  workZ: number,
  tpZ: number,
  ext: ExtendedSchedule,
  g: CraneGeometry,
) {
  const coreEnd = mode === 'RECEIVE' ? ext.core.receiveEnd : ext.core.dispatchEnd
  if (ext.transit > 0 && t < ext.transit) {
    // 출발 — 홈에서 작업위치로(상하 교차 통과 구간)
    return { z: THREE.MathUtils.lerp(homeZ, workZ, smooth(t, 0, ext.transit)), hoistY: g.upSafe, cargo: false }
  }
  if (t < ext.transit + coreEnd) {
    // 목표 지점 도달 및 작업 — 기존 DISPATCH/RECEIVE 사이클 그대로
    const localT = t - ext.transit
    return mode === 'RECEIVE'
      ? receivePhaseValue(localT, workZ, tpZ, ext.core, g)
      : dispatchPhaseValue(localT, workZ, tpZ, ext.core, g)
  }
  // 복귀 주행 — 작업위치에서 다시 홈으로, 끊김 없이 다음 유휴/작업 전환으로 이어진다
  const retT = t - ext.transit - coreEnd
  return { z: THREE.MathUtils.lerp(workZ, homeZ, smooth(retT, 0, Math.max(ext.transit, 0.0001))), hoistY: g.upSafe, cargo: false }
}

function cycleTotalDuration(mode: CraneMode, ext: ExtendedSchedule) {
  return ext.transit * 2 + (mode === 'RECEIVE' ? ext.core.receiveEnd : ext.core.dispatchEnd)
}

function cycleHandoffAt(mode: CraneMode, ext: ExtendedSchedule) {
  return ext.transit + (mode === 'RECEIVE' ? ext.core.receiveHandoffAt : ext.core.dispatchHandoffAt)
}

// 야드 블록 절반을 전담하는 RMGC. half='SEA'(더 크고 넓은 개체)는 해측 TP<->블록 스택(해측 절반),
// half='LAND'(더 작은 개체)는 육측 TP<->블록 스택(육측 절반)만 오가며, 평상시 가동 범위가 절반씩
// 엄격히 분리된다. 육측 RMGC가 고장(FailoverController)나면, 해측 RMGC가 자신의 더 넓은 다리
// 간격 덕분에 육측 크레인을 물리적으로 넘어 지나가(overpass) 육측 LSTP 인계까지 대신 처리한다.
// tpZ는 AGV/트럭이 실제로 정차하는 좌표(seaSideTpZ / LAND_TP_LANE_Z)를 그대로 가져와 로컬
// 좌표로 환산하므로, 스프레더 하강 지점과 적재함 중심이 오차 없이 스냅된다.
export function ArmgcGantry3D({ position, half, channelKey, channel, landChannel, failoverRef, onClick }: Props) {
  const geometry = useMemo(() => buildGeometry(half === 'SEA' ? SEA_SIZE : LAND_SIZE), [half])

  const tpZ = computeTpZ(half, position[2])
  // storageZ는 CENTER_BUFFER 바깥쪽에서만 산출해 두 크레인이 중앙 완충 구간을 절대 침범하지 않도록 강제한다.
  const storageZ = half === 'SEA' ? SEA_STORAGE_Z : LAND_STORAGE_Z
  const schedule = useMemo(() => buildSchedule(storageZ, tpZ), [storageZ, tpZ])
  // OWN 작업 — home과 work가 항상 같으므로(transit=0) 접근/복귀 구간 없이 기존과 동일하게 동작한다.
  const ownExtended = useMemo<ExtendedSchedule>(() => ({ core: schedule, transit: 0 }), [schedule])

  // Overpassing 커버 타겟 — half='SEA' 인스턴스가 고장 구간 동안 대신 처리할 육측 TP/스택 좌표.
  // storageZ/tpZ는 position에만 의존하는 순수 계산이라, 같은 블록의 LAND 인스턴스가 쓰는 값과 동일하다.
  // home(자기 storageZ)과 work(LAND_STORAGE_Z)가 달라 접근/복귀 이동 구간(transit)이 자동으로 붙는다.
  const coverTpZ = computeTpZ('LAND', position[2])
  const coverExtended = useMemo(() => buildExtendedSchedule(storageZ, LAND_STORAGE_Z, coverTpZ), [storageZ, coverTpZ])

  const gantry = useRef<THREE.Group>(null)
  const trolley = useRef<THREE.Group>(null)
  const hoist = useRef<THREE.Mesh>(null)
  const rope = useRef<THREE.Mesh>(null)
  const cargo = useRef<THREE.Mesh>(null)
  const beacon = useRef<THREE.Mesh>(null)
  const cycleTimer = useRef<number | null>(null)
  const mode = useRef<CraneMode>('DISPATCH')
  const activeTarget = useRef<'OWN' | 'COVER'>('OWN')
  const activeChannel = useRef<BerthChannel | undefined>(undefined)
  const handoffFired = useRef(false)
  const wasFailedRequestSeen = useRef(false)

  useFrame(({ clock }, delta) => {
    const isFailedLand = half === 'LAND' && channelKey !== undefined && !!failoverRef?.current.blockXs.has(channelKey)
    const isOverpassingToLand =
      half === 'SEA' && !!landChannel && channelKey !== undefined && !!failoverRef?.current.blockXs.has(channelKey)

    const ownCh = channel && channelKey !== undefined ? channel.current[channelKey] : undefined
    const coverCh = isOverpassingToLand && channelKey !== undefined ? landChannel!.current[channelKey] : undefined

    if (cycleTimer.current === null) {
      if (!isFailedLand && ownCh?.agvPresent && !ownCh.claimed) {
        cycleTimer.current = 0
        // 상대가 화물을 이미 싣고 왔으면(RECEIVE) 수취, 빈 채로 왔으면(DISPATCH) 스택에서 꺼내 배출
        mode.current = ownCh.agvCarrying ? 'RECEIVE' : 'DISPATCH'
        activeTarget.current = 'OWN'
        activeChannel.current = ownCh
        ownCh.claimed = true
        handoffFired.current = false
      } else if (coverCh?.agvPresent && !coverCh.claimed) {
        // Overpassing 커버리지 — 더 큰 해측 RMGC가 다리 간격 안쪽으로 육측 크레인을 넘어 지나가
        // 가동 범위를 확장해 육측 LSTP 요청까지 대신 처리
        cycleTimer.current = 0
        mode.current = coverCh.agvCarrying ? 'RECEIVE' : 'DISPATCH'
        activeTarget.current = 'COVER'
        activeChannel.current = coverCh
        coverCh.claimed = true
        handoffFired.current = false
      }
    } else {
      cycleTimer.current += delta
      const ext = activeTarget.current === 'COVER' ? coverExtended : ownExtended
      const handoffAt = cycleHandoffAt(mode.current, ext)
      const cycleEnd = cycleTotalDuration(mode.current, ext)
      if (!handoffFired.current && cycleTimer.current >= handoffAt) {
        if (activeChannel.current) activeChannel.current.handoffDone = true
        handoffFired.current = true
        // KPI — 핸드오프가 확정되는 이 순간이 실제로 컨테이너가 스택을 드나드는 시점이다.
        // DISPATCH(스택->TP)는 야드 재고 감소, RECEIVE(TP->스택)는 야드 재고 증가.
        simStats.yardStored = THREE.MathUtils.clamp(
          simStats.yardStored + (mode.current === 'RECEIVE' ? 1 : -1),
          0,
          simStats.yardCapacity,
        )
        if (activeTarget.current === 'COVER') simStats.failoverCoveredCount += 1
      }
      if (cycleTimer.current >= cycleEnd) {
        // 복귀 이동(transit)까지 전부 끝난 뒤에만 사이클을 종료한다 — 이 시점의 실제 z는 이미
        // 복귀 구간 보간을 통해 storageZ에 도달해 있으므로, 다음 줄에서 idle이 storageZ를 그대로
        // 대입해도 좌표가 튀지 않는다(강제 초기화가 아니라 이미 도착해 있는 값의 재확인일 뿐).
        if (activeChannel.current) activeChannel.current.claimed = false
        activeChannel.current = undefined
        cycleTimer.current = null
        activeTarget.current = 'OWN'
      }
    }

    // KPI 분모 — 고장 구간 동안 육측 LSTP에 새 트럭/AGV가 도착한 이벤트 수(커버되었는지 여부와 무관하게 집계)
    if (isFailedLand) {
      const nowPresent = !!ownCh?.agvPresent
      if (nowPresent && !wasFailedRequestSeen.current) simStats.failoverRequestedCount += 1
      wasFailedRequestSeen.current = nowPresent
    } else {
      wasFailedRequestSeen.current = false
    }

    if (beacon.current) {
      const mat = beacon.current.material as THREE.MeshStandardMaterial
      if (isFailedLand) {
        beacon.current.visible = true
        mat.emissiveIntensity = 0.6 + Math.abs(Math.sin(clock.getElapsedTime() * 6)) * 1.8
      } else {
        beacon.current.visible = false
      }
    }

    const { z, hoistY, cargo: cargoVisible } =
      cycleTimer.current === null
        ? { z: storageZ, hoistY: geometry.upSafe, cargo: false } // 유휴 — 복귀 구간이 이미 storageZ까지 데려다 놓은 상태라 스냅 없음
        : resolveCyclePosition(
            cycleTimer.current,
            mode.current,
            storageZ, // home은 항상 own storageZ
            activeTarget.current === 'COVER' ? LAND_STORAGE_Z : storageZ, // work — COVER면 커버 대상 블록 위치
            activeTarget.current === 'COVER' ? coverTpZ : tpZ,
            activeTarget.current === 'COVER' ? coverExtended : ownExtended,
            geometry,
          )

    if (gantry.current) gantry.current.position.z = z
    // 트롤리 — 스택 중심과 측면 인계 레일 사이를 살짝 오가는 셔틀 모션(장식용)
    if (trolley.current) trolley.current.position.x = Math.sin(clock.getElapsedTime() * 2.4) * 0.25
    if (hoist.current) hoist.current.position.y = hoistY
    if (rope.current) {
      const ropeLength = Math.abs(hoistY)
      rope.current.scale.y = ropeLength
      rope.current.position.y = hoistY / 2
    }
    if (cargo.current) cargo.current.visible = cargoVisible
  })

  const cargoColor = half === 'SEA' ? CONTAINER_COLORS[2] : CONTAINER_COLORS[3]
  const g = geometry

  return (
    <group position={position} onClick={onClick ? (e) => (e.stopPropagation(), onClick()) : undefined}>
      <group ref={gantry} position={[0, 0, storageZ]}>
        {/* 문형(gate-shaped) 아치 프레임 — 실제 BPA 신항 RMGC 사진 참고. 얇은 HUD 라인이 아니라
            불투명하고 육중한 산업용 오렌지 철골 트러스(TrussBeam)로 표현한다. A자형 다리(바닥이
            상단보다 넓은 사다리꼴) + BNCT 스타일 캔틸레버(다리보다 훨씬 바깥까지 오버행). half별
            치수(geometry)가 달라 해측(SEA) 개체가 육측(LAND) 개체보다 눈에 띄게 크고 다리 간격이
            넓다 — 이 폭 차이 자체가 Overpassing을 가능하게 한다. */}
        <TrussBeam args={[0.5, g.legLength, 0.5]} position={[-g.legMidX, g.archY / 2, 0]} rotation={[0, 0, -g.legAngle]} color={THEME.rmgcOrange} castShadow />
        <TrussBeam args={[0.5, g.legLength, 0.5]} position={[g.legMidX, g.archY / 2, 0]} rotation={[0, 0, g.legAngle]} color={THEME.rmgcOrange} castShadow />
        <TrussBeam args={[g.cantileverSpan, 0.55, 0.55]} position={[0, g.archY, 0]} color={THEME.rmgcOrange} castShadow />
        {/* X자 대각 브레이싱 — 트러스 디테일 */}
        <TrussBeam args={[0.22, g.archBraceLength, 0.22]} position={[0, g.archY / 2, 0]} rotation={[0, 0, -g.archBraceAngle]} color={THEME.rmgcOrange} />
        <TrussBeam args={[0.22, g.archBraceLength, 0.22]} position={[0, g.archY / 2, 0]} rotation={[0, 0, g.archBraceAngle]} color={THEME.rmgcOrange} />
        {/* 캔틸레버 지지 대각 스트럿 — 오버행 구간을 떠받치는 양옆 브레이스 */}
        <TrussBeam
          args={[0.2, g.cantileverStrutLength, 0.2]}
          position={[(g.legTopX + g.cantileverTip) / 2, g.archY - g.cantileverDy / 2, 0]}
          rotation={[0, 0, -g.cantileverStrutAngle]}
          color={THEME.rmgcOrange}
        />
        <TrussBeam
          args={[0.2, g.cantileverStrutLength, 0.2]}
          position={[-(g.legTopX + g.cantileverTip) / 2, g.archY - g.cantileverDy / 2, 0]}
          rotation={[0, 0, g.cantileverStrutAngle]}
          color={THEME.rmgcOrange}
        />

        {/* Failover 경고등 — half='LAND' 인스턴스가 고장 상태일 때만 빨갛게 점멸(useFrame에서 visible/emissive 제어) */}
        {half === 'LAND' && (
          <mesh ref={beacon} position={[0, g.archY + 0.4, 0]} visible={false}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#ff2b2b" emissive="#ff2b2b" emissiveIntensity={1.2} />
          </mesh>
        )}

        <group ref={trolley} position={[0, g.archY, 0]}>
          <mesh>
            <boxGeometry args={[0.4, 0.18, 0.4]} />
            <meshStandardMaterial color={THEME.rmgcOrange} transparent opacity={0.4} emissive={THEME.rmgcOrange} emissiveIntensity={0.6} />
            <Edges color={THEME.rmgcOrange} />
          </mesh>
          <mesh ref={rope}>
            <cylinderGeometry args={[0.018, 0.018, 1, 6]} />
            <meshStandardMaterial color={THEME.rmgcOrange} emissive={THEME.rmgcOrange} emissiveIntensity={0.7} />
          </mesh>
          <mesh ref={hoist} castShadow>
            {/* 와이어 집게 프레임 */}
            <boxGeometry args={[0.55, 0.12, 0.85]} />
            <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.7} />
            <Edges color="#fff3d6" />
            {[
              [-0.24, -0.38],
              [0.24, -0.38],
              [-0.24, 0.38],
              [0.24, 0.38],
            ].map(([px, pz]) => (
              <mesh key={`${px}-${pz}`} position={[px, -0.12, pz]}>
                <cylinderGeometry args={[0.02, 0.02, 0.12, 6]} />
                <meshStandardMaterial color="#fff3d6" emissive="#fff3d6" emissiveIntensity={0.8} />
              </mesh>
            ))}
            <mesh ref={cargo} position={[0, -0.32, 0]} visible={false}>
              <boxGeometry args={[0.48, 0.36, 0.75]} />
              <meshStandardMaterial color={cargoColor} roughness={0.7} />
              <Edges color="#fff3d6" />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  )
}
