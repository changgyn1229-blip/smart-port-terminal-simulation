import { Edges } from '@react-three/drei'
import { THEME } from '../../data/theme'

interface HudBeamProps {
  args: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  color?: string
}

// 사이버펑크 HUD 스타일 구조물 — 반투명 본체 + 발광 엣지 라인
export function HudBeam({ args, position, rotation, castShadow, color = THEME.teal }: HudBeamProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} transparent opacity={0.22} emissive={color} emissiveIntensity={0.5} depthWrite={false} />
      <Edges color={color} threshold={5} />
    </mesh>
  )
}
