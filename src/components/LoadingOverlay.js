import { useEffect } from "react"
import "./LoadingOverlay.css"

let overlayLockCount = 0

export default function LoadingOverlay({ visible, message = "Loading…" }) {
  useEffect(() => {
    if (!visible) return undefined
    if (typeof window === "undefined" || typeof document === "undefined") return undefined

    overlayLockCount += 1

    const body = document.body
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (previouslyFocused) {
      previouslyFocused.blur()
    }

    const suppressInteraction = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener("keydown", suppressInteraction, true)
    window.addEventListener("keypress", suppressInteraction, true)

    if (overlayLockCount === 1) {
      body.classList.add("loading-overlay-active")
      body.setAttribute("aria-busy", "true")
    }

    return () => {
      window.removeEventListener("keydown", suppressInteraction, true)
      window.removeEventListener("keypress", suppressInteraction, true)

      overlayLockCount = Math.max(overlayLockCount - 1, 0)

      if (overlayLockCount === 0) {
        body.classList.remove("loading-overlay-active")
        body.removeAttribute("aria-busy")
        if (
          previouslyFocused &&
          typeof previouslyFocused.focus === "function" &&
          document.contains(previouslyFocused)
        ) {
          previouslyFocused.focus({ preventScroll: true })
        }
      }
    }
  }, [visible])

  if (!visible) return null
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  )
}
