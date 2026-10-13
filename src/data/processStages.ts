import type { ProcessStage } from '../types'

// 출고(반출) 시나리오 순서: 게이트(반입) -> 이송 -> 야드(보관) -> 안벽(선적)
export const processStages: ProcessStage[] = [
  {
    id: 'stage-gate',
    order: 1,
    name: '게이트',
    concept: '외부 반입 트럭이 무인 OCR 게이트를 통과하며 컨테이너 정보를 자동 인식하고 터미널 내부로 진입하는 구간입니다.',
    equipmentIds: ['eq-gate-04'],
  },
  {
    id: 'stage-transfer',
    order: 2,
    name: '이송',
    concept: '게이트를 통과한 컨테이너를 지능형 무인이송차량(IGV)이 실어 야드까지 자율 주행으로 운반하는 구간입니다.',
    equipmentIds: ['eq-agv-047'],
  },
  {
    id: 'stage-yard',
    order: 3,
    name: '야드',
    concept: '레일식 자동 야드크레인(ARMGC)이 IGV로부터 컨테이너를 인계받아 선적 전까지 야드 블록에 임시로 적재·보관하는 구간입니다.',
    equipmentIds: ['eq-armgc-04'],
  },
  {
    id: 'stage-quay',
    order: 4,
    name: '안벽',
    concept: '보관돼 있던 컨테이너가 다시 이송되어 안벽크레인(STS)을 통해 선박에 선적되며 출고가 완료되는 구간입니다.',
    equipmentIds: ['eq-qc-102'],
  },
]
