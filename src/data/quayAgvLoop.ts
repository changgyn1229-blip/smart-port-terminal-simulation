import { berthSlots, quayLineZ, seaSideTpZ, yardBlockSlots } from './scenePositions'

// AGV 해측 순환 루프(오렌지 존, WSTP) — 픽업 레인(안벽 인접, 크레인 하부)과
// 반환/배송 레인(해측 TP 라인) 사이에 넉넉한 여백을 두고 잇는 폐곡선.
// 단방향으로만 순환하며 트럭 존과는 절대 겹치지 않는다.
export const QUAY_PICKUP_LANE_Z = quayLineZ + 4 // -4 — 안벽 라인에서 넉넉히 안쪽, STS 하부 정차선 (L1)
export const YARD_DROPOFF_LANE_Z = seaSideTpZ // 10 — 해측 TP 패드 라인과 동일선 (L3)
// L2 — 중앙 추월/주행로. 실제 IGV는 L1(픽업)<->L3(반환)을 잇는 단일 폐곡선을 순환하지만, 실제
// 안벽 사진처럼 나란한 3개 차선이 시각적으로 존재하도록 L2를 중간에 장식용 직선 차선으로 추가한다.
export const QUAY_THROUGH_LANE_Z = (QUAY_PICKUP_LANE_Z + YARD_DROPOFF_LANE_Z) / 2

const LOOP_X_MIN = berthSlots[0] - 3
const LOOP_X_MAX = berthSlots[berthSlots.length - 1] + 3

// 픽업 레인은 서->동(berthSlots 오름차순), 반환 레인은 동->서(yardBlockSlots 내림차순)로 순환한다
const yardStopXsDescending = [...yardBlockSlots].sort((a, b) => b - a)

export const quayAgvLoopWaypoints: [number, number, number][] = [
  [LOOP_X_MIN, 0, QUAY_PICKUP_LANE_Z],
  ...berthSlots.map((x): [number, number, number] => [x, 0, QUAY_PICKUP_LANE_Z]),
  [LOOP_X_MAX, 0, QUAY_PICKUP_LANE_Z],
  [LOOP_X_MAX + 1.2, 0, (QUAY_PICKUP_LANE_Z + YARD_DROPOFF_LANE_Z) / 2],
  [LOOP_X_MAX, 0, YARD_DROPOFF_LANE_Z],
  ...yardStopXsDescending.map((x): [number, number, number] => [x, 0, YARD_DROPOFF_LANE_Z]),
  [LOOP_X_MIN, 0, YARD_DROPOFF_LANE_Z],
  [LOOP_X_MIN - 1.2, 0, (QUAY_PICKUP_LANE_Z + YARD_DROPOFF_LANE_Z) / 2],
]

export type AgvStopKind = 'STS' | 'YARD_SEA'

export interface AgvStopPoint {
  x: number
  point: [number, number, number]
  kind: AgvStopKind
}

// 루프 순환 순서 그대로 정렬된 정차 지점 목록 — STS 하부(픽업 레인) 다음 해측 TP(반환 레인) 순으로 순환한다
export const agvStopPoints: AgvStopPoint[] = [
  ...berthSlots.map((x): AgvStopPoint => ({ x, point: [x, 0, QUAY_PICKUP_LANE_Z], kind: 'STS' })),
  ...yardStopXsDescending.map((x): AgvStopPoint => ({ x, point: [x, 0, YARD_DROPOFF_LANE_Z], kind: 'YARD_SEA' })),
]

// STS 크레인 하부 정차 지점 — berthSlots와 좌표를 공유해 크레인/AGV가 항상 동일 X에서 만난다
export const berthStopPoints: [number, number, number][] = berthSlots.map((x) => [x, 0, QUAY_PICKUP_LANE_Z])

// 정지선 시각 표시 좌표 — 픽업 레인은 서->동 진행이므로 정지선은 정차 X보다 작은 쪽(진행 방향 앞),
// 반환 레인은 동->서 진행이므로 정차 X보다 큰 쪽에 그린다.
const AGV_STOP_LINE_DISTANCE = 1.8
export const agvStopLinePoints: [number, number][] = agvStopPoints.map((s) => [
  s.kind === 'STS' ? s.x - AGV_STOP_LINE_DISTANCE : s.x + AGV_STOP_LINE_DISTANCE,
  s.point[2],
])

// 오렌지 존(WSTP) 배경 밴드 범위
export const seaZoneXRange: [number, number] = [LOOP_X_MIN - 1.2, LOOP_X_MAX + 1.2]
export const seaZoneZRange: [number, number] = [QUAY_PICKUP_LANE_Z - 0.9, YARD_DROPOFF_LANE_Z + 0.9]

// L2(중앙 추월/주행로) 장식용 직선 차선 — 실제 IGV 순환 경로(L1<->L3)와는 별개로, 안벽 사진처럼
// 나란한 차선이 여러 개 있는 시각적 밀도를 위해 추가하는 참조선
export const quayThroughLanePoints: [number, number, number][] = [
  [LOOP_X_MIN, 0, QUAY_THROUGH_LANE_Z],
  [LOOP_X_MAX, 0, QUAY_THROUGH_LANE_Z],
]
