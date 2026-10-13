import { Edges } from '@react-three/drei'

interface Props {
  position: [number, number, number]
  bayCount?: number
}

const BAY_SPACING = 1.05
const DG_COLORS = ['#e2b93c', '#c0392b', '#e2b93c', '#a4271e']
const CONTAINER_LENGTH = 0.95
const CONTAINER_WIDTH = 0.42
const CONTAINER_HEIGHT = 0.48
const TIER_HEIGHT = 0.5
const FENCE_HEIGHT = 0.55
const FENCE_MARGIN = 0.9 // 컨테이너 열에서 펜스까지 안전 유격 거리

function Fence({ width, depth }: { width: number; depth: number }) {
  const postSpacing = 0.9
  const postsX = Math.max(2, Math.round(width / postSpacing))
  const postsZ = Math.max(2, Math.round(depth / postSpacing))
  const halfW = width / 2
  const halfD = depth / 2

  const posts: [number, number][] = []
  for (let i = 0; i <= postsX; i++) posts.push([-halfW + (i * width) / postsX, -halfD])
  for (let i = 0; i <= postsX; i++) posts.push([-halfW + (i * width) / postsX, halfD])
  for (let i = 0; i <= postsZ; i++) posts.push([-halfW, -halfD + (i * depth) / postsZ])
  for (let i = 0; i <= postsZ; i++) posts.push([halfW, -halfD + (i * depth) / postsZ])

  return (
    <group>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, FENCE_HEIGHT / 2, pz]}>
          <cylinderGeometry args={[0.025, 0.025, FENCE_HEIGHT, 6]} />
          <meshStandardMaterial color="#c0392b" emissive="#c0392b" emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
      ))}
      {/* 상/하단 가로 레일 (4변) */}
      {[FENCE_HEIGHT * 0.35, FENCE_HEIGHT * 0.85].map((ry) => (
        <group key={ry}>
          <mesh position={[0, ry, -halfD]}>
            <boxGeometry args={[width, 0.03, 0.03]} />
            <meshStandardMaterial color="#e2b93c" emissive="#e2b93c" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, ry, halfD]}>
            <boxGeometry args={[width, 0.03, 0.03]} />
            <meshStandardMaterial color="#e2b93c" emissive="#e2b93c" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[-halfW, ry, 0]}>
            <boxGeometry args={[0.03, 0.03, depth]} />
            <meshStandardMaterial color="#e2b93c" emissive="#e2b93c" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[halfW, ry, 0]}>
            <boxGeometry args={[0.03, 0.03, depth]} />
            <meshStandardMaterial color="#e2b93c" emissive="#e2b93c" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 위험물(DG) 장치장 — 노란/빨간 경고 컨테이너 + 둘레 안전 펜스. 다른 구역과 FENCE_MARGIN만큼
// 유격을 두고 배치해 실제 위험물 야드처럼 격리된 전용 구역으로 표현한다.
export function DgZone({ position, bayCount = 5 }: Props) {
  const zBase = (-(bayCount - 1) * BAY_SPACING) / 2
  const width = 1.4 + FENCE_MARGIN * 2
  const depth = bayCount * BAY_SPACING + FENCE_MARGIN * 2

  return (
    <group position={position}>
      <Fence width={width} depth={depth} />
      {Array.from({ length: bayCount }).map((_, bay) => {
        const bz = zBase + bay * BAY_SPACING
        const tiers = 1 + (bay % 2) // 위험물은 낮게(1~2단) 적재해 안전 여유를 둔다
        return Array.from({ length: tiers }).map((_, tier) => {
          const color = DG_COLORS[(bay + tier) % DG_COLORS.length]
          return (
            <mesh key={`${bay}-${tier}`} position={[0, CONTAINER_HEIGHT / 2 + tier * TIER_HEIGHT, bz]} castShadow>
              <boxGeometry args={[CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_LENGTH]} />
              <meshStandardMaterial color={color} roughness={0.6} />
              <Edges color="#2a1a0a" />
            </mesh>
          )
        })
      })}
    </group>
  )
}
