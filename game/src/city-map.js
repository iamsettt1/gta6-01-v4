// Puerto Alba — High Water. Builds the whole city from a seed: districts,
// roads, buildings, props, water edges, the airstrip, the docks, the two
// bridges to Isla Faro, and the spawn points the game and the screenshots use.

import { G, CFG, DISTRICTS, WATER, ISLAND, BRIDGES, AIRSTRIP, DOCKS, BEACH, rectsOverlap, pointInWater, pointOnBridge } from './config.js';
import { mulberry32, rngRange, rngInt, rngPick, rngChance } from './random.js';

export function buildPuertoAlbaCity(state, seed) {
  const rng = mulberry32(seed);
  state.rng = rng;
  const city = {
    roadsV: [600, 1400, 2200, 3000, 3800, 4600, 5400],
    roadsH: [500, 1100, 1700, 2300, 2900, 3500],
    roadW: 96,
    buildings: [],
    props: [],
    palms: [],
    lamps: [],
    signs: [],
    parked: [],
    crates: [],
    spawn: { x: 1000, y: 800 },
    marinaSpawn: { x: 4600, y: 2600 },
    airstripSpawn: { x: 5200, y: 560 },
    islandSpawn: { x: 5200, y: 3350 },
    plaza: { x: 1000, y: 800, w: 420, h: 300 },
  };

  const blocked = [];
  for (const w of WATER) blocked.push({ ...w });
  blocked.push({ ...AIRSTRIP });
  blocked.push({ ...DOCKS });
  blocked.push({ x: 200, y: 3600, w: 1600, h: 200 }); // beach sand strip
  blocked.push({ ...city.plaza });
  // Keep the island's lighthouse clearing free of buildings.
  blocked.push({ x: 5050, y: 3150, w: 300, h: 260 });

  function nearRoad(x, y, w, h) {
    for (const rx of city.roadsV) {
      if (x < rx + city.roadW / 2 + 26 && x + w > rx - city.roadW / 2 - 26) return true;
    }
    for (const ry of city.roadsH) {
      if (y < ry + city.roadW / 2 + 26 && y + h > ry - city.roadW / 2 - 26) return true;
    }
    return false;
  }

  function clearOfBlocked(x, y, w, h) {
    const r = { x, y, w, h };
    for (const b of blocked) if (rectsOverlap(r, b)) return false;
    if (pointInWater(x + w / 2, y + h / 2) && !pointOnBridge(x + w / 2, y + h / 2)) return false;
    return true;
  }

  // Buildings: walk each district in a loose grid, keep the ones that fit.
  for (const d of DISTRICTS) {
    const cols = Math.max(3, Math.floor(d.w / 260));
    const rows = Math.max(2, Math.floor(d.h / 240));
    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        if (rngChance(rng, 0.18)) continue; // leave a yard, a car park, a gap
        const bw = rngRange(rng, 110, 200);
        const bh = rngRange(rng, 90, 170);
        const bx = d.x + 40 + ci * ((d.w - 80) / cols) + rngRange(rng, 0, 30);
        const by = d.y + 40 + ri * ((d.h - 80) / rows) + rngRange(rng, 0, 24);
        if (nearRoad(bx, by, bw, bh)) continue;
        if (!clearOfBlocked(bx, by, bw, bh)) continue;
        const shade = rngRange(rng, -18, 18);
        city.buildings.push({
          x: bx, y: by, w: bw, h: bh,
          district: d.id, color: shadeColor(d.roof, shade),
          roof: rngPick(rng, ['flat', 'tiled', 'tiled', 'flat', 'neon']),
          floors: rngInt(rng, 1, d.id === 'avenida' ? 6 : 3),
          sign: rngChance(rng, 0.3),
        });
      }
    }
  }

  // Props: palms along the beach and avenues, lamps on every corner, stalls
  // in Casco Viejo, crates and containers at the marina and Zona Franca.
  for (let i = 0; i < 90; i++) {
    const x = rngRange(rng, 240, 5800);
    const y = rngRange(rng, 240, 3700);
    if (pointInWater(x, y) || nearRoad(x, y, 20, 20)) continue;
    city.palms.push({ x, y, s: rngRange(rng, 0.8, 1.3) });
  }
  for (const rx of city.roadsV) {
    for (const ry of city.roadsH) {
      city.lamps.push({ x: rx + 62, y: ry - 62 });
      city.lamps.push({ x: rx - 62, y: ry + 62 });
    }
  }
  const stallNames = ['TACOS LUZ', 'CAFÉ ALBA', 'FLORES', 'PANADERÍA', 'FRUTA', 'EMPANADAS'];
  for (let i = 0; i < 14; i++) {
    city.props.push({ kind: 'stall', x: rngRange(rng, 300, 1700), y: rngRange(rng, 300, 1300), label: rngPick(rng, stallNames) });
  }
  for (let i = 0; i < 40; i++) {
    city.crates.push({ x: rngRange(rng, 3900, 5500), y: rngRange(rng, 1700, 2600), s: rngRange(rng, 18, 34), c: rngPick(rng, ['#c23a3a', '#37c8e8', '#e8b13d', '#7fae62']) });
  }
  for (let i = 0; i < 26; i++) {
    city.crates.push({ x: rngRange(rng, 3900, 5500), y: rngRange(rng, 300, 1300), s: rngRange(rng, 20, 40), c: rngPick(rng, ['#8a7a5a', '#5d7ea6', '#c28a4a']) });
  }
  // Marina containers in stacked rows, cranes above the docks.
  for (let i = 0; i < 18; i++) {
    city.props.push({ kind: 'container', x: 3950 + (i % 6) * 240, y: 1750 + Math.floor(i / 6) * 120, c: rngPick(rng, ['#c23a3a', '#37c8e8', '#e8b13d', '#4a7ec2']) });
  }
  for (let i = 0; i < 3; i++) {
    city.props.push({ kind: 'crane', x: 4200 + i * 560, y: 2050 });
  }
  // Lighthouse on Isla Faro, fountain in the Casco plaza.
  city.props.push({ kind: 'lighthouse', x: 5180, y: 3220 });
  city.props.push({ kind: 'fountain', x: 1000, y: 800 });
  city.props.push({ kind: 'runway', x: AIRSTRIP.x, y: AIRSTRIP.y, w: AIRSTRIP.w, h: AIRSTRIP.h });

  // District signage at street corners, original names only.
  const signSpots = [
    ['CASCO VIEJO', 640, 460], ['AVENIDA DEL SOL', 2240, 460], ['ZONA FRANCA', 3840, 460],
    ['BARRIO LUMEN', 640, 1740], ['LAS COLINAS', 2240, 1740], ['MARINA', 3840, 1740],
    ['PLAYA ALBA', 640, 2940], ['ISLA FARO', 4900, 3040],
  ];
  for (const [label, x, y] of signSpots) city.signs.push({ label, x, y });

  // Parked cars on every street, deterministic from the seed.
  const carColors = ['#e8b13d', '#4a7ec2', '#c23a3a', '#37c8e8', '#e8e8e8', '#7a8a6a', '#ffd21f', '#ff4fd8'];
  for (let i = 0; i < 64; i++) {
    const vertical = rngChance(rng, 0.5);
    let x, y, angle;
    if (vertical) {
      x = rngPick(rng, city.roadsV) + rngPick(rng, [-64, 64]);
      y = rngRange(rng, 300, 3600);
      angle = Math.PI / 2;
    } else {
      x = rngRange(rng, 300, 5700);
      y = rngPick(rng, city.roadsH) + rngPick(rng, [-64, 64]);
      angle = 0;
    }
    if (pointInWater(x, y)) continue;
    city.parked.push({ x, y, angle, color: rngPick(rng, carColors), cls: rngPick(rng, ['compact', 'sedan', 'suv', 'pickup', 'van']) });
  }

  state.city = city;
  return city;
}

