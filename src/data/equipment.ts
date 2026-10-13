import type { Equipment } from '../types'

export const equipment: Equipment[] = [
  {
    id: 'eq-qc-102',
    name: '안벽크레인 102호기',
    type: 'quay_crane',
    shortLabel: 'STS',
    description:
      '선박과 안벽 사이에서 컨테이너를 하역·선적하는 안벽크레인(STS, Ship-to-Shore Crane). 포탈 프레임 위에 붐업 가능한 A자형 타워를 얹은 구조로, 여러 대가 안벽 레일을 따라 근접 배치되어 동시에 작업을 수행합니다.',
    specs: [
      { label: '형식', value: '레일식 갠트리 (STS)' },
      { label: '동작', value: '붐업 · 트롤리 · 스프레더 하강' },
      { label: '참고 자료', value: 'PRD/references/quay/quay_reference_01.jpg' },
    ],
  },
  {
    id: 'eq-agv-047',
    name: 'IGV-047',
    type: 'agv',
    shortLabel: 'IGV',
    description:
      '지능형 무인이송차량(IGV, Intelligent Guided Vehicle). 매설 자기 테이프 없이 상단 라이다·센서로 주행로를 실시간 인식하는 자율주행 기반이라 기존 유도선 의존형 AGV와 구분해 IGV로 부릅니다. 게이트·안벽·야드 사이에서 컨테이너를 싣고 자율 이동하며, 완전자동화 컨셉에 맞춰 유인 트랙터 대신 채택했습니다.',
    specs: [
      { label: '형식', value: '지능형 무인이송차량 (IGV, Driverless)' },
      { label: '동작', value: '자율주행 · 컨테이너 적재/하역' },
      { label: '참고 자료', value: 'PRD/references/agv/agv_reference_01.jpeg' },
    ],
  },
  {
    id: 'eq-armgc-04',
    name: 'ARMGC 04호기',
    type: 'yard_crane',
    shortLabel: 'ARMGC',
    description:
      '레일식 자동 야드크레인(ARMGC). 컨테이너 블록 전체 폭을 가로지르는 포탈 구조로 레일 위를 이동하며, IGV와 컨테이너를 주고받아 블록에 적재·인출합니다. 사람이 탑승하지 않는 완전자동 운영을 전제로 합니다.',
    specs: [
      { label: '형식', value: '레일식 자동 갠트리 (ARMGC)' },
      { label: '동작', value: '블록 횡단 주행 · 컨테이너 적재/인출' },
      { label: '참고 자료', value: 'PRD/references/yard/yard_reference_02_armg_agv.jpeg' },
    ],
  },
  {
    id: 'eq-gate-04',
    name: '게이트 4',
    type: 'gate',
    shortLabel: 'GATE',
    description:
      '무인 OCR 게이트. 차량번호·컨테이너 번호를 카메라로 자동 인식해 차단기를 개폐하고 자동으로 정산합니다. 완전자동화 컨셉에 맞춰 유인 게이트 부스 없이 설계했습니다.',
    specs: [
      { label: '형식', value: '캐노피형 다차로 무인 게이트' },
      { label: '동작', value: 'OCR 자동 인식 · 자동 정산 · 차단기 개폐' },
      { label: '참고 자료', value: 'PRD/references/gate/gate_reference_01.jpeg' },
    ],
  },
]

export const equipmentById = Object.fromEntries(equipment.map((e) => [e.id, e]))
