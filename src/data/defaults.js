export const criteria = [
  {
    id: "advantages",
    label: "Advantages",
    min: 0,
    max: 5,
    weight: 1,
  },
  {
    id: "disadvantages",
    label: "Disadvantages / Risks",
    min: -5,
    max: 0,
    weight: 1,
  },
  {
    id: "opportunities",
    label: "Opportunities",
    min: 0,
    max: 5,
    weight: 1,
  },
  {
    id: "costs_time",
    label: "Costs, Resources & Implementation Time",
    min: -5,
    max: 0,
    weight: 1,
  },
  {
    id: "legal_cultural_barriers",
    label: "Legal/Cultural Barriers",
    min: -5,
    max: 0,
    weight: 1,
  },
  {
    id: "legal_cultural_benefits",
    label: "Legal/Cultural Benefits",
    min: 0,
    max: 5,
    weight: 1,
  },
]

export const entryModes = [
  "Direct Export",
  "Indirect Export",
  "Franchising",
  "Joint Ventures",
  "FDI",
  "Strategic Alliances",
  "Licensing",
  "Multilatinas",
]

export const criterionById = Object.fromEntries(criteria.map(c => [c.id, c]))

export const rubricGuidance = [
  "Score +4: Optimal Strategy – exceptionally suited; strong advantages, minimal risks.",
  "Score +3 to +4: Very Strong – numerous advantages and opportunities; manageable risks.",
  "Score +2 to +3: Suitable – clear advantages; moderate risks; viable with care.",
  "Score +1 to +2: Moderately Suitable – benefits with notable challenges; plan mitigation.",
  "Score 0 to +1: Marginally Suitable – limited benefits; considerable risks.",
  "Score -1 to -2: Problematic – risks outweigh advantages; less recommendable.",
  "Score -2 to -3: Highly Problematic – serious flaws; likely discard.",
  "Score -3 to -4: Extremely Inadequate – unsuitable; avoid in most cases.",
  "Score -4 or below: Completely Inadequate – discard as a viable option.",
]

export const modeSlug = (name) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

