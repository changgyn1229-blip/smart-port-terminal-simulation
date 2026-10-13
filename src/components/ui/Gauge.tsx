import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

interface GaugeProps {
  label: string
  value: number
  max: number
  unit: string
  size?: number
}

export function Gauge({ label, value, max, unit, size = 108 }: GaugeProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const data = [{ name: label, value: pct, fill: 'var(--color-accent)' }]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <RadialBarChart
          width={size}
          height={size}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={8}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'var(--color-surface-2)' }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[15px] font-bold tabular-nums text-ink">{value}</span>
          <span className="font-mono text-[9px] text-ink-faint">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-ink-dim text-center leading-tight">{label}</span>
    </div>
  )
}
