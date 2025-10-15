import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"

const STORAGE_KEY = "active-matrix-id"

const MatrixContext = createContext(null)

export function MatrixProvider({ children }) {
  const [activeMatrixId, setActiveMatrixId] = useState(() => {
    if (typeof window === "undefined") return null
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const [reloadCounter, setReloadCounter] = useState(0)
  const pendingSaves = useRef(0)
  const [pendingCount, setPendingCount] = useState(0)
  const queuedReload = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (activeMatrixId) {
        localStorage.setItem(STORAGE_KEY, activeMatrixId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore storage errors
    }
  }, [activeMatrixId])

  const triggerReload = () => {
    setReloadCounter((val) => val + 1)
    queuedReload.current = false
  }

  const queueReloadAfterFlush = () => {
    if (pendingSaves.current === 0) {
      triggerReload()
    } else {
      queuedReload.current = true
    }
  }

  const markSaving = () => {
    pendingSaves.current += 1
    setPendingCount(pendingSaves.current)
  }

  const markSaved = () => {
    pendingSaves.current = Math.max(0, pendingSaves.current - 1)
    setPendingCount(pendingSaves.current)
    if (pendingSaves.current === 0 && queuedReload.current) {
      triggerReload()
    }
  }

  const value = useMemo(
    () => ({
      activeMatrixId,
      setActiveMatrixId,
      reloadCounter,
      triggerReload,
      queueReloadAfterFlush,
      markSaving,
      markSaved,
      pendingCount,
      hasPendingSaves: () => pendingSaves.current > 0,
    }),
    [activeMatrixId, reloadCounter, pendingCount]
  )

  return <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>
}

export function useMatrixContext() {
  const context = useContext(MatrixContext)
  if (!context) {
    throw new Error("useMatrixContext must be used within a MatrixProvider")
  }
  return context
}
