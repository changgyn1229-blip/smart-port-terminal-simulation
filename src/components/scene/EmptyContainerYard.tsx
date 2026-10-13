import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EMPTY_CONTAINER_COLORS } from '../../data/theme'

interface Props {
  position: [number, number, number]
  bayCount?: number
  palette?: string[]
}

export const EMPTY_YARD_BAY_SPACING = 1.0
const BAY_SPACING = EMPTY_YARD_BAY_SPACING
const COLS: [number, number][] = [
  [-0.5, 0],
  [0.5, 1],
]
const CONTAINER_LENGTH = 0.95
const CONTAINER_WIDTH = 0.4
const CONTAINER_HEIGHT = 0.48
const TIER_HEIGHT = 0.5
const TIERS = 8 // 공컨테이너는 가벼워 실제로도 7~8단까지 높게 쌓는다

// 주 야드 블록 주변 데드스페이스에 배치하는 공컨테이너 장치장 — 회색/흰색 톤으로 실제 컨테이너와
// 시각적으로 구분되며, 크레인 상호작용 없이 배경 볼륨만 담당한다. 블록당 개별 mesh(+Edges)를
// 그대로 두면 CFS 벨트처럼 클러스터 수가 많아질 때 드로우콜이 급증해 프레임이 급락하므로,
// YardBlocks3D와 동일하게 컨테이너 색상만 인스턴스 컬러로 다양화하고 단일 InstancedMesh로
// 묶는다(외곽선은 그 대가로 포기 — YardBlocks3D도 같은 이유로 생략).
export function EmptyContainerYard({ position, bayCount = 10, palette = EMPTY_CONTAINER_COLORS }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const { count, matrices, colors } = useMemo(() => {
    const zBase = (-(bayCount - 1) * BAY_SPACING) / 2
    const mats: THREE.Matrix4[] = []
    const cols: THREE.Color[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    for (let bay = 0; bay < bayCount; bay++) {
      const bz = zBase + bay * BAY_SPACING
      for (const [cx, colSeed] of COLS) {
        const tiers = TIERS - ((bay + colSeed) % 2) // 7~8단
        for (let tier = 0; tier < tiers; tier++) {
          const color = new THREE.Color(palette[(bay + colSeed * 2 + tier) % palette.length])
          m.compose(new THREE.Vector3(cx, CONTAINER_HEIGHT / 2 + tier * TIER_HEIGHT, bz), q, scale)
          mats.push(m.clone())
          cols.push(color)
        }
      }
    }
    return { count: mats.length, matrices: mats, colors: cols }
  }, [bayCount, palette])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    colors.forEach((c, i) => mesh.setColorAt(i, c))
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // YardBlocks3D와 동일한 이유로, 매트릭스를 다 채운 뒤 바운딩 스피어를 명시적으로 재계산한다 —
    // mount 초기 프레임에 캐시될 수 있는 "원점 기준" 좁은 스피어를 인스턴스 전체 스팬 기준으로
    // 갱신해, frustumCulled를 켜둔 채로도(성능 이점 유지) 컬링 버그 없이 안전하게 동작한다.
    mesh.computeBoundingSphere()
  }, [matrices, colors])

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_LENGTH]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  )
}
