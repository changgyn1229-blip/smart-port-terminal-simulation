// 3D 월드 좌표 (미터 단위 가정) — 부산 신선대부두 실제 제원(안벽 총연장 1,500m = 300m x 5선석,
// C/C 15기)에 정밀 매칭하고, 야드는 5선석에 대응하는 5개 블록 클러스터(합계 9개 구역, Columns
// 1~9, 듀얼 RMGC 18기)로 편성한 컴팩트 레이아웃.
// 40ft 컨테이너 실물(≈12.19m) 기준 CONTAINER_LENGTH(0.95 unit)로 역산한 METERS_PER_UNIT을
// 모든 실제 치수(안벽 길이 등)의 환산 기준으로 삼는다.
// x = 안벽 라인을 따라 좌우로 늘어선 5선석 축.
// z = 해측(-, 바다) <-> 육측(+, 게이트) 축. 수직 야드 블록은 이 z축을 따라 길게 늘어선다.
//
// 레이아웃 개요 (해측 -> 육측 순) — 신선대 실제 야드맵 비율 반영: 야드는 안벽 전체 폭에 얇게 펴
// 늘어놓지 않고 5선석 대응 클러스터(합계 9개 구역)의 조밀한 메인 블록 군으로 편성해 "정돈된
// 컴팩트" 터미널 공간감을 낸다. 게이트도 야드 바로 뒤(동쪽)로 바짝 붙여 불필요한 데드스페이스를
// 없앤다:
//   z<-14.5      바다 / 접안 선박 (5선석 각 300m급 초대형선)
//   z=-8         안벽 라인 — 총연장 1,500m, STS 크레인(C/C) 15기 (선석당 3기 x 5선석)
//   z=-4         AGV 픽업 레인 (STS 하부 정차선)
//   z=17         해측 TP / AGV 반환·배송 레인 (오렌지 존 WSTP) — 확장된 에이프런
//   z=20~56      수직 야드 블록 9개 = 5선석 클러스터([2,2,1,2,2]) — 클러스터 내부는 촘촘히,
//                클러스터 경계는 뚜렷이 넓게(내부 횡단 도로 겸 구역 분리대)
//   z=57~103     육측 TP (외부트럭 작업 구간) — IN 레인(65)과 OUT 레인(93)을 넓게 분리
//   z=65/93      IN/OUT 게이트 라인 (간격 28 — 각각 독립된 다차선 게이트 단지, 야드 바로 뒤에 밀착)

// 40ft 컨테이너 실측(12.19m)을 CONTAINER_LENGTH(0.95 unit)로 나눈 환산 축척 — 이하 실제 치수는
// 전부 이 값을 거쳐 유닛으로 환산한다(안벽 총연장 1,500m 등 실제 제원과의 정합성 유지).
const METERS_PER_UNIT = 12.19 / 0.95 // ≈12.83 m/unit

// ── 안벽 · 선석 ─────────────────────────────────────────────
export const quayLineZ = -8
const BERTH_COUNT = 5
const QUAY_TOTAL_LENGTH_M = 1500 // 신선대부두 안벽 총연장
const QUAY_TOTAL_UNITS = QUAY_TOTAL_LENGTH_M / METERS_PER_UNIT // ≈116.9
const BERTH_LENGTH = QUAY_TOTAL_UNITS / BERTH_COUNT // ≈23.4, 정확히 300m/선석
const berthCenters = Array.from({ length: BERTH_COUNT }, (_, i) => (i - (BERTH_COUNT - 1) / 2) * BERTH_LENGTH)
// 선석 하나에 STS 크레인(C/C) 3기 배치 — 총 5 x 3 = 15기, 실제 하역 밸런스에 맞춰 균등 간격
const CRANE_OFFSETS = [-7, 0, 7]

export interface BerthCluster {
  centerX: number
  craneXs: number[]
}
// 5선석 x 3기 = STS 크레인(C/C) 15기. 각 클러스터가 초대형 컨테이너선 1척을 공유한다.
export const berthClusters: BerthCluster[] = berthCenters.map((centerX) => ({
  centerX,
  craneXs: CRANE_OFFSETS.map((o) => centerX + o),
}))
// STS 크레인 15기의 X 슬롯 (안벽 수평축을 따라 배치) — AGV 핸드오프 채널 키로도 그대로 쓰인다.
export const berthSlots: number[] = berthClusters.flatMap((b) => b.craneXs)
// 선석당 배치할 선박 1척의 대략적 안벽 점유 길이(크레인 클러스터 스팬 14 + 여유)
export const shipHullLength = 19

