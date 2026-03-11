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

function percentile(sortedArr, p) {
  if (!sortedArr.length) return NaN;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  const w = idx - lo;
  return sortedArr[lo] * (1 - w) + sortedArr[hi] * w;
}

export default function Distribution({ data }) {
  const { mini } = data;
  const [field, setField] = useState("finalWorth");

  const values = useMemo(() => {
    return mini
      .map((d) => d[field])
      .filter((x) => typeof x === "number" && Number.isFinite(x))
      .sort((a, b) => a - b);
  }, [mini, field]);

  const stats = useMemo(() => {
    if (!values.length) {
      return {
        n: 0,
        min: NaN,
        max: NaN,
        mean: NaN,
        median: NaN,
        p90: NaN,
        p99: NaN,
        ratioMaxMedian: NaN,
      };
    }

    const n = values.length;
    const min = values[0];
    const max = values[n - 1];
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = percentile(values, 0.5);
    const p90 = percentile(values, 0.9);
    const p99 = percentile(values, 0.99);

    return {
      n,
      min,
      max,
      mean,
      median,
      p90,
      p99,
      ratioMaxMedian: max / median,
    };
  }, [values]);

  const chartData = useMemo(() => {
    if (!values.length) return [];

    const numBins = field === "finalWorth" ? 35 : 30;
    const min = values[0];
    const max = values[values.length - 1];
    const binWidth = (max - min) / numBins || 1;

    const bins = Array.from({ length: numBins }, (_, i) => {
      const start = min + i * binWidth;
      const end = start + binWidth;
      return {
        binStart: start,
        binEnd: end,
        center: start + binWidth / 2,
        count: 0,
      };
    });

    values.forEach((v) => {
      let idx = Math.floor((v - min) / binWidth);
      if (idx < 0) idx = 0;
      if (idx >= numBins) idx = numBins - 1;
      bins[idx].count += 1;
    });

    return bins.map((b) => ({
      x: b.center,
      count: b.count,
      label:
        field === "finalWorth"
          ? `${formatMoney(b.binStart)} – ${formatMoney(b.binEnd)}`
          : `${b.binStart.toFixed(2)} – ${b.binEnd.toFixed(2)}`,
    }));
  }, [values, field]);

  const xTicks = useMemo(() => {
    if (!values.length) return [];
    return field === "finalWorth"
      ? [stats.median, stats.p90, stats.max]
      : [stats.median, stats.mean, stats.p99];
  }, [values, field, stats]);

  return (
    <div>
      <h2>Wealth Distribution</h2>

      <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
        To understand whether extreme fortunes are surprising, we first need to
        understand the <strong>shape</strong> of billionaire wealth. If wealth is
        heavily skewed, then very large fortunes are not random miracles. They
        are a predictable feature of the system.
      </p>

      <div style={{ marginBottom: 18 }}>
        <label>
          <strong>View:</strong>{" "}
          <select value={field} onChange={(e) => setField(e.target.value)}>
            <option value="finalWorth">Raw wealth (finalWorth)</option>
            <option value="logWorth">Log wealth (logWorth)</option>
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          maxWidth: 950,
          marginBottom: 24,
        }}
      >
        <StatCard label="Billionaires" value={formatNumber(stats.n)} />
        <StatCard
          label={field === "finalWorth" ? "Median wealth" : "Median log-wealth"}
          value={field === "finalWorth" ? formatMoney(stats.median) : formatNumber(stats.median)}
        />
        <StatCard
          label={field === "finalWorth" ? "Mean wealth" : "Mean log-wealth"}
          value={field === "finalWorth" ? formatMoney(stats.mean) : formatNumber(stats.mean)}
        />
        <StatCard
          label={field === "finalWorth" ? "90th percentile" : "99th percentile"}
          value={
            field === "finalWorth"
              ? formatMoney(stats.p90)
              : formatNumber(stats.p99)
          }
        />
        <StatCard
          label={field === "finalWorth" ? "Maximum wealth" : "Maximum log-wealth"}
          value={field === "finalWorth" ? formatMoney(stats.max) : formatNumber(stats.max)}
        />
        {field === "finalWorth" && (
          <StatCard
            label="Max / median"
            value={`${formatNumber(stats.ratioMaxMedian)}×`}
          />
        )}
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
              tickFormatter={(v) =>
                field === "finalWorth" ? formatMoney(v) : formatNumber(v)
              }
            />
            <YAxis />
            <Tooltip
              formatter={(value) => [value, "count"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
            />
            <Legend />
            <ReferenceLine
              x={stats.median}
              stroke="#2563eb"
              strokeWidth={2}
              label={{
                value: "Median",
                position: "top",
                fill: "#2563eb",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={stats.mean}
              stroke="#dc2626"
              strokeWidth={2}
              label={{
                value: "Mean",
                position: "top",
                fill: "#dc2626",
                fontSize: 12,
              }}
            />
            {field === "finalWorth" && (
              <ReferenceLine
                x={stats.p90}
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
            )}
            <Bar dataKey="count" name="Number of billionaires" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {field === "finalWorth" ? (
        <>
          <p style={{ maxWidth: 900, marginTop: 18, lineHeight: 1.6 }}>
            In the raw wealth plot, most billionaires are concentrated near the
            left side of the chart, while a small number stretch far into the
            right tail. That is what a <strong>heavy-tailed distribution</strong>{" "}
            looks like. The mean sits to the right of the median because a few
            extremely large fortunes pull the average upward.
          </p>

          <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
            The most important number here is the gap between the middle and the
            extreme. In this dataset, the richest billionaire has about{" "}
            <strong>{formatNumber(stats.ratioMaxMedian)} times</strong> the
            wealth of the median billionaire. That makes “exceptional” fortunes
            look less like proof of exceptional merit and more like the natural
            outcome of a highly unequal distribution.
          </p>
        </>
      ) : (
        <>
          <p style={{ maxWidth: 900, marginTop: 18, lineHeight: 1.6 }}>
            On the log scale, the distribution spreads out and becomes much more
            interpretable. Instead of being crushed by a few gigantic fortunes,
            we can see the broader structure of billionaire wealth.
          </p>

          <p style={{ maxWidth: 900, lineHeight: 1.6 }}>
            This matters because log-wealth is often closer to a bell-shaped
            distribution. That suggests billionaire wealth may come from
            <strong> multiplicative processes</strong> like compounding,
            ownership growth, and winner-take-most markets. In systems like
            that, large outliers are not weird accidents. They are expected.
          </p>
        </>
      )}

      <div
        style={{
          marginTop: 22,
          padding: 16,
          background: "#f5f7fa",
          borderRadius: 10,
          maxWidth: 950,
          border: "1px solid #e5e7eb",
        }}
      >
        <strong>How to read this page:</strong> if the distribution were tight
        and symmetric, extreme billionaires would be genuinely shocking. But the
        distribution is skewed and heavy-tailed. That means the system itself
        generates huge outliers, which weakens the simple story that extreme
        wealth is just the reward for extreme merit.
      </div>
    </div>
  );
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