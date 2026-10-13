export type EquipmentType = 'quay_crane' | 'agv' | 'yard_crane' | 'gate'

export interface Equipment {
  id: string
  name: string
  type: EquipmentType
  shortLabel: string
  description: string
  specs: { label: string; value: string }[]
}

export interface ProcessStage {
  id: string
  order: number
  name: string
  concept: string
  equipmentIds: string[]
}

export interface MonitoringMetric {
  id: string
  equipmentId: string
  label: string
  value: number
  max: number
  unit: string
  displayType: 'gauge' | 'graph'
  isVirtual: true
  history?: number[]
}

export interface FlowWaypoint {
  stageId: string
  label: string
  x: number
  y: number
}
