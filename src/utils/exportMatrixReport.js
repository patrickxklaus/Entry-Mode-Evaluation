import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { criteria, entryModes } from "../data/defaults"
import {
  getEvaluationsForMatrix,
  getMatrixById,
  getModeNotesForMatrix,
} from "../services/supabaseData"

const normalizeKey = (value) =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? ""

const buildEmptyEvaluation = () => ({
  points: 0,
  justification: "",
  market_conditions: "",
  sources: [],
})

const buildModeMap = () => {
  const out = {}
  for (const mode of entryModes) {
    out[mode] = {}
    for (const criterion of criteria) {
      out[mode][criterion.id] = buildEmptyEvaluation()
    }
  }
  return out
}

const createHelpers = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let cursorY = margin

  const ensureSpace = (height = 0) => {
    if (cursorY + height > pageHeight - margin) {
      doc.addPage()
      cursorY = margin
    }
  }

  const moveCursor = (amount) => {
    cursorY += amount
  }

  const addHeading = (text, level = 1) => {
    const sizeMap = { 1: 20, 2: 16, 3: 13, 4: 11 }
    const size = sizeMap[level] ?? 11
    ensureSpace(size + 6)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(size)
    doc.text(text, margin, cursorY)
    doc.setFont("helvetica", "normal")
    moveCursor(size + 6)
  }

  const addParagraph = (text, { spacing = 12, lineHeight = 14, placeholder = "—" } = {}) => {
    const content = text && text.toString().trim().length ? text.toString() : placeholder
    const maxWidth = pageWidth - margin * 2
    const lines = doc.splitTextToSize(content, maxWidth)
    ensureSpace(lines.length * lineHeight + spacing)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(lines, margin, cursorY)
    moveCursor(lines.length * lineHeight + spacing)
  }

  const addLabeledParagraph = (label, text, options = {}) => {
    const labelHeight = options.labelSpacing ?? 12
    ensureSpace(labelHeight)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`${label}:`, margin, cursorY)
    doc.setFont("helvetica", "normal")
    moveCursor(labelHeight)
    addParagraph(text, options)
  }

  const addBulletList = (label, items, { spacing = 12, lineHeight = 14 } = {}) => {
    ensureSpace(lineHeight)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`${label}:`, margin, cursorY)
    doc.setFont("helvetica", "normal")
    moveCursor(lineHeight)
    const content = Array.isArray(items) ? items.filter((item) => item && item.trim().length) : []
    if (!content.length) {
      addParagraph("—", { spacing, lineHeight })
      return
    }
    const maxWidth = pageWidth - margin * 2
    for (const item of content) {
      const lines = doc.splitTextToSize(`• ${item}`, maxWidth)
      ensureSpace(lines.length * lineHeight + 2)
      doc.text(lines, margin, cursorY)
      moveCursor(lines.length * lineHeight + 4)
    }
    moveCursor(spacing - 4)
  }

  const addTable = (options) => {
    ensureSpace(24)
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [18, 56, 95], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: 20 },
      ...options,
    })
    cursorY = doc.lastAutoTable.finalY + 16
    if (cursorY > pageHeight - margin) {
      doc.addPage()
      cursorY = margin
    }
  }

  const addHorizontalRule = () => {
    ensureSpace(12)
    const x2 = pageWidth - margin
    doc.setDrawColor(200)
    doc.line(margin, cursorY, x2, cursorY)
    moveCursor(12)
  }

  const finalize = (filename) => {
    doc.save(filename)
  }

  return {
    addHeading,
    addParagraph,
    addLabeledParagraph,
    addBulletList,
    addTable,
    addHorizontalRule,
    finalize,
  }
}

