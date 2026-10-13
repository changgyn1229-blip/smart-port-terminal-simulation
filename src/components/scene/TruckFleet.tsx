import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'
import { landTruckLoopWaypoints, landSpurs, STOP_LINE_DISTANCE, inGateCrossPoint, outGateCrossPoint } from '../../data/landTruckLoop'
import { simStats } from '../../data/simStats'
import type { BerthChannel } from './AgvFleet'

interface Props {
  landSignals: { current: Record<number, BerthChannel> }
}

const TRUCK_COUNT = 11 // 9개 구역(Columns 1~9) 규모에 맞춘 대수
const WORLD_SPEED = 2.0 // 초당 이동 거리(월드 단위) — 정상 순항 시 최대 속도

// 안전거리 — 캐빈+트레일러 전체 길이(캡 전면 z=1.45 ~ 트레일러 후미 z=-1.75, 실측 ≈3.2)에 여유를
// 더한 Bounding-Box 기준 실거리(월드 단위). 화물을 실은(Loaded) 트럭은 제동거리가 더 필요하므로
// 배수를 더 크게 확보한다.
const TRUCK_LENGTH = 3.5
const MIN_SAFE_DISTANCE_EMPTY = TRUCK_LENGTH + 1.0 // 4.5
const MIN_SAFE_DISTANCE_LOADED = MIN_SAFE_DISTANCE_EMPTY * 1.6 // 7.2
const SLOWDOWN_FACTOR = 4.0 // 안전거리의 이 배수부터 감속을 시작해 안전거리에서 완전히 멈춘다(Stop & Go)

const MAX_WAIT = 14 // 초 — 육측 RMGC의 핸드오프 신호가 오지 않을 경우의 안전 타임아웃.
const CAB_WHEEL_Z = [1.0]
const TRAILER_WHEEL_Z = [-0.1, -1.0, -1.9]

// 견인차(캡)가 트레일러보다 먼저 회전하고, 트레일러는 관절(힌지)처럼 뒤늦게 방향을 따라잡는 정도
const TRAILER_YAW_LAG_RATE = 4.5
const CAB_YAW_RATE = 3.2 // 정차/출차 시 헤딩 피벗 속도 — 트레일러 래그(4.5)보다 느려 캡이 자연스럽게 리드한다

// 정차 헤딩 — 트럭은 순항 레인에서 90도 꺾어 LSTP 베이로 "후진 주차"한다(실제 항만 사진 참고 —
// 트레일러/화물 쪽이 크레인·야드를 향하고, 캡(머리)은 게이트/도로 쪽을 향해 뒤에 남는다).
// heading=0은 +Z(게이트 방향, 야드 반대쪽)를 바라보는 자세.
const PARK_HEADING = 0
const CAB_YAW_LAG = CAB_YAW_RATE

// 출차 곡선 우회전(EXIT_TURN) — 베이에서 직진으로 빠져나와 분기점(branch)에 도달한 뒤, 순항
// 레인 헤딩으로 부드럽게 꺾이며 합류하는 구간의 소요 시간. 이 구간 동안은 매 프레임 "현재 헤딩
// 방향으로 실제 이동"시키는 운동학적 적분(위치 += 방향벡터 * 속도 * delta) 방식을 써서, 회전이
// 이동 방향을 그대로 만들어내도록 한다 — 그래서 회전과 이동 궤적이 어긋나 "게걸음"처럼 보이는
// 현상이 구조적으로 발생할 수 없다.
const EXIT_TURN_DURATION = 0.9

function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2))
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t
}

