import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

function formatMoney(x) {
  if (!Number.isFinite(x)) return "N/A";
  if (x >= 1e12) return `$${(x / 1e12).toFixed(2)}T`;
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  return `$${Math.round(x).toLocaleString()}`;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function gini(values) {
  const arr = values
    .filter((x) => Number.isFinite(x) && x >= 0)
    .sort((a, b) => a - b);

  const n = arr.length;
  if (n === 0) return 0;

  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;

  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * arr[i];
  }

  return (2 * weightedSum) / (n * sum) - (n + 1) / n;
}

function lorenzCurve(values, numPoints = 100) {
  const arr = values
    .filter((x) => Number.isFinite(x) && x >= 0)
    .sort((a, b) => a - b);

  const n = arr.length;
  if (n === 0) return [];

  const total = arr.reduce((a, b) => a + b, 0);
  let running = 0;

  const raw = [{ populationShare: 0, wealthShare: 0 }];
  for (let i = 0; i < n; i++) {
    running += arr[i];
    raw.push({
      populationShare: (i + 1) / n,
      wealthShare: total === 0 ? 0 : running / total,
    });
  }

  if (raw.length <= numPoints) {
    return raw.map((d) => ({
      ...d,
      popPct: +(d.populationShare * 100).toFixed(1),
      wealthPct: +(d.wealthShare * 100).toFixed(1),
      equalityPct: +(d.populationShare * 100).toFixed(1),
    }));
  }

  const step = Math.ceil(raw.length / numPoints);
  const sampled = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);

  return sampled.map((d) => ({
    ...d,
    popPct: +(d.populationShare * 100).toFixed(1),
    wealthPct: +(d.wealthShare * 100).toFixed(1),
    equalityPct: +(d.populationShare * 100).toFixed(1),
  }));
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 14,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const PIE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];

export default function Demographics({ data }) {
  const { mini } = data;

  const wealthValues = useMemo(
    () =>
      mini
        .map((d) => d.finalWorth)
        .filter((x) => typeof x === "number" && Number.isFinite(x) && x >= 0),
    [mini]
  );

  const genderData = useMemo(() => {
    return countBy(mini, (d) => d.gender).sort((a, b) => b.value - a.value);
  }, [mini]);

  const statusData = useMemo(() => {
    return countBy(mini, (d) => d.status)
      .map((d) => ({
        ...d,
        label:
          d.name === "D"
            ? "Self-made"
            : d.name === "U"
            ? "Inherited / unearned"
            : d.name,
      }))
      .sort((a, b) => b.value - a.value);
  }, [mini]);

  const topCountries = useMemo(() => {
    return countBy(mini, (d) => d.country)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [mini]);

  const giniValue = useMemo(() => gini(wealthValues), [wealthValues]);
  const lorenzData = useMemo(() => lorenzCurve(wealthValues, 120), [wealthValues]);

  const totalWealth = useMemo(
    () => wealthValues.reduce((a, b) => a + b, 0),
    [wealthValues]
  );

  const top10Share = useMemo(() => {
    const arr = [...wealthValues].sort((a, b) => b - a);
    const k = Math.max(1, Math.floor(arr.length * 0.1));
    const top = arr.slice(0, k).reduce((a, b) => a + b, 0);
    return totalWealth === 0 ? 0 : top / totalWealth;
  }, [wealthValues, totalWealth]);

  return (
    <div>
      <h2>Who Becomes a Billionaire?</h2>

      <p style={{ maxWidth: 950, lineHeight: 1.6 }}>
        A pure meritocracy story would predict that extreme wealth is broadly
        accessible and roughly proportional to talent wherever it appears.
        But billionaire wealth is not just concentrated in magnitude — it is
        concentrated across <strong>gender</strong>, <strong>country</strong>,
        and <strong>inheritance status</strong>. These patterns suggest that
        structure matters alongside individual effort.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          maxWidth: 950,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total billionaires" value={mini.length.toLocaleString()} />
        <StatCard label="Gini coefficient" value={giniValue.toFixed(3)} />
        <StatCard label="Top 10% wealth share" value={`${(top10Share * 100).toFixed(1)}%`} />
        <StatCard
          label="Total billionaire wealth"
          value={formatMoney(totalWealth)}
        />
      </div>

      <h3>Gender distribution</h3>
      <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
        If billionaire status were simply the reward for merit, we would expect
        less demographic concentration. A heavily imbalanced gender breakdown
        suggests that access to capital, networks, and institutional opportunity
        are unevenly distributed.
      </p>

      <div style={{ width: "100%", height: 360, marginBottom: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={genderData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" name="Number of billionaires" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>Self-made vs inherited</h3>
      <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
        “Self-made” is often treated as proof of merit. But even that category
        exists inside unequal systems: education, capital access, geography,
        labor markets, and family background still shape who gets the chance to
        build wealth at scale.
      </p>

      <div style={{ width: "100%", height: 360, marginBottom: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label={({ label, percent }) =>
                `${label}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {statusData.map((entry, index) => (
                <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h3>Top countries by billionaire count</h3>
      <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
        Billionaires are not evenly distributed across the world. They cluster in
        specific national systems with strong capital markets, property regimes,
        and institutional support for wealth concentration. That pattern is hard
        to square with a story where merit alone determines outcomes.
      </p>

      <div style={{ width: "100%", height: 420, marginBottom: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topCountries}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip />
            <Bar dataKey="value" name="Number of billionaires" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>Lorenz curve of billionaire wealth</h3>
      <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
        The Lorenz curve shows how concentrated wealth is within the billionaire
        class itself. The diagonal line represents perfect equality. The more the
        actual curve bends below that line, the more unequal the distribution.
        The <strong>Gini coefficient</strong> summarizes that inequality on a
        scale from 0 (perfect equality) to 1 (maximum concentration).
      </p>

      <div style={{ width: "100%", height: 420, marginBottom: 18 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lorenzData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="popPct"
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => [
                `${value}%`,
                name === "wealthPct" ? "Cumulative wealth share" : "Equality line",
              ]}
              labelFormatter={(label) => `Bottom ${label}% of billionaires`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="equalityPct"
              stroke="#9ca3af"
              dot={false}
              name="Perfect equality"
            />
            <Line
              type="monotone"
              dataKey="wealthPct"
              stroke="#dc2626"
              strokeWidth={3}
              dot={false}
              name="Actual wealth share"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: "#f5f7fa",
          borderRadius: 10,
          maxWidth: 950,
          border: "1px solid #e5e7eb",
          
        }}
      >
        <strong>Interpretation:</strong> the farther the Lorenz curve sits below
        the equality line, the more a small elite dominates total wealth. A high
        Gini coefficient within billionaires shows that even among the ultra-rich,
        wealth is concentrated into a much smaller inner circle. That weakens the
        idea that top fortunes simply reflect a smooth ranking of merit.
      </div>
    </div>
  );
}