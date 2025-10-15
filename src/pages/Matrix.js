import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { criteria, entryModes, modeSlug } from "../data/defaults"
import {
  createMatrix as createMatrixRow,
  getMatrixById,
  getEvaluationsForMatrix,
  getModeNotesForMatrix,
  updateMatrix as updateMatrixRow,
} from "../services/supabaseData"
import { useMatrixContext } from "../context/MatrixContext"

const normalizeKey = (value) =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? ""

const buildEmptyScores = () => {
  const grid = {}
  for (const mode of entryModes) {
    grid[mode] = {}
    for (const c of criteria) {
      grid[mode][c.id] = 0
    }
  }
  return grid
}

const buildEmptyModeNotes = () => {
  const map = {}
  for (const mode of entryModes) {
    map[mode] = { discussions: "", observations: "" }
  }
  return map
}

const editableFields = ["title", "country", "company_name", "product_service"]

const buildEmptyMeta = () =>
  editableFields.reduce((acc, key) => {
    acc[key] = ""
    return acc
  }, {})

export default function Matrix() {
  const {
    activeMatrixId,
    setActiveMatrixId,
    reloadCounter,
    triggerReload,
    pendingCount,
  } = useMatrixContext()
  const [scores, setScores] = useState(() => buildEmptyScores())
  const [matrixIdInput, setMatrixIdInput] = useState(() => activeMatrixId ?? "")
  const [matrixMeta, setMatrixMeta] = useState(null)
  const [modeNotes, setModeNotes] = useState(() => buildEmptyModeNotes())
  const [editableMeta, setEditableMeta] = useState(() => buildEmptyMeta())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savingMeta, setSavingMeta] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [creatingMatrix, setCreatingMatrix] = useState(false)

  const syncEditableMeta = useCallback((data) => {
    setEditableMeta(() => {
      const base = buildEmptyMeta()
      for (const field of editableFields) {
        base[field] = data?.[field] ?? ""
      }
      return base
    })
  }, [])

  const saveMetaField = async (field) => {
    if (!matrixMeta?.id) return
    const newValue = editableMeta[field]
    const currentValue = matrixMeta?.[field] ?? ""
    if (currentValue === newValue) return
    setSavingMeta(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const updated = await updateMatrixRow(matrixMeta.id, { [field]: newValue })
      setMatrixMeta(updated)
      syncEditableMeta(updated)
      setSaveSuccess("Details saved.")
    } catch (err) {
      console.error("Failed to update matrix metadata", err)
      setSaveError("Could not save the details. Please try again.")
    } finally {
      setSavingMeta(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    if (pendingCount > 0) {
      return () => {
        isMounted = false
      }
    }

    const fetchMatrix = async () => {
      if (!activeMatrixId) {
        setLoading(false)
        setMatrixMeta(null)
        syncEditableMeta(null)
        setScores(buildEmptyScores())
        setModeNotes(buildEmptyModeNotes())
        return
      }

      setLoading(true)
      setError(null)
      setSaveError(null)
      setSaveSuccess(null)

      try {
        const activeMatrix = await getMatrixById(activeMatrixId)

        if (!activeMatrix) {
          if (isMounted) {
            setError("Matrix not found. Please verify the ID or create a new matrix.")
            setMatrixMeta(null)
            syncEditableMeta(null)
            setScores(buildEmptyScores())
            setModeNotes(buildEmptyModeNotes())
            setActiveMatrixId(null)
          }
          return
        }

        const nextScores = buildEmptyScores()

        if (activeMatrix) {
          const evaluations = await getEvaluationsForMatrix(activeMatrix.id)

          const modeLookup = new Map(entryModes.map((mode) => [normalizeKey(mode), mode]))
          const criterionLookup = new Map()
          for (const c of criteria) {
            criterionLookup.set(normalizeKey(c.id), c.id)
            criterionLookup.set(normalizeKey(c.label), c.id)
          }

          for (const row of evaluations || []) {
            const normalizedMode = normalizeKey(row.mode)
            const normalizedCriterion = normalizeKey(row.criterion)
            const modeName = modeLookup.get(normalizedMode)
            const criterionId = criterionLookup.get(normalizedCriterion)
            const points = Number(row.points)

            if (modeName && criterionId) {
              nextScores[modeName][criterionId] = Number.isFinite(points) ? points : 0
            }
          }

          const modeNotesRows = await getModeNotesForMatrix(activeMatrix.id)
          const nextModeNotes = buildEmptyModeNotes()
          for (const note of modeNotesRows || []) {
            const normalizedMode = normalizeKey(note.mode)
            const modeName = modeLookup.get(normalizedMode)
            if (modeName) {
              nextModeNotes[modeName] = {
                discussions: note.discussions ?? "",
                observations: note.observations ?? "",
              }
            }
          }

          if (isMounted) {
            setModeNotes(nextModeNotes)
          }
        }

        if (isMounted) {
          setMatrixMeta(activeMatrix)
          setScores(nextScores)
          syncEditableMeta(activeMatrix)
          setMatrixIdInput(activeMatrix.id)
        }
      } catch (err) {
        console.error("Failed to load matrix data", err)
        if (isMounted) {
          setError("Could not load data from Supabase.")
          setScores(buildEmptyScores())
          setMatrixMeta(null)
          syncEditableMeta(null)
          setModeNotes(buildEmptyModeNotes())
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMatrix()
    return () => {
      isMounted = false
    }
  }, [activeMatrixId, reloadCounter, syncEditableMeta, pendingCount])

  useEffect(() => {
    setMatrixIdInput(activeMatrixId ?? "")
  }, [activeMatrixId])

  const handleLoadMatrix = (event) => {
    event?.preventDefault?.()
    const trimmedId = matrixIdInput.trim()
    if (!trimmedId) {
      setError("Please enter a matrix ID to load.")
      setActiveMatrixId(null)
      setMatrixMeta(null)
      syncEditableMeta(null)
      setScores(buildEmptyScores())
      return
    }
    setError(null)
    if (trimmedId === activeMatrixId) {
      triggerReload()
    } else {
      setActiveMatrixId(trimmedId)
    }
  }

  const handleCreateMatrix = async () => {
    setCreatingMatrix(true)
    setError(null)
    setSaveError(null)
      setSaveSuccess(null)
    try {
      const matrix = await createMatrixRow()
      setMatrixIdInput(matrix.id)
      setActiveMatrixId(matrix.id)
    } catch (err) {
      console.error("Failed to create matrix", err)
      setError("Could not create a new matrix. Please try again.")
    } finally {
      setCreatingMatrix(false)
    }
  }

  const totals = useMemo(() => {
    const out = {}
    for (const mode of entryModes) {
      let sum = 0
      for (const c of criteria) {
        const v = Number(scores?.[mode]?.[c.id] ?? 0)
        sum += v * (c.weight ?? 1)
      }
      out[mode] = sum
    }
    return out
  }, [scores])

  const ranked = useMemo(() => {
    return [...entryModes].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))
  }, [totals])

  const hasModeNotes = useMemo(() => {
    return Object.values(modeNotes || {}).some(
      (note) =>
        (note.discussions && note.discussions.trim().length > 0) ||
        (note.observations && note.observations.trim().length > 0)
    )
  }, [modeNotes])

  const top = ranked[0]
  const topScore = totals[top] ?? 0

  return (
    <div className="page">
      <div style={{ minHeight: 24, marginBottom: 8 }}>
        {savingMeta && <span>Saving…</span>}
        {!savingMeta && saveError && <span style={{ color: "red" }}>{saveError}</span>}
        {!savingMeta && saveSuccess && <span style={{ color: "green" }}>{saveSuccess}</span>}
      </div>

      <form
        onSubmit={handleLoadMatrix}
        style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span><strong>Matrix ID</strong></span>
          <input
            type="text"
            value={matrixIdInput}
            onChange={(event) => setMatrixIdInput(event.target.value)}
            placeholder="Paste or enter matrix UUID"
            style={{ minWidth: 280 }}
          />
        </label>
        <button type="submit">Load Matrix</button>
        <button type="button" onClick={handleCreateMatrix} disabled={creatingMatrix}>
          {creatingMatrix ? "Creating…" : "Create New Matrix"}
        </button>
        {activeMatrixId && (
          <span style={{ fontSize: 12, color: "#555" }}>Currently loaded: {activeMatrixId}</span>
        )}
      </form>

      {!activeMatrixId && (
        <p style={{ marginBottom: 16 }}>
          Enter a matrix ID to load existing data or create a new matrix to begin editing.
        </p>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginRight: 12 }}>
          Internationalization Strategy Matrix{matrixMeta?.title ? ` – ${matrixMeta.title}` : ""}
        </h2>
        {matrixMeta?.country && <span>Country: {matrixMeta.country}</span>}
      </div>

      {matrixMeta && (
        <div style={{ display: "grid", gap: 12, marginTop: 12, marginBottom: 20, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span><strong>Title</strong></span>
            <input
              type="text"
              value={editableMeta.title}
              onChange={(event) => {
                const { value } = event.target
                setEditableMeta((prev) => ({ ...prev, title: value }))
                setSaveSuccess(null)
                setSaveError(null)
              }}
              onBlur={() => saveMetaField("title")}
              placeholder="International Strategy"
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span><strong>Country</strong></span>
            <input
              type="text"
              value={editableMeta.country}
              onChange={(event) => {
                const { value } = event.target
                setEditableMeta((prev) => ({ ...prev, country: value }))
                setSaveSuccess(null)
                setSaveError(null)
              }}
              onBlur={() => saveMetaField("country")}
              placeholder="Target market country"
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span><strong>Company</strong></span>
            <input
              type="text"
              value={editableMeta.company_name}
              onChange={(event) => {
                const { value } = event.target
                setEditableMeta((prev) => ({ ...prev, company_name: value }))
                setSaveSuccess(null)
                setSaveError(null)
              }}
              onBlur={() => saveMetaField("company_name")}
              placeholder="Company name"
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span><strong>Product / Service</strong></span>
            <input
              type="text"
              value={editableMeta.product_service}
              onChange={(event) => {
                const { value } = event.target
                setEditableMeta((prev) => ({ ...prev, product_service: value }))
                setSaveSuccess(null)
                setSaveError(null)
              }}
              onBlur={() => saveMetaField("product_service")}
              placeholder="Describe the offering"
            />
          </label>

        </div>
      )}

      {loading && <p>Loading matrix scores…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="matrix-wrapper">
        <table className="matrix">
          <thead>
            <tr>
              <th>Entry Mode</th>
              {criteria.map((c) => (
                <th key={c.id}>
                  <div>{c.label}</div>
                  <small>
                    {c.min} to {c.max}
                  </small>
                </th>
              ))}
              <th>Consolidation Score</th>
            </tr>
          </thead>
          <tbody>
            {entryModes.map((mode) => (
              <tr key={mode}>
                <td className="mode-cell"><Link to={`/mode/${modeSlug(mode)}`}>{mode}</Link></td>
                {criteria.map((c) => (
                  <td key={c.id}>
                    {scores?.[mode]?.[c.id] ?? 0}
                  </td>
                ))}
                <td className="total">{totals[mode] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ranking">
        <h3>Ranking</h3>
        <ol>
          {ranked.map((m) => (
            <li key={m}>
              <strong><Link to={`/mode/${modeSlug(m)}`}>{m}</Link></strong>: {totals[m]}
            </li>
          ))}
        </ol>
      </div>

      {hasModeNotes && (
        <div className="mode-notes">
          <h3>Mode Notes</h3>
          <ul>
            {entryModes.map((mode) => {
              const note = modeNotes[mode] || {}
              const summary = note.discussions || note.observations
              if (!summary) return null
              const trimmed = summary.length > 160 ? `${summary.slice(0, 160)}…` : summary
              return (
                <li key={mode}>
                  <strong>{mode}:</strong> {trimmed}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="suggestion">
        <h3>Suggestion for the company based on the results:</h3>
        <p>
          {top ? (
            <>
              Top option: <strong>{top}</strong> with score <strong>{topScore}</strong>
              {matrixMeta?.country ? ` for ${matrixMeta.country}` : ""}.
            </>
          ) : (
            "Add scores to see a suggestion."
          )}
        </p>
        <p style={{ fontSize: "0.95rem", color: "#1f5d52", marginTop: -10 }}>
          Need a refresher on what the score means? Read the <Link to="/rubric">evaluation rubric</Link>.
        </p>
        <textarea
          placeholder="Add qualitative reasoning, risks, implementation considerations..."
          value={matrixMeta?.suggestion_text || ""}
          readOnly
          rows={4}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  )
}