function findClosestT(curve: THREE.CatmullRomCurve3, target: THREE.Vector3, samples = 800) {
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

// prev->next 구간(단방향 순환, 0/1 wrap 가능)이 target t를 가로질렀는지 판정 — TAT 게이트 통과 감지용
function crossedT(prev: number, next: number, target: number): boolean {
  if (next >= prev) return target > prev && target <= next
  return target > prev || target <= next
}

type TruckPhase = 'CRUISING' | 'ENTERING_SPUR' | 'STOPPED' | 'EXITING_SPUR' | 'EXIT_TURN'

interface TruckState {
  t: number // 메인 루프 파라미터 — CRUISING 중에만 갱신되고, 스퍼 진입 시 분기점에 고정된다(Lock)
  phase: TruckPhase
  waitTimer: number
  carrying: boolean
  nextStopIndex: number
  spurTimer: number
  spurIdx: number | null // 현재 진입/정차/이탈/우회전 중인 블록의 landSpurs 인덱스
  turnTimer: number // EXIT_TURN 전용 — 우회전 진행 시간
  turnPos: THREE.Vector3 | null // EXIT_TURN 전용 — 매 프레임 헤딩 방향으로 직접 적분되는 실제 위치
  turnHeading: number // EXIT_TURN 전용 — 현재 프레임의 목표 헤딩(진행 방향과 항상 일치)
  cabRotY: number
  trailerRotY: number
  cabGroup: THREE.Group | null
  trailerGroup: THREE.Group | null
  cargoMesh: THREE.Mesh | null
  tatStartTime: number | null
}

// 육측(Red Zone) 외부트럭 편대 — 게이트 IN -> 육측 순항 레인(mainLaneZ) -> 야드 서쪽 U턴 -> OUT
// 레인 -> 게이트 순으로 폐곡선을 단방향 순환한다. 개별 블록의 LSTP는 이 순항 레인 위에 직접 있지
// 않고, landSpurs로 정의된 짧은 가지 도로로 "분기(branch)"해 들어간다 — 가이드 다이어그램의
// U턴 루프 + 블록별 분기 구조를 그대로 구현한 것.
//
// 상태 기계: CRUISING(순항) -> ENTERING_SPUR(분기점에서 베이로 헤딩을 피벗하며 진입, t 고정) ->
// STOPPED(베이에서 핸드오프 대기) -> EXITING_SPUR(정차 헤딩 그대로 베이->분기점 직진, t 고정) ->
// EXIT_TURN(분기점에서 순항 헤딩으로 곡선 우회전하며 실제 위치를 헤딩 방향으로 직접 적분) ->
// CRUISING 재개(적분된 위치에서 가장 가까운 루프 t를 재탐색해 스냅 없이 합류). ENTERING/STOPPED/
// EXITING/EXIT_TURN 동안 메인 루프 t를 분기점에 고정해두는 것은 기존 LAUNCHING 단계의 "Exit
// Clearance Zone Lock"과 동일한 이유 — 뒤따르는 트럭의 안전거리 판정이 항상 "루프 위 고정된
// 지점"을 기준으로 동작해야 인덱스 순서 불변식이 깨지지 않는다.
//
// 겹침 방지는 두 겹으로 동작한다:
//  1) 차간 안전거리 — 앞차(링 순서 기준)와의 실거리가 MIN_SAFE_DISTANCE 밑으로 좁혀지면 감속하다가
//     정지한다.
//  2) LSTP 베이 예약(reserved) — 목표 블록의 베이가 이미 다른 트럭에게 예약돼 있으면(분기~정차~이탈
//     전체 구간) 분기점 앞 정지선에서 완전히 멈춰 대기한다.
export function TruckFleet({ landSignals }: Props) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(landTruckLoopWaypoints.map((p) => new THREE.Vector3(...p)), true, 'catmullrom', 0.4),
    [],
  )
  const loopLength = useMemo(() => curve.getLength(), [curve])
  const stopXs = useMemo(() => landSpurs.map((s) => s.x), [])
  const branchPoints = useMemo(() => landSpurs.map((s) => new THREE.Vector3(...s.branch)), [])
  const bayPoints = useMemo(() => landSpurs.map((s) => new THREE.Vector3(...s.bay)), [])
  const branchTs = useMemo(() => branchPoints.map((p) => findClosestT(curve, p)), [curve, branchPoints])
  const branchHeadings = useMemo(
    () =>
      branchTs.map((t) => {
        const tangent = curve.getTangentAt(t)
        return Math.atan2(tangent.x, tangent.z)
      }),
    [curve, branchTs],
  )
  // 스퍼 깊이(순항 레인 <-> 베이 사이 거리)는 모든 블록에서 동일 — 첫 블록 값으로 대표한다
  const spurDuration = useMemo(() => {
    const depth = Math.abs(landSpurs[0].branch[2] - landSpurs[0].bay[2])
    return Math.max(0.4, depth / WORLD_SPEED)
  }, [])
  // TAT 측정 기준 t — IN/OUT 게이트 프레임 통과 지점
  const inGateT = useMemo(() => findClosestT(curve, new THREE.Vector3(...inGateCrossPoint)), [curve])
  const outGateT = useMemo(() => findClosestT(curve, new THREE.Vector3(...outGateCrossPoint)), [curve])

  const states = useRef<TruckState[]>(
    Array.from({ length: TRUCK_COUNT }).map((_, i) => {
      const t = i / TRUCK_COUNT
      const tangent = curve.getTangentAt(t)
      const initialHeading = Math.atan2(tangent.x, tangent.z)
      return {
        t,
        phase: 'CRUISING',
        waitTimer: 0,
        carrying: false,
        nextStopIndex: i % stopXs.length,
        spurTimer: 0,
        spurIdx: null,
        turnTimer: 0,
        turnPos: null,
        turnHeading: initialHeading,
        cabRotY: initialHeading,
        trailerRotY: initialHeading,
        cabGroup: null,
        trailerGroup: null,
        cargoMesh: null,
        tatStartTime: null,
      }
    }),
  )

  useFrame(({ clock }, delta) => {
    const trucks = states.current
    const now = clock.elapsedTime

    for (const x of stopXs) {
      landSignals.current[x] ??= { agvPresent: false, agvCarrying: false, handoffDone: false, reserved: false }
    }

    // 1. 정차 중인(STOPPED) 트럭 — 육측 RMGC의 handoffDone 신호를 이벤트 기반으로 대기
    for (const s of trucks) {
      if (s.phase !== 'STOPPED' || s.spurIdx === null) continue
      const channel = landSignals.current[stopXs[s.spurIdx]]
      channel.agvPresent = true
      channel.agvCarrying = s.carrying
      s.waitTimer += delta

      if (channel.handoffDone || s.waitTimer >= MAX_WAIT) {
        channel.handoffDone = false
        channel.agvPresent = false
        s.carrying = !s.carrying
        s.phase = 'EXITING_SPUR'
        s.spurTimer = 0
      }
    }

    // 1.5 스퍼 진입/이탈 중인 트럭 — 국소 타이머만 전진. 메인 루프 t는 분기점에 고정된 채 유지된다.
    for (const s of trucks) {
      if (s.phase === 'ENTERING_SPUR') {
        s.spurTimer += delta
        if (s.spurTimer >= spurDuration) {
          s.phase = 'STOPPED'
          s.waitTimer = 0
        }
      } else if (s.phase === 'EXITING_SPUR') {
        // Phase 1(직진 출차) — 베이 연석을 완전히 빠져나올 때까지는 정차 헤딩(PARK_HEADING) 그대로
        // 직진만 한다(회전 없음). 베이를 완전히 벗어난 이 시점에 예약을 해제해 다음 트럭이 진입할 수 있게 한다.
        s.spurTimer += delta
        if (s.spurTimer >= spurDuration) {
          if (s.spurIdx !== null) landSignals.current[stopXs[s.spurIdx]].reserved = false
          s.phase = 'EXIT_TURN'
          s.turnTimer = 0
          s.turnPos = s.spurIdx !== null ? branchPoints[s.spurIdx].clone() : null
          s.turnHeading = PARK_HEADING
        }
      } else if (s.phase === 'EXIT_TURN') {
        // Phase 2(곡선 우회전) — 헤딩을 PARK_HEADING에서 순항 레인 헤딩으로 서서히 돌리면서, 매
        // 프레임 "그 순간의 헤딩 방향"으로 위치를 직접 적분한다. 이동은 항상 회전이 가리키는
        // 방향으로만 일어나므로 미끄러지듯 보이는 현상이 원천적으로 생길 수 없다.
        s.turnTimer += delta
        const targetHeading = s.spurIdx !== null ? branchHeadings[s.spurIdx] : s.turnHeading
        const progress = THREE.MathUtils.clamp(s.turnTimer / EXIT_TURN_DURATION, 0, 1)
        s.turnHeading = lerpAngle(PARK_HEADING, targetHeading, THREE.MathUtils.smoothstep(progress, 0, 1))
        if (s.turnPos) {
          const dir = new THREE.Vector3(Math.sin(s.turnHeading), 0, Math.cos(s.turnHeading))
          s.turnPos.addScaledVector(dir, WORLD_SPEED * delta)
        }
        if (s.turnTimer >= EXIT_TURN_DURATION) {
          // Phase 3(출구 주행 합류) — 실제로 적분된 위치에서 가장 가까운 루프 t를 다시 찾아 순항을
          // 재개한다. 곡선 끝점을 t로 역산해 스냅하는 게 아니라 "실제로 도달한 위치"를 기준으로
          // 삼기 때문에 CRUISING 전환 시 위치가 튀지 않는다.
          s.t = s.turnPos ? findClosestT(curve, s.turnPos) : s.t
          s.spurIdx = null
          s.turnPos = null
          s.phase = 'CRUISING'
        }
      }
    }

    // 2. 순항 중인 트럭 이동 — 안전거리 Stop & Go + LSTP 베이 예약(reserved) 판정
    const minGapT = (loaded: boolean) => (loaded ? MIN_SAFE_DISTANCE_LOADED : MIN_SAFE_DISTANCE_EMPTY) / loopLength
    const stopLineOffsetT = STOP_LINE_DISTANCE / loopLength

    for (let i = 0; i < TRUCK_COUNT; i++) {
      const s = trucks[i]
      if (s.phase !== 'CRUISING') continue
      const prevT = s.t

      const requiredGapT = minGapT(s.carrying)
      const slowdownGapT = requiredGapT * SLOWDOWN_FACTOR

      const ahead = trucks[(i - 1 + TRUCK_COUNT) % TRUCK_COUNT]
      let currentGap = ahead.t - s.t
      if (currentGap < 0) currentGap += 1
      const speedScale = THREE.MathUtils.clamp((currentGap - requiredGapT) / (slowdownGapT - requiredGapT), 0, 1)

      let desiredT = s.t + (WORLD_SPEED * speedScale * delta) / loopLength

      // 앞차 안전거리 하드 클램프
      let gapToAhead = ahead.t - desiredT
      if (gapToAhead < 0) gapToAhead += 1
      if (gapToAhead < requiredGapT) {
        let clamped = ahead.t - requiredGapT
        if (clamped < 0) clamped += 1
        desiredT = clamped
      }

      const desiredUnwrapped = desiredT < s.t ? desiredT + 1 : desiredT
      const targetIdx = s.nextStopIndex
      const targetX = stopXs[targetIdx]
      const targetT = branchTs[targetIdx]
      const targetUnwrapped = targetT < s.t ? targetT + 1 : targetT
      const stopLineUnwrapped = targetUnwrapped - stopLineOffsetT

      const slotReserved = !!landSignals.current[targetX]?.reserved

      if (slotReserved) {
        // LSTP 베이 예약 중 — 앞 트럭이 스퍼를 완전히 비울 때까지 분기점 앞 정지선에서 대기
        const cappedUnwrapped = Math.min(desiredUnwrapped, stopLineUnwrapped)
        s.t = ((cappedUnwrapped % 1) + 1) % 1
      } else if (desiredUnwrapped >= targetUnwrapped) {
        // 분기점 도달 — 스퍼 진입 확정. 같은 프레임 내 경쟁을 막기 위해 reserved를 즉시 세운다.
        s.t = targetUnwrapped % 1
        s.phase = 'ENTERING_SPUR'
        s.spurTimer = 0
        s.spurIdx = targetIdx
        s.waitTimer = 0
        landSignals.current[targetX].reserved = true
        s.nextStopIndex = (s.nextStopIndex + 1) % stopXs.length
      } else {
        s.t = ((desiredT % 1) + 1) % 1
      }

      // KPI — IN 게이트 통과 시 TAT 타이머 시작, OUT 게이트 통과 시 종료해 누적
      if (crossedT(prevT, s.t, inGateT)) {
        s.tatStartTime = now
      }
      if (crossedT(prevT, s.t, outGateT) && s.tatStartTime !== null) {
        simStats.truckTatSum += now - s.tatStartTime
        simStats.truckTatCount += 1
        s.tatStartTime = null
      }
    }

    // 3. 시각 반영 — 캡(견인차)이 헤딩을 리드하고, 트레일러는 같은 지점(힌지)에서 회전만 지연 추종.
    const trailerLagFactor = 1 - Math.exp(-TRAILER_YAW_LAG_RATE * delta)
    const cabYawFactor = 1 - Math.exp(-CAB_YAW_LAG * delta)
    for (const s of trucks) {
      let hitchPos: THREE.Vector3

      if (s.phase === 'EXIT_TURN') {
        // 곡선 우회전 구간 — 위치는 이미 위 상태머신 단계에서 헤딩 방향으로 직접 적분되었으므로,
        // 여기서는 그 결과(turnPos/turnHeading)를 그대로 반영하기만 한다(회전을 별도로 lerp하지 않음).
        hitchPos = s.turnPos ?? (s.spurIdx !== null ? branchPoints[s.spurIdx] : curve.getPointAt(s.t))
        s.cabRotY = s.turnHeading
      } else if (s.spurIdx !== null && s.phase !== 'CRUISING') {
        const branch = branchPoints[s.spurIdx]
        const bay = bayPoints[s.spurIdx]
        if (s.phase === 'STOPPED') {
          hitchPos = bay
          s.cabRotY = lerpAngle(s.cabRotY, PARK_HEADING, cabYawFactor)
        } else if (s.phase === 'ENTERING_SPUR') {
          const raw = THREE.MathUtils.clamp(s.spurTimer / spurDuration, 0, 1)
          const progress = THREE.MathUtils.smoothstep(raw, 0, 1)
          hitchPos = branch.clone().lerp(bay, progress)
          // 진입 시엔 정차 헤딩(PARK_HEADING, 머리가 게이트 쪽)으로 피벗하며 후진 주차
          s.cabRotY = lerpAngle(s.cabRotY, PARK_HEADING, cabYawFactor)
        } else {
          // EXITING_SPUR(Phase 1, 직진 출차) — 베이 -> 분기점으로 곧장 +Z 방향 직진. 실제 이동
          // 방향(PARK_HEADING)과 회전을 항상 정확히 일치시켜 미끄러지듯 보이는 현상을 방지한다.
          const raw = THREE.MathUtils.clamp(s.spurTimer / spurDuration, 0, 1)
          const progress = THREE.MathUtils.smoothstep(raw, 0, 1)
          hitchPos = branch.clone().lerp(bay, 1 - progress)
          s.cabRotY = PARK_HEADING
        }
      } else {
        hitchPos = curve.getPointAt(s.t)
        const tangent = curve.getTangentAt(s.t)
        s.cabRotY = Math.atan2(tangent.x, tangent.z)
      }

      s.trailerRotY = lerpAngle(s.trailerRotY, s.cabRotY, trailerLagFactor)

      if (s.cabGroup) {
        s.cabGroup.position.set(hitchPos.x, hitchPos.y, hitchPos.z)
        s.cabGroup.rotation.y = s.cabRotY
      }
      if (s.trailerGroup) {
        s.trailerGroup.position.set(hitchPos.x, hitchPos.y, hitchPos.z)
        s.trailerGroup.rotation.y = s.trailerRotY
      }
      if (s.cargoMesh) s.cargoMesh.visible = s.carrying
    }
  })

  return (
    <group>
      {Array.from({ length: TRUCK_COUNT }).map((_, i) => (
        <group key={i}>
          {/* 캡(견인차) — 힌지(hitch) 지점에 독립적으로 위치/회전. 방향 전환을 항상 먼저 리드한다 */}
          <group
            ref={(g) => {
              states.current[i].cabGroup = g
            }}
          >
            {CAB_WHEEL_Z.map((z) =>
              [-0.42, 0.42].map((x) => (
                <mesh key={`${x}-${z}`} position={[x, 0.14, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
                  <meshStandardMaterial color={THEME.inkFaint} />
                </mesh>
              )),
            )}

            {/* 캐빈 */}
            <mesh position={[0, 0.46, 1.15]} castShadow>
              <boxGeometry args={[0.72, 0.5, 0.6]} />
              <meshStandardMaterial color={THEME.surface2} transparent opacity={0.65} emissive={THEME.teal} emissiveIntensity={0.15} />
              <Edges color={THEME.teal} />
            </mesh>
            <mesh position={[-0.24, 0.5, 1.44]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#eafffb" emissive={THEME.accent} emissiveIntensity={1} />
            </mesh>
            <mesh position={[0.24, 0.5, 1.44]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#eafffb" emissive={THEME.accent} emissiveIntensity={1} />
            </mesh>
          </group>

          {/* 트레일러 — 같은 힌지 지점에서 캡과 독립적으로 회전(요 래그 적용) */}
          <group
            ref={(g) => {
              states.current[i].trailerGroup = g
            }}
          >
            {TRAILER_WHEEL_Z.map((z) =>
              [-0.42, 0.42].map((x) => (
                <mesh key={`${x}-${z}`} position={[x, 0.14, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
                  <meshStandardMaterial color={THEME.inkFaint} />
                </mesh>
              )),
            )}

            {/* 트레일러 베드 */}
            <mesh position={[0, 0.34, -0.55]} castShadow>
              <boxGeometry args={[0.78, 0.14, 2.4]} />
              <meshStandardMaterial color={THEME.inkFaint} roughness={0.8} />
              <Edges color={THEME.accent} />
            </mesh>

            {/* 트레일러 화물 컨테이너 — carrying 상태일 때만 표시 */}
            <mesh
              ref={(m) => {
                states.current[i].cargoMesh = m
              }}
              position={[0, 0.66, -0.55]}
              visible={false}
            >
              <boxGeometry args={[0.7, 0.5, 2.2]} />
              <meshStandardMaterial color={CONTAINER_COLORS[5]} roughness={0.7} />
              <Edges color="#fff3d6" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
