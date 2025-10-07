import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Matrix from "./pages/Matrix"
import ModeDetail from "./pages/ModeDetail"
import SqlEnums from "./pages/SqlEnums"
import { MatrixProvider } from "./context/MatrixContext"

function App() {
  return (
    <MatrixProvider>
      <BrowserRouter>
        <nav>
          <h1>Entry Mode Evaluation</h1>
          <Link to="/">Matrix</Link>
          <Link to="/sql">SQL Enums</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Matrix />} />
          <Route path="/mode/:modeId" element={<ModeDetail />} />
          <Route path="/sql" element={<SqlEnums />} />
        </Routes>
      </BrowserRouter>
    </MatrixProvider>
  );
}

export default App;
