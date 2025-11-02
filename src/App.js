import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Matrix from "./pages/Matrix"
import ModeDetail from "./pages/ModeDetail"
import Rubric from "./pages/Rubric"
import Admin from "./pages/Admin"
import { MatrixProvider } from "./context/MatrixContext"

function App() {
  return (
    <MatrixProvider>
      <BrowserRouter>
        <nav>
          <div className="nav-inner">
            <h1>Entry Mode Evaluation</h1>
            <div className="nav-links">
              <Link to="/">Matrix</Link>
              <Link to="/rubric">Rubric</Link>
              <Link to="/admin">Admin</Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Matrix />} />
          <Route path="/mode/:modeId" element={<ModeDetail />} />
          <Route path="/rubric" element={<Rubric />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </MatrixProvider>
  );
}

export default App;
