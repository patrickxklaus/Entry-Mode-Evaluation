import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { criteria, criterionById, entryModes, modeSlug, rubricGuidance } from "../data/defaults"

const STORAGE_KEY = "entry-mode-matrix-v2"

const buildInitialDetails = () => ({
  companyName: "",
  productOrService: "",
  variables: Object.fromEntries(criteria.map(c => [c.id, { points: 0, justification: "", market: "", sources: ["", ""] }])),
  discussions: "",
  observations: "",
})

export default function ModeDetail() {
  const { modeId } = useParams()
  const modeName = useMemo(() => entryModes.find(m => modeSlug(m) === modeId), [modeId])
  const [store, setStore] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {}
    return { scores: {}, details: {} }
  })

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) }, [store])

  // Compute total before any early returns so hooks order stays consistent
  const total = useMemo(() => {
    return criteria.reduce((acc, c) => acc + Number(store.scores?.[modeName]?.[c.id] ?? 0), 0)
  }, [store, modeName])

  if (!modeName) {
    return (
      <div className="page">
        <p>Unknown entry mode.</p>
        <Link to="/">Back to Matrix</Link>
      </div>
    )
  }

  const details = store.details?.[modeName] || buildInitialDetails()

  const updateDetails = (updater) => {
    setStore(prev => ({
      ...prev,
      details: {
        ...(prev.details || {}),
        [modeName]: updater(prev.details?.[modeName] || buildInitialDetails()),
      },
    }))
  }

  const setPoints = (cid, val) => {
    const c = criterionById[cid]
    const n = Math.max(c.min, Math.min(c.max, Number(val) || 0))
    // update details and keep matrix overview in sync
    setStore(prev => ({
      ...prev,
      scores: {
        ...(prev.scores || {}),
        [modeName]: { ...(prev.scores?.[modeName] || {}), [cid]: n },
      },
      details: {
        ...(prev.details || {}),
        [modeName]: {
          ...(prev.details?.[modeName] || buildInitialDetails()),
          variables: {
            ...((prev.details?.[modeName] || buildInitialDetails()).variables),
            [cid]: {
              ...((prev.details?.[modeName] || buildInitialDetails()).variables[cid] || {}),
              points: n,
            },
          },
        },
      },
    }))
  }

  

  const addSource = (cid) => {
    updateDetails(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [cid]: { ...prev.variables[cid], sources: [...(prev.variables[cid].sources || []), ""] },
      },
    }))
  }

  const setSource = (cid, idx, value) => {
    updateDetails(prev => {
      const next = [...(prev.variables[cid].sources || [])]
      next[idx] = value
      return { ...prev, variables: { ...prev.variables, [cid]: { ...prev.variables[cid], sources: next } } }
    })
  }

  const removeSource = (cid, idx) => {
    updateDetails(prev => {
      const next = [...(prev.variables[cid].sources || [])]
      next.splice(idx, 1)
      return { ...prev, variables: { ...prev.variables, [cid]: { ...prev.variables[cid], sources: next } } }
    })
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ marginRight: 12 }}>{modeName}</h2>
        <Link to="/">Back to Matrix</Link>
        <div style={{ marginLeft: 'auto' }}>
          <strong>Total: {total}</strong>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <label>Name of the Company</label>
          <input
            value={details.companyName}
            onChange={e => updateDetails(prev => ({ ...prev, companyName: e.target.value }))}
            placeholder="e.g., ZENLUMINANCE"
          />
        </div>
        <div className="row">
          <label>Product or Service</label>
          <input
            value={details.productOrService}
            onChange={e => updateDetails(prev => ({ ...prev, productOrService: e.target.value }))}
            placeholder="Describe the product or service"
          />
        </div>
      </div>

      <div className="rubric card">
        <details>
          <summary>Rubric Guidance</summary>
          <ul>
            {rubricGuidance.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </details>
      </div>

      {criteria.map((c) => {
        const v = details.variables[c.id]
        return (
          <div className="card" key={c.id}>
            <h3 style={{ marginBottom: 10 }}>{c.label} <small>({c.min} to {c.max})</small></h3>
            <div className="row">
              <label>Points Given</label>
              <input type="number" value={v.points} min={c.min} max={c.max} step={1} onChange={(e) => setPoints(c.id, e.target.value)} />
            </div>
            <div className="row">
              <label>Justification</label>
              <textarea value={v.justification} onChange={(e) => updateDetails(prev => ({
                ...prev,
                variables: { ...prev.variables, [c.id]: { ...prev.variables[c.id], justification: e.target.value } },
              }))} rows={3} />
            </div>
            <div className="row">
              <label>Market Conditions</label>
              <textarea value={v.market} onChange={(e) => updateDetails(prev => ({
                ...prev,
                variables: { ...prev.variables, [c.id]: { ...prev.variables[c.id], market: e.target.value } },
              }))} rows={3} />
            </div>
            <div className="row">
              <label>Sources or Evidence</label>
              <div className="sources">
                {(v.sources || []).map((s, idx) => (
                  <div key={idx} className="source-row">
                    <input value={s} placeholder="URL or citation" onChange={(e) => setSource(c.id, idx, e.target.value)} />
                    <button type="button" onClick={() => removeSource(c.id, idx)}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => addSource(c.id)}>Add Source</button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="card">
        <div className="row">
          <label>Discussions</label>
          <textarea value={details.discussions} rows={4} onChange={(e) => updateDetails(prev => ({ ...prev, discussions: e.target.value }))} />
        </div>
        <div className="row">
          <label>Observations</label>
          <textarea value={details.observations} rows={4} onChange={(e) => updateDetails(prev => ({ ...prev, observations: e.target.value }))} />
        </div>
      </div>
    </div>
  )
}
