// Puerto Alba — High Water. Deterministic random numbers: one seeded stream
// builds the city, a second stream drives gameplay, so a screenshot seed
// always paints the same streets, the same parked cars, the same crowd.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRngFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return mulberry32(h >>> 0);
}

export function rngRange(rng, a, b) { return a + rng() * (b - a); }
export function rngInt(rng, a, b) { return Math.floor(rngRange(rng, a, b + 1)); }
export function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function rngChance(rng, p) { return rng() < p; }
export function rngSign(rng) { return rng() < 0.5 ? -1 : 1; }

// ---- More deterministic helpers ----

export function rngShuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rngWeightedPick(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng() * total;
  for (const [v, w] of entries) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

export function rngNormal(rng) {
  // Approximate a bell curve from three uniform draws.
  return (rng() + rng() + rng()) / 3;
}

export function rngColor(rng, palette) {
  return palette[Math.floor(rng() * palette.length)];
}

// ---- Seed utilities for the screenshot harness ----

export function seedFromDate(date) {
  return (date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate()) % 100000;
}

export function seedForScene(name) {
  const seeds = { heli: 11, race: 23, rifle: 37, garage: 41 };
  return seeds[name] || 7;
}

export function nextSeed(seed) {
  return (seed * 1103515245 + 12345) % 2147483648;
}

export function seedToString(seed) {
  return `alba-${seed}`;
}
