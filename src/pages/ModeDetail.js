import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { criteria, criterionById, entryModes, modeSlug } from "../data/defaults"
import { rubricsByMode } from "../data/rubrics"
import { useMatrixContext } from "../context/MatrixContext"
import {
  getEvaluationsForMatrix,
  getModeNotesForMatrix,
  upsertEvaluation,
  upsertModeNote,
} from "../services/supabaseData"

const normalizeKey = (value) =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? ""

const buildEmptyEvaluations = () => {
  const map = {}
  for (const c of criteria) {
    map[c.id] = {
      points: 0,
      justification: "",
      market_conditions: "",
      sources: [],
    }
  }
  return map
}

const clampPoints = (cid, value) => {
  const config = criterionById[cid]
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (!config) return n
  return Math.max(config.min, Math.min(config.max, n))
}

export default function ModeDetail() {
  const { modeId } = useParams()
  const modeName = useMemo(() => entryModes.find(m => modeSlug(m) === modeId), [modeId])
  const { activeMatrixId, triggerReload } = useMatrixContext()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [evaluations, setEvaluations] = useState(() => buildEmptyEvaluations())
  const [modeNote, setModeNote] = useState({ discussions: "", observations: "" })
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)

  const evaluationTimers = useRef({})
  const noteTimer = useRef(null)
  const successTimer = useRef(null)

  useEffect(() => {
    return () => {
      for (const timer of Object.values(evaluationTimers.current)) {
        clearTimeout(timer)
      }
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!modeName) return
    if (!activeMatrixId) return

    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      setSaveError(null)
      setSaveSuccess(null)
      if (isMounted) {
        setEvaluations(buildEmptyEvaluations())
        setModeNote({ discussions: "", observations: "" })
      }

      try {
        const [evalRows, noteRows] = await Promise.all([
          getEvaluationsForMatrix(activeMatrixId),
          getModeNotesForMatrix(activeMatrixId),
        ])

        const modeKey = normalizeKey(modeName)
        const nextEvaluations = buildEmptyEvaluations()

        for (const row of evalRows || []) {
          if (normalizeKey(row.mode) !== modeKey) continue
          const criterionId = normalizeKey(row.criterion)
          const criterion = criteria.find(c => normalizeKey(c.id) === criterionId || normalizeKey(c.label) === criterionId)
          const targetId = criterion?.id
          if (!targetId) continue
          nextEvaluations[targetId] = {
            points: Number(row.points) || 0,
            justification: row.justification ?? "",
            market_conditions: row.market_conditions ?? "",
            sources: Array.isArray(row.sources) ? row.sources : [],
          }
        }

        const noteRow = (noteRows || []).find((row) => normalizeKey(row.mode) === modeKey)
        const nextNote = {
          discussions: noteRow?.discussions ?? "",
          observations: noteRow?.observations ?? "",
        }

        if (isMounted) {
          setEvaluations(nextEvaluations)
          setModeNote(nextNote)
        }
      } catch (err) {
        console.error("Failed to load mode details", err)
        if (isMounted) {
          setError("Could not load data for this mode.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [activeMatrixId, modeName])

  const scheduleSuccessReset = useCallback(() => {
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSaveSuccess(null), 2500)
  }, [])

  const scheduleEvaluationSave = useCallback(
    (criterionId, row, { refreshTotals = false } = {}) => {
      if (!activeMatrixId || !modeName) return
      setSaveError(null)
      setSaveSuccess(null)

      if (evaluationTimers.current[criterionId]) {
        clearTimeout(evaluationTimers.current[criterionId])
      }

      evaluationTimers.current[criterionId] = setTimeout(async () => {
        try {
          await upsertEvaluation(activeMatrixId, modeName, criterionId, row)
          if (refreshTotals) triggerReload()
          setSaveSuccess("Changes saved.")
          scheduleSuccessReset()
        } catch (err) {
          console.error("Failed to save evaluation", err)
          setSaveError("Could not save the latest changes.")
        } finally {
          delete evaluationTimers.current[criterionId]
        }
      }, 400)
    },
    [activeMatrixId, modeName, triggerReload, scheduleSuccessReset]
  )

  const scheduleModeNoteSave = useCallback(
    (payload) => {
      if (!activeMatrixId || !modeName) return
      setSaveError(null)
      setSaveSuccess(null)
      if (noteTimer.current) clearTimeout(noteTimer.current)

      noteTimer.current = setTimeout(async () => {
        try {
          await upsertModeNote(activeMatrixId, modeName, payload)
          setSaveSuccess("Changes saved.")
          scheduleSuccessReset()
        } catch (err) {
          console.error("Failed to save mode notes", err)
          setSaveError("Could not save the latest changes.")
        }
      }, 400)
    },
    [activeMatrixId, modeName, scheduleSuccessReset]
  )

  const total = useMemo(() => {
    return criteria.reduce((acc, c) => acc + Number(evaluations[c.id]?.points ?? 0), 0)
  }, [evaluations])

  if (!modeName) {
    return (
      <div className="page">
        <p>Unknown entry mode.</p>
        <Link to="/">Back to Matrix</Link>
      </div>
    )
  }

  if (!activeMatrixId) {
    return (
      <div className="page">
        <p>No matrix selected. Go back to the <Link to="/">matrix view</Link> and load or create one first.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginRight: 12 }}>{modeName}</h2>
        <Link to="/">Back to Matrix</Link>
        <div style={{ marginLeft: "auto" }}>
          <strong>Total: {total}</strong>
        </div>
      </div>

      {loading && <p>Loading details…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {saveError && <p style={{ color: "red" }}>{saveError}</p>}
      {saveSuccess && <p style={{ color: "green" }}>{saveSuccess}</p>}

      {criteria.map((c) => {
        const v = evaluations[c.id]
        return (
          <div className="card" key={c.id}>
            <h3 style={{ marginBottom: 10 }}>
              {c.label} <small>({c.min} to {c.max})</small>
            </h3>
            <div className="row">
              <label>Rubric</label>
              <div>
                <details>
                  <summary>Open rubric for {c.label}</summary>
                  <pre style={{ whiteSpace: "pre-wrap" }}>{(() => {
                    const slug = modeSlug(modeName)
                    const map = rubricsByMode[slug] || {}
                    const text = map[c.id]
                    return text || "—"
                  })()}</pre>
                </details>
              </div>
            </div>
            <div className="row">
              <label>Points Given</label>
              <input
                type="number"
                value={v.points}
                min={c.min}
                max={c.max}
                step={1}
                onChange={(event) => {
                  const inputValue = event.target.value
                  setEvaluations((prev) => {
                    const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                    const clamped = clampPoints(c.id, inputValue)
                    const nextRow = { ...current, points: clamped }
                    scheduleEvaluationSave(c.id, nextRow, { refreshTotals: true })
                    return {
                      ...prev,
                      [c.id]: nextRow,
                    }
                  })
                }}
              />
            </div>
            <div className="row">
              <label>Justification</label>
              <textarea
                value={v.justification}
                onChange={(event) => {
                  const value = event.target.value
                  setEvaluations((prev) => {
                    const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                    const nextRow = { ...current, justification: value }
                    scheduleEvaluationSave(c.id, nextRow)
                    return {
                      ...prev,
                      [c.id]: nextRow,
                    }
                  })
                }}
                rows={3}
              />
            </div>
            <div className="row">
              <label>Market Conditions</label>
              <textarea
                value={v.market_conditions}
                onChange={(event) => {
                  const value = event.target.value
                  setEvaluations((prev) => {
                    const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                    const nextRow = { ...current, market_conditions: value }
                    scheduleEvaluationSave(c.id, nextRow)
                    return {
                      ...prev,
                      [c.id]: nextRow,
                    }
                  })
                }}
                rows={3}
              />
            </div>
            <div className="row">
              <label>Sources or Evidence</label>
              <div className="sources">
                {(v.sources || []).map((source, idx) => (
                  <div key={idx} className="source-row">
                    <input
                      value={source}
                      placeholder="URL or citation"
                      onChange={(event) => {
                        const value = event.target.value
                        let nextSources = []
                        setEvaluations((prev) => {
                          const prevSources = prev[c.id]?.sources || []
                          nextSources = [...prevSources]
                          nextSources[idx] = value
                          const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                          const nextRow = { ...current, sources: nextSources }
                          scheduleEvaluationSave(c.id, nextRow)
                          return {
                            ...prev,
                            [c.id]: nextRow,
                          }
                        })
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        let nextSources = []
                        setEvaluations((prev) => {
                          const prevSources = prev[c.id]?.sources || []
                          nextSources = [...prevSources]
                          nextSources.splice(idx, 1)
                          const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                          const nextRow = { ...current, sources: nextSources }
                          scheduleEvaluationSave(c.id, nextRow)
                          return {
                            ...prev,
                            [c.id]: nextRow,
                          }
                        })
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    let nextSources = []
                    setEvaluations((prev) => {
                      const prevSources = prev[c.id]?.sources || []
                      nextSources = [...prevSources, ""]
                      const current = prev[c.id] || { points: 0, justification: "", market_conditions: "", sources: [] }
                      const nextRow = { ...current, sources: nextSources }
                      scheduleEvaluationSave(c.id, nextRow)
                      return {
                        ...prev,
                        [c.id]: nextRow,
                      }
                    })
                  }}
                >
                  Add Source
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="card">
        <div className="row">
          <label>Discussions</label>
          <textarea
            value={modeNote.discussions}
            rows={4}
            onChange={(event) => {
              const value = event.target.value
              setModeNote((prev) => {
                const next = { ...prev, discussions: value }
                scheduleModeNoteSave(next)
                return next
              })
            }}
          />
        </div>
        <div className="row">
          <label>Observations</label>
          <textarea
            value={modeNote.observations}
            rows={4}
            onChange={(event) => {
              const value = event.target.value
              setModeNote((prev) => {
                const next = { ...prev, observations: value }
                scheduleModeNoteSave(next)
                return next
              })
            }}
          />
        </div>
      </div>
    </div>
  )
}
