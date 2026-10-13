import { SHIP_CONTAINER_COLORS, SHIP_HULL } from '../../data/theme'

interface Props {
  length?: number // 선체 길이(로컬 Z, 이물<->고물) — 안벽 크레인 클러스터 스팬에 맞춰 조절
}

const HULL_BEAM = 5.3 // 선폭(로컬 X)
const DECK_ROW_X = [-1.55, -0.5, 0.5, 1.55] // 갑판 컨테이너 4열(폭 방향)
const TIER_Y = [0.96, 1.38, 1.8, 2.22] // 4단 적재

// 실제 초대형 컨테이너선 사진 참고(짙은 남색 선체 + 적색 보트탑 + 흰 브릿지) — 선석 클러스터
// 스팬에 맞춰 길이를 파라미터화한 재사용 가능한 선박 모델. 안벽 크레인 그룹과 동일한 회전
// 좌표계를 공유하므로(로컬 Z가 크레인 배열 방향인 월드 X로 매핑) 선체 장축은 로컬 Z를 따른다.
// 이물(bow, +Z)은 계단식으로 좁아지는 실루엣, 고물(stern, -Z)에는 다단 브릿지 + 연돌을 배치하고,
// 갑판 위 컨테이너는 길이에 비례한 베이 수만큼 4열 x 4단으로 촘촘히 쌓는다.
export function Ship3D({ length = 20 }: Props) {
  const bowTaperLen = 1.4
  const hullBodyLen = length - bowTaperLen
  const bodyCenterZ = -bowTaperLen / 2
  const bowTipZ = hullBodyLen / 2 + bowTaperLen * 0.55
  const sternZ = -hullBodyLen / 2 + 0.9

  const bayCount = Math.max(4, Math.round((hullBodyLen - 1.8) / 0.62))
  const bayStartZ = -hullBodyLen / 2 + 1.4
  const baySpan = hullBodyLen - 2.8

  return (
    <group>
      {/* 선체 하부 — 보트탑(흘수선 아래), 적색 */}
      <mesh position={[0, 0.28, bodyCenterZ]}>
        <boxGeometry args={[HULL_BEAM, 0.56, hullBodyLen]} />
        <meshStandardMaterial color={SHIP_HULL.lower} roughness={0.55} metalness={0.1} />
      </mesh>
      {/* 흘수선 화이트 스트라이프 */}
      <mesh position={[0, 0.58, bodyCenterZ]}>
        <boxGeometry args={[HULL_BEAM + 0.02, 0.05, hullBodyLen + 0.02]} />
        <meshStandardMaterial color={SHIP_HULL.stripe} roughness={0.4} />
      </mesh>
      {/* 선체 상부 — 짙은 남색 메인 헐 */}
      <mesh position={[0, 0.7, bodyCenterZ]}>
        <boxGeometry args={[HULL_BEAM, 0.2, hullBodyLen]} />
        <meshStandardMaterial color={SHIP_HULL.upper} roughness={0.5} metalness={0.15} />
      </mesh>

      {/* 이물(bow) 계단식 테이퍼 */}
      <mesh position={[0, 0.4, bowTipZ - 0.9]}>
        <boxGeometry args={[HULL_BEAM * 0.72, 0.78, 1.8]} />
        <meshStandardMaterial color={SHIP_HULL.lower} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.4, bowTipZ - 0.3]}>
        <boxGeometry args={[HULL_BEAM * 0.42, 0.78, 0.9]} />
        <meshStandardMaterial color={SHIP_HULL.lower} roughness={0.55} metalness={0.1} />
      </mesh>

      {/* 브릿지(선교) — 고물 쪽, 다단 백색 구조물 */}
      <mesh position={[0, 1.05, sternZ]}>
        <boxGeometry args={[2.6, 0.52, 1.3]} />
        <meshStandardMaterial color={SHIP_HULL.bridge} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, sternZ]}>
        <boxGeometry args={[2.0, 0.4, 1.0]} />
        <meshStandardMaterial color={SHIP_HULL.bridge} roughness={0.5} />
      </mesh>
      {/* 브릿지 창 — 어두운 발광 스트립 */}
      <mesh position={[0, 1.15, sternZ + 0.4]}>
        <boxGeometry args={[2.3, 0.14, 0.05]} />
        <meshStandardMaterial color="#0a1418" emissive="#4fb3a6" emissiveIntensity={0.25} />
      </mesh>
      {/* 연돌 */}
      <mesh position={[0, 1.85, sternZ - 0.5]}>
        <boxGeometry args={[0.9, 0.4, 0.55]} />
        <meshStandardMaterial color={SHIP_HULL.funnel} roughness={0.6} />
      </mesh>

      {/* 갑판 컨테이너 — 길이에 비례한 베이 수 x 4열 x 4단 */}
      {Array.from({ length: bayCount }).map((_, bay) => {
        const bz = bayStartZ + (bayCount <= 1 ? 0 : (bay / (bayCount - 1)) * baySpan)
        return DECK_ROW_X.map((rx, ri) =>
          TIER_Y.map((ty, ti) => (
            <mesh key={`${bay}-${ri}-${ti}`} position={[rx, ty, bz]}>
              <boxGeometry args={[0.56, 0.4, 0.92]} />
              <meshStandardMaterial color={SHIP_CONTAINER_COLORS[(bay + ri * 2 + ti) % SHIP_CONTAINER_COLORS.length]} roughness={0.7} />
            </mesh>
          )),
        )
      })}
    </group>
  )
}
