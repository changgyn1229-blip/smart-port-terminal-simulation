import { useState } from 'react'
import { TopStatusBar } from './components/ui/TopStatusBar'
import { ViewModeBar } from './components/ui/ViewModeBar'
import { Scene3D } from './components/ui/Scene3D'
import { MetricsSidebar } from './components/ui/MetricsSidebar'
import { EventLog } from './components/ui/EventLog'
import { KpiBar } from './components/ui/KpiBar'

function App() {
  const [focusedId, setFocusedId] = useState<string | null>(null)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg">
      <TopStatusBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <ViewModeBar focusedId={focusedId} onSelect={setFocusedId} />
          <Scene3D focusedId={focusedId} onFocus={setFocusedId} onZoomOut={() => setFocusedId(null)} />
        </div>

        <MetricsSidebar focusedId={focusedId} onFocus={setFocusedId} />
      </div>

      <div className="flex h-32 border-t border-border bg-surface">
        <KpiBar />
        <EventLog />
      </div>
    </div>
  )
}

export default App
