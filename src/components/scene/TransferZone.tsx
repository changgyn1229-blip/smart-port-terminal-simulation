import { Edges, Html, Text } from '@react-three/drei'

interface SeaSideTpPadProps {
  position: [number, number, number]
}

// 해측 TP — 야드 블록마다 하나씩 배치되는 개별 AGV/IGV 교환 패드 (주황색)
export function SeaSideTpPad({ position }: SeaSideTpPadProps) {
  return (
    <mesh position={[position[0], 0.015, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.7, 1.7]} />
      <meshStandardMaterial color="#e2a24a" emissive="#e2a24a" emissiveIntensity={0.55} roughness={0.6} />
    </mesh>
  )
}

interface TruckParkingLaneProps {
  x: number
  branchZ: number // 순항 레인 쪽 입구(분기점)
  bayZ: number // 크레인 인계 지점(안쪽) — 항상 branchZ보다 야드 쪽(절대값 기준 더 작은 z)
  slotNumber?: number
  width?: number
}

// 육측 LSTP 트럭 주차 슬롯 — 어두운 아스팔트 바닥 위 노란색 대각선 빗살무늬(쉐브론) 주차 슬롯 +
// 스텐실 스타일 번호 마킹 + 파란 구획 포스트. 트럭은 이 슬롯의 스퍼(branch~bay)를 따라 후진 주차한다.
// 실제 BPA 신항 사진 참고 — 크레인(베이) 쪽 진입부에는 촘촘한 노란 해치(정차 금지/서행 경고)
// 구간을, 슬롯 경계는 굵은 바깥선 + 얇은 안쪽선의 이중 라인으로 그려 실사진의 디테일을 재현한다.
export function TruckParkingLane({ x, branchZ, bayZ, slotNumber, width = 3.0 }: TruckParkingLaneProps) {
  const length = Math.abs(branchZ - bayZ)
  const centerZ = (branchZ + bayZ) / 2
  const chevronCount = Math.max(3, Math.round(length / 1.1))
  const lineColor = '#f2c94c' // 노란색 페인트 마킹
  const bayLocalZ = bayZ - centerZ // 크레인 인계 지점(베이) 쪽 로컬 Z — 항상 ±length/2
  const bayDir = Math.sign(bayLocalZ) || 1
  const hazardLen = Math.min(length * 0.28, 3.2) // 베이(크레인) 인접부 고밀도 안전 해치 구간 길이
  const hazardStripes = Math.max(6, Math.round(hazardLen / 0.28))
  const hazardCenterZ = bayLocalZ - bayDir * (hazardLen / 2)
  // 트럭 한 대가 딱 맞게 들어가는 "칸" 절반 폭 — 트레일러 실측 폭(TruckFleet 트레일러 베드 0.78)에
  // 최소 여유(미러 폭 등)만 더한 값. 전체 슬롯(width, 진입 시 넓게 쓰는 에이프런/도색 폭)과는
  // 별개로, 연석·키오스크·폴대는 항상 이 좁은 폭을 기준으로 세워 트럭 차체 바로 옆에 붙는다.
  const BAY_HALF_WIDTH = 0.65
  const curbSide = BAY_HALF_WIDTH + 0.16 // 연석 두께(0.32)의 절반만큼 바깥쪽에 중심을 둬 안쪽 면이 BAY_HALF_WIDTH에 정확히 맞닿게
  return (
    <group position={[x, 0, centerZ]}>
      {/* 아스팔트 슬롯 바닥 */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
      </mesh>
      {/* 슬롯 좌우 경계선 — 굵은 바깥선 + 얇은 안쪽선의 이중 라인(실사진 참고) */}
      {[-width / 2, width / 2].map((sx) => {
        const dir = Math.sign(sx) || 1
        return (
          <group key={sx}>
            <mesh position={[sx, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.08, length]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[sx - dir * 0.22, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.04, length]} />
              <meshStandardMaterial color="#dfe6e2" emissive="#dfe6e2" emissiveIntensity={0.2} />
            </mesh>
          </group>
        )
      })}
      {/* 화살표(쉐브론) 빗살 마킹 — 베이(크레인) 방향을 가리키는 노란색 페인트가 슬롯 길이를 따라 반복 */}
      {Array.from({ length: chevronCount }).map((_, i) => {
        const cz = -length / 2 + (i + 0.5) * (length / chevronCount)
        return (
          <group key={i} position={[0, 0.014, cz]}>
            <mesh position={[-width * 0.18, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <planeGeometry args={[0.1, width * 0.5]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.32} />
            </mesh>
            <mesh position={[width * 0.18, 0, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
              <planeGeometry args={[0.1, width * 0.5]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.32} />
            </mesh>
          </group>
        )
      })}
      {/* 베이(크레인) 인접부 고밀도 안전 해치 — 실제 사진처럼 크레인 레일 바로 아래를 촘촘한
          대각선 노란 줄무늬로 덮어 "정차 금지/서행" 구간임을 강조 */}
      <group position={[0, 0.016, hazardCenterZ]}>
        {Array.from({ length: hazardStripes }).map((_, i) => {
          const sz = -hazardLen / 2 + (i + 0.5) * (hazardLen / hazardStripes)
          return (
            <mesh key={i} position={[0, 0, sz]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <planeGeometry args={[width * 1.1, 0.16]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.4} />
            </mesh>
          )
        })}
      </group>
      {/* 파란 구획 포스트 — 칸의 진입/안쪽 코너에 낮은 반사 기둥 */}
      {[-curbSide, curbSide].map((sx) =>
        [-length / 2 + 0.35, length / 2 - 0.35].map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[sx, 0.15, sz]}>
            <cylinderGeometry args={[0.045, 0.045, 0.3, 8]} />
            <meshStandardMaterial color="#1c5faa" emissive="#1c5faa" emissiveIntensity={0.45} />
          </mesh>
        )),
      )}
      {/* 콘크리트 연석(Island) — 트럭 차체 바로 옆(BAY_HALF_WIDTH)에 붙여 세운 낮은 회색 턱.
          이 두 연석 사이가 실제로 트럭이 들어가 정차하는 칸이다. */}
      {[-1, 1].map((dir) => (
        <mesh key={`island-${dir}`} position={[dir * curbSide, 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.12, length]} />
          <meshStandardMaterial color="#b9beb7" roughness={0.9} />
          <Edges color="#7a8079" />
        </mesh>
      ))}
      {/* 파란색 키오스크(트럭 운전사 조작 단말기) — 트럭이 후진 주차했을 때 캡(운전석)이 서는
          지점(TruckFleet 캡 오프셋 1.15와 동일 기준) 바로 옆 연석 위에 세운다. */}
      {(() => {
        const kioskSide = curbSide
        const kioskLocalZ = bayLocalZ - bayDir * 1.15
        return (
          <group position={[kioskSide, 0.12, kioskLocalZ]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.24, 0.84, 0.24]} />
              <meshStandardMaterial color="#1c5faa" roughness={0.4} metalness={0.2} emissive="#1c5faa" emissiveIntensity={0.25} />
              <Edges color="#0d3a68" />
            </mesh>
            {/* 조작 화면 패널 — 차로(레인 중심) 쪽을 향해 살짝 튀어나온 발광 패널 */}
            <mesh position={[-0.13, 0.5, 0]}>
              <boxGeometry args={[0.02, 0.22, 0.16]} />
              <meshStandardMaterial color="#bff3ff" emissive="#8fe8ff" emissiveIntensity={1.1} />
            </mesh>
          </group>
        )
      })()}
      {/* 센서/조명 폴대 — 키오스크 뒤쪽부터 크레인 인계 지점(베이)까지 연석을 따라 일정 간격 배치 */}
      {(() => {
        const poleSide = curbSide
        const kioskLocalZ = bayLocalZ - bayDir * 1.15
        const poleCount = 4
        return Array.from({ length: poleCount }).map((_, i) => {
          const pz = kioskLocalZ + (bayLocalZ - kioskLocalZ) * ((i + 1) / (poleCount + 1))
          return (
            <group key={i} position={[poleSide, 0.12, pz]}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 1.4, 8]} />
                <meshStandardMaterial color="#9aa3ab" roughness={0.35} metalness={0.6} />
              </mesh>
              <mesh position={[0, 1.42, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#ffe9a8" emissive="#ffe9a8" emissiveIntensity={0.9} />
              </mesh>
            </group>
          )
        })
      })()}
      {/* 슬롯 번호 — 입구(분기점) 쪽 바닥에 거대한 흰색 스텐실 페인트로 표기 */}
      {slotNumber !== undefined && (
        <Text
          position={[0, 0.02, (branchZ - centerZ) * 0.7]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.75}
          color="#f4f6f2"
          outlineWidth={0.015}
          outlineColor="#1b2224"
          anchorX="center"
          anchorY="middle"
        >
          {slotNumber}
        </Text>
      )}
    </group>
  )
}

interface ZoneBandProps {
  centerX: number
  width: number
  zRange: [number, number]
  label: string
  color: string
  labelZ?: number
}

// 존 배경 밴드 (해측 오렌지 존 / 육측 청록 존 공용) — 색상으로 구역을 명확히 구분
function ZoneBand({ centerX, width, zRange, label, color, labelZ }: ZoneBandProps) {
  const centerZ = (zRange[0] + zRange[1]) / 2
  const depth = zRange[1] - zRange[0]
  return (
    <group>
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.16} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <Html position={[centerX, 0.4, labelZ ?? zRange[1] + 0.6]} center zIndexRange={[10, 0]} occlude={false}>
        <span
          className="pointer-events-none whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
          style={{ borderColor: `${color}80`, color, background: 'rgba(15,28,25,0.85)' }}
        >
          {label}
        </span>
      </Html>
    </group>
  )
}

interface LandSideTpBandProps {
  centerX: number
  width: number
  zRange: [number, number]
  label: string
}

// 육측 TP — 야드 블록 하단(육측) 전체를 가로지르는 외부트럭 작업 구간 밴드 (청록색)
export function LandSideTpBand({ centerX, width, zRange, label }: LandSideTpBandProps) {
  return <ZoneBand centerX={centerX} width={width} zRange={zRange} label={label} color="#4fb3a6" />
}

interface SeaSideZoneBandProps {
  centerX: number
  width: number
  zRange: [number, number]
  label: string
}

// 해측 TP — STS 하부 ~ 야드 사이 AGV 전용 순환 구역 밴드 (주황색, "ORANGE ZONE")
export function SeaSideZoneBand({ centerX, width, zRange, label }: SeaSideZoneBandProps) {
  return <ZoneBand centerX={centerX} width={width} zRange={zRange} label={label} color="#e2a24a" labelZ={zRange[0] - 0.6} />
}
