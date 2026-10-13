import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  gateX,
  landMainLaneZ,
  yardBlockHalfWidth,
  yardBlockCenterZ,
  berthSlots,
  quayLineZ,
  scenePositions,
} from '../../data/scenePositions'
import { seaZoneZRange } from '../../data/quayAgvLoop'

interface CameraRigProps {
  focusedId: string | null
}

// 부감 45도 기본 시점 (탑다운도 측면도도 아닌 오블리크 조감)
// 야드를 5선석 클러스터(9개 구역)로 재편하고 게이트를 야드 바로 뒤로 밀착시키면서, 안벽(±54)이
// X축의 지배적 범위가 되고 Z축은 북측 CFS 전용부지까지 포함한 부대시설 지구(z≈116)까지 늘어났다 —
// 바운딩박스(X: -54~54, Z: -15~122)를 여유 있게, 과도하게 멀지 않게 담는 거리로 재산출.
const OVERVIEW_TARGET = new THREE.Vector3(0, 3, 51)
const OVERVIEW_CAMERA = new THREE.Vector3(195, 188, 230)

// 숫자키 뷰 프리셋 (1~5) — camera/target 쌍. 클릭 포커스와 동일한 lerp 전환 메커니즘을 그대로 재사용한다.
const PRESETS: Record<string, { camera: THREE.Vector3; target: THREE.Vector3 }> = {
  '1': { camera: OVERVIEW_CAMERA.clone(), target: OVERVIEW_TARGET.clone() }, // 전체 부감 뷰
  '2': { camera: new THREE.Vector3(70, 55, 85), target: new THREE.Vector3(0, 3, -4) }, // 해측 뷰 (5선석 15기 전체)
  '3': { camera: new THREE.Vector3(38, 44, 82), target: new THREE.Vector3(0, 3, 38) }, // 야드 뷰 (5선석 클러스터 9구역)
  '4': { camera: new THREE.Vector3(180, 120, 225), target: new THREE.Vector3(28, 3, 90) }, // 게이트 + 부대시설 지구 뷰
  '5': { camera: new THREE.Vector3(0.5, 370, 51.5), target: new THREE.Vector3(0, 0, 51) }, // 수직 탑뷰
}

// 영역 버튼(ViewModeBar: 게이트/이송/야드/안벽) 클릭 시 카메라 목적지 — 손으로 고른 camera/target
// 상수 대신, 각 구역의 실제 바운딩 박스(scenePositions.ts/quayAgvLoop.ts에 이미 있는 실측 상수에서
// 그대로 유도, 새 매직넘버 없음)를 계산해 "그 구역 크기에 딱 맞는" 거리·높이를 매 클릭마다 구한다.
// 이 4개 구역은 전부 부모 그룹에 숨은 회전 없이 월드 좌표에 직접 배치되므로(CFS 존처럼 별도
// 회전이 낀 경우와 달리) 아래 상수를 그대로 신뢰해 계산해도 안전하다.
// 쿼터뷰 앙각 — 42도(전체 부감과 같은 각도)는 카메라 피치가 얕아(수평에 가까워) 화면 위쪽으로
// 갈수록 지면과 스치듯 만나는 지점이 급격히 멀어진다(높이/tan(작은 각) → 거리 폭증) — distance를
// 아무리 줄여도 화면 상단에 저 뒤편 크레인들이 계속 들어와 "확대해도 여전히 멀어 보이는" 원인이었다.
// 상세 확대(장비 1개 박스)는 훨씬 가파른 각도로 내려다봐야 지면 스침 거리가 짧아져 실제로 그
// 장비 하나에 시야가 갇힌다.
const AREA_ELEVATION_DEG = 58
const AREA_MARGIN = 1.3 // 바운딩 박스 가장자리가 화면 끝에 딱 붙지 않도록 주는 여유 배율
// 전체 부감(OVERVIEW_CAMERA)과 같은 방위각(azimuth)을 그대로 재사용 — 구역마다 시선 방향이
// 제각각 돌아가지 않고, 어느 버튼을 눌러도 "같은 방향에서" 확대/축소되는 느낌을 유지한다.
const OVERVIEW_DIR = new THREE.Vector2(OVERVIEW_CAMERA.x, OVERVIEW_CAMERA.z).normalize()

