import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Matrix from "./pages/Matrix"
import ModeDetail from "./pages/ModeDetail"
import SqlEnums from "./pages/SqlEnums"
import Rubric from "./pages/Rubric"
import { MatrixProvider } from "./context/MatrixContext"

function App() {
  return (
    <MatrixProvider>
      <BrowserRouter>
        <nav>
          <h1>Entry Mode Evaluation</h1>
          <Link to="/">Matrix</Link>
          <Link to="/sql">SQL Enums</Link>
          <Link to="/rubric">Rubric</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Matrix />} />
          <Route path="/mode/:modeId" element={<ModeDetail />} />
          <Route path="/sql" element={<SqlEnums />} />
          <Route path="/rubric" element={<Rubric />} />
        </Routes>
      </BrowserRouter>
    </MatrixProvider>
  );
}

export default App;
