import { entryModes } from "./defaults"
import { modeSlug } from "./defaults"

const baseRubric = {
  advantages: `+5: Exceptional advantages; offer significant strategic benefits and competitive edge.
+3: Considerable advantages; contribute positively to achieving business goals.
+1: Moderate advantages; provide some benefit but not game-changing.
0: No real advantages; offers no particular benefit to the business.`,
  disadvantages: `0: No disadvantages; no apparent negative aspects. / Moderate risks; require attention but are generally balanced with opportunities.
-1: Minor disadvantages; easily manageable without significant impact.
-3: Significant disadvantages; require strategic planning to manage. / High risks; could potentially hinder success and require substantial mitigation strategies.
-5: Severe disadvantages; could critically hamper business success. / Extreme risks; could jeopardize the entire venture, requiring urgent and extensive mitigation.`,
  opportunities: `+5: Exceptional opportunities; can significantly transform the business.
+3: Significant opportunities; offer clear paths to market expansion and profit.
+1: Moderate opportunities; provide some potential for growth or improvement.
0: No opportunities; offers no growth or improvement potential.`,
  costs_time: `0: Minimal costs/resources needed; easily manageable within current capabilities. / Very quick; implementation can be achieved rapidly with minimal delays.
-1: Moderate costs/resources; require some investment but manageable. / Moderately quick; some delays expected but nothing significant.
-3: High costs/resources; significant investment needed, impacting financial planning. / Slow; implementation takes considerable time, causing potential market entry delays.
-5: Prohibitive costs/resources; excessively high, posing a serious financial challenge. / Very slow; excessively long implementation could significantly hinder market entry.`,
  legal_cultural_barriers: `0: No barriers; seamless integration into market without legal/cultural hindrances.
-1: Minor barriers; require some adjustments but not difficult to overcome.
-3: Significant barriers; pose considerable challenges, requiring substantial efforts.
-5: Severe barriers; extremely challenging, potentially preventing successful entry.`,
  legal_cultural_benefits: `+5: Exceptional benefits; significantly enhance the business strategy and operations.
+3: Considerable benefits; provide a strong supportive environment for business.
+1: Moderate benefits; offer some level of support or ease in operations.
0: No benefits; do not contribute to business strategy or ease of operations.`,
}

// Build a per-mode rubric map. Currently, the Excel rubrics are identical across sheets.
// If future sheets diverge, swap these with sheet-specific texts.
export const rubricsByMode = entryModes.reduce((acc, name) => {
  acc[modeSlug(name)] = { ...baseRubric }
  return acc
}, {})

