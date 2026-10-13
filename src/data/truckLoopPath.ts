import { scenePositions, landSideTpZRange, truckOutGatePos, yardBlockSlots } from './scenePositions'

const inGatePos = scenePositions['eq-gate-04']
const gateFarX = inGatePos.x + 7 // 게이트 바깥쪽 진입/퇴장 지점
const gateNearX = inGatePos.x - 0.4 // 게이트 프레임 바로 안쪽

// 야드 블록 서쪽 끝보다 살짝 바깥으로 U턴 지점을 잡아 블록과 겹치지 않게 한다
const yardMinX = Math.min(...yardBlockSlots) - 3
const uTurnApexX = yardMinX - 2.5
const laneMidZ = (landSideTpZRange[0] + landSideTpZRange[1]) / 2

// 게이트(우측) IN -> 육측 TP를 가로질러 야드 블록 서쪽 끝에서 U턴 -> OUT 게이트로 돌아오는 도로
export const truckLoopWaypoints: [number, number, number][] = [
  [gateFarX, 0, inGatePos.z],
  [gateNearX, 0, inGatePos.z],
  [yardMinX, 0, landSideTpZRange[0] + 1],
  [uTurnApexX, 0, laneMidZ],
  [yardMinX, 0, truckOutGatePos.z],
  [gateNearX, 0, truckOutGatePos.z],
  [gateFarX, 0, truckOutGatePos.z],
]