// ── 야드 블록 컨테이너 열(Row) 밀도 ──────────────────────────────
// 야드 블록의 가로 열(Row) 수. 이 값이 블록의 실제 X 반폭(yardBlockHalfWidth)을 결정하므로,
// YardBlocks3D(컨테이너 인스턴스), ArmgcGantry3D(RMGC 다리 간격), simStats(KPI 용량 산식)가
// 전부 이 상수 하나만 보고 함께 갱신되도록 단일 소스로 둔다. 9는 이 열 수(블록 폭)를 가리키며,
// 아래 CLUSTER_BLOCK_COUNTS 합계(야드 블록 "개수" 9개, Columns 1~9)와는 별개의 값이다.
export const YARD_COL_COUNT = 9
const YARD_COL_PITCH = 0.47 // 컨테이너 폭(0.45)보다 살짝만 넓은 최소 열 간격 — 서로 겹치지 않게
export const YARD_CONTAINER_WIDTH = 0.45
export const yardColOffsets: number[] = Array.from({ length: YARD_COL_COUNT }, (_, i) => (i - (YARD_COL_COUNT - 1) / 2) * YARD_COL_PITCH)
export const yardBlockHalfWidth = Math.max(...yardColOffsets) + YARD_CONTAINER_WIDTH / 2

// ── 야드 블록 (선석별 클러스터 x 9개 구역) ───────────────────────
// 실제 신선대 야드맵은 야드 블록을 안벽 전체 폭에 1:1로 얇게 펴 늘어놓지 않는다. 대신 5선석에
// 대응하는 5개의 독립 블록 클러스터로 묶고(합계 9개 구역, Columns 1~9), 클러스터 내부는 ARMGC
// 다리 최소 이격에 실제 유지보수 통로(1.5~2m)를 더한 피치로 촘촘히, 클러스터 경계에는 그보다
// 뚜렷하게 넓은 간격(내부 횡단 도로 + 구역 분리대)을 두어 선석 구역 간 시각적 구분을 명확히
// 한다. 두 간격 모두 절대 실측치(3~5m 등)를 그대로 유닛 환산하지 않고 — 그러면 ARMGC 다리
// 최소 이격보다도 작아져 무의미해진다 — "클러스터 내부보다 뚜렷이 넓다"는 상대적 비율로
// 구현했다. 블록 열 수(YARD_COL_COUNT, 위)에 맞춰 블록 폭이 넓어진 만큼, 두 간격도 같은 비율로
// 넓혀 RMGC 다리(legBaseX, ArmgcGantry3D)가 옆 블록 스택을 침범하지 않게 한다 — 다리 최소
// 이격(LAND legBaseX*2 ≈ 6.26) + 통로 여유(1.6).
const CLUSTER_BLOCK_COUNTS = [2, 2, 1, 2, 2] // 5선석 대응 클러스터별 블록 "개수"(합계 9, Columns 1~9) — 열 수(YARD_COL_COUNT)와는 별개
const INTRA_CLUSTER_SPACING = 7.86 // 클러스터 내부 블록 피치
const INTER_CLUSTER_GAP = 13.1 // 클러스터(선석 구역) 경계 간격 — 기존과 동일한 상대 비율(약 1.67배) 유지

function buildYardLayout() {
  const positions: number[] = []
  const gapMidpoints: number[] = []
  let cursor = 0
  let placed = 0
  for (const size of CLUSTER_BLOCK_COUNTS) {
    for (let i = 0; i < size; i++) {
      if (placed > 0) {
        const step = i === 0 ? INTER_CLUSTER_GAP : INTRA_CLUSTER_SPACING
        if (i === 0) gapMidpoints.push(cursor + step / 2) // 클러스터 경계 중점 — 횡단 도로 마킹용
        cursor += step
      }
      positions.push(cursor)
      placed += 1
    }
  }
  const center = (Math.min(...positions) + Math.max(...positions)) / 2
  return {
    slots: positions.map((p) => p - center),
    gapMidpoints: gapMidpoints.map((p) => p - center),
  }
}
const yardLayout = buildYardLayout()
export const yardBlockSlots: number[] = yardLayout.slots
// 클러스터(선석 구역) 경계 중점 X — 내부 횡단 도로 마킹을 그리는 기준점
export const yardClusterGapXs: number[] = yardLayout.gapMidpoints
export const yardBlockHalfLength = 18

// 특화 구역 지정 — 야드 서쪽 끝 블록은 위험물(DG, 주변과 격리), 동쪽 끝 블록은 냉동/냉장(Reefer,
// 게이트 인근 전력 인프라 접근성)으로 지정한다.
export const dgBlockX = yardBlockSlots[0]
export const reeferBlockX = yardBlockSlots[yardBlockSlots.length - 1]

