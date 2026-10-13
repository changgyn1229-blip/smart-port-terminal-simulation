function Building({ x, z, w, h, d }: { x: number; z: number; w: number; h: number; d: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1a2422" roughness={0.85} />
      </mesh>
      {/* 야간 조명이 켜진 창문 느낌의 발광 스트라이프 */}
      <mesh position={[0, h * 0.62, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.82, h * 0.14]} />
        <meshStandardMaterial color="#4fb3a6" emissive="#4fb3a6" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// 확장된 야드 블록(x=-16.3)·AGV 루프(x=-23)·U턴 도로와 겹치지 않는 남서쪽 여백에 배치
function OperationsBuildings() {
  return (
    <group>
      <Building x={-27} z={15} w={2.2} h={1.6} d={1.4} />
      <Building x={-29.4} z={14.6} w={1.6} h={1.1} d={1.2} />
    </group>
  )
}

function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2b1e" />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <coneGeometry args={[0.45, 0.9, 7]} />
        <meshStandardMaterial color="#1e7a4f" roughness={0.9} />
      </mesh>
    </group>
  )
}

function GreenZone() {
  const spots: [number, number][] = [
    [-26.5, 18.4],
    [-25.6, 19.2],
    [-27.4, 19.1],
    [-24.8, 18.0],
    [-26.2, 19.8],
  ]
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-26, -0.015, 19]}>
        <planeGeometry args={[5.5, 3.4]} />
        <meshStandardMaterial color="#14532d" roughness={1} />
      </mesh>
      {spots.map(([x, z], i) => (
        <Tree key={i} x={x} z={z} />
      ))}
    </group>
  )
}

export function Decorations() {
  return (
    <group>
      <OperationsBuildings />
      <GreenZone />
    </group>
  )
}
