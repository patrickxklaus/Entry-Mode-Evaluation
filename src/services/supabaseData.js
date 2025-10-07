import supabase from "../config/supabaseClient"
import { criteria, entryModes } from "../data/defaults"

const handleSingle = async (query) => {
  const { data, error } = await query
  if (error) throw error
  return data
}

const handleMaybeSingle = async (query) => {
  const { data, error } = await query
  if (error) throw error
  return data ?? null
}

const normalizeKey = (value) =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? ""

const resolveEntryMode = (value) => {
  if (!value) return value
  const normalized = normalizeKey(value)
  return entryModes.find((mode) => normalizeKey(mode) === normalized) ?? value
}

const resolveCriterion = (value) => {
  if (!value) return value
  const normalized = normalizeKey(value)
  const match = criteria.find(
    (c) => normalizeKey(c.id) === normalized || normalizeKey(c.label) === normalized
  )
  return match?.label ?? value
}

const normalizeEvaluationPayload = (payload) => {
  const numericPoints = Number(payload.points)
  const safePoints = Number.isFinite(numericPoints) ? numericPoints : 0
  const safeSources = Array.isArray(payload.sources) ? payload.sources : []
  return {
    points: safePoints,
    justification: payload.justification ?? "",
    market_conditions: payload.market_conditions ?? "",
    sources: safeSources,
  }
}

export const createMatrix = async () => {
  return handleSingle(
    supabase
      .from("matrices")
      .insert([{}])
      .select()
      .single()
  )
}

export const getMatrixById = async (id) => {
  if (!id) return null
  return handleMaybeSingle(
    supabase
      .from("matrices")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle()
  )
}

export const updateMatrix = async (id, payload) => {
  if (!id) throw new Error("Matrix ID is required")
  return handleSingle(
    supabase
      .from("matrices")
      .update(payload)
      .eq("id", id)
      .select()
      .single()
  )
}

export const getEvaluationsForMatrix = async (matrixId) => {
  if (!matrixId) return []
  return handleSingle(
    supabase
      .from("evaluations")
      .select("id, mode, criterion, points, justification, market_conditions, sources, updated_at")
      .eq("matrix_id", matrixId)
  )
}

export const upsertEvaluation = async (matrixId, mode, criterion, payload) => {
  if (!matrixId) throw new Error("Matrix ID is required")
  if (!mode) throw new Error("mode is required")
  if (!criterion) throw new Error("criterion is required")

  const modeValue = resolveEntryMode(mode)
  const criterionValue = resolveCriterion(criterion)
  const normalizedPayload = normalizeEvaluationPayload(payload)

  const existing = await handleMaybeSingle(
    supabase
      .from("evaluations")
      .select("id")
      .eq("matrix_id", matrixId)
      .eq("mode", modeValue)
      .eq("criterion", criterionValue)
      .maybeSingle()
  )

  if (existing?.id) {
    return handleSingle(
      supabase
        .from("evaluations")
        .update(normalizedPayload)
        .eq("id", existing.id)
        .select()
        .single()
    )
  }

  return handleSingle(
    supabase
      .from("evaluations")
      .insert([
        {
          matrix_id: matrixId,
          mode: modeValue,
          criterion: criterionValue,
          ...normalizedPayload,
        },
      ])
      .select()
      .single()
  )
}

export const getModeNotesForMatrix = async (matrixId) => {
  if (!matrixId) return []
  return handleSingle(
    supabase
      .from("mode_notes")
      .select("id, matrix_id, mode, discussions, observations, updated_at")
      .eq("matrix_id", matrixId)
  )
}

export const upsertModeNote = async (matrixId, mode, payload) => {
  if (!matrixId) throw new Error("Matrix ID is required")
  if (!mode) throw new Error("mode is required")

  const modeValue = resolveEntryMode(mode)

  const existing = await handleMaybeSingle(
    supabase
      .from("mode_notes")
      .select("id")
      .eq("matrix_id", matrixId)
      .eq("mode", modeValue)
      .maybeSingle()
  )

  if (existing?.id) {
    return handleSingle(
      supabase
        .from("mode_notes")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single()
    )
  }

  return handleSingle(
    supabase
      .from("mode_notes")
      .insert([
        {
          matrix_id: matrixId,
          mode: modeValue,
          ...payload,
        },
      ])
      .select()
      .single()
  )
}
