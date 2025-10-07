import { useEffect, useState } from "react"
import supabase from "../config/supabaseClient"

const RPC_ENTRY_MODES = "get_entry_modes"
const RPC_CRITERIA = "get_evaluation_criteria"

export default function SqlEnums() {
  const [entryModes, setEntryModes] = useState([])
  const [criteria, setCriteria] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: modes, error: modesErr }, { data: crit, error: critErr }] =
          await Promise.all([
            supabase.rpc(RPC_ENTRY_MODES),
            supabase.rpc(RPC_CRITERIA),
          ])

        if (modesErr || critErr) {
          throw modesErr || critErr
        }

        if (!isMounted) return
        setEntryModes(Array.isArray(modes) ? modes : [])
        setCriteria(Array.isArray(crit) ? crit : [])
      } catch (err) {
        console.error("Failed to fetch enum values", err)
        if (isMounted) setError("Could not load enum values. Check Supabase RPC functions.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="page">
      <h2>Enum Values from Supabase</h2>
      {loading && <p>Loading enums…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <section>
            <h3>Entry Modes (`entry_mode` enum)</h3>
            {entryModes.length ? (
              <ul>
                {entryModes.map((mode) => (
                  <li key={mode}>{mode}</li>
                ))}
              </ul>
            ) : (
              <p>No values returned.</p>
            )}
          </section>

          <section>
            <h3>Evaluation Criteria (`evaluation_criterion` enum)</h3>
            {criteria.length ? (
              <ul>
                {criteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            ) : (
              <p>No values returned.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