// WSTP 에이프런 — 안벽 라인(z=-8)과 야드 블록 해측 시작점 사이의 트인 공간을 확장해
// 레퍼런스 이미지처럼 쾌적한 공간감을 확보한다 (기존 20 -> 28)
export const apronDepth = 28
export const yardBlockSeaEdgeZ = quayLineZ + apronDepth // 20
export const yardBlockCenterZ = yardBlockSeaEdgeZ + yardBlockHalfLength // 38
export const yardBlockLandEdgeZ = yardBlockCenterZ + yardBlockHalfLength // 56

// 해측 TP(Transfer Point) / AGV 반환·배송 레인 — 야드 경계와의 여백도 함께 확장
export const seaSideTpZ = yardBlockSeaEdgeZ - 3 // 17

// ── 육측 TP / IN·OUT 게이트 ─────────────────────────────────
// IN(진입) 순항 레인 — 게이트에서 야드 서쪽 끝까지, 각 블록의 LSTP는 여기서 분기(spur)한다.
// LSTP 에이프런 여백도 확장(야드 경계 +6 -> +9)
export const landMainLaneZ = yardBlockLandEdgeZ + 9 // 65
// LSTP 정차 베이(=크레인 인계 지점) — 순항 레인에서 야드 쪽으로 살짝 들어간 스퍼 안쪽
export const landBayZ = yardBlockLandEdgeZ + 3 // 59
// OUT(진출) 순항 레인 — IN과 완전히 분리된 별도 레인 (간격 28)
export const landOutLaneZ = yardBlockLandEdgeZ + 37 // 93
// 육측 TP 전체 작업 구간 밴드 (배경 표시용)
export const landSideTpZRange: [number, number] = [yardBlockLandEdgeZ + 1, landOutLaneZ + 10] // [57, 103]

// 게이트 X — 야드맵 비율에 맞춰 야드 블록 동쪽 끝 바로 뒤(10 유닛)로 압축 배치해
// 기존의 불필요한 데드스페이스를 제거한다 (기존 20 -> 10)
export const gateX = Math.max(...yardBlockSlots) + 10

// 히어로 야드 블록 — 9개 구역 중 정중앙(Column 5, 정중앙 선석 클러스터의 단일 블록)
const heroYardBlockX = yardBlockSlots[Math.floor(yardBlockSlots.length / 2)]

export const scenePositions: Record<string, { x: number; y: number; z: number; delay: number }> = {
  // 중앙 선석의 STS 크레인 (15기 중 히어로 장비, 정중앙 선석의 정중앙 크레인)
  'eq-qc-102': { x: berthClusters[Math.floor(BERTH_COUNT / 2)].craneXs[1], y: 0, z: quayLineZ, delay: 0 },
  // 해측 TP 라인에서 출발해 히어로 야드 블록으로 향하는 히어로 AGV의 카메라 앵커
  'eq-agv-047': { x: heroYardBlockX, y: 0, z: seaSideTpZ, delay: 0.9 },
  // 9개 구역(Columns 1~9) 중 히어로 블록 (Column 5, 정중앙)
  'eq-armgc-04': { x: heroYardBlockX, y: 0, z: yardBlockCenterZ, delay: 1.8 },
  // 우측 외부트럭 IN 게이트
  'eq-gate-04': { x: gateX, y: 0, z: landMainLaneZ, delay: 0 },
}

// OUT 게이트 라인 — IN과 별도 구조물로 완전히 분리 배치
export const truckOutGatePos = { x: gateX, y: 0, z: landOutLaneZ }

// ── 게이트 배후 부대시설 지구 & CFS 구역 ─────────────────────
// "1번/5번 선석" 같은 좌우 라벨은 카메라 각도에 따라 화면에서 반대로 보일 수 있어(오블리크
// 카메라가 월드 X를 좌우로 뒤집어 투영) 신뢰할 수 없는 기준이다. 대신 항상 같은 세계 좌표를
// 가리키는 구체적 랜드마크 2개로 고정한다: [IN GATE](x=gateX, z=landMainLaneZ)와 리퍼(냉동/
// 냉장, 하늘색 톤) 블록(x=reeferBlockX, 야드 동쪽 끝). 부대시설을 리퍼 블록 바로 옆(x가
// reeferBlockX보다 조금 큼) + IN GATE 바로 아래(z가 landMainLaneZ보다 작음, 야드 자체 깊이
// 범위 안)의 빈 공간에 둔다 — 리퍼 블록을 담당하는 RMGC 다리 반경(해측 개체 기준 최대 3.6)과
// 겹치지 않도록 reeferBlockX+16까지 떨어뜨리고, z는 IN/OUT 레인 밴드(65/93 ±4.5)와 AGV
// 존(z<=17.9)을 모두 피해 야드 랜드엣지(56) 바로 안쪽에 둔다.
export const gateFacilityPos = { x: reeferBlockX + 16, z: yardBlockLandEdgeZ - 6 }

