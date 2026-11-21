// Puerto Alba — High Water. The wanted system: one to five stars, escalation
// by crimes witnessed, and a response that grows with the level — foot
// officers, patrol cars, interceptors and roadblocks, police boats on the
// water, and a helicopter at five stars. Lose the heat by breaking line of
// sight, repainting, or bribing on the phone.

import { G, CFG, clamp } from './config.js';
import { rngRange, rngPick } from './random.js';

export function raiseWantedLevel(state, stars, reason) {
  const p = state.player;
  const before = p.wanted;
  p.wanted = clamp(p.wanted + stars, 0, CFG.MAX_WANTED);
  p.heat = 1;
  if (p.wanted > before) {
    state.message = `WANTED ${'★'.repeat(p.wanted)} — ${reason || 'the police are coming'}`;
    state.messageTimer = 4;
    spawnPoliceResponse(state);
  }
  return p.wanted;
}

export function clearWantedLevel(state, how) {
  state.player.wanted = 0;
  state.player.heat = 0;
  state.police = state.police.filter(c => !c.isPolice);
  state.message = `Heat cleared — ${how}.`;
  state.messageTimer = 3;
}

export function spawnPoliceResponse(state) {
  const w = state.player.wanted;
  const p = state.player;
  const wantCars = w >= 2 ? Math.min(w, 4) : 0;
  const wantFoot = w === 1 ? 2 : w >= 3 ? 3 : 1;
  for (let i = 0; i < wantCars; i++) {
    if (state.police.length > 8) break;
    state.police.push({
      kind: 'police-car', isPolice: true, x: p.x + rngRange(state.rng, -700, 700), y: p.y + rngRange(state.rng, -700, 700),
      angle: 0, speed: 0, top: w >= 3 ? 660 : 560, color: '#2a2a3a', siren: 0, roadblock: w >= 3 && i === 0,
    });
  }
  for (let i = 0; i < wantFoot; i++) {
    state.police.push({
      kind: 'officer', isPolice: true, x: p.x + rngRange(state.rng, -300, 300), y: p.y + rngRange(state.rng, -300, 300),
      angle: 0, speed: 0, color: '#20242e',
    });
  }
  if (w >= 4 && state.player.vehicle && state.player.vehicle.kind === 'boat') {
    state.police.push({
      kind: 'police-boat', isPolice: true, x: p.x + 400, y: p.y + 300, angle: 0, speed: 0, top: 560, color: '#20242e',
    });
  }
}

export function updatePolicePursuit(state, dt) {
  const p = state.player;
  if (p.wanted <= 0) {
    // Stragglers drift away once the heat dies.
    for (const c of state.police) { c.speed = Math.max(0, c.speed - 200 * dt); }
    return;
  }
  // Heat decays only while no police can see the player.
  let seen = false;
  for (const c of state.police) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < 620) seen = true;
    if (c.kind === 'police-car' || c.kind === 'police-boat') {
      const dx = p.x - c.x, dy = p.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      const want = Math.atan2(dy, dx);
      let diff = want - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
      c.speed = Math.min(c.top, c.speed + 380 * dt);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.siren += dt * 6;
      if (d < 70 && p.vehicle) {
        p.vehicle.health = (p.vehicle.health ?? 100) - 8 * dt;
        state.shake = Math.max(state.shake, 4);
      }
      if (d < 60 && p.onFoot) {
        p.health -= 10 * dt;
        if (p.health <= 0) bustPlayer(state);
      }
    } else if (c.kind === 'officer') {
      const dx = p.x - c.x, dy = p.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      c.x += (dx / dd) * 150 * dt;
      c.y += (dy / dd) * 150 * dt;
      if (dd < 46 && p.onFoot) {
        // Busted: arrest, cash penalty, respawn at the precinct.
        bustPlayer(state);
      }
    }
  }
  if (!seen) {
    p.heat -= dt / 14;
    if (p.heat <= 0) {
      p.wanted = 0;
      state.message = 'You lost the heat.';
      state.messageTimer = 3;
    }
  } else {
    p.heat = Math.min(1, p.heat + dt / 20);
  }
}

export function bustPlayer(state) {
  const fine = Math.min(state.player.cash, 200);
  state.player.cash -= fine;
  state.player.health = 100;
  state.player.wanted = 0;
  state.player.x = 1000;
  state.player.y = 800;
  state.player.vehicle = null;
  state.player.onFoot = true;
  state.screen = 'busted';
  state.bustedFine = fine;
  state.police = [];
}

export function wastePlayer(state) {
  const fine = Math.min(state.player.cash, 300);
  state.player.cash -= fine;
  state.player.health = 100;
  state.player.armor = 0;
  state.player.wanted = 0;
  state.player.x = 1000;
  state.player.y = 800;
  state.player.vehicle = null;
  state.player.onFoot = true;
  state.screen = 'wasted';
  state.wastedFine = fine;
  state.police = [];
}

