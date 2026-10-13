import { useEffect, useState } from 'react'

interface Kpi {
  id: string
  label: string
  value: number
  unit: string
  decimals: number
  min: number
  max: number
  step: number
}

const INITIAL: Kpi[] = [
  { id: 'throughput', label: '시간당 처리량', value: 142, unit: 'TEU/h', decimals: 0, min: 90, max: 190, step: 2 },
  { id: 'wait-time', label: '선박 대기 시간', value: 1.8, unit: '시간', decimals: 1, min: 0.5, max: 4, step: 0.1 },
  { id: 'yard-congestion', label: '야드 정체 지수', value: 62, unit: '/ 100', decimals: 0, min: 20, max: 95, step: 1 },
  { id: 'equipment-util', label: '전체 장비 가동률', value: 87, unit: '%', decimals: 0, min: 60, max: 99, step: 1 },
]

export function KpiBar() {
  const [kpis, setKpis] = useState(INITIAL)

  useEffect(() => {
    const id = setInterval(() => {
      setKpis((prev) =>
        prev.map((k) => {
          const delta = (Math.random() - 0.5) * k.step * 2
          const next = Math.min(k.max, Math.max(k.min, k.value + delta))
          return { ...k, value: +next.toFixed(k.decimals) }
        }),
      )
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid w-[440px] shrink-0 grid-cols-2 gap-2 border-r border-border bg-surface px-4 py-3">
      {kpis.map((k) => (
        <div
          key={k.id}
          className="flex flex-col justify-center gap-1 rounded-md border border-border border-t-2 border-t-teal bg-surface-2 px-3 py-1.5"
        >
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">{k.label}</span>
          <span className="font-mono text-[17px] font-bold tabular-nums text-ink">
            {k.value.toFixed(k.decimals)}
            <span className="ml-1 text-[10px] font-normal text-ink-faint">{k.unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
