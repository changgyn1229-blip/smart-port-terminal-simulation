import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Text } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'
import { quayAgvLoopWaypoints, agvStopPoints } from '../../data/quayAgvLoop'
import { simStats } from '../../data/simStats'

// 핸드오프 채널 (x좌표 기준). "픽업/배송 대상"이 쓰는 필드(present/carrying)와
// 그 상대(크레인)가 쓰는 필드(handoffDone)로 나뉜 양방향 이벤트 채널.
// STS<->AGV, 해측RMGC<->AGV, 육측RMGC<->트럭 세 곳 모두 동일한 모양을 공유한다.
export interface BerthChannel {
  agvPresent: boolean
  agvCarrying: boolean
  handoffDone: boolean
  // Failover 상황에서 해측/육측 RMGC 두 크레인이 같은 채널을 동시에 볼 수 있을 때, 이미 한쪽이
  // 사이클을 시작했음을 표시해 다른 쪽의 중복 서비스(같은 AGV를 두 크레인이 동시에 처리)를 막는다.
  claimed?: boolean
  // AgvFleet/TruckFleet 전용 — 정차 지점(TP 슬롯/LSTP 스퍼) 도착을 "확정"하는 바로 그 프레임에
  // 즉시 세워, 같은 프레임 안에서 다른 AGV/트럭이 동일 지점으로 동시에 도착 확정하는 경쟁 상태를
  // 막는다. agvPresent(정차 완료 후 다음 루프에서 세팅)보다 먼저, 도착 판정과 같은 순간에 동작해야
  // 하므로 별도 필드로 분리했다. 크레인 쪽은 이 필드를 읽지 않는다(agvPresent/handoffDone 계약은 그대로 유지).
  reserved?: boolean
}

interface Props {
  berthSignals: { current: Record<number, BerthChannel> }
  yardSeaSignals: { current: Record<number, BerthChannel> }
  onFocusHero: () => void
}

// AGV 편대가 STS 15기 하부 정차선을 균등 순환(라운드 로빈)한다 — 정차 목록(agvStopPoints)이
// 15개 STS + 9개 야드 해측 TP(총 24곳)를 고정 순서로 반복 방문하므로, 특정 크레인에 쏠리지 않고
// 모든 STS 크레인 아래에 항상 여러 대가 골고루 분산돼 작업한다.
const AGV_COUNT = 16
const WORLD_SPEED = 1.7 // 초당 이동 거리(월드 단위) — 정상 순항 시 최대 속도
const MIN_GAP = 0.045 // 앞차와의 최소 arc-length 간격(t, 0~1) — 충돌 방지 안전거리
const SLOWDOWN_GAP = MIN_GAP * 4 // 이 간격부터 감속을 시작해 MIN_GAP에서 완전 정지하는 Stop & Go 구간
const MAX_WAIT = 14 // 초 — 상대(크레인)의 핸드오프 신호가 오지 않을 경우의 안전 타임아웃.
// RMGC 사이클 시간은 storageZ<->tpZ 거리에 비례해 동적으로 산출되며, 확장된 야드 규격에서
// 최장 사이클(육측 RECEIVE)이 ≈10초에 달하므로 정상 동작 중에는 절대 걸리지 않도록 여유 있게 설정.

// 차선 변경(추월) — 앞차가 정차(STOPPED)로 오래 막혀 있을 때, L2(중앙 주행로) 쪽으로 옆으로
// 비켜서 추월한 뒤 원래 레인으로 부드럽게 복귀한다. 위치는 그대로 t로 계산하고, 그 위에 곡선
// 접선의 수직 방향으로 lerp된 오프셋을 더해 시각적으로만 차선을 넘나든다(물리 경로는 단일 폐곡선
// 그대로 유지 — 실제 t 진행/안전거리 로직은 건드리지 않아 기존 충돌 방지 보장이 깨지지 않는다).
const BLOCKED_TRIGGER_SEC = 1.2 // 이만큼 계속 막혀 있으면 추월 시작
const LANE_CHANGE_OFFSET = 1.6 // 옆 차선으로 비켜서는 횡방향 거리(월드 단위)
const LANE_CHANGE_RATE = 4.0 // 오프셋 lerp 속도
const OVERTAKE_CLEAR_GAP = MIN_GAP * 3 // 이만큼 앞질렀다고 판단되면 원래 차선으로 복귀 시작

