import { processStages } from '../../data/processStages'

interface ViewModeBarProps {
  focusedId: string | null
  onSelect: (id: string | null) => void
}

export function ViewModeBar({ focusedId, onSelect }: ViewModeBarProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="font-mono text-[10.5px] text-ink-faint">
        조감도 영역을 직접 클릭하거나, 아래 버튼으로 카메라를 확대할 수 있습니다.
      </p>
      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        <button
          onClick={() => onSelect(null)}
          className={`rounded-md px-3 py-1.5 font-mono text-[11.5px] font-semibold transition-colors ${
            focusedId === null ? 'bg-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
          }`}
        >
          전체 보기
        </button>
        {processStages.map((stage) => {
          const equipmentId = stage.equipmentIds[0]
          const active = focusedId === equipmentId
          return (
            <button
              key={stage.id}
              onClick={() => onSelect(equipmentId)}
              className={`rounded-md px-3 py-1.5 font-mono text-[11.5px] font-semibold transition-colors ${
                active ? 'bg-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {stage.name} 확대
            </button>
          )
        })}
      </div>
    </div>
  )
}
