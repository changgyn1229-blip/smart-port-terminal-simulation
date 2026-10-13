export type LiveStatus = 'ACTIVE' | 'IDLE'

export interface EquipmentStatusRow {
  id: string
  name: string
  status: LiveStatus
  cycleSeconds: number
  etaSeconds: number
}

function buildInitialRows(): EquipmentStatusRow[] {
  const rows: EquipmentStatusRow[] = [
    { id: 'sts-00', name: 'STS-00', status: 'ACTIVE', cycleSeconds: 142, etaSeconds: 38 },
  ]

  for (let i = 0; i <= 13; i++) {
    rows.push({
      id: `armgc-${String(i).padStart(2, '0')}`,
      name: `ARMGC-${String(i).padStart(2, '0')}`,
      status: i % 3 === 0 ? 'IDLE' : 'ACTIVE',
      cycleSeconds: 55 + i * 6,
      etaSeconds: 8 + i * 3,
    })
  }

  rows.push({ id: 'gate-01', name: 'GATE-01', status: 'ACTIVE', cycleSeconds: 24, etaSeconds: 6 })
  rows.push({ id: 'gate-02', name: 'GATE-02', status: 'ACTIVE', cycleSeconds: 31, etaSeconds: 9 })

  return rows
}

export const INITIAL_EQUIPMENT_STATUS_ROWS = buildInitialRows()
