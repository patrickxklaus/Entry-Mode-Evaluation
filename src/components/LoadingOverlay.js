import "./LoadingOverlay.css"

export default function LoadingOverlay({ visible, message = "Loading…" }) {
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

