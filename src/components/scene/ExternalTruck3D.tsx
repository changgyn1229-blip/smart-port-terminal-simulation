import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'

interface Props {
  waypoints: [number, number, number][]
  delay: number
  cycle?: number
}

const WHEEL_Z = [1.0, -0.1, -1.0, -1.9]

// 캐빈 + 트레일러가 결합된 외부트럭 — IN 게이트 -> 육측 TP -> U턴 -> OUT 게이트 도로를 왕복 주행
export function ExternalTruck3D({ waypoints, delay, cycle = 20 }: Props) {
  const body = useRef<THREE.Group>(null)
  const cargo = useRef<THREE.Mesh>(null)

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(waypoints.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4),
    [waypoints],
  )

  useFrame(({ clock }) => {
    const raw = ((clock.getElapsedTime() + delay) % cycle) / cycle
    const t = raw < 0.5 ? raw * 2 : 2 - raw * 2
    const outbound = raw < 0.5

    if (body.current) {
      const pos = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      const dir = outbound ? tangent : tangent.clone().negate()
      body.current.position.copy(pos)
      body.current.rotation.y = Math.atan2(dir.x, dir.z)
    }
    // U턴을 지나 OUT 게이트 방향(경로 후반부)에서만 화물을 적재한 상태로 표시
    if (cargo.current) cargo.current.visible = t >= 0.5
  })

  return (
    <group ref={body}>
      {WHEEL_Z.map((z) =>
        [-0.42, 0.42].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, 0.14, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
            <meshStandardMaterial color={THEME.inkFaint} />
          </mesh>
        )),
      )}

      {/* 캐빈 */}
      <mesh position={[0, 0.46, 1.15]} castShadow>
        <boxGeometry args={[0.72, 0.5, 0.6]} />
        <meshStandardMaterial color={THEME.surface2} transparent opacity={0.65} emissive={THEME.teal} emissiveIntensity={0.15} />
        <Edges color={THEME.teal} />
      </mesh>
      <mesh position={[-0.24, 0.5, 1.44]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#eafffb" emissive={THEME.accent} emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.24, 0.5, 1.44]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#eafffb" emissive={THEME.accent} emissiveIntensity={1} />
      </mesh>

      {/* 트레일러 베드 */}
      <mesh position={[0, 0.34, -0.55]} castShadow>
        <boxGeometry args={[0.78, 0.14, 2.4]} />
        <meshStandardMaterial color={THEME.inkFaint} roughness={0.8} />
        <Edges color={THEME.accent} />
      </mesh>

      {/* 트레일러 화물 컨테이너 — U턴 이후 구간에서만 표시 */}
      <mesh ref={cargo} position={[0, 0.66, -0.55]} visible={false}>
        <boxGeometry args={[0.7, 0.5, 2.2]} />
        <meshStandardMaterial color={CONTAINER_COLORS[5]} roughness={0.7} />
        <Edges color="#fff3d6" />
      </mesh>
    </group>
  )
}
