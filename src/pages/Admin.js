import { useState } from "react"
import { Link } from "react-router-dom"
import { createMatrix as createMatrixRow } from "../services/supabaseData"
import { useMatrixContext } from "../context/MatrixContext"

const maskValue = (value) => value?.trim() ?? ""

const Admin = () => {
  const { setActiveMatrixId } = useMatrixContext()
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [authorized, setAuthorized] = useState(false)
  const [creatingMatrix, setCreatingMatrix] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createdMatrixId, setCreatedMatrixId] = useState(null)

  const expectedPassword = maskValue(process.env.REACT_APP_ADMIN_PASSWORD)

  const handleAuthenticate = (event) => {
    event.preventDefault()
    if (!expectedPassword) {
      setPasswordError(
        "Admin password is not configured. Set REACT_APP_ADMIN_PASSWORD in your environment."
      )
      return
    }
    if (maskValue(passwordInput) !== expectedPassword) {
      setPasswordError("Incorrect password. Please try again.")
      return
    }
    setPasswordError("")
    setAuthorized(true)
    setPasswordInput("")
  }

  const handleCreateMatrix = async () => {
    setCreatingMatrix(true)
    setCreateError("")
    setCreatedMatrixId(null)
    try {
      const matrix = await createMatrixRow()
      setCreatedMatrixId(matrix.id)
      setActiveMatrixId(matrix.id)
    } catch (err) {
      console.error("Failed to create matrix", err)
      setCreateError("Could not create a new matrix. Please try again.")
    } finally {
      setCreatingMatrix(false)
    }
  }

  return (
    <div className="page admin">
      <h2>Administrative Tools</h2>

      {!authorized ? (
        <form onSubmit={handleAuthenticate} className="admin-auth">
          <p>Please enter the administrator password to continue.</p>
          <label style={{ display: "grid", gap: 6, maxWidth: 320 }}>
            <span>Password</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <button type="submit" className="matrix-selector__primary">
              Unlock Admin Area
            </button>
            {passwordError && <span style={{ color: "red" }}>{passwordError}</span>}
          </div>
        </form>
      ) : (
        <div className="admin-panel" style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <p>
            Use this page to create new matrix identifiers. Once created, the matrix will be loaded
            automatically on the <Link to="/">Matrix view</Link>.
          </p>
          <button
            type="button"
            onClick={handleCreateMatrix}
            className="matrix-selector__secondary"
            disabled={creatingMatrix}
          >
            {creatingMatrix ? "Creating…" : "Create New Matrix"}
          </button>
          {createError && <span style={{ color: "red" }}>{createError}</span>}
          {createdMatrixId && (
            <div
              style={{
                border: "1px solid var(--border-color, #ccc)",
                borderRadius: 8,
                padding: 16,
                background: "var(--surface, #f7f7f7)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Matrix created</h3>
              <p>The new matrix identifier is:</p>
              <code style={{ display: "block", padding: "8px 12px", fontSize: "1.1rem" }}>
                {createdMatrixId}
              </code>
              <p>
                Share this ID with collaborators so they can load it from the{" "}
                <Link to="/">Matrix view</Link>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Admin
