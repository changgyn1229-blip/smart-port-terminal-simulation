interface Props {
  position: [number, number]
  width?: number
  color?: string
}

// TP 정차 슬롯 진입부 정지선 — 이 시스템의 모든 정차선은 X축 방향 차선을 가로지르므로
// 폭(width)이 Z축을 따라 놓이도록 90도 고정 배치한다.
export function StopLine({ position, width = 2.2, color = '#f2c94c' }: Props) {
  return (
    <mesh position={[position[0], 0.016, position[1]]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[width, 0.18]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  )
}
