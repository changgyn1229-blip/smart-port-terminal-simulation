import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CONTAINER_COLORS } from '../../data/theme'
import { yardBlockHalfLength, reeferBlockX, yardColOffsets, YARD_CONTAINER_WIDTH as CONTAINER_WIDTH } from '../../data/scenePositions'

interface Props {
  positions: number[]
  centerZ: number
  heroX?: number
  onHeroClick?: () => void
}

const BAY_SPACING = 1.0
const BAY_COUNT = Math.round(2 * (yardBlockHalfLength / BAY_SPACING))
const BAY_Z_BASE = (-(BAY_COUNT - 1) * BAY_SPACING) / 2
// 컨테이너 열(Row) 폭 — 실제 야드 사진처럼 촘촘한 9열(YARD_COL_COUNT, scenePositions.ts)을
// 그대로 가져와 colSeed(0~8)만 붙인다.
const COLS: [number, number][] = yardColOffsets.map((x, i) => [x, i])

// ISO 표준 규격 비율 — 40ft(12.2m)를 기준 유닛(0.95)으로 두고, 20ft(6.0m)는 그 비율로 축소.
// 20ft는 실제 야드처럼 40ft 한 슬롯 자리에 두 대를 이어붙여(백투백) 배치한다.
const CONTAINER_LENGTH_40 = 0.95
const CONTAINER_LENGTH_20 = CONTAINER_LENGTH_40 * (6.0 / 12.2) // ≈0.467
const CONTAINER_HEIGHT = 0.48
const TIER_HEIGHT = 0.5

// 냉동/냉장(Reefer) 전용 컨테이너 팔레트 — 흰색 위주 + 시안(전력유닛) 포인트
const REEFER_CONTAINER_COLORS = ['#e7ebee', '#c8ced2', '#4fd1ff', '#e7ebee', '#9aa4ab', '#4fd1ff']

// 안벽과 수직으로 늘어선 컨테이너 적재 블록들을 단 하나의 InstancedMesh로 렌더링한다.
// 블록당 개별 mesh(≈1460개, Edges 포함 시 2배 이상)를 그대로 두면 블록 수가 늘어날 때 드로우콜이
// 급증해 프레임이 급락하므로, 컨테이너 색상/길이(20ft·40ft)만 인스턴스 매트릭스·컬러로 다양화하고
// 외곽선(Edges)은 포기하는 대신 단일 드로우콜로 묶어 부드럽게 렌더링한다.
// 클릭 포커스는 히어로 블록 위치에만 얇은 투명 히트박스를 별도로 얹어 처리한다.
export function YardBlocks3D({ positions, centerZ, heroX, onHeroClick }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const { count, matrices, colors } = useMemo(() => {
    const mats: THREE.Matrix4[] = []
    const cols: THREE.Color[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const scale40 = new THREE.Vector3(1, 1, 1)
    const scale20 = new THREE.Vector3(1, 1, CONTAINER_LENGTH_20 / CONTAINER_LENGTH_40)

    for (const blockX of positions) {
      const isReefer = blockX === reeferBlockX
      const palette = isReefer ? REEFER_CONTAINER_COLORS : CONTAINER_COLORS
      for (let bay = 0; bay < BAY_COUNT; bay++) {
        const bz = BAY_Z_BASE + bay * BAY_SPACING
        const isTwentyFtBay = bay % 4 === 3 // 4베이 중 1번은 20ft 컨테이너 2대를 백투백 배치
        for (const [cx, colSeed] of COLS) {
          const tiers = 4 + ((bay + colSeed) % 2) // 4~5단, 빈 슬롯 없음
          for (let tier = 0; tier < tiers; tier++) {
            const y = CONTAINER_HEIGHT / 2 + tier * TIER_HEIGHT
            const color = new THREE.Color(palette[(bay * 2 + colSeed * 3 + tier) % palette.length])
            if (isTwentyFtBay) {
              const halfGap = CONTAINER_LENGTH_20 / 2 + 0.015
              m.compose(new THREE.Vector3(blockX + cx, y, centerZ + bz - halfGap), q, scale20)
              mats.push(m.clone())
              cols.push(color)
              m.compose(new THREE.Vector3(blockX + cx, y, centerZ + bz + halfGap), q, scale20)
              mats.push(m.clone())
              cols.push(color)
            } else {
              m.compose(new THREE.Vector3(blockX + cx, y, centerZ + bz), q, scale40)
              mats.push(m.clone())
              cols.push(color)
            }
          }
        }
      }
    }
    return { count: mats.length, matrices: mats, colors: cols }
  }, [positions, centerZ])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    colors.forEach((c, i) => mesh.setColorAt(i, c))
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // 실제 인스턴스 매트릭스를 다 채운 "뒤"에 바운딩 스피어를 다시 계산한다. R3F가 mount 시점에
    // 이 useEffect보다 먼저 한두 프레임을 그릴 수 있는데, 그때 frustumCulled=true였다면 아직
    // 전부 원점(identity 매트릭스)에 몰려 있는 상태의 바운딩 스피어가 캐시돼 버려 — 이후
    // 매트릭스가 실제 월드 좌표로 갱신돼도 그 좁은(원점 기준) 스피어가 그대로 남아 카메라가 조금만
    // 움직여도 블록 전체가 컬링돼 사라지는 버그가 났었다. 여기서 명시적으로 재계산해 인스턴스
    // 전체 스팬을 감싸는 정확한 바운딩 스피어로 갱신하면, 컬링을 켜둬도(성능 이점 유지) 안전하다.
    mesh.computeBoundingSphere()
  }, [matrices, colors])

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
        <boxGeometry args={[CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_LENGTH_40]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {heroX !== undefined && (
        <mesh
          position={[heroX, 1.6, centerZ]}
          onClick={onHeroClick ? (e) => (e.stopPropagation(), onHeroClick()) : undefined}
        >
          <boxGeometry args={[2.2, 3.2, yardBlockHalfLength * 2]} />
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}
