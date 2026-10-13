import { useEffect, useState } from 'react'
import {
  berthOccupancyPercent,
  truckAverageTat,
  COLLISION_RISK_PERCENT,
  failoverCoverageRatePercent,
  yardUtilizationPercent,
} from '../../data/simStats'

const POLL_MS = 500

interface KpiRow {
  label: string
  value: string
  unit: string
  accent?: boolean
}

// 실시간 TOS KPI 오버레이(우측 하단) — R3F 프레임 루프(AgvFleet/TruckFleet/ArmgcGantry3D/QuayCrane3D)가
// 갱신하는 simStats 싱글턴을 주기적으로 폴링해 표시한다. Canvas 바깥 React 트리라 useFrame을 쓸 수 없어
// setInterval 폴링으로 연결한다.
export function TosKpiOverlay() {
  const [rows, setRows] = useState<KpiRow[]>([])

  useEffect(() => {
    const poll = () => {
      setRows([
        { label: 'Berth Occupancy', value: berthOccupancyPercent().toFixed(0), unit: '%' },
        { label: 'Truck TAT', value: truckAverageTat().toFixed(1), unit: '초(시뮬)' },
        { label: 'Collision Risk', value: COLLISION_RISK_PERCENT.toFixed(1), unit: '%', accent: true },
        { label: 'ARMGC 고장 대응 가동률', value: failoverCoverageRatePercent().toFixed(0), unit: '%' },
        { label: '야드 장치율', value: yardUtilizationPercent().toFixed(0), unit: '%' },
      ])
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="pointer-events-none absolute bottom-9 right-3 z-20 w-[200px] overflow-hidden rounded-md border border-teal/50 bg-surface/90 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/90 px-2 py-1">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
        </span>
        <span className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-teal">TOS Live KPI</span>
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9px] text-ink-faint">{r.label}</span>
            <span className={`font-mono text-[13px] font-bold tabular-nums ${r.accent ? 'text-ok' : 'text-ink'}`}>
              {r.value}
              <span className="ml-1 text-[9px] font-normal text-ink-faint">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
