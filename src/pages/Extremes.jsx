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
import { maxSimApprox } from "../lib/sim";

function formatMoneyMillions(x) {
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

export default function Extremes({ data }) {
  const { stats, mini } = data;
  const [poolSize, setPoolSize] = useState(100000);
  const [trials, setTrials] = useState(500);

  const actualMax = useMemo(() => {
    const vals = mini
      .map((d) => d.finalWorth)
      .filter((x) => typeof x === "number" && Number.isFinite(x));
    return vals.length ? Math.max(...vals) : NaN;
  }, [mini]);

  const maxima = useMemo(() => {
    if (
      !stats ||
      typeof stats.log_mu !== "number" ||
      typeof stats.log_sigma !== "number"
    ) {
      return [];
    }

    try {
      return maxSimApprox(stats.log_mu, stats.log_sigma, poolSize, trials);
    } catch (e) {
      console.error("maxSimApprox failed:", e);
      return [];
    }
  }, [stats, poolSize, trials]);

  const sortedMaxima = useMemo(() => [...maxima].sort((a, b) => a - b), [maxima]);

  const summary = useMemo(() => {
    if (!maxima.length) {
      return {
        mean: NaN,
        median: NaN,
        p10: NaN,
        p90: NaN,
      };
    }
    return {
      mean: maxima.reduce((a, b) => a + b, 0) / maxima.length,
      median: percentile(sortedMaxima, 0.5),
      p10: percentile(sortedMaxima, 0.1),
      p90: percentile(sortedMaxima, 0.9),
    };
  }, [maxima, sortedMaxima]);

  const chartData = useMemo(() => {
    if (!maxima.length) return [];

    const numBins = 30;
    const min = Math.min(...maxima);
    const max = Math.max(...maxima);
    const binWidth = (max - min) / numBins || 1;

    const bins = Array.from({ length: numBins }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      center: min + (i + 0.5) * binWidth,
      count: 0,
    }));

    maxima.forEach((v) => {
      let idx = Math.floor((v - min) / binWidth);
      if (idx < 0) idx = 0;
      if (idx >= numBins) idx = numBins - 1;
      bins[idx].count += 1;
    });

    return bins.map((b) => ({
      x: b.center,
      count: b.count,
      label: `${formatMoneyMillions(b.binStart)} – ${formatMoneyMillions(b.binEnd)}`,
    }));
  }, [maxima]);

  const xTicks = useMemo(() => {
    return [summary.p10, summary.median, summary.p90, actualMax].filter((x) =>
      Number.isFinite(x)
    );
  }, [summary, actualMax]);

  return (
    <div>
      <h2>Extremes: The Wealth of the Maximum</h2>

      <p style={{ maxWidth: 950, lineHeight: 1.65 }}>
        This page studies the <strong>maximum</strong>: the richest individual you
        would expect to observe in a large population if wealth follows the fitted
        log-normal model. The key idea is simple: in a heavy-tailed system, larger
        populations naturally produce larger extremes.
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
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Model and equation</div>
        <div style={{ lineHeight: 1.8 }}>
          <code>{`X ~ LogNormal(μ, σ²)`}</code>
          <br />
          <code>{`M_N = max(X₁, X₂, ..., X_N)`}</code>
          <br />
          <code>{`P(M_N ≤ x) = [P(X ≤ x)]^N = [F(x)]^N`}</code>
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
          In words: the probability that the maximum is below some value <code>x</code>
          equals the probability that <em>every single draw</em> is below <code>x</code>.
          As <code>N</code> gets larger, that becomes less likely, so the maximum shifts upward.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Pool size N:</strong> {poolSize.toLocaleString()}
          <br />
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={poolSize}
            onChange={(e) => setPoolSize(Number(e.target.value))}
          />
        </label>

        <label>
          <strong>Trials:</strong> {trials}
          <br />
          <input
            type="range"
            min="100"
            max="1000"
            step="100"
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
          label="Actual max in dataset"
          value={formatMoneyMillions(actualMax)}
          subvalue="Observed richest billionaire"
        />
        <StatCard
          label="Average simulated max"
          value={formatMoneyMillions(summary.mean)}
          subvalue="Mean of simulated maxima"
        />
        <StatCard
          label="Median simulated max"
          value={formatMoneyMillions(summary.median)}
          subvalue="Middle simulated maximum"
        />
        <StatCard
          label="10th percentile"
          value={formatMoneyMillions(summary.p10)}
          subvalue="Lower end of simulated maxima"
        />
        <StatCard
          label="90th percentile"
          value={formatMoneyMillions(summary.p90)}
          subvalue="Upper end of simulated maxima"
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
              tickFormatter={(v) => formatMoneyMillions(v)}
            />
            <YAxis label={{ value: "Count of simulated maxima", angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value) => [value, "count"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
            />
            <Legend />
            <ReferenceLine
              x={summary.median}
              stroke="#2563eb"
              strokeWidth={2}
              label={{
                value: "Median simulated max",
                position: "top",
                fill: "#2563eb",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={summary.p10}
              stroke="#16a34a"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "10th pct",
                position: "top",
                fill: "#16a34a",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={summary.p90}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "90th pct",
                position: "top",
                fill: "#f59e0b",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={actualMax}
              stroke="#dc2626"
              strokeWidth={2}
              label={{
                value: "Actual max",
                position: "top",
                fill: "#dc2626",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" name="Simulated maximum wealth" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 18, maxWidth: 950 }}>
        <h3>How to read this graph</h3>
        <p style={{ lineHeight: 1.65 }}>
          Each bar shows how often a particular <strong>maximum wealth</strong> appeared
          across repeated simulations. In each trial, the app simulates a population
          of size <strong>N</strong>, draws wealth values from the fitted log-normal
          distribution, and records only the richest simulated individual.
        </p>

        <p style={{ lineHeight: 1.65 }}>
          The red line marks the richest billionaire actually observed in the dataset.
          The blue line marks the median simulated maximum, while the dashed lines mark
          the 10th and 90th percentiles. As <strong>N</strong> increases, the whole
          distribution shifts to the right: larger populations make extreme fortunes
          more likely.
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
        <strong>Interpretation:</strong> the richest person in a large system does
        not have to be a miraculous exception. In heavy-tailed distributions, very
        large outliers are mathematically expected. Scale alone increases the size
        of the maximum.
      </div>

      <div style={{ marginTop: 22, maxWidth: 950 }}>
        <h3>Why this matters for meritocracy</h3>
        <p style={{ lineHeight: 1.65 }}>
          Meritocracy narratives often focus on the most extreme success stories and
          treat them as proof of extraordinary merit. But this simulation shows that
          some extreme fortunes can emerge simply because the system is large and the
          wealth distribution has a heavy tail. That does not mean talent is irrelevant.
          It means the existence of a billionaire at the far extreme is not, by itself,
          evidence that the person is proportionally more meritorious than everyone else.
        </p>
      </div>
    </div>
  );
}