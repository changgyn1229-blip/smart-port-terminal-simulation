import { useEffect, useState } from 'react'

const SIM_START_SECONDS = 6 * 3600 // 06:00:00
const SIM_END_SECONDS = 24 * 3600
const SPEEDS = [1, 2, 5, 10] as const

function formatClock(totalSeconds: number) {
  const clamped = Math.min(SIM_END_SECONDS, Math.max(0, Math.round(totalSeconds)))
  const hh = String(Math.floor(clamped / 3600) % 24).padStart(2, '0')
  const mm = String(Math.floor((clamped % 3600) / 60)).padStart(2, '0')
  const ss = String(Math.floor(clamped % 60)).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function TopStatusBar() {
  const [simSeconds, setSimSeconds] = useState(SIM_START_SECONDS)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setSimSeconds((s) => Math.min(SIM_END_SECONDS, s + speed))
    }, 1000)
    return () => clearInterval(id)
  }, [playing, speed])

  useEffect(() => {
    if (simSeconds >= SIM_END_SECONDS) setPlaying(false)
  }, [simSeconds])

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3">
      <div className="flex shrink-0 items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
        </span>
        <h1 className="font-display text-[16px] font-bold leading-tight tracking-wide">
          스마트 항만 시뮬레이션 플랫폼
          <span className="ml-2 font-mono text-[11px] font-normal text-teal">v1.0</span>
          <span className="ml-2 hidden font-mono text-[10.5px] font-normal text-ink-faint md:inline">
            | TOS 연동 시뮬레이션 엔진 가동 중
          </span>
        </h1>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
          <button
            onClick={() => setPlaying(true)}
            title="재생"
            className={`rounded-md px-2.5 py-1 font-mono text-[12px] font-semibold transition-colors ${
              playing ? 'bg-teal text-accent-ink' : 'text-ink-dim hover:text-teal'
            }`}
          >
            ▶
          </button>
          <button
            onClick={() => setPlaying(false)}
            title="일시정지"
            className={`rounded-md px-2.5 py-1 font-mono text-[12px] font-semibold transition-colors ${
              !playing && simSeconds > SIM_START_SECONDS && simSeconds < SIM_END_SECONDS
                ? 'bg-surface text-accent'
                : 'text-ink-dim hover:text-accent'
            }`}
          >
            ❚❚
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setSimSeconds(SIM_START_SECONDS)
            }}
            title="정지"
            className="rounded-md px-2.5 py-1 font-mono text-[12px] font-semibold text-ink-dim transition-colors hover:text-ink"
          >
            ■
          </button>
        </div>

        <input
          type="range"
          min={SIM_START_SECONDS}
          max={SIM_END_SECONDS}
          value={simSeconds}
          onChange={(e) => setSimSeconds(Number(e.target.value))}
          className="h-1.5 w-full max-w-md flex-1 cursor-pointer appearance-none rounded-full bg-surface-2 accent-teal"
        />

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors ${
                speed === s ? 'bg-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[12px] tabular-nums">
        <span className="text-ink-faint">현재 시뮬레이션 시간</span>
        <span className="font-semibold text-teal">{formatClock(simSeconds)}</span>
      </div>
    </header>
  )
}
