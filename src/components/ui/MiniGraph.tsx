import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

interface MiniGraphProps {
  label: string
  value: number
  unit: string
  history: number[]
}

export function MiniGraph({ label, value, unit, history }: MiniGraphProps) {
  const data = history.map((v, i) => ({ i, v }))

  return (
    <div className="flex flex-col gap-1.5 min-w-[132px]">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-ink-dim">{label}</span>
        <span className="font-mono text-[13px] font-bold tabular-nums text-ink">
          {value}
          <span className="text-[10px] font-normal text-ink-faint ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-9">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
            <defs>
              <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--color-teal)"
              strokeWidth={1.5}
              fill="url(#graphFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
