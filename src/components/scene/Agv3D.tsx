import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, CONTAINER_COLORS } from '../../data/theme'

interface Props {
  waypoints: [number, number, number][]
  delay: number
  onClick: () => void
  carryContainer?: boolean
}

// 해측 TP 라인을 왕복하는 AGV/IGV — 주어진 웨이포인트를 따라 이동 (임의 수치 이동 아님)
export function Agv3D({ waypoints, delay, onClick, carryContainer = false }: Props) {
  const body = useRef<THREE.Group>(null)
  const lightL = useRef<THREE.Mesh>(null)
  const lightR = useRef<THREE.Mesh>(null)
  const cargo = useRef<THREE.Mesh>(null)

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(waypoints.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5),
    [waypoints],
  )

  useFrame(({ clock }) => {
    const cycle = 9
    const raw = ((clock.getElapsedTime() + delay) % cycle) / cycle
    // ping-pong: 0->1->0 를 매끄러운 삼각파로 (해측 TP 라인 U턴 루프)
    const t = raw < 0.5 ? raw * 2 : 2 - raw * 2
    const outbound = raw < 0.5

    if (body.current) {
      const pos = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      const dir = outbound ? tangent : tangent.clone().negate()
      body.current.position.copy(pos)
      body.current.rotation.y = Math.atan2(dir.x, dir.z)
    }
    const pulse = 0.5 + Math.abs(Math.sin(clock.getElapsedTime() * 4)) * 1.3
    if (lightL.current) (lightL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
    if (lightR.current) (lightR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
    if (cargo.current) cargo.current.visible = carryContainer && outbound
  })

  return (
    <group onClick={(e) => (e.stopPropagation(), onClick())}>
      {/* 주행 경로 가이드라인 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(curve.getPoints(40).flatMap((p) => [p.x, p.y + 0.015, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={THEME.teal} transparent opacity={0.5} />
      </line>

      {/* 바퀴 반지름(0.12)만큼 띄운 축 위에 차체가 정확히 얹히도록 피벗 높이를 바퀴 상단(y=0.24) 기준으로 정렬 */}
      <group ref={body}>
        {[
          [-0.4, -0.3],
          [0.4, -0.3],
          [-0.4, 0.3],
          [0.4, 0.3],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.12, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.12, 12]} />
            <meshStandardMaterial color={THEME.inkFaint} />
          </mesh>
        ))}
        {/* 낮게 깔린 플랫베드 차체 — 청록 유리 + 주황 트림 */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[1.1, 0.36, 0.8]} />
          <meshStandardMaterial color={THEME.surface2} transparent opacity={0.6} emissive={THEME.teal} emissiveIntensity={0.15} />
          <Edges color={THEME.teal} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[1.14, 0.03, 0.84]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.73, -0.05]}>
          <boxGeometry args={[0.6, 0.24, 0.5]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.6} />
          <Edges color="#fff3d6" />
        </mesh>
        {/* 네온 헤드라이트 (좌/우) */}
        <mesh ref={lightL} position={[-0.5, 0.68, 0.35]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#eafffb" emissive={THEME.teal} emissiveIntensity={1} />
        </mesh>
        <mesh ref={lightR} position={[0.5, 0.68, 0.35]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#eafffb" emissive={THEME.teal} emissiveIntensity={1} />
        </mesh>
        {/* 적재 컨테이너 — 왕복 중 왕(outbound) 구간에서만 표시 */}
        <mesh ref={cargo} position={[0, 0.66, 0]} visible={false}>
          <boxGeometry args={[0.9, 0.34, 0.66]} />
          <meshStandardMaterial color={CONTAINER_COLORS[4]} roughness={0.7} />
          <Edges color="#fff3d6" />
        </mesh>
      </group>
    </group>
  )
}