interface AreaBox {
  cx: number
  cz: number
  halfWidth: number
  halfDepth: number
}

// 히어로 장비 좌표 — 지역 전체가 아니라 "그 장비 하나"를 감싸는 박스의 중심으로 쓴다.
const heroQuayX = scenePositions['eq-qc-102'].x
const heroYardX = scenePositions['eq-armgc-04'].x

// 같은 선석 내 크레인 간 최소 간격 — CRANE_OFFSETS를 다시 매직넘버로 베끼지 않고 berthSlots
// 실측 좌표에서 직접 유도한다. 히어로 크레인 좌우로 이 간격의 절반 남짓만 담아야 옆 크레인의
// 붐이 프레임에 걸리지 않고 "그 크레인 한 대"가 화면을 채운다.
const sortedBerthX = [...berthSlots].sort((a, b) => a - b)
const craneGap = Math.min(...sortedBerthX.slice(1).map((x, i) => x - sortedBerthX[i]))

// 캔버스가 좌우 패널 때문에 화면비가 매우 넓다(aspect≈2.3, 수평 화각이 수직 화각의 2배 이상) —
// areaCameraFor는 halfWidth·halfDepth 각각에 필요한 거리 중 큰 쪽(주로 halfDepth 쪽, 수직 화각이
// 훨씬 좁으므로)을 채택하는 "contain fit" 방식이라, 그 거리에서 실제로 보이는 가로 폭은 halfWidth가
// 아니라 halfDepth × (수평/수직 화각 비율)에 비례해 훨씬 넓게 나온다. 즉 이 화면비에서는 halfWidth를
// 아무리 줄여도 소용없고, halfDepth(장비 1개를 담는 데 필요한 깊이)를 실제로 줄여야만 확대가 된다 —
// 안벽 전체 15기가 계속 딸려 들어오던 진짜 원인이 이것이었다.
const AREA_BOXES: Record<string, AreaBox> = {
  // 게이트 — OUT까지 함께 담아 전체 게이트 지구를 잡던 기존 박스 대신, 히어로인 IN 게이트
  // 캐노피 한 동만 감싸 실제로 차로·부스가 자세히 보이게 한다.
  'eq-gate-04': {
    cx: gateX,
    cz: landMainLaneZ,
    halfWidth: 9,
    halfDepth: 6,
  },
  // 야드 — 9개 블록 전체 스팬 대신 히어로 블록 1개 폭(+RMGC 다리 여유)만, 깊이도 블록 전체 길이(36)
  // 대신 크레인·컨테이너 스택이 자세히 보이는 앞쪽 일부만 담는다.
  'eq-armgc-04': {
    cx: heroYardX,
    cz: yardBlockCenterZ,
    halfWidth: yardBlockHalfWidth + 3,
    halfDepth: 7,
  },
  // 이송 — 오렌지 존 전체 폭(안벽 전체와 동일한 스팬) 대신 히어로 야드 블록의 해측 TP 한 곳만.
  'eq-agv-047': {
    cx: heroYardX,
    cz: (seaZoneZRange[0] + seaZoneZRange[1]) / 2,
    halfWidth: yardBlockHalfWidth + 4,
    halfDepth: 6,
  },
  // 안벽 — STS 크레인 15기 전체 스팬 대신 히어로 크레인 좌우 여유만, 깊이도 선박 선체 절반
  // 전체가 아니라 크레인 몸체가 자세히 보이는 정도로만 좁힌다.
  'eq-qc-102': {
    cx: heroQuayX,
    cz: quayLineZ,
    halfWidth: craneGap / 2 + 2,
    halfDepth: 5,
  },
}

