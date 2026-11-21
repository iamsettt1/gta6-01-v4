// Puerto Alba — High Water. Particles and effects: muzzle flash, hit
// sparks, smoke, dust, water spray, wake, rotor wash, cash confetti on
// payouts, and screen shake on explosions and near misses.

import { G } from './config.js';
import { rngRange, rngPick } from './random.js';

export function burstMuzzleFlash(state, x, y, angle) {
  state.particles.push({
    kind: 'flash', x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26,
    vx: 0, vy: 0, life: 0.09, max: 0.09, size: 26, color: '#ffe9a0',
  });
  for (let i = 0; i < 4; i++) {
    state.particles.push({
      kind: 'spark', x, y, vx: Math.cos(angle + rngRange(state.rng, -0.4, 0.4)) * 300,
      vy: Math.sin(angle + rngRange(state.rng, -0.4, 0.4)) * 300,
      life: 0.3, max: 0.3, size: 8, color: '#ffd76a',
    });
  }
}

export function burstHitSparks(state, x, y) {
  for (let i = 0; i < 8; i++) {
    state.particles.push({
      kind: 'spark', x, y, vx: rngRange(state.rng, -220, 220), vy: rngRange(state.rng, -220, 220),
      life: 0.4, max: 0.4, size: 9, color: rngPick(state.rng, ['#ffd76a', '#ff9a3d', '#fff']),
    });
  }
}

export function burstCashConfetti(state, x, y, count) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      kind: 'cash', x: x + rngRange(state.rng, -60, 60), y: y + rngRange(state.rng, -60, 60),
      vx: rngRange(state.rng, -120, 120), vy: rngRange(state.rng, -200, -40),
      life: 1.6, max: 1.6, size: 12, color: '#37e87a',
    });
  }
}

export function burstWaterSpray(state, x, y) {
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      kind: 'spray', x, y, vx: rngRange(state.rng, -140, 140), vy: rngRange(state.rng, -180, -20),
      life: 0.7, max: 0.7, size: rngRange(state.rng, 10, 22), color: '#dff2ff',
    });
  }
}

export function burstDustCloud(state, x, y) {
  for (let i = 0; i < 6; i++) {
    state.particles.push({
      kind: 'dust', x: x + rngRange(state.rng, -30, 30), y: y + rngRange(state.rng, -30, 30),
      vx: rngRange(state.rng, -40, 40), vy: rngRange(state.rng, -60, -10),
      life: 0.9, max: 0.9, size: rngRange(state.rng, 12, 24), color: 'rgba(180,160,130,0.7)',
    });
  }
}

export function updateParticles(state, dt) {
  for (const pt of state.particles) {
    pt.life -= dt;
    pt.x += (pt.vx || 0) * dt;
    pt.y += (pt.vy || 0) * dt;
    if (pt.kind === 'cash') pt.vy += 300 * dt;
    if (pt.kind === 'rain') pt.y += 0; // rain streaks are screen-space, moved by the storm
  }
  state.particles = state.particles.filter(pt => pt.life > 0);
  for (const tr of state.tracers) tr.life -= dt;
  state.tracers = state.tracers.filter(tr => tr.life > 0);
  if (state.particles.length > 600) state.particles.splice(0, state.particles.length - 600);
}

export function shakeScreen(state, amount) {
  state.shake = Math.max(state.shake, amount);
}

// ---- Explosions, smoke trails and landing dust ----

export function burstExplosion(state, x, y) {
  for (let i = 0; i < 30; i++) {
    state.particles.push({
      kind: 'fire', x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320,
      life: 0.9, max: 0.9, size: 22, color: ['#ff5c5c', '#ff9a3d', '#ffd21f', '#3a3a3a'][i % 4],
    });
  }
  state.shake = 16;
}

export function burstSmokeTrail(state, x, y, angle) {
  state.particles.push({
    kind: 'smoke', x, y, vx: -Math.cos(angle) * 60, vy: -Math.sin(angle) * 60,
    life: 1.4, max: 1.4, size: 18, color: 'rgba(80,80,80,0.6)',
  });
}

export function burstLandingDust(state, x, y) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    state.particles.push({
      kind: 'dust', x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140,
      life: 0.8, max: 0.8, size: 16, color: 'rgba(180,160,130,0.8)',
    });
  }
}

export function burstNeonSparkle(state, x, y, color) {
  for (let i = 0; i < 8; i++) {
    state.particles.push({
      kind: 'spark', x: x + (Math.random() - 0.5) * 80, y: y + (Math.random() - 0.5) * 40,
      vx: 0, vy: -30, life: 0.7, max: 0.7, size: 8, color,
    });
  }
}

export function particleCount(state) {
  return state.particles.length;
}

// ---- Weather particles: leaves, spray and embers ----

export function burstLeaves(state, x, y) {
  for (let i = 0; i < 8; i++) {
    state.particles.push({
      kind: 'leaf', x: x + (Math.random() - 0.5) * 100, y: y + (Math.random() - 0.5) * 100,
      vx: 40 + Math.random() * 60, vy: 20 + Math.random() * 40,
      life: 1.6, max: 1.6, size: 8, color: ['#7fae62', '#e8b13d', '#c28a4a'][i % 3],
    });
  }
}

export function burstSeaSpray(state, x, y) {
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      kind: 'spray', x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 200,
      life: 0.8, max: 0.8, size: 14, color: '#dff2ff',
    });
  }
}

export function burstEmbers(state, x, y) {
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      kind: 'ember', x, y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 80,
      life: 1.2, max: 1.2, size: 6, color: ['#ff9a3d', '#ffd21f', '#ff5c5c'][i % 3],
    });
  }
}

export function updateWeatherParticles(state, dt) {
  if (state.weather !== 'storm') return;
  if (state.frame % 30 === 0) {
    burstLeaves(state, state.player.x + (Math.random() - 0.5) * 600, state.player.y + (Math.random() - 0.5) * 400);
  }
}