// AGV 차체 Y축 스냅 — 바퀴 반지름(0.12)에서 위로 정확히 누적해 뜨거나 파묻히지 않도록 정렬
const WHEEL_RADIUS = 0.12
const AGV_BODY_HEIGHT = 0.28
const AGV_BODY_Y = WHEEL_RADIUS * 2 + AGV_BODY_HEIGHT / 2 // 0.38, 베드 바닥이 바퀴 상단(0.24)에 정확히 얹힌다
const AGV_BUMPER_Y = 0.28
const AGV_CONSOLE_Y = AGV_BODY_Y + AGV_BODY_HEIGHT / 2 + 0.11 // 베드 상단 위 콘솔
const AGV_HEADLIGHT_Y = 0.58
const AGV_CARGO_Y = AGV_BODY_Y + AGV_BODY_HEIGHT / 2 + 0.17 // 베드 상단에 정확히 얹히는 컨테이너 중심

// 바퀴 8개 — 전/후 듀얼 페어 (실제 항만 AGV 사진 참고)
const WHEEL_POSITIONS: [number, number][] = [
  [-0.5, -0.34],
  [-0.36, -0.34],
  [0.36, -0.34],
  [0.5, -0.34],
  [-0.5, 0.34],
  [-0.36, 0.34],
  [0.36, 0.34],
  [0.5, 0.34],
]

// 폐곡선 위에서 targetPoint에 가장 가까운 arc-length 파라미터(t)를 탐색 (정차 지점 좌표 -> t 매핑)
function findClosestT(curve: THREE.CatmullRomCurve3, target: THREE.Vector3, samples = 500) {
  let bestT = 0
  let bestDist = Infinity
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const d = curve.getPointAt(t).distanceToSquared(target)
    if (d < bestDist) {
      bestDist = d
      bestT = t
    }
  }
  return bestT
}

type OvertakeState = 'NONE' | 'ENGAGING' | 'HOLDING' | 'MERGING'

interface AgvState {
  t: number
  phase: 'CRUISING' | 'STOPPED'
  waitTimer: number
  carrying: boolean
  nextStopIndex: number
  stoppedAt: { x: number; kind: 'STS' | 'YARD_SEA' } | null
  overtake: OvertakeState
  blockedTimer: number
  laneOffset: number // L1/L3 기준 L2 쪽으로 비켜선 정도(0 = 제 차선)
  group: THREE.Group | null
  cargoMesh: THREE.Mesh | null
  lightL: THREE.Mesh | null
  lightR: THREE.Mesh | null
}

