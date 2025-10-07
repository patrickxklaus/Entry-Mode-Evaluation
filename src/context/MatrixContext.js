import { createContext, useContext, useEffect, useMemo, useState } from "react"

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
  }

  const value = useMemo(
    () => ({
      activeMatrixId,
      setActiveMatrixId,
      reloadCounter,
      triggerReload,
    }),
    [activeMatrixId, reloadCounter]
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

