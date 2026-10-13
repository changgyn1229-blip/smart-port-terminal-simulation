// Three.js 머티리얼은 CSS 변수를 못 읽으므로, index.css의 @theme 토큰과 값을 맞춘 JS 상수를 별도로 둔다.
export const THEME = {
  accent: '#e2a24a',
  teal: '#4fb3a6',
  ink: '#e7ede9',
  inkFaint: '#6d7c76',
  surface2: '#152622',
  border: '#223330',
  ok: '#67c17c',
  gantryRed: '#c0392b',
  stsBlue: '#0f2f52', // STS 크레인 메인 컬러 — 묵직한 다크 블루
  rmgcOrange: '#f2841a', // RMGC 야드 크레인 메인 컬러 — 오렌지 (실제 신선대 RMGC 도장 참고)
  hudPink: '#e6178a', // 범용 HUD 포인트 컬러 (게이트 마스트, STS 장식 스트라이프 등) — RMGC 본체와는 무관
}

// 야드/트럭 컨테이너 색상 팔레트 — 인덱스로 순회하며 다채로운 적재 연출에 사용
export const CONTAINER_COLORS = ['#2563eb', '#c0392b', '#1e7a4f', '#e2a24a', '#7c3aed', '#0e7490']

// 공컨테이너 장치장 팔레트 — 회색/흰색 위주 (빈 컨테이너는 도장이 바래고 단조로운 톤)
export const EMPTY_CONTAINER_COLORS = ['#c8ced2', '#9aa4ab', '#e7ebee', '#7f8b92', '#b7bec3']

// 선박 갑판 컨테이너 팔레트 — 실제 초대형선 사진 참고(적색 위주 + 남색/흰색/녹색 포인트)
export const SHIP_CONTAINER_COLORS = ['#b8242c', '#b8242c', '#1c3f6e', '#e8edf0', '#b8242c', '#1e7a4f']

// 실제 초대형 컨테이너선 사진 참고 — 짙은 남색 선체 + 적색 보트탑(흘수선 아래) + 흰 상부 라인
export const SHIP_HULL = {
  lower: '#8c1c1c', // 보트탑(흘수선 아래) — 적색
  stripe: '#f2f5f7', // 흘수선 경계 화이트 스트라이프
  upper: '#0f2f52', // 흘수선 위 메인 선체 — 짙은 남색 (STS 크레인과 동일 톤)
  bridge: '#e8edf0', // 브릿지(선교) — 흰색
  funnel: '#1a2836', // 연돌 — 짙은 남색/블랙
}
