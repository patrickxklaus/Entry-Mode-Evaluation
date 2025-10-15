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

const createDefaultRow = () => ({
  points: 0,
  persistedPoints: 0,
  pointsDraft: null,
  exists: false,
  justification: "",
  market_conditions: "",
  sources: [],
})

const buildEmptyEvaluations = () => {
  const map = {}
  for (const c of criteria) {
    map[c.id] = createDefaultRow()
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
  const {
    activeMatrixId,
    queueReloadAfterFlush,
    markSaving,
    markSaved,
  } = useMatrixContext()

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
          const numericPoints = Number(row.points)
          const safePoints = Number.isFinite(numericPoints) ? numericPoints : 0
          nextEvaluations[targetId] = {
            points: safePoints,
            persistedPoints: safePoints,
            pointsDraft: null,
            exists: true,
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
        markSaving()
        try {
          const { persistedPoints, pointsDraft, exists, ...rest } = row || {}
          const fallbackPoints = Number.isFinite(persistedPoints) ? persistedPoints : 0
          const numericPoints = Number(rest.points)
          const basePoints = Number.isFinite(numericPoints) ? numericPoints : fallbackPoints
          const safePoints = clampPoints(criterionId, basePoints)
          const payload = {
            ...rest,
            points: safePoints,
            justification: rest.justification ?? "",
            market_conditions: rest.market_conditions ?? "",
            sources: Array.isArray(rest.sources) ? rest.sources : [],
          }
          await upsertEvaluation(activeMatrixId, modeName, criterionId, payload)
          if (refreshTotals) {
            queueReloadAfterFlush()
          }
          setSaveSuccess("Changes saved.")
          scheduleSuccessReset()
        } catch (err) {
          console.error("Failed to save evaluation", err)
          setSaveError("Could not save the latest changes.")
        } finally {
          markSaved()
          delete evaluationTimers.current[criterionId]
        }
      }, 400)
    },
    [activeMatrixId, modeName, queueReloadAfterFlush, markSaving, markSaved, scheduleSuccessReset]
  )

  const scheduleModeNoteSave = useCallback(
    (payload) => {
      if (!activeMatrixId || !modeName) return
      setSaveError(null)
      setSaveSuccess(null)
      if (noteTimer.current) clearTimeout(noteTimer.current)

      noteTimer.current = setTimeout(async () => {
        markSaving()
        try {
          await upsertModeNote(activeMatrixId, modeName, payload)
          queueReloadAfterFlush()
          setSaveSuccess("Changes saved.")
          scheduleSuccessReset()
        } catch (err) {
          console.error("Failed to save mode notes", err)
          setSaveError("Could not save the latest changes.")
        } finally {
          markSaved()
        }
      }, 400)
    },
    [activeMatrixId, modeName, queueReloadAfterFlush, markSaving, markSaved, scheduleSuccessReset]
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

      <div style={{ minHeight: 24, margin: "12px 0" }}>
        {loading && <span>Loading…</span>}
        {!loading && saveError && <span style={{ color: "red" }}>{saveError}</span>}
        {!loading && saveSuccess && <span style={{ color: "green" }}>{saveSuccess}</span>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

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
                value={
                  v.pointsDraft !== null && v.pointsDraft !== undefined
                    ? v.pointsDraft
                    : Number.isFinite(v.points)
                      ? v.points
                      : ""
                }
                min={c.min}
                max={c.max}
                step={1}
                onFocus={(event) => {
                  event.target.select()
                  setEvaluations((prev) => {
                    const current = prev[c.id] || createDefaultRow()
                    return {
                      ...prev,
                      [c.id]: { ...current, pointsDraft: "" },
                    }
                  })
                }}
                onBlur={(event) => {
                  const raw = event.target.value
                  setEvaluations((prev) => {
                    const current = prev[c.id] || createDefaultRow()
                    const persisted =
                      current.persistedPoints ?? (Number.isFinite(current.points) ? Number(current.points) : 0)
                    if (raw === "" || raw === null) {
                      const nextRow = {
                        ...current,
                        points: persisted,
                        persistedPoints: persisted,
                        pointsDraft: null,
                      }
                      return { ...prev, [c.id]: nextRow }
                    }
                    const parsed = Number(raw)
                    if (!Number.isFinite(parsed)) {
                      const nextRow = {
                        ...current,
                        points: persisted,
                        persistedPoints: persisted,
                        pointsDraft: null,
                      }
                      return { ...prev, [c.id]: nextRow }
                    }
                    const clamped = clampPoints(c.id, parsed)
                    if (clamped === persisted && current.exists) {
                      const nextRow = {
                        ...current,
                        points: persisted,
                        persistedPoints: persisted,
                        pointsDraft: null,
                      }
                      return { ...prev, [c.id]: nextRow }
                    }
                    const nextRow = {
                      ...current,
                      points: clamped,
                      persistedPoints: clamped,
                      pointsDraft: null,
                      exists: true,
                    }
                    scheduleEvaluationSave(c.id, nextRow, { refreshTotals: true })
                    return {
                      ...prev,
                      [c.id]: nextRow,
                    }
                  })
                }}
                onChange={(event) => {
                  const value = event.target.value
                  setEvaluations((prev) => {
                    const current = prev[c.id] || createDefaultRow()
                    const nextRow = {
                      ...current,
                      pointsDraft: value,
                    }
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
                    const current = prev[c.id] || createDefaultRow()
                    const nextRow = { ...current, justification: value, exists: true }
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
                    const current = prev[c.id] || createDefaultRow()
                    const nextRow = { ...current, market_conditions: value, exists: true }
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
                          const current = prev[c.id] || createDefaultRow()
                          const nextRow = { ...current, sources: nextSources, exists: true }
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
                          const current = prev[c.id] || createDefaultRow()
                          const nextRow = { ...current, sources: nextSources, exists: true }
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
                      const current = prev[c.id] || createDefaultRow()
                      const nextRow = { ...current, sources: nextSources, exists: true }
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
