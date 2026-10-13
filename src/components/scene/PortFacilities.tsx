import { Html, Text, Edges, Billboard } from '@react-three/drei'
import { THEME } from '../../data/theme'
import { EmptyContainerYard, EMPTY_YARD_BAY_SPACING } from './EmptyContainerYard'
import { Editable } from './BuildingEditMode'
import { CFS_ZONE_ROTATION_DEG, CFS_WAREHOUSE_LOCAL_X, CFS_WAREHOUSE_LOCAL_Z, AUX_YARD_BELT_EXTRA_ROTATION_DEG } from '../../data/scenePositions'

// 냉동/냉장(Reefer) 장치장 팔레트 — 일반 공컨테이너(회색조)보다 밝은 화이트+시안 톤으로 도면의
// 청록색 테두리 R구역과 시각적으로 구분되게 한다.
const REEFER_EMPTY_COLORS = ['#dff2f0', '#bfe6e2', '#4fd1ff', '#dff2f0', '#9fd6d0']

interface BuildingProps {
  x: number
  z: number
  w: number
  h: number
  d: number
  color?: string
  label?: string
  rotationDeg?: number
}

// 신선대부두 야드맵 참고(C.F.S 사무실 / 운영건물 / 정비·대기실 등) — 건물마다 작은 명패를 달아
// 어떤 시설인지 구분되도록 한다. 장비(크레인) 클린 뷰 지침과는 별개로, 부대시설 안내 라벨은
// 기존 AreaBadge/구역 라벨과 같은 성격(고정 인프라 명칭)이라 유지한다. rotationDeg로 터미널
// 외곽의 비스듬한 지형선에 맞춰 개별 건물 방향을 회전시킬 수 있다(기본값 0 = 회전 없음).
function Building({ x, z, w, h, d, color = '#1a2422', label, rotationDeg = 0 }: BuildingProps) {
  return (
    <Editable name={label ?? '건물'} position={[x, 0, z]} rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* 야간 조명이 켜진 창문 느낌의 발광 스트라이프 */}
      <mesh position={[0, h * 0.62, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.82, h * 0.14]} />
        <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.9} />
      </mesh>
      {label && (
        <Html position={[0, h + 0.35, 0]} center zIndexRange={[8, 0]} occlude={false}>
          <span className="pointer-events-none whitespace-nowrap rounded border border-border bg-surface/85 px-0.5 py-0 font-mono text-[5px] leading-tight text-ink-faint backdrop-blur-sm">
            {label}
          </span>
        </Html>
      )}
    </Editable>
  )
}

interface ParkingLotProps {
  x: number
  z: number
  rows: number
  cols: number
}

// 주차장 라인 — 아스팔트 위 흰색 구획선으로 간단히 묘사
function ParkingLot({ x, z, rows, cols }: ParkingLotProps) {
  const spotW = 0.55
  const spotD = 1.1
  const gap = 0.15
  const totalW = cols * (spotW + gap)
  const totalD = rows * (spotD + gap)
  return (
    <group position={[x, 0.01, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalW + 0.4, totalD + 0.4]} />
        <meshStandardMaterial color="#20282a" roughness={0.95} />
      </mesh>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols + 1 }).map((_, c) => (
          <mesh
            key={`${r}-${c}`}
            position={[-totalW / 2 + c * (spotW + gap), 0.005, -totalD / 2 + r * (spotD + gap) + spotD / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.04, spotD]} />
            <meshStandardMaterial color="#e7ede9" />
          </mesh>
        )),
      )}
    </group>
  )
}

interface ZoneProps {
  x: number
  z: number
}

// 부대시설(본관/변전실/정비공장/복합건물/라싱/CFS 등) 공통 스틸 그레이 톤 — 야드 블록·장비 색상과
// 겹치지 않는 모던한 그레이/화이트 계열로 모든 부대시설 건물을 하나의 색으로 통일한다.
const FACILITY_STEEL = '#8b939b'