export function shadeColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function buildingAt(state, x, y) {
  if (!state.city) return null;
  for (const b of state.city.buildings) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
  }
  return null;
}

export function collideWithBuildings(state, x, y, r) {
  if (!state.city) return false;
  for (const b of state.city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return null;
}

// ---- Harbour, beach and plaza dressing ----

export function harbourCranePositions(state) {
  return state.city.props.filter(p => p.kind === 'crane').map(c => ({ x: c.x, y: c.y }));
}

export function beachUmbrellaSpots(state) {
  const spots = [];
  for (let i = 0; i < 10; i++) {
    spots.push({ x: 300 + i * 150, y: 3680 + (i % 2) * 60, color: ['#ff5c5c', '#37c8e8', '#ffd21f', '#ff4fd8'][i % 4] });
  }
  return spots;
}

export function plazaFountainRipple(state, t) {
  return { x: 1000, y: 800, r: 60 + Math.sin(t * 2) * 8 };
}

export function airstripHangars(state) {
  return [
    { x: 4950, y: 380, w: 120, h: 90, color: '#7a6a55' },
    { x: 5150, y: 380, w: 120, h: 90, color: '#5d7ea6' },
    { x: 5350, y: 380, w: 120, h: 90, color: '#8a7a5a' },
  ];
}

export function marinaDockSlips(state) {
  const slips = [];
  for (let i = 0; i < 8; i++) {
    slips.push({ x: 4050 + i * 170, y: 2520, w: 120, h: 170, occupied: i < 3 });
  }
  return slips;
}

export function drawHarbourDetails(ctx, state, camX, camY) {
  ctx.save();
  for (const h of airstripHangars(state)) {
    ctx.fillStyle = h.color;
    ctx.fillRect(h.x - camX, h.y - camY, h.w, h.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(h.x - camX, h.y - camY, h.w, h.h);
  }
  for (const s of marinaDockSlips(state)) {
    ctx.fillStyle = s.occupied ? '#37c8e8' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(s.x - camX, s.y - camY, s.w, s.h);
  }
  for (const u of beachUmbrellaSpots(state)) {
    const sx = u.x - camX, sy = u.y - camY;
    if (sx < -60 || sx > 1340 || sy < -60 || sy > 860) continue;
    ctx.fillStyle = u.color;
    ctx.beginPath(); ctx.arc(sx, sy, 26, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 30); ctx.stroke();
  }
  ctx.restore();
}

export function cityBlockAt(state, x, y) {
  // Which road-grid cell is this point in? Used by traffic and the map.
  const city = state.city;
  let col = 0, row = 0;
  for (let i = 0; i < city.roadsV.length; i++) if (x > city.roadsV[i]) col = i + 1;
  for (let i = 0; i < city.roadsH.length; i++) if (y > city.roadsH[i]) row = i + 1;
  return { col, row };
}

// ---- Road network helpers and a simple route finder ----

export function nearestRoadPoint(state, x, y) {
  let best = null, bestD = Infinity;
  for (const rx of state.city.roadsV) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of state.city.roadsH) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best;
}

export function routeWaypoints(state, from, to) {
  // A simple L-shaped route along the road grid: horizontal, then vertical.
  const start = nearestRoadPoint(state, from.x, from.y);
  const end = nearestRoadPoint(state, to.x, to.y);
  const corner = { x: end.x, y: start.y };
  return [start, corner, end, to];
}

export function roadLength(state) {
  const city = state.city;
  const v = city.roadsV.length * CFG.WORLD_H;
  const h = city.roadsH.length * CFG.WORLD_W;
  return v + h;
}

export function junctionList(state) {
  const list = [];
  for (const rx of state.city.roadsV) {
    for (const ry of state.city.roadsH) {
      list.push({ x: rx, y: ry });
    }
  }
  return list;
}

export function nearestJunction(state, x, y) {
  let best = null, bestD = Infinity;
  for (const j of junctionList(state)) {
    const d = (j.x - x) * (j.x - x) + (j.y - y) * (j.y - y);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}
