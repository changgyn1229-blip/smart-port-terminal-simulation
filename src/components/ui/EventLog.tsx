import { useEffect, useState } from 'react'

const MOCK_LOG_TEMPLATES = [
  '[안벽] 안벽크레인 102호기 컨테이너(ID: CNTR-9921) 선적 완료',
  '[이송] IGV-047호기 야드 C4 블록으로 자율주행 이동 시작',
  '[야드] ARMGC 04호기 최적 배치 스케줄링 수신',
  '[게이트] 외부 트럭(부산 86가 1234) OCR 무인 인식 통과',
  '[이송] IGV-047호기 자동 충전 스테이션 진입 (잔량 78%)',
  '[안벽] 선박 접안 완료 및 선적 시퀀스 개시',
]

export function EventLog() {
  const [logs, setLogs] = useState<string[]>([
    '[시스템] 출고 시뮬레이션 엔진 가동 중...',
    '[시스템] 게이트 → 이송 → 야드 → 안벽 흐름 모니터링 초기화 완료.',
  ])

  useEffect(() => {
    const id = setInterval(() => {
      const next = MOCK_LOG_TEMPLATES[Math.floor(Math.random() * MOCK_LOG_TEMPLATES.length)]
      setLogs((prev) => [next, ...prev].slice(0, 12))
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col px-5 py-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        라이브 시뮬레이션 이벤트 로그 · 예시 데이터
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto font-mono text-[11px] text-ink-faint">
        {logs.map((log, i) => (
          <div key={i} className={i === 0 ? 'font-semibold text-teal' : 'opacity-75'}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}