interface DiagonalBlockClusterProps {
  x: number
  z: number
  rotationDeg: number
  bayCount: number
  label: string
  variant?: 'standard' | 'reefer'
}

// 블록 풋프린트 바닥 테두리 — 도면처럼 일반 블록은 노란 테두리, 냉동(R) 블록은 청록 테두리로
// 옅게 표시해 구역 성격이 한눈에 구분되도록 한다(바닥 라인 색상만 다르게, 채움은 거의 투명).
function BlockFloorOutline({ bayCount, color }: { bayCount: number; color: string }) {
  const depth = bayCount * EMPTY_YARD_BAY_SPACING + 0.3
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.3, depth]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} />
      <Edges color={color} />
    </mesh>
  )
}

// 대각선/사선 특수 야드블록(H/D/V/N/P/X/Y/K/R 블록 계열) — 실제 야드맵의 CFS 주변 꺾어지는 외곽
// 부지를 재현하기 위해 공컨테이너 스택을 각도를 주어 배치하고, 라벨을 같은 로컬 그룹에 묶어
// 위치가 항상 함께 따라오도록 한다. CfsZone 안에서는 부모 그룹이 이미 존 공통 사선 각도로
// 회전돼 있으므로 rotationDeg=0으로 넘겨 CFS 창고와 완전히 평행한 스택 열을 이룬다. variant가
// 'reefer'면 냉동(R) 구역 전용 팔레트 + 청록 바닥 테두리로 시각적으로 구분한다.
// 일반 group으로 렌더링한다(Editable 아님) — 블록 하나하나가 개별 선택 대상이 되면 클릭 이벤트가
// 여기서 stopPropagation돼 부모(AuxYardBelt)의 Editable까지 올라가지 못한다. 벨트는 블록별이
// 아니라 통째로 한 덩어리로 드래그·회전해야 하므로, 선택 가능한 지점은 AuxYardBelt 하나뿐이어야
// 한다.
function DiagonalBlockCluster({ x, z, rotationDeg, bayCount, label, variant = 'standard' }: DiagonalBlockClusterProps) {
  const isReefer = variant === 'reefer'
  const outlineColor = isReefer ? THEME.teal : THEME.accent
  return (
    <group position={[x, 0, z]} rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
      <BlockFloorOutline bayCount={bayCount} color={outlineColor} />
      <EmptyContainerYard position={[0, 0, 0]} bayCount={bayCount} palette={isReefer ? REEFER_EMPTY_COLORS : undefined} />
      <Html position={[0, 4.4, 0]} center zIndexRange={[8, 0]} occlude={false}>
        <span className="pointer-events-none whitespace-nowrap rounded border border-border bg-surface/85 px-1 py-0.5 font-mono text-[8px] text-ink-faint backdrop-blur-sm">
          {label}
        </span>
      </Html>
    </group>
  )
}

interface CfsWarehouseProps {
  x: number
  z: number
  w: number
  d: number
  h?: number
  rotationDeg?: number
}

