import { useMemo } from 'react'
import * as THREE from 'three'
import { THEME } from '../../data/theme'

interface Props {
  waypoints: [number, number, number][]
}

const ROAD_WIDTH = 2.2

// IN 게이트 -> 육측 TP -> U턴 -> OUT 게이트로 이어지는 도로 바닥 라인.
// 곡선을 따라 짧은 평면 세그먼트를 이어붙여 매끄러운 U턴 루프를 만든다 (Y=0 스냅).
export function TruckLoopRoad({ waypoints }: Props) {
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(waypoints.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)
    return curve.getPoints(64)
  }, [waypoints])

  return (
    <group>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1]
        const mid = p.clone().lerp(next, 0.5)
        const dx = next.x - p.x
        const dz = next.z - p.z
        const len = Math.hypot(dx, dz)
        const angle = Math.atan2(dx, dz)
        return (
          <mesh key={i} position={[mid.x, 0.008, mid.z]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[ROAD_WIDTH, len + 0.06]} />
            <meshStandardMaterial color="#1b2224" roughness={0.95} />
          </mesh>
        )
      })}
      {points.slice(0, -1).map((p, i) => {
        if (i % 3 !== 0) return null
        const next = points[Math.min(i + 2, points.length - 1)]
        const mid = p.clone().lerp(next, 0.5)
        const dx = next.x - p.x
        const dz = next.z - p.z
        const len = Math.hypot(dx, dz)
        const angle = Math.atan2(dx, dz)
        return (
          <mesh key={`dash-${i}`} position={[mid.x, 0.014, mid.z]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.08, len * 0.5]} />
            <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={1} />
          </mesh>
        )
      })}
    </group>
  )
}
