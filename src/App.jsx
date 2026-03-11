import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { loadAllData } from "./lib/loadData";

import Distribution from "./pages/Distribution";
import CLT from "./pages/CLT";
import Extremes from "./pages/Extremes";
import Likelihood from "./pages/Likelihood";
import Demographics from "./pages/Demographics";

export default function App() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    loadAllData().then(setData).catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 24 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 24 }}>Loading data…</div>;

  return (
    <HashRouter>
      <div className="background-gif" />
      <div className="background-overlay" />
    
      <div style={{ fontFamily: "system-ui", padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 6 }}>Meritocracy & Wealth</h1>
        <h2>A Probabilistic Investigation</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Billionaire wealth is heavy-tailed; averages stabilize (CLT), while extremes scale with population size.
        </p>

        <nav style={{ display: "flex", gap: 50, marginBottom: 18, fontSize: 25 }}>
          <Link to="/">Distribution</Link>
          <Link to="/clt">CLT</Link>
          <Link to="/demographics">Who becomes a billionaire?</Link>
          <Link to="/extremes">Extremes</Link>
          <Link to="/likelihood">Representation</Link>        </nav>

        <Routes>
          <Route path="/" element={<Distribution data={data} />} />
          <Route path="/clt" element={<CLT data={data} />} />
          <Route path="/demographics" element={<Demographics data={data} />} />
          <Route path="/extremes" element={<Extremes data={data} />} />
          <Route path="/likelihood" element={<Likelihood data={data} />} />
        </Routes>
      </div>
    </HashRouter>
  );
}