// CFS(컨테이너 조작장) 대형 창고 — 본관/정비공장류보다 면적이 훨씬 넓은 대형 물류창고 메쉬 +
// 건물 위에 큼직하게 띄운 실제 3D "CFS" 텍스트(drei Text, DOM 오버레이가 아닌 씬 지오메트리) +
// 창고 앞쪽으로 살짝 띄워 붙인 트럭 하역 도크 플랫폼(베이도어 줄무늬 포함)으로 구성한다.
function CfsWarehouse({ x, z, w, h = 2.4, d, rotationDeg = 0 }: CfsWarehouseProps) {
  const dockWidth = w * 0.7
  const bayCount = Math.max(3, Math.round(dockWidth / 1.3))
  return (
    <Editable name="CFS 창고" position={[x, 0, z]} rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={FACILITY_STEEL} roughness={0.85} />
      </mesh>
      {/* 창고 파사드 발광 스트라이프 */}
      <mesh position={[0, h * 0.62, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.9, h * 0.12]} />
        <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.9} />
      </mesh>
      {/* 트럭 하역 도크 — 창고 앞쪽에 바닥보다 살짝 띄운(0.3) 낮은 플랫폼 */}
      <mesh position={[0, 0.3, d / 2 + 1.1]} castShadow receiveShadow>
        <boxGeometry args={[dockWidth, 0.6, 2.0]} />
        <meshStandardMaterial color="#2a3230" roughness={0.9} />
      </mesh>
      {/* 도크 베이도어 줄무늬 — 창고 파사드 하단, 도크 폭에 맞춰 균등 배치 */}
      {Array.from({ length: bayCount }).map((_, i) => {
        const bx = -dockWidth / 2 + (i + 0.5) * (dockWidth / bayCount)
        return (
          <mesh key={i} position={[bx, 0.62, d / 2 + 0.02]}>
            <boxGeometry args={[0.9, 0.5, 0.04]} />
            <meshStandardMaterial color="#f2c94c" emissive="#f2c94c" emissiveIntensity={0.4} />
          </mesh>
        )
      })}
      {/* CFS 라벨 — DOM 오버레이(Html)가 아닌 실제 3D 텍스트(drei Text/troika)로, 창고 지붕 위에
          크게 떠서 Billboard로 감싸 카메라를 항상 정면으로 바라본다. */}
      <Billboard position={[0, h + 1.1, 0]}>
        <Text fontSize={1.4} color={THEME.ink} outlineWidth={0.04} outlineColor="#1b2224" anchorX="center" anchorY="middle">
          CFS
        </Text>
      </Billboard>
    </Editable>
  )
}

interface MainHallProps {
  x: number
  z: number
  rotationDeg?: number
}

// 본관 — 도면상 ㄷ자(U자) 형태의 대형 건물. 동쪽(우측) 세로 몸통(스파인) + 남/북으로 뻗은 두 날개로
// 구성해, 서쪽(좌측)이 트인 ㄷ자 평면을 재현한다. 군집 내 가장 넓은 앵커(Anchor) 건물이다.
function MainHall({ x, z, rotationDeg = 0 }: MainHallProps) {
  const h = 2.3
  const W = 4.2 // 동서 전체 폭
  const D = 4.8 // 남북 전체 길이
  const spineW = 1.6 // 동쪽 세로 몸통 폭
  const wingD = 1.6 // 남/북 날개 깊이
  const spineX = W / 2 - spineW / 2
  const wingX = (-W / 2 + (W - spineW)) / 2
  const wingW = W - spineW
  return (
    <Editable name="본관" position={[x, 0, z]} rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
      {/* 동쪽 세로 몸통 */}
      <mesh position={[spineX, h / 2, 0]} castShadow>
        <boxGeometry args={[spineW, h, D]} />
        <meshStandardMaterial color={FACILITY_STEEL} roughness={0.85} />
      </mesh>
      <mesh position={[spineX, h * 0.62, D / 2 + 0.01]}>
        <planeGeometry args={[spineW * 0.82, h * 0.14]} />
        <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.9} />
      </mesh>
      {/* 북쪽 날개 */}
      <mesh position={[wingX, h / 2, -D / 2 + wingD / 2]} castShadow>
        <boxGeometry args={[wingW, h, wingD]} />
        <meshStandardMaterial color={FACILITY_STEEL} roughness={0.85} />
      </mesh>
      {/* 남쪽 날개 */}
      <mesh position={[wingX, h / 2, D / 2 - wingD / 2]} castShadow>
        <boxGeometry args={[wingW, h, wingD]} />
        <meshStandardMaterial color={FACILITY_STEEL} roughness={0.85} />
      </mesh>
      <Html position={[0, h + 0.35, 0]} center zIndexRange={[8, 0]} occlude={false}>
        <span className="pointer-events-none whitespace-nowrap rounded border border-border bg-surface/85 px-0.5 py-0 font-mono text-[5px] leading-tight text-ink-faint backdrop-blur-sm">
          본관
        </span>
      </Html>
    </Editable>
  )
}

