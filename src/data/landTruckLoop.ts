import { yardBlockSlots, landMainLaneZ, landBayZ, landOutLaneZ, gateX } from './scenePositions'

const gateFarX = gateX + 9 // 게이트 바깥쪽 진입/퇴장 지점
const gateNearX = gateX - 0.4 // 게이트 프레임 바로 안쪽
const mainLaneZ = landMainLaneZ // IN 순항 레인 — 모든 블록의 분기점(spur branch)이 이 위에 놓인다
const bayZ = landBayZ // LSTP 정차 베이 — 실제 크레인 인계 좌표
const outLaneZ = landOutLaneZ

// 육측 RMGC가 스프레더를 정확히 이 좌표로 스냅시켜 트럭 적재함과 만난다 (좌표 단일 소스)
export const LAND_TP_LANE_Z = bayZ

// 야드 블록 서쪽 끝보다 살짝 바깥으로 U턴 지점을 잡아 블록과 겹치지 않게 한다
const yardMinX = Math.min(...yardBlockSlots) - 4
const uTurnApexX = yardMinX - 3
const laneMidZ = (mainLaneZ + outLaneZ) / 2

// IN 세그먼트 — 게이트에서 야드 서쪽 끝까지 곧게 순항하는 레인. 개별 블록 정차는 여기서 직접
// 일어나지 않는다 — 각 블록의 LSTP는 이 레인에서 "분기(spur)"해 들어가는 짧은 가지 도로다
// (landSpurs 참고). 가이드 다이어그램의 [B. BOTTOM] U턴 루프 구조를 그대로 반영.
export const inRoadWaypoints: [number, number, number][] = [
  [gateFarX, 0, mainLaneZ],
  [gateNearX, 0, mainLaneZ],
  [yardMinX, 0, mainLaneZ],
]

// OUT 세그먼트 — U턴 완료 지점부터 시작해 IN과 완전히 분리된 레인(outLaneZ)으로 게이트까지 돌아나간다.
export const outRoadWaypoints: [number, number, number][] = [
  [yardMinX, 0, mainLaneZ],
  [uTurnApexX, 0, laneMidZ],
  [yardMinX, 0, outLaneZ],
  [gateNearX, 0, outLaneZ],
  [gateFarX, 0, outLaneZ],
]

// 실제로 도로가 그려지는 전체 구간 — 트럭 편대 물리 궤적(landTruckLoopWaypoints)의 기반.
export const landTruckRoadWaypoints: [number, number, number][] = [...inRoadWaypoints, ...outRoadWaypoints.slice(1)]

// IN/OUT 레인 사이 중앙분리대 스펙 — 두 레인이 나란히 평행하게 달리는 구간에만 그린다.
export const laneMedian = { x0: yardMinX, x1: gateNearX, z: (mainLaneZ + outLaneZ) / 2 }

// 트럭 편대가 순환하는 폐곡선 — 게이트 바깥(동쪽 먼 지점)에서 OUT->IN으로 되돌아오는 구간을 추가해 닫는다.
export const landTruckLoopWaypoints: [number, number, number][] = [
  ...landTruckRoadWaypoints,
  [gateFarX + 10, 0, outLaneZ],
  [gateFarX + 10, 0, mainLaneZ],
]

// 블록별 LSTP 분기(spur) — 순항 레인(mainLaneZ)의 분기점(branch)에서 갈라져 베이(bayZ)로 들어가는
// 짧은 직선 가지 도로. 트럭은 여기서 실제로 90도 방향을 틀어 컨테이너 스택의 세로(Z) 축과
// 나란한 자세로 들어가 정차한다(TruckFleet의 ENTERING_SPUR/EXITING_SPUR 페이즈).
export interface LandSpur {
  x: number
  branch: [number, number, number]
  bay: [number, number, number]
}
export const landSpurs: LandSpur[] = yardBlockSlots.map((x) => ({
  x,
  branch: [x, 0, mainLaneZ],
  bay: [x, 0, bayZ],
}))

// 야드 블록별 육측 TP 정차 지점(베이 좌표) — yardBlockSlots와 좌표를 공유해 육측 RMGC와 항상 동일 X에서 만난다
export const landStopPoints: [number, number, number][] = landSpurs.map((s) => s.bay)

// TAT(Turnaround Time) 측정용 게이트 통과 기준점
export const inGateCrossPoint: [number, number, number] = [gateNearX, 0, mainLaneZ]
export const outGateCrossPoint: [number, number, number] = [gateNearX, 0, outLaneZ]

// 분기점 앞 정지선까지의 거리(월드 단위) — 베이가 점유 중일 때 순항 레인 위에서 대기하는 지점
export const STOP_LINE_DISTANCE = 1.6
// IN 레인은 게이트->야드 방향(x 내림차순)으로 진행하므로, 슬롯보다 큰 x가 "정지선(그 앞)"이 된다.
export const landStopLinePoints: [number, number][] = yardBlockSlots.map((x) => [x + STOP_LINE_DISTANCE, mainLaneZ])
