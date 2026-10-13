import { Grid } from '@react-three/drei'
import { THEME } from '../../data/theme'

// 해측(-Z, 바다)과 육측(+Z, 야드·게이트) 경계가 안벽 라인(z=-8)을 기준으로 나뉜다.
// 신선대부두 컴팩트 레이아웃(5선석 x STS 15기 ~ 선석 클러스터 야드 9블록 ~ 게이트 배후 부대시설
// 지구 + CFS 전용부지)에 맞춰 바운딩박스(X: -85~85, Z: -24~126)를 넉넉히 감싸도록 확대했다.
export function Ground() {
  return (
    <group>
      {/* 육측 지면 (야드 · 게이트 아스팔트 톤) — 카메라를 낮은 각도로 돌려도 지면 가장자리가
          보이지 않도록 실제 콘텐츠 범위보다 훨씬 넉넉하게 확장. 깔끔한 매트 다크 그레이
          아스팔트 톤(#2C3034) + 높은 roughness/낮은 metalness로 빛 반사를 줄여 도로 위 차선
          (노란/붉은 점선)이 또렷하게 대비되도록 한다. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 51]} receiveShadow>
        <planeGeometry args={[600, 500]} />
        <meshStandardMaterial color="#2c3034" roughness={0.95} metalness={0} />
      </mesh>

      <Grid
        position={[0, 0, 51]}
        args={[170, 150]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#2a3336"
        sectionSize={10}
        sectionThickness={1}
        sectionColor={THEME.teal}
        fadeDistance={190}
        fadeStrength={1.6}
        infiniteGrid={false}
      />

      {/* 해측 바다 — 씬 전체를 덮을 만큼 대폭 확장(3000 x 1500). 가까운 쪽 경계만 안벽 라인
          (z=-8) 바로 바깥(-6)에서 멈춰 크레인·에이프런이 바다 위에 뜬 것처럼 보이지 않게 하고,
          나머지 전 방향은 지면(y=-0.02)보다 확실히 아래(y=-0.5)에 깔아 맵 가장자리·선박 주변이
          항상 물로 채워지도록 한다. 탁한 네이비/청록(#1F4E5B) + 옅은 emissive를 함께 줘 그림자나
          안개가 짙은 각도에서도 완전히 새까맣게 꺼지지 않고 물빛이 유지되게 한다. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -756]}>
        <planeGeometry args={[3000, 1500]} />
        <meshStandardMaterial
          color="#1f4e5b"
          emissive="#1f4e5b"
          emissiveIntensity={0.18}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* 안벽 경계선 — 발광 라인으로 바다/육지 구분을 명확히 (5선석 수평축) */}
      <mesh position={[0, 0.15, -8]}>
        <boxGeometry args={[140, 0.3, 0.4]} />
        <meshStandardMaterial color={THEME.surface2} />
      </mesh>
      <mesh position={[0, 0.32, -8.22]}>
        <boxGeometry args={[140, 0.03, 0.04]} />
        <meshStandardMaterial color={THEME.teal} emissive={THEME.teal} emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}
