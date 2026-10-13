import type { MonitoringMetric } from '../types'

// 예시(가상) 데이터입니다. 실시간 운영 데이터가 아닙니다 — Phase 3에서 실데이터로 교체 예정.
export const monitoringMetrics: MonitoringMetric[] = [
  {
    id: 'mon-qc102-throughput',
    equipmentId: 'eq-qc-102',
    label: '시간당 처리량',
    value: 28,
    max: 40,
    unit: 'TEU/h',
    displayType: 'graph',
    isVirtual: true,
    history: [18, 21, 19, 24, 26, 22, 25, 27, 24, 28, 26, 28],
  },
  {
    id: 'mon-agv047-battery',
    equipmentId: 'eq-agv-047',
    label: 'IGV 충전 상태',
    value: 78,
    max: 100,
    unit: '%',
    displayType: 'gauge',
    isVirtual: true,
  },
  {
    id: 'mon-armgc04-utilization',
    equipmentId: 'eq-armgc-04',
    label: 'ARMGC 가동률',
    value: 92,
    max: 100,
    unit: '%',
    displayType: 'gauge',
    isVirtual: true,
  },
  {
    id: 'mon-gate04-avgtime',
    equipmentId: 'eq-gate-04',
    label: '게이트 평균 통과 시간',
    value: 45,
    max: 120,
    unit: '초',
    displayType: 'gauge',
    isVirtual: true,
  },
]

export const monitoringByEquipmentId = monitoringMetrics.reduce<Record<string, MonitoringMetric[]>>(
  (acc, m) => {
    ;(acc[m.equipmentId] ??= []).push(m)
    return acc
  },
  {},
)
