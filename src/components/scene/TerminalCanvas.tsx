import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  scenePositions,
  berthClusters,
  quayLineZ,
  yardBlockSlots,
  yardBlockCenterZ,
  yardBlockHalfLength,
  seaSideTpZ,
  landSideTpZRange,
  truckOutGatePos,
  shipHullLength,
  reeferBlockX,
  dgBlockX,
  gateFacilityPos,
  cfsClusterPos,
  auxYardBeltPos,
  yardClusterGapXs,
} from '../../data/scenePositions'
import { seaZoneXRange, seaZoneZRange, quayAgvLoopWaypoints, quayThroughLanePoints, agvStopLinePoints } from '../../data/quayAgvLoop'
import { inRoadWaypoints, outRoadWaypoints, laneMedian, landStopLinePoints, landSpurs } from '../../data/landTruckLoop'
import { THEME } from '../../data/theme'
import { Ground } from './Ground'
import { QuayCrane3D, SHIP_X } from './QuayCrane3D'
import { Ship3D } from './Ship3D'
import { AgvFleet, type BerthChannel } from './AgvFleet'
import { YardBlocks3D } from './YardBlocks3D'
import { ArmgcGantry3D } from './ArmgcGantry3D'
import { FailoverController, type FailoverState } from './FailoverController'
import { Gate3D } from './Gate3D'
import { TruckFleet } from './TruckFleet'
import { AdminGateZone, CfsZone, AuxYardBelt } from './PortFacilities'
import { ReeferPowerRack, DgHazardFloor } from './SpecialZoneMarkers'
import { SeaSideTpPad, SeaSideZoneBand, TruckParkingLane, LandSideTpBand } from './TransferZone'
import { RoadWithLanes, StraightLane } from './RoadWithLanes'
import { StopLine } from './StopLine'
import { CameraRig } from './CameraRig'
import { AreaBadge } from './AreaBadge'
import { EditModeProvider, BuildingTransformGizmo, useBuildingEditModeState } from './BuildingEditMode'

const AGV_LANE_COLOR = '#1e9bf0' // 안벽 실제 사진 참고 — 굵은 하늘색/블루 유도선(L1/L2/L3)
const TRUCK_LOOP_COLOR = '#FF1133' // 육측 외부트럭 1-Way 순환 궤적 (IN/OUT 공통)

interface TerminalCanvasProps {
  focusedId: string | null
  onFocus: (id: string) => void
}

const noop = () => {}

const heroQuayX = scenePositions['eq-qc-102'].x
const heroYardX = scenePositions['eq-armgc-04'].x
const inGatePos = scenePositions['eq-gate-04']

const yardSpan = Math.max(...yardBlockSlots) - Math.min(...yardBlockSlots)

// Canvas의 camera 프롭은 참조가 바뀔 때마다 R3F가 카메라 position/근평면을 다시 적용한다
// (아래 주석 참고). 컴포넌트 안에 인라인 객체 리터럴로 두면 focusedId가 바뀔 때마다(=확대
// 버튼을 누를 때마다) TerminalCanvas가 리렌더되며 매번 새 객체가 만들어져, CameraRig가
// 서서히 확대해 가던 카메라 위치를 초기값(195,188,230)으로 계속 되돌려버린다 — "확대를 눌러도
// 항상 멀리서만 보이는" 원인. 모듈 스코프 상수로 참조를 고정해 최초 1회만 적용되게 한다.
const INITIAL_CAMERA = { fov: 48, position: [195, 188, 230] as [number, number, number], near: 0.1, far: 12000 }

