import { Edges } from '@react-three/drei'
import { THEME } from '../../data/theme'

interface Props {
  position: [number, number, number]
  bayCount?: number
}

const BAY_SPACING = 1.05
const REEFER_COLORS = ['#e7ede9', '#d7ecd9', '#c3e6c9', '#eef3ee']
const CONTAINER_LENGTH = 0.95
const CONTAINER_WIDTH = 0.42
const CONTAINER_HEIGHT = 0.48
const TIER_HEIGHT = 0.5
const RACK_HEIGHT = 2.3 // 냉동 컨테이너 전원 공급용 세로 철골 랙 높이 (4단 위로 여유)

// 냉동 컨테이너 장치장 — 전원 공급용 세로 철골 리퍼 랙 + 흰색/연두색 컨테이너 3~4단.
// 정적 배경 볼륨으로, 크레인 상호작용 없이 야드 특수 구역 존재감만 담당한다.
export function ReeferYard({ position, bayCount = 8 }: Props) {
  const zBase = (-(bayCount - 1) * BAY_SPACING) / 2

  return (
    <group position={position}>
      {/* 세로 철골 리퍼 랙 — 베이마다 전원 공급 기둥 */}
      {Array.from({ length: bayCount + 1 }).map((_, i) => {
        const bz = zBase - BAY_SPACING / 2 + i * BAY_SPACING
        return (
          <group key={`rack-${i}`}>
            {[-0.55, 0.55].map((rx) => (
              <mesh key={rx} position={[rx, RACK_HEIGHT / 2, bz]}>
                <boxGeometry args={[0.06, RACK_HEIGHT, 0.06]} />
                <meshStandardMaterial color="#38424a" roughness={0.7} metalness={0.3} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* 랙 상단 케이블 트레이 라인 (전원 공급 연출) — 전체 랙 스팬(zBase±BAY_SPACING/2~) 중앙(z=0)에 맞춰 정렬 */}
      {[-0.55, 0.55].map((rx) => (
        <mesh key={`tray-${rx}`} position={[rx, RACK_HEIGHT - 0.1, 0]}>
          <boxGeometry args={[0.1, 0.06, bayCount * BAY_SPACING]} />
          <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* 냉동 컨테이너 — 흰색/연두색, 3~4단 */}
      {Array.from({ length: bayCount }).map((_, bay) => {
        const bz = zBase + bay * BAY_SPACING
        const tiers = 3 + (bay % 2) // 3~4단
        return Array.from({ length: tiers }).map((_, tier) => {
          const color = REEFER_COLORS[(bay + tier) % REEFER_COLORS.length]
          return (
            <mesh key={`${bay}-${tier}`} position={[0, CONTAINER_HEIGHT / 2 + tier * TIER_HEIGHT, bz]} castShadow>
              <boxGeometry args={[CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_LENGTH]} />
              <meshStandardMaterial color={color} roughness={0.6} />
              <Edges color="#4a5a52" />
            </mesh>
          )
        })
      })}
    </group>
  )
}
