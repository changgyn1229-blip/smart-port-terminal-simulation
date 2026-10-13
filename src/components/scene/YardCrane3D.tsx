import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME } from '../../data/theme'
import { HudBeam } from './HudBeam'

interface Props {
  position: [number, number, number]
  delay: number
  color: string
  onClick: () => void
}

// 갠트리 로컬 기준 호이스트 상하 이동 범위 — 레일(y=3.3) 바로 아래에서 컨테이너 블록 상단(절대 y≈1.3)까지 내려감
const HOIST_MIN = -2.3
const HOIST_MAX = -0.5

export function YardCrane3D({ position, delay, onClick }: Props) {
  const gantry = useRef<THREE.Group>(null)
  const hoist = useRef<THREE.Mesh>(null)
  const rope = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.5 + delay
    if (gantry.current) gantry.current.position.x = Math.sin(t) * 1.6

    const hoistY = HOIST_MIN + (Math.sin(t * 1.8) * 0.5 + 0.5) * (HOIST_MAX - HOIST_MIN)
    if (hoist.current) hoist.current.position.y = hoistY
    if (rope.current) {
      const ropeLength = Math.abs(hoistY)
      rope.current.scale.y = ropeLength
      rope.current.position.y = hoistY / 2
    }
  })

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]} onClick={(e) => (e.stopPropagation(), onClick())}>
      {/* container block */}
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2].map((row) => (
          <mesh key={`${col}-${row}`} position={[-1.8 + col * 1.05, 0.2 + row * 0.42, 0]} castShadow>
            <boxGeometry args={[0.9, 0.4, 1.8]} />
            <meshStandardMaterial
              color={row % 2 === 0 ? THEME.teal : THEME.accent}
              transparent
              opacity={0.3}
              emissive={row % 2 === 0 ? THEME.teal : THEME.accent}
              emissiveIntensity={0.35}
            />
            <Edges color={row % 2 === 0 ? THEME.teal : THEME.accent} />
          </mesh>
        )),
      )}

      {/* portal legs — HUD 스타일 */}
      <HudBeam args={[0.22, 3.3, 0.22]} position={[-2.4, 1.65, -1.4]} />
      <HudBeam args={[0.22, 3.3, 0.22]} position={[-2.4, 1.65, 1.4]} />
      <HudBeam args={[0.22, 3.3, 0.22]} position={[2.4, 1.65, -1.4]} />
      <HudBeam args={[0.22, 3.3, 0.22]} position={[2.4, 1.65, 1.4]} />
      <HudBeam args={[5, 0.2, 0.2]} position={[0, 3.3, -1.4]} />
      <HudBeam args={[5, 0.2, 0.2]} position={[0, 3.3, 1.4]} />

      <group ref={gantry} position={[0, 3.3, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.2, 2.9]} />
          <meshStandardMaterial color={THEME.teal} transparent opacity={0.35} emissive={THEME.teal} emissiveIntensity={0.6} />
          <Edges color={THEME.teal} />
        </mesh>
        <mesh ref={rope}>
          <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
          <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={0.8} />
        </mesh>
        <mesh ref={hoist} castShadow>
          <boxGeometry args={[0.7, 0.35, 1.7]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.7} />
          <Edges color="#fff3d6" />
        </mesh>
      </group>
    </group>
  )
}
