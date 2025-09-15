import { useEffect, useMemo, useState } from "react"
import { criteria, entryModes, modeSlug } from "../data/defaults"
import { Link } from "react-router-dom"

const clamp = (val, min, max) => {
  const n = Number(val)
  if (Number.isNaN(n)) return 0
  return Math.max(min, Math.min(max, n))
}

const buildInitialScores = () => {
  const scores = {}
  for (const mode of entryModes) {
    scores[mode] = {}
    for (const c of criteria) {
      scores[mode][c.id] = 0
    }
  }
  return scores
}

const STORAGE_KEY = "entry-mode-matrix-v2"

export default function Matrix() {
  const [scores, setScores] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return { scores: buildInitialScores(), details: {}, country: "", note: "" }
  })
  const country = scores.country || ""
  const note = scores.note || ""

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
  }, [scores])

  const totals = useMemo(() => {
    const out = {}
    for (const mode of entryModes) {
      let sum = 0
      for (const c of criteria) {
        const v = Number(scores?.scores?.[mode]?.[c.id] ?? 0)
        sum += v * (c.weight ?? 1)
      }
      out[mode] = sum
    }
    return out
  }, [scores])

  const ranked = useMemo(() => {
    return [...entryModes].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))
  }, [totals])

  const handleChange = (mode, c, value) => {
    setScores((prev) => ({
      ...prev,
      scores: {
        ...(prev.scores || {}),
        [mode]: {
          ...(prev.scores?.[mode] || {}),
          [c.id]: clamp(value, c.min, c.max),
        },
      },
    }))
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(scores, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `entry-mode-matrix${country ? `-${country}` : ""}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (data && (data.scores || data.details)) setScores(data)
      } catch (e) {
        console.error("Invalid JSON", e)
      }
    }
    reader.readAsText(file)
  }

  const top = ranked[0]
  const topScore = totals[top] ?? 0

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginRight: 12 }}>Internationalization Strategy Matrix</h2>
        <input
          placeholder="Country (optional)"
          value={country}
          onChange={(e) => setScores(prev => ({ ...prev, country: e.target.value }))}
          style={{ padding: 6 }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportJSON}>Export JSON</button>
          <label className="file-input">
            Import JSON
            <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          </label>
          <button onClick={() => setScores({ scores: buildInitialScores(), details: {}, country: "", note: "" })}>Reset</button>
        </div>
      </div>

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
                    <input
                      type="number"
                      inputMode="numeric"
                      step={1}
                      value={scores?.scores?.[mode]?.[c.id] ?? 0}
                      min={c.min}
                      max={c.max}
                      onChange={(e) => handleChange(mode, c, e.target.value)}
                    />
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
              {country ? ` for ${country}` : ""}.
            </>
          ) : (
            "Add scores to see a suggestion."
          )}
        </p>
        <textarea
          placeholder="Add qualitative reasoning, risks, implementation considerations..."
          value={note}
          onChange={(e) => setScores(prev => ({ ...prev, note: e.target.value }))}
          rows={4}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  )
}
