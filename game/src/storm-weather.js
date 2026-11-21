// Puerto Alba — High Water. Storm weather: lightning flashes, heavy rain,
// flooded streets that slow cars, wet-street reflections. Random storms
// roll in, and the story scripts one over Barrio Lumen and one over the
// finale. The storm is what the cover screenshot freezes mid-flash.

import { G, clamp } from './config.js';
import { rngRange } from './random.js';

export function triggerStormFront(state, intensity) {
  state.weather = 'storm';
  state.storm.active = true;
  state.storm.intensity = intensity ?? 0.85;
  state.storm.nextBolt = rngRange(state.rng, 0.5, 2);
  state.message = 'STORM FRONT — lightning, flooded streets, slow traffic.';
  state.messageTimer = 4;
  return state.storm;
}

export function clearStormFront(state) {
  state.weather = 'clear';
  state.storm.active = false;
  state.storm.intensity = 0;
  state.storm.flash = 0;
  state.message = 'The storm breaks — sun over Puerto Alba again.';
  state.messageTimer = 3;
}

export function updateStormWeather(state, dt) {
  const s = state.storm;
  if (!s.active) {
    // A storm may roll in on its own every few minutes of play.
    state.storm.nextBolt -= dt;
    if (state.storm.nextBolt < -240 && state.rng() < 0.002) triggerStormFront(state, 0.7);
    return;
  }
  s.nextBolt -= dt;
  if (s.nextBolt <= 0) {
    s.flash = 1;
    s.lightning = rngRange(state.rng, 0.5, 1);
    s.nextBolt = rngRange(state.rng, 3, 9);
    state.shake = Math.max(state.shake, 2);
  }
  s.flash = Math.max(0, s.flash - dt * 2.2);
  // Rain streaks drift with the wind.
  if (state.frame % 2 === 0) {
    for (let i = 0; i < 6; i++) {
      state.particles.push({
        kind: 'rain', x: state.camera.x + rngRange(state.rng, -100, 1380), y: state.camera.y - 40,
        vx: -120, vy: 900, life: 0.9, max: 0.9, size: 18, color: 'rgba(200,220,255,0.5)',
      });
    }
  }
}

export function applyStormSlowdown(state, dt) {
  if (!state.storm.active) return;
  // Flooded streets: every wheeled vehicle loses a fifth of its pace.
  for (const v of state.vehicles) {
    if (Math.abs(v.speed) > 40) v.speed *= (1 - 0.18 * dt);
  }
  if (state.player.vehicle && state.player.vehicle.kind === 'car') {
    state.player.vehicle.speed *= (1 - 0.1 * dt);
  }
  // Peds with umbrellas huddle under cover instead of walking.
  for (const p of state.peds) {
    if (p.umbrella) p.speed *= 0.9;
  }
}

export function drawRainOverlay(ctx, state, t) {
  if (!state.storm.active) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(190,215,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = ((i * 137 + t * 420) % 1400) - 60;
    const y = ((i * 211 + t * 900) % 900) - 50;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 22);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawLightningFlash(ctx, state) {
  const f = state.storm.flash;
  if (f <= 0) return;
  ctx.save();
  ctx.globalAlpha = f * 0.55;
  ctx.fillStyle = '#e8f2ff';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.restore();
  // A jagged bolt frozen in the sky, top of frame.
  if (f > 0.4) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,220,${f})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    let x = 760, y = 0;
    ctx.moveTo(x, y);
    while (y < 300) {
      x += (Math.sin(y * 0.05 + state.frame) * 40);
      y += 46;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function drawWetStreetReflections(ctx, state, camX, camY) {
  if (!state.storm.active) return;
  ctx.save();
  ctx.globalAlpha = 0.14;
  for (const v of state.vehicles) {
    const sx = v.x - camX, sy = v.y - camY;
    if (sx < -100 || sx > 1380 || sy < -100 || sy > 900) continue;
    ctx.fillStyle = v.color;
    ctx.beginPath(); ctx.ellipse(sx, sy + 34, 44, 10, v.angle, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---- Flooded streets and the storm's aftermath ----

export function drawFloodedStreets(ctx, state, camX, camY) {
  if (!state.storm.active) return;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#2a6a8a';
  for (const ry of state.city.roadsH) {
    ctx.fillRect(-camX, ry - 30 - camY, 6400, 60);
  }
  for (const rx of state.city.roadsV) {
    ctx.fillRect(rx - 30 - camX, -camY, 60, 4400);
  }
  ctx.restore();
}

export function stormIntensityLabel(state) {
  const i = state.storm.intensity;
  if (i >= 0.85) return 'BLACK STORM';
  if (i >= 0.6) return 'HEAVY STORM';
  if (i >= 0.3) return 'RAIN';
  return 'DRIZZLE';
}

export function lightningStrikeNear(state, x, y) {
  state.storm.flash = 1;
  state.storm.lightning = 1;
  state.shake = Math.max(state.shake, 6);
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      kind: 'spark', x: x + (Math.random() - 0.5) * 80, y: y + (Math.random() - 0.5) * 80,
      vx: 0, vy: -60, life: 0.5, max: 0.5, size: 12, color: '#fff8c0',
    });
  }
}

// ---- Rain intensity and flood depth ----

export function rainIntensity(state) {
  if (!state.storm.active) return 0;
  return state.storm.intensity;
}

export function floodDepthAt(state, x, y) {
  if (!state.storm.active) return 0;
  // Low ground near the lagoon floods first.
  const low = y > 3400 ? 0.6 : y > 2800 ? 0.3 : 0.1;
  return low * state.storm.intensity;
}

export function carInFlood(state, car) {
  const depth = floodDepthAt(state, car.x, car.y);
  if (depth > 0.4) {
    car.speed *= 0.98;
    if (Math.random() < 0.01) {
      state.message = 'Flooded street — the engine is struggling.';
      state.messageTimer = 2;
    }
  }
  return depth;
}

export function drawRainPuddles(ctx, state, camX, camY, t) {
  if (!state.storm.active) return;
  ctx.save();
  ctx.fillStyle = 'rgba(180,210,240,0.25)';
  for (let i = 0; i < 10; i++) {
    const x = ((i * 173 + 200) % 1200) - camX + camX;
    const y = ((i * 97 + 100) % 700) - camY + camY;
    ctx.beginPath();
    ctx.ellipse(200 + (i * 113) % 1000, 150 + (i * 67) % 550, 40 + Math.sin(t * 2 + i) * 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