export function TerminalCanvas({ focusedId, onFocus }: TerminalCanvasProps) {
  // STS <-> AGV 핸드오프 채널 (크레인 15기 개별 X 기준)
  const berthSignals = useRef<Record<number, BerthChannel>>({})
  // 해측 RMGC <-> AGV 핸드오프 채널 (야드 블록 x 기준)
  const yardSeaSignals = useRef<Record<number, BerthChannel>>({})
  // 육측 RMGC <-> 외부트럭 핸드오프 채널 (야드 블록 x 기준)
  const landSignals = useRef<Record<number, BerthChannel>>({})
  // RMGC Failover 신호 — 현재 육측 RMGC가 고장 상태인 블록 X 집합(여러 블록 동시 가능). 각 블록의
  // 해측 RMGC가 이를 감지해 커버한다
  const failoverState = useRef<FailoverState>({ blockXs: new Set() })

  // 건물 드래그/회전 편집 모드 — 'E'로 토글, 클릭 선택, G(이동)/R(회전), Esc(선택 해제)
  const edit = useBuildingEditModeState()

  // near를 0.1까지 낮춰 카메라가 오브젝트에 바짝 붙어 포커스 줌인할 때 근평면(near plane)에
  // 메쉬가 잘려 사라지는 클리핑을 방지한다. R3F는 camera 프롭 변경 시 내부적으로
  // updateProjectionMatrix()를 자동 호출하므로 별도 명령형 호출이 필요 없다.
  return (
    <Canvas
      shadows
      camera={INITIAL_CAMERA}
      gl={{ antialias: true }}
      onPointerMissed={() => edit.editMode && edit.select(null)}
    >
      {/* 바다 톤(#0d4f52)과 이어지도록 배경/안개도 살짝 청록 기운을 준다 — 지면 가장자리가
          어쩌다 보여도 뚝 끊긴 검은 허공이 아니라 바다색이 이어지는 것처럼 보이게 */}
      <color attach="background" args={['#04120f']} />
      <fog attach="fog" args={['#04120f', 260, 560]} />

      {/* 깨끗한 주광색 — 바닥·컨테이너에 녹색/청록 빛이 섞이지 않도록 중성 화이트/쿨톤으로 보정 */}
      <ambientLight color="#f8fafc" intensity={0.55} />
      <directionalLight position={[30, 45, 20]} intensity={1.15} castShadow />
      {/* hemisphereLight의 하늘색 성분이 실제 녹색 틴트의 주 원인이었음 — 중성 쿨그레이로 교체 */}
      <hemisphereLight args={['#4a5560', '#0a1210', 0.5]} />

      <Ground />

      {/* 게이트 배후 부대시설 지구 — 컨테이너 블록보다 서쪽(1번선석 방향)에, IN GATE와 같은 육상
          도로 축(z)으로 맞춰 배치. 바다 쪽 얕은 z를 쓰지 않아 건물이 안벽 쪽으로 튀어나와 보이지
          않는다. 메인 GATE/철송 GATE 같은 장식용 게이트 구조물은 두지 않는다. */}
      {/* 건물 드래그/회전 편집 대상 — 본관/변전실/정비공장/CFS 등 부대시설 건물만 이 프로바이더로
          감싸 편집 모드에서 클릭 선택이 가능하도록 한다(크레인·AGV·게이트 등 장비는 대상 외). */}
      <EditModeProvider editMode={edit.editMode} selected={edit.selected} select={edit.select}>
        <AdminGateZone x={gateFacilityPos.x} z={gateFacilityPos.z} />

        {/* CFS 구역 — 부지 전체에서 가장 서쪽·북쪽 끝 외곽에 독립 배치(마스터 도면 기준 유일한 CFS
            창고). 주변 D/H/V/N/P/특수장치장(X·Y·K)/냉동(R) 블록 벨트 전체를 CfsZone 내부에서 함께
            관리해 라벨이 항상 같은 좌표계로 따라온다. */}
        <CfsZone x={cfsClusterPos.x} z={cfsClusterPos.z} />

        {/* 보조 장치장 벨트(H/D/V/N/P/X/Y/K/R) — OUT GATE를 지나 우측(동쪽)의 넓은 빈 아스팔트로
            이동 배치. CfsZone(창고)과는 독립된 앵커라 창고 위치와 무관하게 이동할 수 있다. */}
        <AuxYardBelt x={auxYardBeltPos.x} z={auxYardBeltPos.z} />
      </EditModeProvider>

      {/* 1. 최상단 안벽 — 안벽 총연장 1,500m, STS 크레인(C/C) 15기(선석당 3기 x 5선석), 선석마다
          초대형 컨테이너선 1척 공유. 클린 뷰 유지를 위해 장비 상단 플로팅 ID 라벨은 표시하지 않는다 */}
      {berthClusters.map((cluster) => (
        <group key={`berth-${cluster.centerX}`}>
          <group position={[cluster.centerX + SHIP_X, 0, quayLineZ]} rotation={[0, -Math.PI / 2, 0]}>
            <Ship3D length={shipHullLength} />
          </group>
          {cluster.craneXs.map((x) => {
            const isHero = x === heroQuayX
            return (
              <group key={`crane-${x}`} position={[x, 0, quayLineZ]} rotation={[0, -Math.PI / 2, 0]}>
                <QuayCrane3D
                  position={[0, 0, 0]}
                  onClick={isHero ? () => onFocus('eq-qc-102') : noop}
                  carryContainer
                  berthX={x}
                  berthSignals={berthSignals}
                />
              </group>
            )
          })}
        </group>
      ))}

      {/* 해측 오렌지 존 — AGV 전용 단방향 순환 구역 배경 밴드 */}
      <SeaSideZoneBand
        centerX={0}
        width={seaZoneXRange[1] - seaZoneXRange[0]}
        zRange={seaZoneZRange}
        label="ORANGE ZONE (SEA-SIDE TP · IGV ONLY)"
      />

      {/* 3. 상단 해측 TP — 야드 블록마다 개별 AGV/IGV 교환 패드 */}
      {yardBlockSlots.map((x) => (
        <SeaSideTpPad key={`sea-tp-${x}`} position={[x, 0, seaSideTpZ]} />
      ))}

      {/* Orange Zone 도로 — 실제 안벽 현장 사진 참고, IGV 1-Way 순환 궤적(L1 픽업 <-> L3 반환)을
          굵은 실선 블루 유도선으로 표시. L2는 중앙 추월/주행로를 나타내는 장식용 평행 차선.
          STS/해측TP 정차 슬롯마다 정지선(대비를 위해 흰색) 표시 */}
      <RoadWithLanes waypoints={quayAgvLoopWaypoints} closed laneColor={AGV_LANE_COLOR} dashed={false} lineWidth={0.16} />
      <StraightLane from={quayThroughLanePoints[0]} to={quayThroughLanePoints[1]} width={2.2} laneColor={AGV_LANE_COLOR} />
      {agvStopLinePoints.map(([x, z]) => (
        <StopLine key={`agv-stopline-${x}-${z}`} position={[x, z]} color={THEME.ink} />
      ))}

      {/* AGV/IGV 편대 — 오렌지 존 폐곡선을 단방향 순환. STS 15기 하부 정차선과 야드 해측 TP 9곳을
          루프 순서대로 번갈아 들르며, 절대 육측(트럭 루프)으로는 넘어오지 않는다. 무간섭 검증: 야드
          블록(z=20~56)이 해측 AGV 구간(z≈-8~18)과 육측 트럭 구간(z≈57~103) 사이를 방패처럼 완전히
          가로막고 있어 두 동선은 어떤 경우에도 교차하지 않는다. */}
      <AgvFleet berthSignals={berthSignals} yardSeaSignals={yardSeaSignals} onFocusHero={() => onFocus('eq-agv-047')} />

      {/* 2. 중앙 수직 야드 블록 9개 = 5선석 대응 클러스터([2,2,1,2,2]) — 실제 신선대 야드맵처럼
          안벽 전체 폭에 얇게 펴지 않고 선석별 독립 클러스터로 편성(안벽과 수직, 4~5단 고밀도,
          20ft/40ft 혼합) — 단일 InstancedMesh로 렌더링 */}
      <YardBlocks3D positions={yardBlockSlots} centerZ={yardBlockCenterZ} heroX={heroYardX} onHeroClick={() => onFocus('eq-armgc-04')} />
      {/* 클러스터(선석 구역) 경계 내부 횡단 도로 — 야드 전체 깊이를 가로지르는 옅은 마킹으로
          선석 구역 간 경계를 시각적으로 명확히 구분한다 */}
      {yardClusterGapXs.map((gx) => (
        <mesh key={`cluster-gap-${gx}`} position={[gx, 0.008, yardBlockCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, yardBlockHalfLength * 2 + 2]} />
          <meshStandardMaterial color="#20282a" roughness={0.95} />
        </mesh>
      ))}
      {/* 특화 구역 — 서쪽 끝 블록은 위험물(DG) 바닥 경고 스트라이프, 동쪽 끝 블록은 냉동/냉장(Reefer)
          전력 랙을 테두리에 배치 */}
      <DgHazardFloor x={dgBlockX} centerZ={yardBlockCenterZ} />
      <ReeferPowerRack x={reeferBlockX} centerZ={yardBlockCenterZ} />

      {/* 듀얼 RMGC — 블록마다 해측 절반 전담(AGV 인계) + 육측 절반 전담(트럭 인계) 2대씩, 9블록 x 2 = 18기.
          해측(SEA) 개체가 육측(LAND)보다 더 높고 다리 간격이 넓은 Overpassing 규격 — 평상시엔 가동
          범위가 절반씩 분리되지만, 육측이 고장나면 해측이 그 위/옆으로 물리적으로 넘어 지나가(overpass)
          대신 처리한다. 클린 뷰 유지를 위해 장비 상단 플로팅 ID 라벨은 표시하지 않는다 */}
      {yardBlockSlots.map((x) => {
        const isHero = x === heroYardX
        return (
          <group key={`armgc-pair-${x}`}>
            <ArmgcGantry3D
              position={[x, 0, yardBlockCenterZ]}
              half="SEA"
              channelKey={x}
              channel={yardSeaSignals}
              landChannel={landSignals}
              failoverRef={failoverState}
              onClick={isHero ? () => onFocus('eq-armgc-04') : undefined}
            />
            <ArmgcGantry3D
              position={[x, 0, yardBlockCenterZ]}
              half="LAND"
              channelKey={x}
              channel={landSignals}
              failoverRef={failoverState}
              onClick={isHero ? () => onFocus('eq-armgc-04') : undefined}
            />
          </group>
        )
      })}

      {/* 4. 육측 TP — 외부트럭 작업 구간 배경 밴드 + 블록별 LSTP 주차 슬롯. 실제 현장 사진 참고 —
          아스팔트 위 노란색 화살표형 빗살 마킹 + 파란 구획 포스트 + 슬롯 번호(블록 순번)를 스퍼
          (branch~bay) 전체 길이에 그려, 슬롯 도로 표면 자체가 곧 주차 슬롯 마킹이 되도록 한다 */}
      <LandSideTpBand centerX={0} width={yardSpan + 16} zRange={landSideTpZRange} label="LAND-SIDE TP (외부트럭 작업 구간)" />
      {landSpurs.map((s, i) => (
        <TruckParkingLane key={`land-tp-${s.x}`} x={s.x} branchZ={s.branch[2]} bayZ={s.bay[2]} slotNumber={i + 1} />
      ))}

      {/* 4. 우측 외부트럭 IN/OUT 게이트 + U턴 루프 — 게이트 진입 -> 직진 -> 블록별 LSTP 종방향(세로)
          정차 -> 180도 U턴 아크로 출차하는 1-Way 순환 궤적을 스펙 지정 적색(#FF1133)으로 통일 표시.
          IN(진입)과 OUT(진출)은 완전히 분리된 레인·게이트 구조물로 나누고, 각 블록의 LSTP는 순항
          레인에서 분기(spur)하는 짧은 가지 도로로 연결한다. 폭을 기존 대비 3배 이상(2.2 -> 9) 넓혀
          궤적이 겹치지 않는 넉넉한 진입/출차 공간을 확보한다. */}
      <RoadWithLanes waypoints={inRoadWaypoints} width={9} laneColor={TRUCK_LOOP_COLOR} />
      <RoadWithLanes waypoints={outRoadWaypoints} width={9} laneColor={TRUCK_LOOP_COLOR} />
      {/* 스퍼(분기~베이) 구간은 TruckParkingLane이 슬롯 아스팔트 표면을 직접 그리므로 별도 도로 불필요 */}
      {/* IN/OUT 평행 구간 중앙분리대 — 실제 게이트 사진의 차로 분리 마킹을 재현 */}
      <mesh position={[(laneMedian.x0 + laneMedian.x1) / 2, 0.05, laneMedian.z]} receiveShadow>
        <boxGeometry args={[Math.abs(laneMedian.x1 - laneMedian.x0), 0.12, 0.5]} />
        <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.45} />
      </mesh>
      {landStopLinePoints.map(([x, z]) => (
        <StopLine key={`truck-stopline-${x}`} position={[x, z]} width={2.8} color={TRUCK_LOOP_COLOR} />
      ))}
      <Html position={[inGatePos.x + 10, 1.2, inGatePos.z]} center zIndexRange={[10, 0]} occlude={false}>
        <span className="pointer-events-none whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF1133] backdrop-blur-sm" style={{ borderColor: '#FF113380', background: 'rgba(15,28,25,0.85)' }}>
          IN →
        </span>
      </Html>
      <Html position={[truckOutGatePos.x + 10, 1.2, truckOutGatePos.z]} center zIndexRange={[10, 0]} occlude={false}>
        <span className="pointer-events-none whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF1133] backdrop-blur-sm" style={{ borderColor: '#FF113380', background: 'rgba(15,28,25,0.85)' }}>
          ← OUT
        </span>
      </Html>
      {/* IN 게이트 — 10차선 다차선 캐노피 단지 (OUT 대비 규모감 있으되 과도하지 않게 축소) */}
      <group position={[inGatePos.x, 0, inGatePos.z]} rotation={[0, Math.PI / 2, 0]}>
        <Gate3D position={[0, 0, 0]} delay={inGatePos.delay} color={THEME.ink} lanes={10} laneWidth={1.6} label="IN GATE" onClick={() => onFocus('eq-gate-04')} />
      </group>
      {/* OUT 게이트 — 8차선, IN과 완전히 분리된 별도 구조물 */}
      <group position={[truckOutGatePos.x, 0, truckOutGatePos.z]} rotation={[0, Math.PI / 2, 0]}>
        <Gate3D position={[0, 0, 0]} delay={0.5} color={THEME.ink} lanes={8} laneWidth={1.8} label="OUT GATE" onClick={noop} />
      </group>
      <TruckFleet landSignals={landSignals} />

      <AreaBadge
        position={[heroQuayX, 6.2, quayLineZ]}
        label="QUAY SIDE (영역 클릭 시 확대)"
        onClick={() => onFocus('eq-qc-102')}
      />
      <AreaBadge
        position={[inGatePos.x, 3.6, inGatePos.z]}
        label="IN GATE (영역 클릭 시 확대)"
        onClick={() => onFocus('eq-gate-04')}
      />
      <AreaBadge
        position={[truckOutGatePos.x, 3.6, truckOutGatePos.z]}
        label="OUT GATE"
        onClick={() => onFocus('eq-gate-04')}
      />

      <FailoverController blockXs={yardBlockSlots} failoverRef={failoverState} />
      <CameraRig focusedId={focusedId} />
      <BuildingTransformGizmo editMode={edit.editMode} selected={edit.selected} mode={edit.mode} />
    </Canvas>
  )
}
