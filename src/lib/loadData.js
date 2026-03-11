const base = import.meta.env.BASE_URL;

export async function loadAllData() {
  const urls = [
    `${base}data/billionaires_clean.json`,
    `${base}data/stats.json`,
    `${base}data/histograms.json`,
    `${base}data/population_shares.json`,
  ];

  const responses = await Promise.all(urls.map((u) => fetch(u)));

  responses.forEach((r, i) => {
    if (!r.ok) {
      throw new Error(`Failed to load ${urls[i]}: ${r.status} ${r.statusText}`);
    }
  });

  const [mini, stats, hists, populationShares] = await Promise.all(
    responses.map((r) => r.json())
  );

  return { mini, stats, hists, populationShares };
}