// 게이트 지구 외곽 경계선 사선 각도 — 실제 야드맵 도면의 비스듬한 부지 경계선을 그대로 반영해
// 클러스터 전체를 한 각도로 통일 회전시킨다(개별 건물마다 다른 각도로 "계단식"으로 걷지 않는다).
const ADMIN_ZONE_ROTATION_DEG = -18

// 어드민/게이트 지구 — 실제 신선대부두 야드맵 도면의 1:1 상대 배치. 부지 자체가 동쪽 변은 곧고
// 서쪽으로 갈수록(=남쪽으로 갈수록) 사선으로 좁아지는 쐐기 모양이므로, 아래로(남쪽으로) 내려갈수록
// 건물의 x가 점점 더 동쪽(양수)으로 수렴하도록 배치해 부지 바깥으로 삐져나가지 않게 한다.
// [본관](ㄷ자, 앵커) 바로 아래(남쪽)에 [변전실](세로로 긴 형태)이 붙고, 변전실 서쪽에
// [복합건물](북)+[정비공장](남)이 가로로 나란히 붙는다. [라싱]은 그보다 더 서쪽, 대각선 외곽선
// 위에. [용접]+[LB2]는 변전실 바로 아래 작게, [주유]는 부지 남동쪽 끝자락 구석에 둔다.
export function AdminGateZone({ x, z }: ZoneProps) {
  return (
    <group position={[x, 0, z]} rotation={[0, (ADMIN_ZONE_ROTATION_DEG * Math.PI) / 180, 0]}>
      {/* 아래 좌표는 편집 모드(E, 드래그 G/R)로 사용자가 직접 재배치해 확정한 값 — 콘솔 로그
          그대로 반영(주석의 방위 설명은 최초 배치 기준이라 현재 좌표와는 다를 수 있음). */}
      <MainHall x={-7.17} z={-2.93} rotationDeg={-18.5} />

      <Building x={-10.04} z={-8.23} w={1.3} h={1.3} d={3.0} color={FACILITY_STEEL} label="변전실" rotationDeg={-17.2} />

      <Building x={-3.06} z={-9.45} w={3.6} h={1.6} d={1.5} color={FACILITY_STEEL} label="복합건물" rotationDeg={17.8} />
      <Building x={-3.66} z={-11.56} w={3.4} h={1.4} d={1.5} color={FACILITY_STEEL} label="정비공장" rotationDeg={17.8} />

      <Building x={3.6} z={-11.69} w={1.3} h={0.9} d={1.3} color={FACILITY_STEEL} label="라싱" rotationDeg={-15} />

      <Building x={-9.73} z={-12.64} w={1.0} h={0.8} d={1.0} color={FACILITY_STEEL} label="용접" rotationDeg={17.3} />
      <Building x={-11.17} z={-12.2} w={0.9} h={0.8} d={0.9} color={FACILITY_STEEL} label="LB2" rotationDeg={15.5} />

      <Building x={-12.92} z={-18.5} w={1.2} h={0.85} d={1.2} color={FACILITY_STEEL} label="주유" rotationDeg={19.2} />

      <Building x={-3.53} z={-15.32} w={1.5} h={0.95} d={1.5} color={FACILITY_STEEL} label="도구창고" rotationDeg={14.7} />

      <ParkingLot x={0.4} z={9.4} rows={2} cols={7} />
    </group>
  )
}

// CFS 존 공통 사선 각도(CFS_ZONE_ROTATION_DEG, 30~45도 범위)는 scenePositions.ts에서 가져온다 —
// CfsZone/CfsWarehouse/AuxYardBelt가 전부 같은 값을 써야 서로 평행을 이루고, scenePositions.ts의
// cfsX/cfsZ(창고 실제 월드 좌표) 계산도 이 값을 그대로 써야 앵커링이 어긋나지 않는다.

