import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'

type GizmoMode = 'translate' | 'rotate'

interface EditModeContextValue {
  editMode: boolean
  selected: THREE.Object3D | null
  select: (object: THREE.Object3D | null) => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

function useEditMode() {
  return useContext(EditModeContext)
}

// 건물 드래그 편집 모드 상태 — Canvas 바깥(TerminalCanvas)에서 호출한다. 키보드 리스너는
// r3f 훅에 의존하지 않으므로 Canvas 안팎 어디서 써도 동일하게 동작한다.
// 'E'로 편집 모드 토글, 'G' 이동 / 'R' 회전, 'Esc'로 선택 해제.
// 참고: 카메라 뷰 프리셋(CameraRig.tsx)이 이미 숫자키 1~5를 쓰고 있어 충돌하므로
// 이동/회전 전환은 G/R 키만 사용한다(1/2 별칭은 의도적으로 배정하지 않음).
export function useBuildingEditModeState() {
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<THREE.Object3D | null>(null)
  const [mode, setMode] = useState<GizmoMode>('translate')

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = e.key.toLowerCase()
      if (key === 'e') {
        setEditMode((v) => !v)
        setSelected(null)
        return
      }
      if (!editMode) return
      if (key === 'g') setMode('translate')
      else if (key === 'r') setMode('rotate')
      else if (key === 'escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editMode])

  return { editMode, selected, mode, select: setSelected }
}

// 건물 하나를 감싸면 편집 모드에서 클릭으로 선택 가능해진다. 편집 모드가 아닐 때는
// 기존 onClick(카메라 포커스 등)을 그대로 통과시켜 기존 동작을 건드리지 않는다.
interface EditableProps {
  children: ReactNode
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  name?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function Editable({ children, onClick, name, position, rotation }: EditableProps) {
  const ctx = useEditMode()
  const ref = useRef<THREE.Group>(null)

  return (
    <group
      ref={ref}
      name={name}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        if (ctx?.editMode) {
          e.stopPropagation()
          ctx.select(ref.current)
          return
        }
        onClick?.(e)
      }}
      onPointerOver={(e) => {
        if (ctx?.editMode) {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {children}
    </group>
  )
}

export function EditModeProvider({
  editMode,
  selected,
  select,
  children,
}: {
  editMode: boolean
  selected: THREE.Object3D | null
  select: (object: THREE.Object3D | null) => void
  children: ReactNode
}) {
  return <EditModeContext.Provider value={{ editMode, selected, select }}>{children}</EditModeContext.Provider>
}

function logTransform(obj: THREE.Object3D) {
  const rotDeg = THREE.MathUtils.radToDeg(obj.rotation.y)
  // eslint-disable-next-line no-console
  console.log(
    `[건물 편집] ${obj.name || '(이름 없음)'} → x={${obj.position.x.toFixed(2)}} z={${obj.position.z.toFixed(2)}} y={${obj.position.y.toFixed(2)}} rotationDeg={${rotDeg.toFixed(1)}}`,
  )
}

// Canvas 내부에 두는 실제 기즈모. 선택된 건물이 있을 때만 렌더링된다.
export function BuildingTransformGizmo({
  editMode,
  selected,
  mode,
}: {
  editMode: boolean
  selected: THREE.Object3D | null
  mode: GizmoMode
}) {
  if (!editMode || !selected) return null

  // 회전 모드는 이 코드베이스의 모든 건물 배치가 Y축(rotationDeg) 하나만 쓰므로
  // X/Z 링을 숨겨 실수로 기울어지는 것을 방지한다.
  return (
    <TransformControls
      object={selected}
      mode={mode}
      showX={mode !== 'rotate'}
      showZ={mode !== 'rotate'}
      onMouseUp={() => logTransform(selected)}
    />
  )
}
