import { useEffect, useState } from 'react'
import { INITIAL_EQUIPMENT_STATUS_ROWS, type EquipmentStatusRow } from '../../data/equipmentStatus'

const VIEW_BUTTONS = [
  { label: '전체 보기', equipmentId: null },
  { label: '안벽 확대', equipmentId: 'eq-qc-102' },
  { label: '게이트 확대', equipmentId: 'eq-gate-04' },
] as const

interface NumberMetric {
  kind: 'number'
  id: string
  label: string
  value: number
  unit: string
  decimals: number
  step: number
  min: number
  max: number
  format?: 'minsec'
}

interface StatusMetric {
  kind: 'status'
  id: string
  label: string
  value: 'ACTIVE' | 'IDLE'
}

type ZoneMetric = NumberMetric | StatusMetric

interface Zone {
  id: string
  name: string
  equipmentId: string
  metrics: ZoneMetric[]
}

const INITIAL_ZONES: Zone[] = [
  {
    id: 'quay',
    name: 'Quay Side',
    equipmentId: 'eq-qc-102',
    metrics: [
      { kind: 'number', id: 'sts-eff', label: 'STS Efficiency', value: 69.3, unit: '%', decimals: 1, step: 0.4, min: 55, max: 85 },
      { kind: 'number', id: 'cycle-time', label: 'Cycle Time', value: 22 * 60 + 19, unit: '', decimals: 0, step: 5, min: 18 * 60, max: 26 * 60, format: 'minsec' },
    ],
  },
  {
    id: 'yard',
    name: 'Yard',
    equipmentId: 'eq-armgc-04',
    metrics: [
      { kind: 'number', id: 'yard-occ', label: 'Occupancy', value: 53.0, unit: '%', decimals: 1, step: 0.5, min: 30, max: 80 },
      { kind: 'status', id: 'crane-status', label: 'Crane Status', value: 'ACTIVE' },
    ],
  },
  {
    id: 'agv',
    name: 'IGV',
    equipmentId: 'eq-agv-047',
    metrics: [
      { kind: 'number', id: 'agv-util', label: 'Utilization', value: 90.0, unit: '%', decimals: 1, step: 0.3, min: 70, max: 99 },
      { kind: 'number', id: 'agv-battery', label: 'Battery', value: 8.7, unit: '%', decimals: 1, step: 0.3, min: 2, max: 20 },
    ],
  },
  {
    id: 'gate',
    name: 'Gate',
    equipmentId: 'eq-gate-04',
    metrics: [
      { kind: 'number', id: 'gate-throughput', label: 'Throughput', value: 13.57, unit: 'k/hps', decimals: 2, step: 0.1, min: 10, max: 18 },
      { kind: 'number', id: 'truck-turnaround', label: 'Truck Turnaround Time', value: 13, unit: 'ms', decimals: 0, step: 1, min: 6, max: 25 },
    ],
  },
]

function formatMinSec(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}m ${String(s).padStart(2, '0')}s`
}

interface MetricsSidebarProps {
  focusedId: string | null
  onFocus: (id: string | null) => void
}

export function MetricsSidebar({ focusedId, onFocus }: MetricsSidebarProps) {
  const [zones, setZones] = useState(INITIAL_ZONES)
  const [rows, setRows] = useState<EquipmentStatusRow[]>(INITIAL_EQUIPMENT_STATUS_ROWS)

  useEffect(() => {
    const id = setInterval(() => {
      setZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          metrics: zone.metrics.map((m) => {
            if (m.kind === 'status') {
              return Math.random() > 0.9 ? { ...m, value: m.value === 'ACTIVE' ? 'IDLE' : 'ACTIVE' } : m
            }
            const delta = (Math.random() - 0.5) * m.step * 2
            const next = Math.min(m.max, Math.max(m.min, m.value + delta))
            return { ...m, value: +next.toFixed(m.decimals) }
          }),
        })),
      )
    }, 1500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.etaSeconds <= 0) {
            return {
              ...r,
              status: r.status === 'ACTIVE' ? (Math.random() > 0.8 ? 'IDLE' : 'ACTIVE') : 'ACTIVE',
              cycleSeconds: 20 + Math.floor(Math.random() * 140),
              etaSeconds: 5 + Math.floor(Math.random() * 40),
            }
          }
          return r.status === 'ACTIVE' ? { ...r, etaSeconds: r.etaSeconds - 1 } : r
        }),
      )
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-hidden border-l border-border bg-surface p-4">
      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {VIEW_BUTTONS.map((v) => {
          const active = focusedId === v.equipmentId
          return (
            <button
              key={v.label}
              onClick={() => onFocus(v.equipmentId)}
              className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                active ? 'bg-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <div>
        <p className="border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal">
          구역별 실시간 지표
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => onFocus(zone.equipmentId)}
              className={`flex flex-col gap-1.5 rounded-md border bg-surface-2 p-2.5 text-left transition-colors ${
                focusedId === zone.equipmentId ? 'border-accent' : 'border-border hover:border-teal'
              }`}
            >
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-teal">
                {zone.name}
              </span>
              {zone.metrics.map((m) => (
                <div key={m.id} className="flex items-baseline justify-between gap-1 text-[10.5px]">
                  <span className="truncate text-ink-faint">{m.label}</span>
                  {m.kind === 'status' ? (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                        m.value === 'ACTIVE' ? 'bg-ok/15 text-ok' : 'bg-surface text-ink-faint'
                      }`}
                    >
                      {m.value}
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono font-bold tabular-nums text-ink">
                      {m.format === 'minsec' ? formatMinSec(m.value) : `${m.value.toFixed(m.decimals)}${m.unit}`}
                    </span>
                  )}
                </div>
              ))}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal">
          장비 실시간 상태
        </p>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          <table className="w-full border-collapse font-mono text-[10px]">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="text-left text-[9px] uppercase tracking-wider text-ink-faint">
                <th className="px-2 py-1.5 font-semibold">Equipment</th>
                <th className="px-2 py-1.5 font-semibold">Status</th>
                <th className="px-2 py-1.5 text-right font-semibold">Cycle</th>
                <th className="px-2 py-1.5 text-right font-semibold">ETA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-2 py-1 text-ink-dim">{r.name}</td>
                  <td className="px-2 py-1">
                    <span className={r.status === 'ACTIVE' ? 'font-semibold text-teal' : 'text-ink-faint'}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-ink-dim">{r.cycleSeconds}s</td>
                  <td className="px-2 py-1 text-right tabular-nums text-ink-dim">{r.etaSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  )
}