// 도면(신선대부두 마스터 야드맵)에 적힌 라벨을 그대로 옮긴 것 — 한 사각형 안에 두 블록 코드가
// 같이 적힌 경우(예: "V7,V1")는 실제로 한 열을 반씩 나눠 쓰는 인접 블록이라, 도면 표기 그대로
// 하나의 클러스터 라벨로 합쳐 표기한다(구획을 물리적으로 쪼개지 않는 대신 텍스트는 빠짐없이 전부
// 옮긴다).
const V_ROW: { x: number; label: string; bay: number }[] = [
  { x: -7.5, label: 'V7·V1', bay: 6 },
  { x: -4.5, label: 'V2·V3', bay: 6 },
  { x: -1.5, label: 'V4', bay: 5 },
  { x: 1.5, label: 'V5', bay: 5 },
  { x: 4.5, label: 'V6', bay: 5 },
]

const NP_ROW: { x: number; label: string }[] = [
  { x: -6, label: '3N' },
  { x: -3, label: '2N' },
  { x: 0, label: '1N' },
  { x: 3, label: '2P' },
  { x: 6, label: '1P' },
]

const XYK_ROW: { x: number; label: string }[] = [
  { x: -7.5, label: '3Y·4Y' },
  { x: -4.5, label: '1Y·2Y' },
  { x: -1.5, label: '8K·9K' },
  { x: 1.5, label: '6K·7K' },
  { x: 4.5, label: '4X·5X' },
  { x: 7.5, label: '2X·3X' },
]

// 냉동(Reefer) 클러스터 2세트 — 도면에도 동일하게 1R~5R 번호가 두 벌(서로 다른 물리적 냉동
// 블록 군) 나온다. 위치만 다르고 번호 체계는 도면 그대로 반복 표기한다.
const REEFER_ROW_A: { x: number; label: string }[] = [
  { x: -4, label: '5R' },
  { x: -2, label: '4R' },
  { x: 0, label: '3R' },
  { x: 2, label: '2R' },
  { x: 4, label: '1R' },
]
const REEFER_ROW_B: { x: number; label: string }[] = [
  { x: 0, label: '5R' },
  { x: 2, label: '4R' },
  { x: 4, label: '3R' },
  { x: 6, label: '2R' },
  { x: 8, label: '1R' },
]

// CFS 구역(북서쪽 끝자락) — 마스터 도면 그대로, 부지 전체에서 가장 서쪽·북쪽에 있는 대형 CFS
// 창고 한 채 + 사무실만 남는다. 예전에는 보조 장치장 벨트(H/D/V/N/P/X/Y/K/R)까지 이 그룹에
// 종속돼 있어 항상 창고와 함께 붙어 다녔지만, 벨트는 AuxYardBelt로 분리해 독립된 위치(OUT GATE
// 우측)로 옮겼다(scenePositions.ts의 auxYardBeltPos 참고).
export function CfsZone({ x, z }: ZoneProps) {
  return (
    <group position={[x, 0, z]} rotation={[0, (CFS_ZONE_ROTATION_DEG * Math.PI) / 180, 0]}>
      {/* CFS 대형 창고 — 부지 최서단, 도면처럼 가로로 길고 넓은 대형 물류창고 + 트럭 하역 도크 +
          3D CFS 텍스트. H/D 블록보다 뚜렷이 서쪽으로 떨어뜨려 "완전한 북서쪽 끝자락" 배치를
          분명히 한다. */}
      {/* 아래 좌표는 편집 모드로 사용자가 직접 재배치해 확정한 값(콘솔 로그 그대로 반영) —
          CFS 벨트 나머지 블록들과 멀리 떨어진 값임을 확인하고도 유지하기로 함 */}
      <CfsWarehouse x={CFS_WAREHOUSE_LOCAL_X} z={CFS_WAREHOUSE_LOCAL_Z} w={13} h={2.6} d={3.4} rotationDeg={5.7} />
      <Building x={77.70} z={130.26} w={1.9} h={1.3} d={1.7} color={FACILITY_STEEL} label="CFS 사무실" rotationDeg={5.6} />
    </group>
  )
}

