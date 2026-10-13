import { berthSlots, yardBlockSlots } from '../../data/scenePositions'

const SPECS = [
  { label: '안벽 총연장', value: '1,500 m', sub: '300m x 5선석' },
  { label: 'STS 크레인 (C/C)', value: `${berthSlots.length}기`, sub: '선석당 3기' },
  { label: 'ARMGC (T/C)', value: `${yardBlockSlots.length * 2}기`, sub: `${yardBlockSlots.length}블록 x 듀얼 2기` },
  { label: '수직 야드 블록', value: `${yardBlockSlots.length}개`, sub: '핵심 라인 정돈 배치' },
]

// 좌측 상단 고정 오버레이 — 신선대부두 실제 제원 정보. scenePositions의 실측 기반 상수에서
// 직접 파생해 레이아웃이 바뀌어도(블록/크레인 수 조정 등) 항상 실제 배치와 일치한다.
export function TerminalSpecPanel() {
  return (
    <div className="pointer-events-none absolute left-3 top-[168px] z-20 w-[200px] overflow-hidden rounded-md border border-teal/50 bg-surface/90 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      <div className="border-b border-border bg-surface-2/90 px-2 py-1">
        <span className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-teal">터미널 제원</span>
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {SPECS.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9px] text-ink-faint">
              {s.label}
              <span className="ml-1 text-[8px] text-ink-faint/70">({s.sub})</span>
            </span>
            <span className="shrink-0 font-mono text-[12px] font-bold tabular-nums text-ink">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
