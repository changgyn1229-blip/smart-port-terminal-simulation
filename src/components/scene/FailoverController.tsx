import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { simStats } from '../../data/simStats'

export interface FailoverState {
  blockXs: Set<number> // 현재 육측 RMGC가 고장 상태인 블록 X 집합 — 여러 블록이 동시에 포함될 수 있다
}

interface Props {
  blockXs: number[]
  failoverRef: { current: FailoverState }
}

// 블록별 정상 가동 구간(고장 사이 간격) — 기존 40초 "블록 1개씩 순차 고장"에서 큰 폭으로
// 단축하고, 아래에서 블록마다 독립된 위상(phase)으로 동시에 여러 블록이 겹쳐 고장 나도록 바꿔
// 오버패싱 발생 빈도를 대폭 높인다(작업 부하 분산·비상 장애 대응 연출 강화 목적).
const CYCLE_INTERVAL = 24
// 고장 지속 시간 — AgvFleet의 MAX_WAIT(14초, 상대 크레인 응답을 기다리는 안전 타임아웃)보다 짧게 잡아,
// 육측 RMGC가 확장 커버하는 동안 항상 실제로 핸드오프를 완료시킬 수 있도록 여유를 둔다.
const FAILURE_DURATION = 9

// 육측 RMGC 고장 시뮬레이터 — 블록 1개씩 순차로 고장 내던 기존 방식 대신, 블록마다 독립된 시작
// 위상을 CYCLE_INTERVAL 안에 고르게 분산해 여러 블록이 항상 동시에(overlap) "고장" 상태를
// 이루도록 한다(주기 24초 중 9초 = 블록당 37.5% 듀티, 9개 블록 기준 평균 3~4개 블록이 상시
// 동시 고장). failoverRef를 통해 신호를 내보내면, 같은 블록의 해측 RMGC(ArmgcGantry3D,
// half='SEA' — 더 높고 다리 간격이 넓은 Overpassing 규격)가 이를 감지해 가동 범위를 해측
// 절반(50%)에서 전체 블록(100%)으로 확장, 육측 크레인을 물리적으로 넘어 지나가(overpass) 육측
// LSTP의 트럭 인계까지 대신 처리한다.
export function FailoverController({ blockXs, failoverRef }: Props) {
  const timers = useRef<number[]>([])
  if (timers.current.length !== blockXs.length) {
    // 블록마다 시작 위상을 CYCLE_INTERVAL 안에 고르게 분산 — 여러 블록이 항상 동시에 고장/
    // 오버패싱 상태를 이루어 화면 어디선가 자주 보이도록 한다
    timers.current = blockXs.map((_, i) => (i / blockXs.length) * CYCLE_INTERVAL)
  }
  const wasFailing = useRef<boolean[]>(blockXs.map(() => false))

  useFrame((_, delta) => {
    const next = new Set(failoverRef.current.blockXs)
    let changed = false
    blockXs.forEach((x, i) => {
      timers.current[i] += delta
      const t = timers.current[i] % CYCLE_INTERVAL
      const failing = t < FAILURE_DURATION
      if (failing && !wasFailing.current[i]) {
        next.add(x)
        simStats.failoverEventCount += 1
        changed = true
      } else if (!failing && wasFailing.current[i]) {
        next.delete(x)
        changed = true
      }
      wasFailing.current[i] = failing
    })
    if (changed) failoverRef.current.blockXs = next
  })

  return null
}