// 보조 장치장 벨트(H/D/V/N/P/X/Y/K/R) — CFS 창고와는 독립된 앵커(x, z)를 받는 별도 그룹. CFS
// 창고 근처(OUT GATE 아래·CFS 왼쪽) 빈 아스팔트로 옮기되, 그 자리가 육측 TP 작업 구간(도로)과
// 아슬아슬하게 붙어 있어 냉동(R) 블록 열이 도로 쪽으로 삐져나왔다 — 위치(x, z)는 그대로 두고
// 그룹 자체를 AUX_YARD_BELT_EXTRA_ROTATION_DEG만큼 추가로 더 돌려 도로 쪽으로 뻗은 방향을 틀어
// 침범을 없앤다. 내부 블록 좌표·간격은 원래 그대로 두고, 그룹 전체 회전(CFS_ZONE_ROTATION_DEG +
// 추가 회전)만 적용해 대각선 배열과 계단식 간격이 한 치도 깨지지 않는다.
// Editable로 감싸 편집 모드(E)에서 벨트 전체를 한 덩어리로 선택해 드래그(G)·회전(R)할 수 있게
// 한다 — 내부 블록 하나하나가 아니라 이 바깥 그룹 자체가 선택 대상이 되므로, 회전시켜도 블록
// 간 상대 배치(사선 정렬·계단식 간격)는 절대 깨지지 않고 벨트 전체가 강체로 함께 돈다.
export function AuxYardBelt({ x, z }: ZoneProps) {
  const rotationDeg = CFS_ZONE_ROTATION_DEG + AUX_YARD_BELT_EXTRA_ROTATION_DEG
  return (
    <Editable name="보조 장치장 벨트" position={[x, 0, z]} rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
      {/* H 블록 열 (H4, H2) */}
      <DiagonalBlockCluster x={-2.0} z={-3.2} rotationDeg={0} bayCount={6} label="H4" />
      <DiagonalBlockCluster x={2.2} z={-3.2} rotationDeg={0} bayCount={6} label="H2" />

      {/* D 블록 열 (D1, D2, D4) */}
      <DiagonalBlockCluster x={-4.0} z={-7.0} rotationDeg={0} bayCount={6} label="D1" />
      <DiagonalBlockCluster x={0} z={-7.0} rotationDeg={0} bayCount={6} label="D2" />
      <DiagonalBlockCluster x={4.0} z={-7.0} rotationDeg={0} bayCount={6} label="D4" />

      {/* V 블록 열 (V1~V7, 도면 표기 그대로 5개 클러스터에 7개 코드) */}
      {V_ROW.map((b) => (
        <DiagonalBlockCluster key={b.label} x={b.x} z={-10.6} rotationDeg={0} bayCount={b.bay} label={b.label} />
      ))}

      {/* N/P 블록 열 (3N·2N·1N·2P·1P) — 도면상 가장 길게 뻗은 평행 블록 군 */}
      {NP_ROW.map((b) => (
        <DiagonalBlockCluster key={b.label} x={b.x} z={-14.2} rotationDeg={0} bayCount={6} label={b.label} />
      ))}

      {/* 세부 장치장 열 (Y·K·X 혼재) + 단독 소형 블록 1X */}
      {XYK_ROW.map((b) => (
        <DiagonalBlockCluster key={b.label} x={b.x} z={-17.8} rotationDeg={0} bayCount={3} label={b.label} />
      ))}
      <DiagonalBlockCluster x={9.5} z={-17.8} rotationDeg={0} bayCount={2} label="1X" />

      {/* 냉동(Reefer) 블록 2군집 — 청록 테두리 + 전용 팔레트로 일반 블록과 구분 */}
      {REEFER_ROW_A.map((b) => (
        <DiagonalBlockCluster key={`r-a-${b.label}`} x={b.x} z={-21.4} rotationDeg={0} bayCount={3} label={b.label} variant="reefer" />
      ))}
      {REEFER_ROW_B.map((b) => (
        <DiagonalBlockCluster key={`r-b-${b.label}`} x={b.x} z={-25.0} rotationDeg={0} bayCount={3} label={b.label} variant="reefer" />
      ))}
    </Editable>
  )
}
