import { useMemo, useState } from "react";

function uniqueValues(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function formatPercent(x) {
  if (!Number.isFinite(x)) return "N/A";
  return `${(x * 100).toFixed(2)}%`;
}

function formatRatio(x) {
  if (!Number.isFinite(x)) return "N/A";
  return `${x.toFixed(2)}×`;
}

function formatMoneyMillions(x) {
  if (!Number.isFinite(x)) return "N/A";
  const dollars = x * 1_000_000;
  if (dollars >= 1e12) return `$${(dollars / 1e12).toFixed(2)}T`;
  if (dollars >= 1e9) return `$${(dollars / 1e9).toFixed(2)}B`;
  if (dollars >= 1e6) return `$${(dollars / 1e6).toFixed(1)}M`;
  return `$${Math.round(dollars).toLocaleString()}`;
}

function Card({ label, value, subvalue }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 16,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      {subvalue ? (
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{subvalue}</div>
      ) : null}
    </div>
  );
}

export default function Likelihood({ data }) {
  const { mini, populationShares } = data;

  const countries = useMemo(() => uniqueValues(mini.map((d) => d.country)), [mini]);
  const genders = useMemo(() => uniqueValues(mini.map((d) => d.gender)), [mini]);
  const statuses = useMemo(() => uniqueValues(mini.map((d) => d.status)), [mini]);
  const industries = useMemo(() => uniqueValues(mini.map((d) => d.industries)), [mini]);

  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");

  const total = mini.length;

  const filtered = useMemo(() => {
    return mini.filter((d) => {
      return (
        (!country || d.country === country) &&
        (!gender || d.gender === gender) &&
        (!status || d.status === status) &&
        (!industry || d.industries === industry)
      );
    });
  }, [mini, country, gender, status, industry]);

  const billionaireShare = total ? filtered.length / total : NaN;

  const avgWorth = useMemo(() => {
    const vals = filtered
      .map((d) => d.finalWorth)
      .filter((x) => typeof x === "number" && Number.isFinite(x));
    if (!vals.length) return NaN;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [filtered]);

  const populationShare = useMemo(() => {
    let share = 1;
    let usedAnyBaseline = false;

    if (country) {
      const c = populationShares?.country?.[country];
      if (!Number.isFinite(c)) return NaN;
      share *= c;
      usedAnyBaseline = true;
    }

    if (gender) {
      const g = populationShares?.gender?.[gender];
      if (!Number.isFinite(g)) return NaN;
      share *= g;
      usedAnyBaseline = true;
    }

    return usedAnyBaseline ? share : NaN;
  }, [country, gender, populationShares]);

  const representationRatio = useMemo(() => {
    if (!Number.isFinite(populationShare) || populationShare <= 0) return NaN;
    if (!Number.isFinite(billionaireShare)) return NaN;
    return billionaireShare / populationShare;
  }, [populationShare, billionaireShare]);

  const interpretation = useMemo(() => {
    if (!Number.isFinite(representationRatio)) return null;
    if (representationRatio > 1) {
      return "This profile is overrepresented among billionaires relative to its population share.";
    }
    if (representationRatio < 1) {
      return "This profile is underrepresented among billionaires relative to its population share.";
    }
    return "This profile is roughly proportionate to its population share.";
  }, [representationRatio]);

  return (
    <div>
      <h2>Representation Among Billionaires</h2>

      <p style={{ maxWidth: 950, lineHeight: 1.65 }}>
        This page asks: <strong>which profiles are overrepresented at the top?</strong>
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
        <div style={{ fontWeight: 700, marginBottom: 8 }}>What these numbers mean</div>
        <div style={{ lineHeight: 1.8 }}>
          <code>{`Billionaire share = P(profile | billionaire)`}</code>
          <br />
          <code>{`Population share = P(profile)`}</code>
          <br />
          <code>{`Representation ratio = P(profile | billionaire) / P(profile)`}</code>
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
          A ratio above 1 means the selected profile appears more often among billionaires than you would expect from its population share.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <label>
          Country
          <br />
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ width: "100%" }}>
            <option value="">Any</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label>
          Gender
          <br />
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: "100%" }}>
            <option value="">Any</option>
            {genders.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        <label>
          Status
          <br />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
            <option value="">Any</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "D" ? "D (self-made)" : s === "U" ? "U (inherited)" : s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Industry
          <br />
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ width: "100%" }}>
            <option value="">Any</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          maxWidth: 1000,
          marginBottom: 20,
        }}
      >
        <Card
          label="Matching billionaires"
          value={`${filtered.length.toLocaleString()} / ${total.toLocaleString()}`}
        />
        <Card
          label="Share among billionaires"
          value={formatPercent(billionaireShare)}
          subvalue="P(profile | billionaire)"
        />
        <Card
          label="Population share"
          value={Number.isFinite(populationShare) ? formatPercent(populationShare) : "N/A"}
          subvalue="Available when country and/or gender is selected"
        />
        <Card
          label="Representation ratio"
          value={formatRatio(representationRatio)}
          subvalue="Billionaire share ÷ population share"
        />
        <Card
          label="Average wealth in subgroup"
          value={formatMoneyMillions(avgWorth)}
          subvalue="Average billionaire wealth for the selected profile"
        />
      </div>

      <div
        style={{
          padding: 16,
          background: "#f5f7fa",
          borderRadius: 10,
          maxWidth: 950,
          border: "1px solid #e5e7eb",
          marginBottom: 18,
        }}
      >
        <strong>Interpretation:</strong>{" "}
        {interpretation ??
          "To compute a population comparison, select at least a country or a gender. Status and industry still describe billionaire composition, but this page does not have a population denominator for them."}
      </div>

      <div style={{ maxWidth: 950 }}>
        <h3>Why this matters for meritocracy</h3>
        <p style={{ lineHeight: 1.65 }}>
          If billionaire status were simply the result of individual merit, we would expect elite wealth to be distributed more proportionally across groups. Large representation gaps suggest that structure matters too: geography, gender, institutional access, and historical advantage all shape who reaches extreme wealth.
        </p>
      </div>
    </div>
  );
}