// 바운딩 박스를 화면(현재 카메라의 실제 fov·aspect 기준)에 여유 있게 꽉 채우는 camera/target 쌍을
// 구한다 — 폭(halfWidth)과 깊이(halfDepth) 각각에 필요한 거리를 구해 더 큰 쪽을 채택하므로, 가로로
// 넓은 구역(안벽)도 세로로 깊은 구역(야드)도 어느 한쪽이 화면 밖으로 잘리지 않는다.
function areaCameraFor(box: AreaBox, camera: THREE.PerspectiveCamera) {
  const vFovRad = THREE.MathUtils.degToRad(camera.fov)
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * camera.aspect)
  const distForDepth = (box.halfDepth * AREA_MARGIN) / Math.tan(vFovRad / 2)
  const distForWidth = (box.halfWidth * AREA_MARGIN) / Math.tan(hFovRad / 2)
  const distance = Math.max(distForDepth, distForWidth)
  const elevRad = THREE.MathUtils.degToRad(AREA_ELEVATION_DEG)
  const horiz = distance * Math.cos(elevRad)
  const height = distance * Math.sin(elevRad)
  return {
    camera: new THREE.Vector3(box.cx + OVERVIEW_DIR.x * horiz, height, box.cz + OVERVIEW_DIR.y * horiz),
    target: new THREE.Vector3(box.cx, 3, box.cz),
  }
}

// 카메라 전환 소요 시간(초) — delta 기반 지수 감쇠라 프레임레이트가 흔들려도 이 시간에 수렴한다.
// 1~1.5초 범위를 satisfy하도록 3.6(대략 1.3초에 99% 도달)로 고정.
const CAMERA_TRANSITION_RATE = 3.6

export function CameraRig({ focusedId }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()
  const transitioning = useRef(true)
  const goalTarget = useRef(OVERVIEW_TARGET.clone())
  const goalCamera = useRef(OVERVIEW_CAMERA.clone())

  useEffect(() => {
    transitioning.current = true
    const box = focusedId ? AREA_BOXES[focusedId] : null
    if (box) {
      const { camera: goalCam, target: goalTgt } = areaCameraFor(box, camera as THREE.PerspectiveCamera)
      goalCamera.current.copy(goalCam)
      goalTarget.current.copy(goalTgt)
    } else {
      goalTarget.current.copy(OVERVIEW_TARGET)
      goalCamera.current.copy(OVERVIEW_CAMERA)
    }
  }, [focusedId, camera])

  // 숫자키 1~5 뷰 프리셋 — 어느 상태에서 눌러도 즉시 해당 프리셋으로 부드럽게 전환
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const preset = PRESETS[e.key]
      if (!preset) return
      goalCamera.current.copy(preset.camera)
      goalTarget.current.copy(preset.target)
      transitioning.current = true
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useFrame((_, delta) => {
    if (!transitioning.current || !controls.current) return
    // 고정 비율(예: 0.06) lerp는 프레임레이트가 떨어지면 체감 소요 시간이 늘어난다 — delta 기반
    // 지수 감쇠를 써서 프레임레이트와 무관하게 항상 같은 시간(CAMERA_TRANSITION_RATE)에 수렴시킨다.
    const t = 1 - Math.exp(-CAMERA_TRANSITION_RATE * delta)
    camera.position.lerp(goalCamera.current, t)
    controls.current.target.lerp(goalTarget.current, t)
    controls.current.update()
    if (camera.position.distanceTo(goalCamera.current) < 0.05) {
      transitioning.current = false
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      minDistance={0.5}
      maxDistance={6000}
      minPolarAngle={THREE.MathUtils.degToRad(2)}
      // 카메라가 지면 아래로 파고들어 뒤집히는 것을 막는 상한 — 정확히 지면 수평선(PI/2)
      // 바로 못 미치는 각도로 고정한다.
      maxPolarAngle={Math.PI / 2 - 0.05}
      enableDamping
      dampingFactor={0.05}
      // 기본값(1)은 휠 한 번에 너무 조금씩 움직여 답답하다 — 스크롤 한 번으로 체감되는 이동폭을
      // 키우되, dampingFactor와 함께 여전히 미끄러지듯 부드럽게 감속하도록 값을 올린다.
      zoomSpeed={1.4}
      onStart={() => {
        transitioning.current = false
      }}
    />
  )
}
