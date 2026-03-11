import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { cltSampleMeans } from "../lib/sim";

function formatMoney(x) {
  if (!Number.isFinite(x)) return "N/A";

  const dollars = x * 1_000_000;

  if (dollars >= 1e12) return `$${(dollars / 1e12).toFixed(2)}T`;
  if (dollars >= 1e9) return `$${(dollars / 1e9).toFixed(2)}B`;
  if (dollars >= 1e6) return `$${(dollars / 1e6).toFixed(1)}M`;

  return `$${Math.round(dollars).toLocaleString()}`;
}

function formatNumber(x) {
  if (!Number.isFinite(x)) return "N/A";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function std(arr) {
  if (!arr.length) return NaN;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return NaN;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  const w = idx - lo;
  return sortedArr[lo] * (1 - w) + sortedArr[hi] * w;
}

function StatCard({ label, value, subvalue }) {
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
      {subvalue ? (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{subvalue}</div>
      ) : null}
    </div>
  );
}

export default function CLT({ data }) {
  const { mini } = data;
  const [n, setN] = useState(30);
  const [trials, setTrials] = useState(2000);

  const wealth = useMemo(() => {
    return mini
      .map((d) => d.finalWorth)
      .filter((x) => typeof x === "number" && Number.isFinite(x));
  }, [mini]);

  const populationMean = useMemo(() => {
    if (!wealth.length) return NaN;
    return wealth.reduce((a, b) => a + b, 0) / wealth.length;
  }, [wealth]);

  const populationStd = useMemo(() => std(wealth), [wealth]);

  const means = useMemo(() => {
    if (!wealth.length) return [];
    return cltSampleMeans(wealth, n, trials);
  }, [wealth, n, trials]);

  const sortedMeans = useMemo(() => [...means].sort((a, b) => a - b), [means]);

  const sampleMeanStats = useMemo(() => {
    if (!means.length) {
      return {
        mean: NaN,
        std: NaN,
        p10: NaN,
        p90: NaN,
      };
    }
    return {
      mean: means.reduce((a, b) => a + b, 0) / means.length,
      std: std(means),
      p10: percentile(sortedMeans, 0.1),
      p90: percentile(sortedMeans, 0.9),
    };
  }, [means, sortedMeans]);

  const theoreticalSE = useMemo(() => {
    if (!Number.isFinite(populationStd) || !n) return NaN;
    return populationStd / Math.sqrt(n);
  }, [populationStd, n]);

  const chartData = useMemo(() => {
    if (!means.length) return [];

    const numBins = 35;
    const min = Math.min(...means);
    const max = Math.max(...means);
    const binWidth = (max - min) / numBins || 1;

    const bins = Array.from({ length: numBins }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      center: min + (i + 0.5) * binWidth,
      count: 0,
    }));

    means.forEach((v) => {
      let idx = Math.floor((v - min) / binWidth);
      if (idx < 0) idx = 0;
      if (idx >= numBins) idx = numBins - 1;
      bins[idx].count += 1;
    });

    return bins.map((b) => ({
      x: b.center,
      count: b.count,
      label: `${formatMoney(b.binStart)} – ${formatMoney(b.binEnd)}`,
    }));
  }, [means]);

  const xTicks = useMemo(() => {
    const ticks = [
      sampleMeanStats.p10,
      populationMean,
      sampleMeanStats.p90,
    ].filter((x) => Number.isFinite(x));
    return ticks;
  }, [sampleMeanStats, populationMean]);

  return (
    <div>
      <h2>CLT: Distribution of Sample Means</h2>

      <p style={{ maxWidth: 950, lineHeight: 1.65 }}>
        The <strong>Central Limit Theorem (CLT)</strong> says that if we repeatedly
        draw samples of size <strong>n</strong> from a population and compute their
        averages, then the distribution of those sample averages becomes more
        bell-shaped as <strong>n</strong> grows. This can happen even when the
        original data are highly skewed — which is exactly what we see with billionaire wealth.
      </p>

      <div
        style={{
          padding: 16,
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          maxWidth: 950,
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>CLT equation</div>
        <div style={{ lineHeight: 1.8 }}>
          <code>{`X̄ = (X₁ + X₂ + ... + Xₙ) / n`}</code>
          <br />
          <code>{`E[X̄] = μ`}</code>
          <br />
          <code>{`SD(X̄) = σ / √n`}</code>
          <br />
          <code>{`(X̄ - μ) / (σ / √n) → N(0,1)`}</code>
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
          In words: the average stays centered at the population mean <code>μ</code>,
          but its variability shrinks like <code>1/√n</code>. Larger samples produce
          more stable averages.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Sample size n:</strong> {n}
          <br />
          <input
            type="range"
            min="2"
            max="200"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>

        <label>
          <strong>Trials:</strong> {trials}
          <br />
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          maxWidth: 1000,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Population mean"
          value={formatMoney(populationMean)}
          subvalue="Mean billionaire wealth"
        />
        <StatCard
          label="Population SD"
          value={formatMoney(populationStd)}
          subvalue="Spread of individual wealth"
        />
        <StatCard
          label="Empirical mean of sample means"
          value={formatMoney(sampleMeanStats.mean)}
          subvalue="Should stay near μ"
        />
        <StatCard
          label="Empirical SD of sample means"
          value={formatMoney(sampleMeanStats.std)}
          subvalue="Observed spread across trials"
        />
        <StatCard
          label="Theoretical standard error"
          value={formatMoney(theoreticalSE)}
          subvalue="σ / √n"
        />
      </div>

      <div style={{ width: "100%", height: 520 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={xTicks}
              tickFormatter={(v) => formatMoney(v)}
            />
            <YAxis label={{ value: "Count of simulated sample means", angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value) => [value, "count"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
            />
            <Legend />
            <ReferenceLine
              x={populationMean}
              stroke="#dc2626"
              strokeWidth={2}
              label={{
                value: "Population mean μ",
                position: "top",
                fill: "#dc2626",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={sampleMeanStats.p10}
              stroke="#2563eb"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "10th pct",
                position: "top",
                fill: "#2563eb",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={sampleMeanStats.p90}
              stroke="#16a34a"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "90th pct",
                position: "top",
                fill: "#16a34a",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" name="Simulated sample means" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 18, maxWidth: 950 }}>
        <h3>How to read this graph</h3>
        <p style={{ lineHeight: 1.65 }}>
          Each bar shows how often a particular <strong>sample average</strong> appeared
          across repeated simulations. For each trial, the app randomly selects
          <strong> n billionaires</strong> from the dataset (with replacement), computes
          their average wealth, and records that average.
        </p>

        <p style={{ lineHeight: 1.65 }}>
          The red line marks the overall billionaire mean <strong>μ</strong>. The blue and
          green dashed lines mark the 10th and 90th percentiles of the simulated sample means.
          As <strong>n</strong> gets larger, the histogram should become tighter and more
          centered around the red line. That is the CLT in action.
        </p>
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
        <strong>Interpretation:</strong> individual billionaire wealth is extremely
        skewed and unequal, but averages are much more stable than individuals.
        This helps explain an important tension in capitalism: the system can look
        statistically regular in the aggregate while still producing dramatic inequality
        at the individual level.
      </div>

      <div style={{ marginTop: 22, maxWidth: 950 }}>
        <h3>Why this matters for meritocracy</h3>
        <p style={{ lineHeight: 1.65 }}>
          The CLT does not directly prove or disprove meritocracy. What it shows is
          that once we stop focusing on exceptional individuals and start looking at
          averages, the system becomes much more predictable. That is important because
          meritocracy narratives tend to emphasize outliers — the single billionaire,
          the singular genius, the exceptional success story. The CLT reminds us that
          individual extremes can be misleading, while aggregate patterns reveal the
          underlying structure much more clearly.
        </p>
      </div>
    </div>
  );
}