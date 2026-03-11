// Simple RNG helpers (uses Math.random; fine for demo)
export function sampleWithReplacement(arr, n) {
  const out = new Array(n);
  const L = arr.length;
  for (let i = 0; i < n; i++) out[i] = arr[Math.floor(Math.random() * L)];
  return out;
}

export function mean(arr) {
  let s = 0;
  for (const x of arr) s += x;
  return s / arr.length;
}

// CLT: distribution of sample means from empirical billionaire wealth
export function cltSampleMeans(values, sampleSize, trials) {
  const means = new Array(trials);
  const L = values.length;

  for (let t = 0; t < trials; t++) {
    let s = 0;
    for (let i = 0; i < sampleSize; i++) {
      s += values[Math.floor(Math.random() * L)];
    }
    means[t] = s / sampleSize;
  }
  return means;
}

// Box-Muller normal generator
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Lognormal draw using mu/sigma in log-space
export function drawLogNormal(mu, sigma) {
  return Math.exp(mu + sigma * randn());
}

// Extreme wealth sim: max of N lognormal draws, repeated trials times.
// WARNING: can't literally draw N=1e8. Use a cap + approximation strategy.
// export function maxSimApprox(mu, sigma, poolSize, trials, perTrialDrawCap = 200000) {
//   // Strategy: if poolSize <= cap, simulate directly.
//   // If poolSize > cap, simulate cap draws and then "inflate" using repeated batches
//   // (still approximate). Better version: precompute in Python, but this is usable.

//   const maxima = new Array(trials);
//   const cap = Math.min(poolSize, perTrialDrawCap);
//   const batches = Math.ceil(poolSize / cap);

//   for (let t = 0; t < trials; t++) {
//     let m = 0;
//     for (let b = 0; b < batches; b++) {
//       let localMax = 0;
//       for (let i = 0; i < cap; i++) {
//         const x = drawLogNormal(mu, sigma);
//         if (x > localMax) localMax = x;
//       }
//       if (localMax > m) m = localMax;
//     }
//     maxima[t] = m;
//   }

//   return maxima;
// }
// export function maxSimApprox(mu, sigma, poolSize, trials) {
//   const maxima = [];

//   for (let t = 0; t < trials; t++) {
//     let m = 0;
//     for (let i = 0; i < poolSize; i++) {
//       const x = drawLogNormal(mu, sigma);
//       if (x > m) m = x;
//     }
//     maxima.push(m);
//   }

//   return maxima;
// }

export function maxSimApprox(mu, sigma, poolSize, trials) {
  const maxima = [];

  // Instead of drawing poolSize samples exactly,
  // draw a much smaller representative sample and scale intuition visually.
  const effectiveSize = Math.min(poolSize, 5000);

  for (let t = 0; t < trials; t++) {
    let m = 0;
    for (let i = 0; i < effectiveSize; i++) {
      const x = drawLogNormal(mu, sigma);
      if (x > m) m = x;
    }
    maxima.push(m);
  }

  return maxima;
}