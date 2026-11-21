// Puerto Alba — High Water. Pedestrians: about sixty people with simple
// routines — walking the sidewalks, fleeing gunfire, cowering at sirens,
// umbrella carriers in the rain. Density stays high near the player.

import { G, CFG, clamp } from './config.js';
import { rngRange, rngPick, rngChance } from './random.js';

export function spawnPedestrianCrowd(state, cx, cy, count) {
  const colors = ['#e8b13d', '#4a7ec2', '#c23a3a', '#37c8e8', '#7fae62', '#ff4fd8', '#e8e8e8', '#c28a4a'];
  for (let i = 0; i < count; i++) {
    const x = clamp(cx + rngRange(state.rng, -600, 600), 200, 5800);
    const y = clamp(cy + rngRange(state.rng, -500, 500), 200, 3600);
    state.peds.push({
      kind: 'ped', x, y, angle: rngRange(state.rng, 0, Math.PI * 2),
      speed: rngRange(state.rng, 30, 70), color: rngPick(state.rng, colors),
      state: 'walk', panic: 0, umbrella: state.weather === 'storm' && rngChance(state.rng, 0.5),
      homeX: x, homeY: y,
    });
  }
  return state.peds;
}

export function spawnAldanaRivals(state, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    state.peds.push({
      kind: 'ped', crew: 'aldana', x: cx + rngRange(state.rng, -160, 160), y: cy + rngRange(state.rng, -120, 120),
      angle: rngRange(state.rng, 0, Math.PI * 2), speed: 0, color: '#3a3a3a',
      state: 'stand', health: 60, mode: 'cover', think: 0, shotTimer: 1,
    });
  }
}

export function updatePedestrians(state, dt) {
  const p = state.player;
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    if (ped.crew === 'aldana') continue; // rivals are driven by combat-weapons.js
    const d = Math.hypot(p.x - ped.x, p.y - ped.y);
    if (ped.panic > 0) {
      ped.panic -= dt;
      ped.state = 'flee';
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(away) * 190 * dt;
      ped.y += Math.sin(away) * 190 * dt;
      ped.speed = 190;
    } else if (state.tracers.length > 0 && d < 400) {
      ped.state = 'flee';
      ped.panic = 2;
    } else if (p.wanted >= 2 && d < 300) {
      ped.state = 'cower';
    } else if (ped.state !== 'walk') {
      ped.state = 'walk';
    }
    if (ped.state === 'walk') {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      // Wander: drift back toward home turf, turn at random.
      if (Math.hypot(ped.x - ped.homeX, ped.y - ped.homeY) > 260 || rngChance(state.rng, 0.004)) {
        ped.angle = rngRange(state.rng, 0, Math.PI * 2);
      }
      ped.x = clamp(ped.x, 180, 5900);
      ped.y = clamp(ped.y, 180, 3750);
    }
  }
  // Keep the crowd dense near the player: top up when they wander off.
  const near = state.peds.filter(q => Math.hypot(q.x - p.x, q.y - p.y) < 800).length;
  if (near < 24 && state.peds.length < 70) {
    spawnPedestrianCrowd(state, p.x, p.y, 6);
  }
}

export function pedFleeFromGunfire(state, x, y) {
  for (const ped of state.peds) {
    if (ped.crew === 'aldana') continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < 420) { ped.state = 'flee'; ped.panic = 3; }
  }
}

// ---- Pedestrian routines: vendors, joggers, tourists ----

export function spawnStreetVendor(state, x, y) {
  state.peds.push({
    kind: 'ped', x, y, angle: 0, speed: 0, color: '#ff8a5c',
    state: 'stand', role: 'vendor', homeX: x, homeY: y,
  });
}

export function spawnJogger(state, x, y) {
  state.peds.push({
    kind: 'ped', x, y, angle: Math.random() * Math.PI * 2, speed: 150, color: '#7dff5c',
    state: 'walk', role: 'jogger', homeX: x, homeY: y,
  });
}

export function spawnTouristGroup(state, x, y) {
  for (let i = 0; i < 4; i++) {
    state.peds.push({
      kind: 'ped', x: x + (i % 2) * 40, y: y + Math.floor(i / 2) * 40,
      angle: 0, speed: 40, color: ['#e8e8e8', '#ffd21f', '#37c8e8', '#ff4fd8'][i],
      state: 'walk', role: 'tourist', homeX: x, homeY: y,
    });
  }
}

export function pedestrianMood(ped) {
  if (ped.state === 'flee') return 'terrified';
  if (ped.state === 'cower') return 'cowering';
  if (ped.role === 'vendor') return 'selling';
  if (ped.role === 'jogger') return 'running';
  if (ped.role === 'tourist') return 'sightseeing';
  return 'strolling';
}

// ---- Crowd events: the night market and the race crowd ----

export function nightMarketCrowd(state, cx, cy) {
  // The Barrio Lumen night market: thirty people between the stalls.
  spawnPedestrianCrowd(state, cx, cy, 30);
  spawnStreetVendor(state, cx - 100, cy - 60);
  spawnStreetVendor(state, cx + 120, cy + 40);
  return state.peds.length;
}

export function raceDayCrowd(state, cx, cy) {
  // The league crowd behind the barriers, twelve-plus strong.
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    state.peds.push({
      kind: 'ped', x: cx - 300 + i * 40, y: cy + side * 200,
      angle: 0, speed: 0, color: ['#e8b13d', '#4a7ec2', '#ff4fd8', '#7dff5c'][i % 4],
      state: 'stand', role: 'spectator', homeX: cx, homeY: cy,
    });
  }
  return 16;
}

export function crowdCheer(state) {
  for (const ped of state.peds) {
    if (ped.role === 'spectator' && Math.hypot(ped.x - state.player.x, ped.y - state.player.y) < 500) {
      ped.state = 'walk';
      ped.panic = 0;
    }
  }
}

export function crowdDensityAt(state, x, y, r) {
  return state.peds.filter(p => Math.hypot(p.x - x, p.y - y) < r).length;
}
