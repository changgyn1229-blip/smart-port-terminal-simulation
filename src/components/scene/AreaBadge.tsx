import { Html } from '@react-three/drei'

interface AreaBadgeProps {
  position: [number, number, number]
  label: string
  onClick: () => void
}

// 3D 월드 좌표에 붙는 플로팅 배지 — 구역 상단에 표출되고 클릭 시 카메라 포커스를 트리거한다.
export function AreaBadge({ position, label, onClick }: AreaBadgeProps) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} occlude={false}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="group pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-md border border-teal/60 bg-surface/85 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-teal shadow-[0_0_16px_-4px_rgba(79,179,166,0.55)] backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal group-hover:bg-accent" />
        {label}
      </button>
    </Html>
  )
}
