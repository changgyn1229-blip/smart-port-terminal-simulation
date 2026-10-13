import { berthSlots, yardBlockSlots, YARD_COL_COUNT } from './scenePositions'

// 블록당 컨테이너 열(Row) 수가 기존 3열 기준 대비 늘어난 비율 — 야드 블록 폭이 넓어진 만큼
// (scenePositions.ts YARD_COL_COUNT) 용량 KPI도 함께 늘려 3D 씬 스케일과 계속 동기화한다.
const YARD_DENSITY_RATIO = YARD_COL_COUNT / 3

// 시뮬레이션 KPI 집계 — R3F 프레임 루프(AgvFleet/TruckFleet/ArmgcGantry3D/QuayCrane3D)가 매 프레임
// 갱신하고, React UI(TopStatusBar 등)가 주기적으로 폴링해 표시하는 모듈 스코프 싱글턴.
// 두 트리(Canvas 내부 R3F / 바깥 React UI)가 ref를 공유할 공통 부모가 없어 모듈 싱글턴으로 연결한다.
export interface SimStats {
  agvDistanceTotal: number // AGV 누적 이동 거리(월드 단위)
  agvTripCount: number // AGV가 정차 지점에 도달한 총 횟수(트립 수)
  truckTatSum: number // 트럭 IN->OUT 소요 시간 합(초)
  truckTatCount: number
  yardStored: number // 야드에 현재 적재된 것으로 집계되는 컨테이너 수(RECEIVE +1 / DISPATCH -1)
  yardCapacity: number // 야드 전체 용량(정규화 기준)
  failoverEventCount: number // 발생한 해측 RMGC 고장 이벤트 수
  failoverCoveredCount: number // 육측 RMGC가 대신 처리를 완료(handoffDone)한 해측 요청 수
  failoverRequestedCount: number // 고장 구간 동안 발생한 해측 요청 수(분모)
  activeCraneXs: Record<number, boolean> // STS 크레인 X별 현재 하역 사이클 진행 여부 (Berth Occupancy 산출용)
}

export const simStats: SimStats = {
  agvDistanceTotal: 0,
  agvTripCount: 0,
  truckTatSum: 0,
  truckTatCount: 0,
  // 야드 블록 수 변화 + 블록당 열 밀도 변화(YARD_DENSITY_RATIO) 모두에 비례해 초기 장치율 유지
  yardStored: Math.round(595 * (yardBlockSlots.length / 28) * YARD_DENSITY_RATIO),
  yardCapacity: Math.round(700 * (yardBlockSlots.length / 28) * YARD_DENSITY_RATIO),
  failoverEventCount: 0,
  failoverCoveredCount: 0,
  failoverRequestedCount: 0,
  activeCraneXs: {},
}

export function agvAverageTripDistance() {
  return simStats.agvTripCount > 0 ? simStats.agvDistanceTotal / simStats.agvTripCount : 0
}

export function truckAverageTat() {
  return simStats.truckTatCount > 0 ? simStats.truckTatSum / simStats.truckTatCount : 0
}

export function yardUtilizationPercent() {
  return clamp((simStats.yardStored / simStats.yardCapacity) * 100, 0, 100)
}

export function failoverCoverageRatePercent() {
  return simStats.failoverRequestedCount > 0 ? (simStats.failoverCoveredCount / simStats.failoverRequestedCount) * 100 : 100
}

// Berth Occupancy — 선석 3기씩 배치된 STS 크레인 중 지금 이 순간 하역 사이클을 진행 중인 비율.
// 선박은 항상 접안 중이라 "정박 여부"로는 값이 항상 100%로 고정되어 의미가 없으므로,
// 실제 하역 밸런스를 반영하는 크레인 가동률을 Berth Occupancy 대리 지표로 사용한다.
export function berthOccupancyPercent() {
  const activeCount = Object.values(simStats.activeCraneXs).filter(Boolean).length
  return berthSlots.length > 0 ? clamp((activeCount / berthSlots.length) * 100, 0, 100) : 0
}

// Collision Risk — AGV/트럭 편대 모두 앞차와의 실거리를 하드 클램프하고(MIN_SAFE_DISTANCE 미만으로
// 절대 좁혀지지 않음), LSTP/TP 슬롯은 reserved/claimed 플래그로 동시 점유 자체를 원천 차단한다.
// 즉 겹침이 구조적으로 불가능하므로 0.0%가 실제값이며, 별도 확률 모델로 근사할 필요가 없다.
export const COLLISION_RISK_PERCENT = 0

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
