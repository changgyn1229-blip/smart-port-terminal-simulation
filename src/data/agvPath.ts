// AGV/IGV 해측 TP 라인 — 4개 야드 블록의 해측 TP 패드를 잇는 U턴 루프.
// CatmullRomCurve3로 보간하고, Agv3D가 삼각파(ping-pong)로 왕복하며 양 끝에서 U턴한다.
// y=0으로 노면(Ground, Y=0)에 스냅 — 차체 각 부위의 높이는 Agv3D 내부의 로컬 오프셋(바퀴 반지름 등)으로만 표현한다.
export const agvWaypoints: [number, number, number][] = [
  [-9, 0, -6],
  [-3, 0, -6],
  [3, 0, -6],
  [9, 0, -6],
]
