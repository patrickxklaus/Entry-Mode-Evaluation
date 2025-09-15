import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Matrix from "./pages/Matrix"
import ModeDetail from "./pages/ModeDetail"

function App() {
  return (
    <BrowserRouter>
      <nav>
        <h1>Entry Mode Evaluation</h1>
        <Link to="/">Matrix</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Matrix />} />
        <Route path="/mode/:modeId" element={<ModeDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
