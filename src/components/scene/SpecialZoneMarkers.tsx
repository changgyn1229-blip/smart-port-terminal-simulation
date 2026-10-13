import { yardBlockHalfLength } from '../../data/scenePositions'

interface ZoneProps {
  x: number
  centerZ: number
}

const RACK_SPACING = 2.0
const RACK_COUNT = Math.round((yardBlockHalfLength * 2) / RACK_SPACING)

// 냉동/냉장(Reefer) 블록 테두리 전력 랙 — 시안색 발광 기둥이 블록 한쪽 긴 변을 따라 늘어서
// 실제 리퍼 야드의 전력 공급 랙 열을 표현한다.
export function ReeferPowerRack({ x, centerZ }: ZoneProps) {
  const railX = x - 1.15 // 블록 서쪽 긴 변 바깥쪽
  return (
    <group>
      {/* 랙 상단을 잇는 케이블 트레이 */}
      <mesh position={[railX, 1.4, centerZ]}>
        <boxGeometry args={[0.08, 0.08, yardBlockHalfLength * 2]} />
        <meshStandardMaterial color="#4fd1ff" emissive="#4fd1ff" emissiveIntensity={0.6} />
      </mesh>
      {Array.from({ length: RACK_COUNT + 1 }).map((_, i) => {
        const z = centerZ - yardBlockHalfLength + i * RACK_SPACING
        return (
          <group key={`rack-${z}`} position={[railX, 0, z]}>
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.14, 1.4, 0.14]} />
              <meshStandardMaterial color="#152622" roughness={0.6} />
            </mesh>
            <mesh position={[0, 1.02, 0]}>
              <boxGeometry args={[0.16, 0.12, 0.16]} />
              <meshStandardMaterial color="#4fd1ff" emissive="#4fd1ff" emissiveIntensity={1} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

const HAZARD_STRIPE_SPACING = 0.5

// 위험물(DG) 블록 바닥 경고 스트라이프 — 적색/황색 사선 해치 패턴을 블록 전체 폭에 깔아
// 위험물 구역임을 시각적으로 명확히 구분한다.
export function DgHazardFloor({ x, centerZ }: ZoneProps) {
  const length = yardBlockHalfLength * 2 + 1
  const count = Math.round(length / HAZARD_STRIPE_SPACING)
  return (
    <group>
      <mesh position={[x, 0.006, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, length]} />
        <meshStandardMaterial color="#c0392b" emissive="#c0392b" emissiveIntensity={0.18} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => {
        const z = centerZ - length / 2 + i * HAZARD_STRIPE_SPACING
        return (
          <mesh key={`dg-stripe-${z}`} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[0.18, 3.0]} />
            <meshStandardMaterial color="#f2c94c" emissive="#f2c94c" emissiveIntensity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}
