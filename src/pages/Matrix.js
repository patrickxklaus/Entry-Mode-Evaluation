import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import supabase from "../config/supabaseClient"
import { criteria, entryModes, modeSlug } from "../data/defaults"

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

const editableFields = ["title", "country", "company_name", "product_service"]

const buildEmptyMeta = () =>
  editableFields.reduce((acc, key) => {
    acc[key] = ""
    return acc
  }, {})

export default function Matrix() {
  const [scores, setScores] = useState(() => buildEmptyScores())
  const [matrixMeta, setMatrixMeta] = useState(null)
  const [editableMeta, setEditableMeta] = useState(() => buildEmptyMeta())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingMeta, setSavingMeta] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchMatrix = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: matrices, error: matricesError } = await supabase
          .from("matrices")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)

        if (matricesError) throw matricesError

        const activeMatrix = matrices?.[0] ?? null
        const nextScores = buildEmptyScores()

        if (activeMatrix) {
          const { data: evaluations, error: evaluationsError } = await supabase
            .from("evaluations")
            .select("mode, criterion, points")
            .eq("matrix_id", activeMatrix.id)

          if (evaluationsError) throw evaluationsError

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
        }

        if (isMounted) {
          setMatrixMeta(activeMatrix)
          setScores(nextScores)
          setEditableMeta(() => {
            const base = buildEmptyMeta()
            for (const field of editableFields) {
              base[field] = activeMatrix?.[field] ?? ""
            }
            return base
          })
        }
      } catch (err) {
        console.error("Failed to load matrix data", err)
        if (isMounted) {
          setError("Could not load data from Supabase.")
          setScores(buildEmptyScores())
          setMatrixMeta(null)
          setEditableMeta(buildEmptyMeta())
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
  }, [])

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

  const top = ranked[0]
  const topScore = totals[top] ?? 0

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginRight: 12 }}>
          Internationalization Strategy Matrix{matrixMeta?.title ? ` – ${matrixMeta.title}` : ""}
        </h2>
        {matrixMeta?.country && <span>Country: {matrixMeta.country}</span>}
      </div>

      {matrixMeta && (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!matrixMeta?.id) return
            setSavingMeta(true)
            setSaveError(null)
            setSaveSuccess(null)
            try {
              const updatePayload = {}
              for (const field of editableFields) {
                updatePayload[field] = editableMeta[field]
              }
              const { data, error: updateError } = await supabase
                .from("matrices")
                .update(updatePayload)
                .eq("id", matrixMeta.id)
                .select()
                .single()

              if (updateError) throw updateError

              setMatrixMeta(data)
              setEditableMeta(() => {
                const base = buildEmptyMeta()
                for (const field of editableFields) {
                  base[field] = data?.[field] ?? ""
                }
                return base
              })
              setSaveSuccess("Details saved.")
            } catch (err) {
              console.error("Failed to update matrix metadata", err)
              setSaveError("Could not save the details. Please try again.")
            } finally {
              setSavingMeta(false)
            }
          }}
          style={{ display: "grid", gap: 12, marginTop: 12, marginBottom: 20, maxWidth: 520 }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            <span><strong>Title</strong></span>
            <input
              type="text"
              value={editableMeta.title}
              onChange={(event) => {
                const { value } = event.target
                setEditableMeta((prev) => ({ ...prev, title: value }))
                setSaveSuccess(null)
              }}
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
              }}
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
              }}
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
              }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={savingMeta}>
              {savingMeta ? "Saving…" : "Save Details"}
            </button>
            {saveError && <span style={{ color: "red" }}>{saveError}</span>}
            {saveSuccess && <span style={{ color: "green" }}>{saveSuccess}</span>}
          </div>
        </form>
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

      <div className="suggestion">
        <h3>Suggestion Based on Results</h3>
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