export function bribePoliceOnPhone(state) {
  const cost = 150 * Math.max(1, state.player.wanted);
  if (state.player.wanted === 0) { state.message = 'No heat to bribe away.'; state.messageTimer = 2; return false; }
  if (state.player.cash < cost) { state.message = `Bribe costs $${cost} — not enough cash.`; state.messageTimer = 3; return false; }
  state.player.cash -= cost;
  clearWantedLevel(state, `bribe paid ($${cost})`);
  return true;
}

export function drawPoliceCar(ctx, car, camX, camY, t) {
  const sx = car.x - camX, sy = car.y - camY;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  ctx.fillStyle = '#20242e';
  ctx.fillRect(-42, -20, 84, 40);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-16, -18, 26, 36);
  ctx.fillStyle = '#20242e';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', 0, 5);
  // Flashing light bar.
  const phase = Math.floor(t * 6) % 2 === 0;
  ctx.fillStyle = phase ? '#ff2a2a' : '#2a6bff';
  ctx.fillRect(-14, -24, 14, 8);
  ctx.fillStyle = phase ? '#2a6bff' : '#ff2a2a';
  ctx.fillRect(0, -24, 14, 8);
  ctx.restore();
}

export function drawWantedStars(ctx, state) {
  // Top-left, so the wide objective banner never collides with the stars.
  const x0 = 24;
  const y0 = 30;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * 62 + 30;
    ctx.font = '58px sans-serif';
    ctx.fillStyle = i < state.player.wanted ? '#ffd21f' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = '#20202e';
    ctx.lineWidth = 6;
    ctx.strokeText('★', x, y0 + 30);
    ctx.fillText('★', x, y0 + 30);
  }
  ctx.restore();
}

// ---- Roadblocks and the escalating response ----

export function spawnRoadblock(state, x, y) {
  const block = {
    kind: 'police-car', isPolice: true, x, y, angle: Math.PI / 2,
    speed: 0, top: 0, color: '#2a2a3a', siren: 0, roadblock: true,
  };
  state.police.push(block);
  return block;
}

export function roadblockAhead(state, x, y, angle) {
  // Two patrol cars parked across the road ahead of the player.
  const fx = x + Math.cos(angle) * 500;
  const fy = y + Math.sin(angle) * 500;
  spawnRoadblock(state, fx - 40, fy);
  spawnRoadblock(state, fx + 40, fy);
  state.message = 'ROADBLOCK AHEAD — find another way through!';
  state.messageTimer = 3;
}

export function wantedResponseSummary(wanted) {
  const table = {
    1: 'Foot officers on the beat.',
    2: 'Patrol cars join the chase.',
    3: 'Interceptors and roadblocks.',
    4: 'Police boats on the water, more roadblocks.',
    5: 'A police helicopter hunts you from above.',
  };
  return table[wanted] || 'No heat.';
}

export function heatDecayRate(wanted, seen) {
  if (seen) return 0;
  return 1 / (10 + wanted * 4);
}

// ---- The searchlight, the siren and the air response ----

export function searchlightSweep(state, heli, dt) {
  // The police helicopter sweeps its searchlight in a slow arc until it
  // locks onto the player, then the cone tracks them.
  const p = state.player;
  const d = Math.hypot(p.x - heli.x, p.y - heli.y);
  if (d < 400) {
    heli.searchlight = Math.atan2(p.y - heli.y, p.x - heli.x);
    heli.locked = true;
  } else {
    heli.locked = false;
    heli.searchlight += dt * 0.8;
  }
  return heli.searchlight;
}

export function sirenPitchByDistance(state, car) {
  const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
  return Math.max(0, 1 - d / 900);
}

export function policeBackupCall(state) {
  if (state.player.wanted < 3) return false;
  state.message = 'Dispatch: all units, the suspect is armed. Backup en route.';
  state.messageTimer = 4;
  spawnPoliceResponse(state);
  return true;
}

export function arrestTimer(state, dt) {
  const p = state.player;
  let nearest = Infinity;
  for (const c of state.police) {
    if (c.kind !== 'officer') continue;
    nearest = Math.min(nearest, Math.hypot(c.x - p.x, c.y - p.y));
  }
  if (nearest < 60 && p.onFoot) {
    state.arrestProgress = (state.arrestProgress || 0) + dt;
    if (state.arrestProgress > 1.5) {
      bustPlayer(state);
      state.arrestProgress = 0;
      return true;
    }
  } else {
    state.arrestProgress = 0;
  }
  return false;
}

export function drawArrestMeter(ctx, state) {
  if (!state.arrestProgress || state.arrestProgress <= 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.8)';
  ctx.fillRect(490, 330, 300, 44);
  ctx.fillStyle = '#ff5c5c';
  ctx.fillRect(494, 334, 292 * Math.min(1, state.arrestProgress / 1.5), 36);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARREST IN PROGRESS — RUN!', 640, 322);
  ctx.restore();
}
