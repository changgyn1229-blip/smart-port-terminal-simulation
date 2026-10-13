import quayImg from '../assets/refs/quay.jpg'
import agvImg from '../assets/refs/agv.jpeg'
import yardImg from '../assets/refs/yard.jpeg'
import gateImg from '../assets/refs/gate.jpg'

export interface EquipmentPhoto {
  src: string
  sourceNote: string
}

// 사용자가 제공한 참고 자료(PRD/references/)에서 각 장비를 가장 잘 대표하는 사진 1장씩 채택.
// 실제 운영 중인 특정 터미널의 자체 사진이 아닌 형태 참고용이며, 일부는 AI 생성 이미지로 추정됩니다.
export const equipmentPhotos: Record<string, EquipmentPhoto> = {
  'eq-qc-102': {
    src: quayImg,
    sourceNote: '실사진 참고 · 컨테이너 터미널의 STS 크레인 (특정 터미널 자체 사진 아님)',
  },
  'eq-agv-047': {
    src: agvImg,
    sourceNote: 'AI 생성 추정 · 무인 IGV(IGV-047) 형태 참고',
  },
  'eq-armgc-04': {
    src: yardImg,
    sourceNote: 'AI 생성 추정 · ARMGC + IGV 완전자동화 야드 장면 참고',
  },
  'eq-gate-04': {
    src: gateImg,
    sourceNote: '실사진 추정 · 캐노피형 다차로 게이트 구조 참고',
  },
}