export const exportMatrixReport = async (matrixId) => {
  if (!matrixId) {
    throw new Error("A matrix ID is required to export the PDF.")
  }

  const [matrix, evaluationRows, modeNotesRows] = await Promise.all([
    getMatrixById(matrixId),
    getEvaluationsForMatrix(matrixId),
    getModeNotesForMatrix(matrixId),
  ])

  if (!matrix) {
    throw new Error("Matrix not found.")
  }

  const modeLookup = new Map(entryModes.map((mode) => [normalizeKey(mode), mode]))
  const criterionLookup = new Map()
  for (const criterion of criteria) {
    const normalizedId = normalizeKey(criterion.id)
    const normalizedLabel = normalizeKey(criterion.label)
    criterionLookup.set(normalizedId, criterion.id)
    criterionLookup.set(normalizedLabel, criterion.id)
  }

  const perMode = buildModeMap()

  for (const row of evaluationRows || []) {
    const modeName = modeLookup.get(normalizeKey(row.mode))
    const criterionId = criterionLookup.get(normalizeKey(row.criterion))
    if (!modeName || !criterionId) continue
    const target = perMode[modeName][criterionId] || buildEmptyEvaluation()
    const numericPoints = Number(row.points)
    target.points = Number.isFinite(numericPoints) ? numericPoints : 0
    target.justification = row.justification ?? ""
    target.market_conditions = row.market_conditions ?? ""
    target.sources = Array.isArray(row.sources) ? row.sources.filter(Boolean) : []
    perMode[modeName][criterionId] = target
  }

  const totals = {}
  for (const mode of entryModes) {
    let sum = 0
    for (const criterion of criteria) {
      const value = Number(perMode[mode][criterion.id]?.points ?? 0)
      const weight = Number(criterion.weight ?? 1)
      sum += value * weight
    }
    totals[mode] = sum
  }

  const ranked = [...entryModes].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))

  const modeNotesMap = new Map()
  for (const note of modeNotesRows || []) {
    const name = modeLookup.get(normalizeKey(note.mode))
    if (!name) continue
    modeNotesMap.set(name, {
      discussions: note.discussions ?? "",
      observations: note.observations ?? "",
    })
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const helpers = createHelpers(doc)

  helpers.addHeading("Entry Mode Evaluation Report", 1)
  helpers.addParagraph(`Matrix ID: ${matrix.id}`)

  helpers.addHeading("Project Overview", 2)
  helpers.addLabeledParagraph("Title", matrix.title)
  helpers.addLabeledParagraph("Country", matrix.country)
  helpers.addLabeledParagraph("Company", matrix.company_name)
  helpers.addLabeledParagraph("Product / Service", matrix.product_service)
  helpers.addLabeledParagraph(
    "Suggestion",
    matrix.suggestion_text,
    { placeholder: "No suggestion recorded.", spacing: 16 }
  )

  helpers.addHeading("Summary of Scores", 2)
  const tableHead = [
    "Entry Mode",
    ...criteria.map((c) => c.label),
    "Consolidated Score",
  ]
  const tableBody = entryModes.map((mode) => [
    mode,
    ...criteria.map((c) => {
      const value = Number(perMode[mode][c.id]?.points ?? 0)
      return Number.isFinite(value) ? value : 0
    }),
    Number.isFinite(totals[mode]) ? Number(totals[mode].toFixed(2)) : 0,
  ])
  helpers.addTable({
    head: [tableHead],
    body: tableBody,
  })

  helpers.addHeading("Ranking", 2)
  ranked.forEach((mode, index) => {
    const score = totals[mode] ?? 0
    helpers.addParagraph(`${index + 1}. ${mode} – ${score.toFixed(2)}`, { spacing: 6 })
  })

  helpers.addHeading("Mode Notes Summary", 2)
  entryModes.forEach((mode) => {
    const notes = modeNotesMap.get(mode) || { discussions: "", observations: "" }
    helpers.addHeading(mode, 3)
    helpers.addLabeledParagraph("Discussions", notes.discussions, { spacing: 8 })
    helpers.addLabeledParagraph("Observations", notes.observations, { spacing: 12 })
  })

  helpers.addHorizontalRule()
  helpers.addHeading("Detailed Evaluations", 2)

  entryModes.forEach((mode) => {
    const notes = modeNotesMap.get(mode) || { discussions: "", observations: "" }
    helpers.addHeading(`${mode}`, 2)
    helpers.addParagraph(`Total Score: ${totals[mode]?.toFixed(2) ?? "0.00"}`, { spacing: 10 })
    helpers.addLabeledParagraph("Discussions", notes.discussions, { spacing: 8 })
    helpers.addLabeledParagraph("Observations", notes.observations, { spacing: 12 })

    criteria.forEach((criterion) => {
      const data = perMode[mode][criterion.id] || buildEmptyEvaluation()
      helpers.addHeading(`${criterion.label} – Score ${Number(data.points ?? 0)}`, 3)
      helpers.addLabeledParagraph("Justification", data.justification, { spacing: 8 })
      helpers.addLabeledParagraph("Market Conditions", data.market_conditions, { spacing: 8 })
      helpers.addBulletList("Sources / Evidence", data.sources, { spacing: 12 })
    })
    helpers.addHorizontalRule()
  })

  helpers.finalize(`matrix-${matrixId}-report.pdf`)
}