// CFS 구역(북서쪽 끝자락) — 마스터 도면(신선대부두 야드맵) 기준, 부지 전체에서 가장 서쪽·북쪽에
// 위치한 대형 CFS 창고 + D/H/V/N/P/특수장치장(X·Y·K)/냉동(R) 블록 벨트 전체를 여기 한 곳에
// 배치한다(북동쪽 보조 CFS는 도면에 없는 배치였으므로 제거). x는 DG 블록 담당 RMGC 다리 반경
// (최대 3.6)보다 넉넉히 떨어뜨리고(-16), z는 야드 세로 중심(yardBlockCenterZ)에서 남쪽(+12)으로
// 더 내려 벨트 전체 길이(N/P·X/Y/K·냉동 블록까지 포함해 기존보다 훨씬 깊어짐)가 회전(36도) 후에도
// AGV 존(z<=17.9)을 침범하지 않도록 충분한 여유를 확보했다(회전 후 최악 지점도 world z>=25로 검증).
export const cfsClusterPos = { x: dgBlockX - 16, z: yardBlockCenterZ + 12 }

// CFS 존 공통 사선 회전각 — PortFacilities의 CfsZone/CfsWarehouse/AuxYardBelt가 전부 이 값
//하나만 가져다 쓴다(30~45도 범위, 도면 외곽선 각도 반영). 여기 한 곳에서만 정의해야 cfsX/cfsZ
// 계산과 실제 렌더링이 항상 같은 각도를 쓴다고 보장된다.
export const CFS_ZONE_ROTATION_DEG = 36

// CFS 창고(CfsWarehouse)의 로컬 좌표 — 편집 모드(E, 드래그 G/R)로 사용자가 직접 재배치해 확정한
// 값(콘솔 로그 그대로 반영). PortFacilities.tsx가 이 상수를 그대로 prop으로 받아 창고를 그린다.
export const CFS_WAREHOUSE_LOCAL_X = 67.64
export const CFS_WAREHOUSE_LOCAL_Z = 132.49

// CFS 창고의 실제 월드 좌표(중심점) — cfsX, cfsZ. CfsZone 그룹 자체가 cfsClusterPos에서
// CFS_ZONE_ROTATION_DEG만큼 회전돼 있으므로, 로컬 좌표를 그 회전만큼 돌린 뒤 cfsClusterPos를
// 더해야 화면에 실제로 보이는 창고의 진짜 중심 좌표가 나온다(Three.js의 Y축 회전 행렬 부호를
// 반대로 써서 한 번 틀렸던 적이 있다 — 실제 렌더링된 오브젝트의 matrixWorld를 찍어 검증한 값:
// cfsX≈74.68, cfsZ≈117.43. 이 좌표는 게이트 근처이지, 애초 주석에 적힌 "북서쪽 끝자락"과는
// 전혀 다른 곳이다 — 편집 모드로 드래그해 확정한 실제 위치가 설계 의도와 달라진 상태였다).
const cfsRotRad = (CFS_ZONE_ROTATION_DEG * Math.PI) / 180
export const cfsX = cfsClusterPos.x + CFS_WAREHOUSE_LOCAL_X * Math.cos(cfsRotRad) + CFS_WAREHOUSE_LOCAL_Z * Math.sin(cfsRotRad)
export const cfsZ = cfsClusterPos.z - CFS_WAREHOUSE_LOCAL_X * Math.sin(cfsRotRad) + CFS_WAREHOUSE_LOCAL_Z * Math.cos(cfsRotRad)

// 보조 장치장 벨트(H/D/V/N/P/X/Y/K/R) 앵커 — 편집 모드(E, 드래그 G/R)로 사용자가 직접 재배치해
// 확정한 값(콘솔 로그 그대로 반영). 아래 주석의 방위 설명은 최초 배치 기준이라 현재 오프셋과는
// 다를 수 있다.
const AUX_YARD_BELT_OFFSET_X = -15.34
const AUX_YARD_BELT_OFFSET_Z = -4.24
export const auxYardBeltPos = { x: cfsX + AUX_YARD_BELT_OFFSET_X, z: cfsZ + AUX_YARD_BELT_OFFSET_Z }

// 벨트가 CFS 창고 쪽으로 다가붙으면서 육측 TP 작업 구간(도로)에 살짝 걸치는 문제 — 위치는
// 유지한 채 그룹 자체를 몸통만 살짝 더 돌려(CFS_ZONE_ROTATION_DEG에 이 값을 더함) 도로 쪽으로
// 뻗은 블록 열의 방향을 틀어 침범을 줄인다. 벨트 내부 블록의 상대 간격·사선 정렬 자체는
// 그대로 유지된다(그룹 전체가 한 각도 더 돌아갈 뿐). 이 값도 편집 모드로 확정한 값이다.
export const AUX_YARD_BELT_EXTRA_ROTATION_DEG = 20.6