// 해측 TP(오렌지 존) 전용 AGV 순환 편대.
// 폐곡선 루프를 단방향으로만 순환하며, STS 하부 정차선과 야드 해측 TP 정차선을 루프 순서대로 번갈아 들른다.
// 정차할 때마다 그 지점 성격(STS/해측RMGC)에 맞는 채널에 자기 상태(present/carrying)를 기록하고,
// 상대가 handoffDone을 세우는 즉시(이벤트 기반, 고정 대기시간 아님) 화물 상태를 뒤집고 바로 출발한다 —
// 이 토글이 매 정차마다 자연스럽게 양하/선적을 교대시킨다.
// 각 AGV는 앞차(i-1)와의 arc-length 간격을 MIN_GAP 이상으로 유지해(추월 없음) 충돌을 방지한다.
export function AgvFleet({ berthSignals, yardSeaSignals, onFocusHero }: Props) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(quayAgvLoopWaypoints.map((p) => new THREE.Vector3(...p)), true, 'catmullrom', 0.4),
    [],
  )
  const loopLength = useMemo(() => curve.getLength(), [curve])
  const stopTs = useMemo(() => agvStopPoints.map((s) => findClosestT(curve, new THREE.Vector3(...s.point))), [curve])

  const states = useRef<AgvState[]>(
    Array.from({ length: AGV_COUNT }).map((_, i) => ({
      t: i / AGV_COUNT,
      phase: 'CRUISING',
      waitTimer: 0,
      carrying: false,
      nextStopIndex: 0,
      stoppedAt: null,
      overtake: 'NONE',
      blockedTimer: 0,
      laneOffset: 0,
      group: null,
      cargoMesh: null,
      lightL: null,
      lightR: null,
    })),
  )

  const channelFor = (kind: 'STS' | 'YARD_SEA') => (kind === 'STS' ? berthSignals : yardSeaSignals)

  useFrame(({ clock }, delta) => {
    const agvs = states.current

    // 채널 존재 보장 (첫 프레임 등 상대가 먼저 읽는 경우 대비)
    for (const s of agvStopPoints) {
      channelFor(s.kind).current[s.x] ??= { agvPresent: false, agvCarrying: false, handoffDone: false, reserved: false }
    }

    // 1. 정차 중인 AGV — 상대(크레인)의 handoffDone 신호를 이벤트 기반으로 대기
    for (const s of agvs) {
      if (s.phase !== 'STOPPED' || s.stoppedAt === null) continue
      const channel = channelFor(s.stoppedAt.kind).current[s.stoppedAt.x]
      channel.agvPresent = true
      channel.agvCarrying = s.carrying
      s.waitTimer += delta

      if (channel.handoffDone || s.waitTimer >= MAX_WAIT) {
        channel.handoffDone = false
        channel.agvPresent = false
        channel.reserved = false
        s.carrying = !s.carrying // 양하: 빈 차 -> 적재 / 선적: 적재 차 -> 빈 차, 핸드오프 즉시 반영
        s.stoppedAt = null
        s.phase = 'CRUISING'
      }
    }

    // 2. 순항 중인 AGV 이동 — 다음 정차 지점 도달 판정 + Stop & Go 안전거리 제어 + 정차 지점 예약(reserved)
    // + 유연한 차선 변경(추월). 앞차와의 간격이 SLOWDOWN_GAP 밑으로 좁혀지면 속도를 비례 감속하다가
    // MIN_GAP에서 멈추는데, 앞차가 정차(STOPPED)로 오래 막혀 있으면 L2 쪽으로 추월(overtake)해
    // 빠져나간다 — 추월 중에는 앞차 안전거리 클램프를 해제하고 정상 속도로 통과한다(횡방향 오프셋으로
    // 시각적으로 옆 차선에 있으므로 실제로는 부딪히지 않는다). 같은 정차 지점을 여러 AGV가 동시에
    // 노릴 수 있으므로(모든 AGV가 같은 순서로 정차 목록을 순회), reserved 플래그로 "이미 그 자리를
    // 향해 확정한 AGV가 있는지"를 확인해 두 대가 같은 좌표에 동시에 스냅되는 경쟁 상태(겹침)를 막는다.
    const stopLineT = MIN_GAP * 1.5
    for (let i = 0; i < AGV_COUNT; i++) {
      const s = agvs[i]
      if (s.phase !== 'CRUISING') continue

      const ahead = agvs[(i - 1 + AGV_COUNT) % AGV_COUNT]
      let currentGap = ahead.t - s.t
      if (currentGap < 0) currentGap += 1

      const stop = agvStopPoints[s.nextStopIndex]
      const targetT = stopTs[s.nextStopIndex]
      const targetUnwrapped = targetT < s.t ? targetT + 1 : targetT
      const stopLineUnwrapped = targetUnwrapped - stopLineT
      const targetChannel = channelFor(stop.kind).current[stop.x]

      // 추월 상태 갱신 — 내 목적지와 앞차가 멈춰 있는 지점이 같다면(어차피 그 자리로 가야 하므로)
      // 추월해도 의미가 없어 시도하지 않는다.
      const blockedByAheadStopped = ahead.phase === 'STOPPED' && !(ahead.stoppedAt?.x === stop.x && ahead.stoppedAt?.kind === stop.kind)
      if (s.overtake === 'NONE') {
        const rawSpeedScale = THREE.MathUtils.clamp((currentGap - MIN_GAP) / (SLOWDOWN_GAP - MIN_GAP), 0, 1)
        if (rawSpeedScale < 0.12 && blockedByAheadStopped) {
          s.blockedTimer += delta
          if (s.blockedTimer >= BLOCKED_TRIGGER_SEC) {
            s.overtake = 'ENGAGING'
            s.blockedTimer = 0
          }
        } else {
          s.blockedTimer = 0
        }
      } else if (s.overtake === 'HOLDING') {
        let leadGap = s.t - ahead.t
        if (leadGap < 0) leadGap += 1
        if (leadGap > OVERTAKE_CLEAR_GAP && leadGap < 0.5) s.overtake = 'MERGING'
      }

      const overtaking = s.overtake !== 'NONE'
      const speedScale = overtaking ? 1 : THREE.MathUtils.clamp((currentGap - MIN_GAP) / (SLOWDOWN_GAP - MIN_GAP), 0, 1)

      // KPI — 이번 프레임 이동 "의도" 거리를 누적(하드 클램프로 실제 덜 이동해도 근사치로 충분)
      simStats.agvDistanceTotal += WORLD_SPEED * speedScale * delta

      let desiredT = s.t + (WORLD_SPEED * speedScale * delta) / loopLength

      // 앞차 안전거리 하드 클램프 — 추월 중(횡방향으로 비켜선 상태)에는 적용하지 않는다
      if (!overtaking) {
        let gapToAhead = ahead.t - desiredT
        if (gapToAhead < 0) gapToAhead += 1
        if (gapToAhead < MIN_GAP) {
          let clamped = ahead.t - MIN_GAP
          if (clamped < 0) clamped += 1
          desiredT = clamped
        }
      }

      const desiredUnwrapped = desiredT < s.t ? desiredT + 1 : desiredT

      if (!overtaking && targetChannel?.reserved) {
        // 이미 다른 AGV가 이 정차 지점을 확정했다 — 정지선에서 대기
        const cappedUnwrapped = Math.min(desiredUnwrapped, stopLineUnwrapped)
        s.t = ((cappedUnwrapped % 1) + 1) % 1
      } else if (desiredUnwrapped >= targetUnwrapped) {
        // 도착 확정 — 같은 프레임 내 다른 AGV와의 경쟁을 막기 위해 reserved를 즉시 세운다
        s.t = targetUnwrapped % 1
        s.phase = 'STOPPED'
        s.waitTimer = 0
        s.stoppedAt = { x: stop.x, kind: stop.kind }
        s.nextStopIndex = (s.nextStopIndex + 1) % agvStopPoints.length
        s.overtake = 'NONE'
        if (targetChannel) targetChannel.reserved = true
        simStats.agvTripCount += 1
      } else {
        s.t = ((desiredT % 1) + 1) % 1
      }
    }

    // 3. 시각 반영 — 차선 오프셋을 목표값으로 부드럽게 lerp한 뒤, 곡선 접선의 수직 방향으로 더해
    // 실제로 옆 차선에 있는 것처럼 표현한다.
    const laneLerpFactor = 1 - Math.exp(-LANE_CHANGE_RATE * delta)
    for (const s of agvs) {
      const targetOffset = s.overtake === 'ENGAGING' || s.overtake === 'HOLDING' ? LANE_CHANGE_OFFSET : 0
      s.laneOffset = THREE.MathUtils.lerp(s.laneOffset, targetOffset, laneLerpFactor)
      if (s.overtake === 'ENGAGING' && Math.abs(s.laneOffset - LANE_CHANGE_OFFSET) < 0.03) s.overtake = 'HOLDING'
      if (s.overtake === 'MERGING' && Math.abs(s.laneOffset) < 0.03) {
        s.laneOffset = 0
        s.overtake = 'NONE'
      }

      const pos = curve.getPointAt(s.t)
      const tangent = curve.getTangentAt(s.t)
      if (s.laneOffset > 0.001) {
        // 접선의 수직(왼쪽) 벡터 — L1<->L3 사이 루프 내측(L2 방향)을 향하도록 일관되게 계산된다
        const perpX = -tangent.z
        const perpZ = tangent.x
        pos.x += perpX * s.laneOffset
        pos.z += perpZ * s.laneOffset
      }
      if (s.group) {
        s.group.position.set(pos.x, pos.y, pos.z)
        if (s.phase === 'CRUISING') {
          s.group.rotation.y = Math.atan2(tangent.x, tangent.z)
        }
      }
      if (s.cargoMesh) s.cargoMesh.visible = s.carrying
      const pulse = 0.5 + Math.abs(Math.sin(clock.getElapsedTime() * 4)) * 1.3
      if (s.lightL) (s.lightL.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
      if (s.lightR) (s.lightR.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
    }
  })

  return (
    <group>
      {/* 순환 경로 가이드라인은 TerminalCanvas가 동일 곡선(quayAgvLoopWaypoints) 위에
          굵은 블루 실선(RoadWithLanes)으로 그린다 — 여기서 별도로 중복 렌더링하지 않는다 */}

      {Array.from({ length: AGV_COUNT }).map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            states.current[i].group = g
          }}
          onClick={
            i === 0
              ? (e) => {
                  e.stopPropagation()
                  onFocusHero()
                }
              : undefined
          }
        >
          {/* 바퀴 8개 (앞/뒤 듀얼 페어) — 실제 항만 AGV 사진 참고, 어두운 회색 */}
          {WHEEL_POSITIONS.map(([x, z]) => (
            <mesh key={`${x}-${z}`} position={[x, 0.12, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.12, 0.12, 0.11, 14]} />
              <meshStandardMaterial color="#1c2023" roughness={0.75} />
            </mesh>
          ))}

          {/* 메인 차체 — 선명한 블루, 길쭉하고 평평한 베드 (바퀴 상단에 정확히 스냅) */}
          <mesh position={[0, AGV_BODY_Y, 0]} castShadow>
            <boxGeometry args={[1.15, AGV_BODY_HEIGHT, 0.9]} />
            <meshStandardMaterial color="#0055D4" roughness={0.45} metalness={0.2} />
            <Edges color="#003a99" />
          </mesh>
          {/* 차체 번호 도장 — 실제 안벽 사진 참고(357/368/369 등), 차체 표면에 직접 도장된
              livery 넘버라 "장비 상단 플로팅 라벨 금지" 원칙과는 무관하다 */}
          <Text
            position={[0, AGV_BODY_Y + AGV_BODY_HEIGHT / 2 + 0.004, 0.12]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.2}
            color="#eafffb"
            anchorX="center"
            anchorY="middle"
          >
            {350 + i}
          </Text>

          {/* 전/후면 하단 안전 범퍼 — 노란색 바탕 + 검은색 경고 스트라이프 */}
          {[-0.5, 0.5].map((bz) => (
            <group key={bz} position={[0, AGV_BUMPER_Y, bz]}>
              <mesh>
                <boxGeometry args={[1.1, 0.16, 0.1]} />
                <meshStandardMaterial color="#f2c94c" roughness={0.6} />
              </mesh>
              {[-0.38, -0.13, 0.13, 0.38].map((sx) => (
                <mesh key={sx} position={[sx, 0, 0.052]}>
                  <boxGeometry args={[0.1, 0.17, 0.01]} />
                  <meshStandardMaterial color="#111214" />
                </mesh>
              ))}
            </group>
          ))}

          {/* 중앙 콘솔/전장 박스 */}
          <mesh position={[0, AGV_CONSOLE_Y, -0.05]}>
            <boxGeometry args={[0.6, 0.22, 0.5]} />
            <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.6} />
            <Edges color="#fff3d6" />
          </mesh>
          <mesh
            ref={(m) => {
              states.current[i].lightL = m
            }}
            position={[-0.5, AGV_HEADLIGHT_Y, 0.4]}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#eafffb" emissive={THEME.teal} emissiveIntensity={1} />
          </mesh>
          <mesh
            ref={(m) => {
              states.current[i].lightR = m
            }}
            position={[0.5, AGV_HEADLIGHT_Y, 0.4]}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#eafffb" emissive={THEME.teal} emissiveIntensity={1} />
          </mesh>

          {/* 적재 컨테이너 — 베드 상단에 정확히 스냅(뜨거나 파묻히지 않음) */}
          <mesh
            ref={(m) => {
              states.current[i].cargoMesh = m
            }}
            position={[0, AGV_CARGO_Y, 0]}
            visible={false}
          >
            <boxGeometry args={[0.9, 0.34, 0.66]} />
            <meshStandardMaterial color={CONTAINER_COLORS[4]} roughness={0.7} />
            <Edges color="#fff3d6" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
