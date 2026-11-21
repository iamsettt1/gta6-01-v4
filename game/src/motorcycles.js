// Puerto Alba — High Water. Motorcycles: one bike class, faster and nimbler
// than any car, drawn smaller, ridden leaning into the corners. Steal one
// from the kerb outside Club Lumen or the marina.

import { G, CFG, clamp, lerp } from './config.js';

export function mountMotorcycle(state, x, y) {
  const bike = {
    kind: 'bike', cls: 'bike', name: 'Lumen Bike', x, y, angle: -Math.PI / 2,
    speed: 0, top: 680, grip: 0.97, color: '#ff4fd8', health: 100,
    lean: 0, underglow: null, wheels: 'stock', spoiler: null,
  };
  state.vehicles.push(bike);
  return bike;
}

export function rideMotorcycle(state, bike, dt) {
  const keys = state.keys;
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];
  if (up) bike.speed = Math.min(bike.top, bike.speed + 640 * dt);
  if (down) bike.speed = Math.max(-140, bike.speed - 480 * dt);
  if (!up && !down) bike.speed = lerp(bike.speed, 0, dt * 1.1);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const dir = bike.speed >= 0 ? 1 : -1;
  bike.angle += steer * 3.1 * dt * dir * clamp(Math.abs(bike.speed) / 220, 0.3, 1);
  bike.lean = lerp(bike.lean, steer * 0.35, dt * 6);
  bike.x = clamp(bike.x + Math.cos(bike.angle) * bike.speed * dt, 60, CFG.WORLD_W - 60);
  bike.y = clamp(bike.y + Math.sin(bike.angle) * bike.speed * dt, 60, CFG.WORLD_H - 60);
  state.player.x = bike.x;
  state.player.y = bike.y;
  state.player.angle = bike.angle;
  state.stats.distance += Math.abs(bike.speed) * dt / 100;
  return bike;
}

export function drawMotorcycle(ctx, bike, camX, camY) {
  const sx = bike.x - camX, sy = bike.y - camY;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(bike.angle + bike.lean);
  ctx.fillStyle = '#181818';
  ctx.fillRect(-26, -5, 52, 10);
  ctx.fillStyle = bike.color;
  ctx.beginPath(); ctx.ellipse(4, 0, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(18, -5, 8, 10);
  ctx.fillStyle = '#e8b13d';
  ctx.beginPath(); ctx.arc(-18, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Stunts, wheelies and the bike gang ----

export function popMotorcycleWheelie(state, bike) {
  if (Math.abs(bike.speed) < 300) return false;
  bike.wheelie = 0.8;
  state.message = 'WHEELIE! The crowd loves it.';
  state.messageTimer = 2;
  return true;
}

export function bikeStuntScore(state, bike, airTime) {
  const score = Math.round(airTime * 150 + (bike.wheelie > 0 ? 50 : 0));
  if (score > 0) {
    state.player.cash += score;
    state.message = `BIKE STUNT +$${score}`;
    state.messageTimer = 3;
  }
  return score;
}

export function drawBikeWheelie(ctx, bike, camX, camY) {
  if (!bike.wheelie || bike.wheelie <= 0) return;
  const sx = bike.x - camX, sy = bike.y - camY;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(bike.angle - 0.3);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(-26, -5, 52, 10);
  ctx.restore();
}

// ---- The Lumen bike gang ----

export function spawnBikeGang(state, x, y) {
  const gang = [];
  for (let i = 0; i < 4; i++) {
    const bike = mountMotorcycle(state, x + i * 60, y + (i % 2) * 50);
    bike.color = ['#ff4fd8', '#37e8ff', '#7dff5c', '#ffd21f'][i];
    bike.underglow = bike.color;
    gang.push(bike);
  }
  return gang;
}

export function bikeGangRide(state, gang, dt) {
  for (const bike of gang) {
    bike.x += Math.cos(bike.angle) * bike.speed * dt;
    bike.y += Math.sin(bike.angle) * bike.speed * dt;
    bike.speed = Math.min(bike.top * 0.6, bike.speed + 200 * dt);
  }
}

export function bikeGangNames() {
  return ['Vela', 'Toro', 'Faro', 'Luz'];
}
