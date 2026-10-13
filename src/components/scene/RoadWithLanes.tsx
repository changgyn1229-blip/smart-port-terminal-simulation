import { useMemo } from 'react'
import * as THREE from 'three'

interface Props {
  waypoints: [number, number, number][]
  closed?: boolean
  width?: number
  laneColor?: string
  dashed?: boolean // false면 점선 대신 실제 안벽 사진처럼 굵은 실선 스트라이프를 그린다
  lineWidth?: number
}

// 아스팔트 질감 도로 + 점선/실선 차선. Orange Zone(AGV)과 Red Zone(트럭) 양쪽에서 공용으로 쓴다.
// 곡선을 따라 짧은 평면 세그먼트를 이어붙여 매끄러운 루프를 만든다 (Y=0 스냅).
export function RoadWithLanes({ waypoints, closed = false, width = 2.2, laneColor = '#e7ede9', dashed = true, lineWidth = 0.08 }: Props) {
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(waypoints.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', closed ? 0.4 : 0.5)
    return curve.getPoints(closed ? 160 : 64)
  }, [waypoints, closed])

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
            <planeGeometry args={[width, len + 0.06]} />
            <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
          </mesh>
        )
      })}
      {points.slice(0, -1).map((p, i) => {
        if (dashed && i % 3 !== 0) return null
        const next = dashed ? points[Math.min(i + 2, points.length - 1)] : points[i + 1]
        const mid = p.clone().lerp(next, 0.5)
        const dx = next.x - p.x
        const dz = next.z - p.z
        const len = Math.hypot(dx, dz)
        const angle = Math.atan2(dx, dz)
        return (
          <mesh key={`dash-${i}`} position={[mid.x, 0.014, mid.z]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[lineWidth, dashed ? len * 0.5 : len + 0.02]} />
            <meshStandardMaterial color={laneColor} emissive={laneColor} emissiveIntensity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

interface StraightLaneProps {
  from: [number, number, number]
  to: [number, number, number]
  width?: number
  laneColor?: string
}

// 직선 2점 구간 전용 경량 도로 — RoadWithLanes(곡선 64~160 샘플)를 짧은 직선 스퍼에 그대로 쓰면
// 세그먼트마다 수십 개 메쉬가 낭비되므로, 스퍼처럼 개수가 많고(예: 야드 블록 9개) 형태가 항상
// 직선인 구간은 이 컴포넌트로 단 2개 메쉬(아스팔트 + 중앙 점선)만 사용해 그린다.
export function StraightLane({ from, to, width = 2.2, laneColor = '#e7ede9' }: StraightLaneProps) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const len = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz)
  const midX = (from[0] + to[0]) / 2
  const midZ = (from[2] + to[2]) / 2
  return (
    <group>
      <mesh position={[midX, 0.008, midZ]} rotation={[-Math.PI / 2, 0, angle]}>
        <planeGeometry args={[width, len + 0.06]} />
        <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[midX, 0.014, midZ]} rotation={[-Math.PI / 2, 0, angle]}>
        <planeGeometry args={[0.08, len * 0.6]} />
        <meshStandardMaterial color={laneColor} emissive={laneColor} emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}
