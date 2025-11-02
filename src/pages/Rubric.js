import "./Rubric.css"
import { rubricBands } from "../data/rubricBands"

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
        {rubricBands.map((band) => (
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
