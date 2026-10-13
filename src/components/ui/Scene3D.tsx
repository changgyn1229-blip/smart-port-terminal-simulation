import { Suspense } from 'react'
import { equipmentById } from '../../data/equipment'
import { TerminalCanvas } from '../scene/TerminalCanvas'
import { DetailPanel } from './DetailPanel'
import { TosKpiOverlay } from './TosKpiOverlay'
import { TerminalSpecPanel } from './TerminalSpecPanel'

interface Scene3DProps {
  focusedId: string | null
  onFocus: (id: string) => void
  onZoomOut: () => void
}

export function Scene3D({ focusedId, onFocus, onZoomOut }: Scene3DProps) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border">
      <Suspense fallback={null}>
        <TerminalCanvas focusedId={focusedId} onFocus={onFocus} />
      </Suspense>

      <TerminalSpecPanel />
      <TosKpiOverlay />
      <DetailPanel equipment={focusedId ? equipmentById[focusedId] : null} onClose={onZoomOut} />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-ink-faint">
        기본 45도 부감 시점 · 드래그로 자유 회전 · 장비 클릭 시 카메라만 확대(재생/정지 아님) · E 건물 편집 모드(클릭 선택 · G 이동 · R 회전 · Esc 해제)
      </p>
    </div>
  )
}
