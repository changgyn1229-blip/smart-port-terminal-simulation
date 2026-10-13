import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode는 R3F의 비동기 텍스처 로딩(Suspense)과 함께 쓰면 개발 모드의 이중 마운트가
// WebGL 컨텍스트 손실을 유발할 수 있어 의도적으로 제외.
createRoot(document.getElementById('root')!).render(<App />)
