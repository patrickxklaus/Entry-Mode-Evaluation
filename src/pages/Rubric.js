import "./Rubric.css"

const bands = [
  {
    title: "Score +4 · Optimal Strategy",
    description:
      "Exceptionally suited for the company and target market. Every criterion aligns perfectly, offering significant advantages, minimal risks, and outstanding opportunities.",
    implication:
      "Highly recommended. Expect optimal results with strong strategic fit.",
    tone: "success",
    range: "+4",
  },
  {
    title: "Score +3 to +4 · Very Strong Strategy",
    description:
      "Robust strategy with numerous advantages and opportunities. Risks are manageable and disadvantages minimal.",
    implication:
      "A highly viable option with strong potential for success.",
    tone: "positive",
    range: "+3 to +4",
  },
  {
    title: "Score +2 to +3 · Suitable Strategy",
    description:
      "Adequate strategy with several clear advantages. Risks are moderate and opportunities good.",
    implication:
      "Viable option that can succeed with attentive risk management.",
    tone: "neutralPositive",
    range: "+2 to +3",
  },
  {
    title: "Score +1 to +2 · Moderately Suitable",
    description:
      "Offers benefits alongside notable challenges. Risks and disadvantages are significant.",
    implication:
      "Proceed with caution—requires careful planning and mitigation.",
    tone: "softNeutral",
    range: "+1 to +2",
  },
  {
    title: "Score 0 to +1 · Marginally Suitable",
    description:
      "Benefits are limited and balanced by considerable risks and disadvantages.",
    implication:
      "Viable only with reservations. Perform a detailed assessment before committing.",
    tone: "softNeutral",
    range: "0 to +1",
  },
  {
    title: "Score -1 to -2 · Problematic Strategy",
    description:
      "Risks and disadvantages outweigh advantages. Significant issues must be addressed.",
    implication:
      "Less recommendable option that demands major adjustments.",
    tone: "caution",
    range: "-1 to -2",
  },
  {
    title: "Score -2 to -3 · Highly Problematic",
    description:
      "Serious flaws with high risks and scarce advantages.",
    implication:
      "Strongly reconsider or discard this approach.",
    tone: "warning",
    range: "-2 to -3",
  },
  {
    title: "Score -3 to -4 · Extremely Inadequate",
    description:
      "Almost wholly unsuitable. Risks are extremely high and opportunities minimal.",
    implication:
      "Avoid in most cases; pursuing this path is unlikely to succeed.",
    tone: "danger",
    range: "-3 to -4",
  },
  {
    title: "Score -4 or Below · Completely Inadequate",
    description:
      "Entirely unsuitable. Critical risks, no substantive advantages.",
    implication:
      "Discard as a viable option.",
    tone: "dangerStrong",
    range: "-4 or below",
  },
]

export default function Rubric() {
  return (
    <div className="page rubric-page">
      <header className="rubric-hero">
        <h2>Internationalization Strategy Rubric</h2>
        <p>
          Use these guardrails to interpret consolidated scores. Each band combines
          quantitative thresholds with qualitative guidance so teams can discuss the “why”
          behind a number.
        </p>
      </header>

      <section className="rubric-grid">
        {bands.map((band) => (
          <article key={band.title} className={`rubric-card rubric-${band.tone}`}>
            <div className="rubric-range">{band.range}</div>
            <h3>{band.title}</h3>
            <p className="rubric-description">{band.description}</p>
            <p className="rubric-implication"><strong>Implication:</strong> {band.implication}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

