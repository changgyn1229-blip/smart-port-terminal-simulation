import { motion, AnimatePresence } from 'framer-motion'
import type { Equipment } from '../../types'
import { Gauge } from './Gauge'
import { MiniGraph } from './MiniGraph'
import { monitoringByEquipmentId } from '../../data/monitoring'
import { equipmentPhotos } from '../../data/photos'

interface DetailPanelProps {
  equipment: Equipment | null
  onClose: () => void
}

export function DetailPanel({ equipment, onClose }: DetailPanelProps) {
  const metrics = equipment ? monitoringByEquipmentId[equipment.id] ?? [] : []
  const photo = equipment ? equipmentPhotos[equipment.id] : null

  return (
    <AnimatePresence>
      {equipment && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute right-3 top-3 bottom-3 z-10 w-[300px] overflow-y-auto rounded-md border border-border bg-surface/95 backdrop-blur-md p-4 shadow-[0_20px_44px_-16px_rgba(0,0,0,0.7)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-teal font-semibold">
                카메라 확대 · 상세 뷰
              </p>
              <h3 className="font-display text-[17px] font-bold mt-0.5 leading-tight">{equipment.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-[10.5px] text-ink-dim hover:border-accent hover:text-accent transition-colors"
            >
              ← 줌아웃
            </button>
          </div>

          {photo && (
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <img src={photo.src} alt={equipment.name} className="h-28 w-full object-cover" />
              <p className="bg-surface-2 px-2 py-1 font-mono text-[9.5px] text-ink-faint">{photo.sourceNote}</p>
            </div>
          )}

          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-dim">{equipment.description}</p>

          <div className="mt-3 grid grid-cols-1 gap-1.5">
            {equipment.specs.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
                <span className="font-mono text-[9.5px] uppercase tracking-wide text-ink-faint">{s.label}</span>
                <span className="text-right text-[11px] text-ink">{s.value}</span>
              </div>
            ))}
          </div>

          {metrics.length > 0 && (
            <>
              <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                모니터링 · 예시 데이터
              </p>
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2 p-2.5">
                {metrics.map((m) =>
                  m.displayType === 'gauge' ? (
                    <Gauge key={m.id} label={m.label} value={m.value} max={m.max} unit={m.unit} size={68} />
                  ) : (
                    <MiniGraph key={m.id} label={m.label} value={m.value} unit={m.unit} history={m.history ?? []} />
                  ),
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
