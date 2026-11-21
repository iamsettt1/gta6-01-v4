// Puerto Alba — High Water. The tuning shop in Zona Franca: neon underglow,
// wheels and spoilers you can see on the car, on the street and on the
// minimap blip. Tuning is what the race screenshot is really showing.

import { G, NEON_COLORS } from './config.js';

export function fitNeonUnderglow(state, vehicle, color) {
  if (!vehicle) return false;
  const cost = 300;
  if (state.player.cash < cost) {
    state.message = 'Not enough cash for neon underglow ($300).';
    state.messageTimer = 3;
    return false;
  }
  state.player.cash -= cost;
  vehicle.underglow = color;
  vehicle.tuned = true;
  state.tuning.underglow = color;
  state.tuning.carsTuned += 1;
  state.message = `NEON UNDERGLOW fitted — ${color}. The street will notice.`;
  state.messageTimer = 4;
  return true;
}

export function fitTuningWheels(state, vehicle, style) {
  const cost = 250;
  if (!vehicle || state.player.cash < cost) return false;
  state.player.cash -= cost;
  vehicle.wheels = style;
  state.tuning.wheels = style;
  state.message = `Wheels fitted: ${style}.`;
  state.messageTimer = 3;
  return true;
}

export function fitTuningSpoiler(state, vehicle, style) {
  const cost = 200;
  if (!vehicle || state.player.cash < cost) return false;
  state.player.cash -= cost;
  vehicle.spoiler = style;
  state.tuning.spoiler = style;
  state.message = `Spoiler fitted: ${style}.`;
  state.messageTimer = 3;
  return true;
}

export function tuningShopMenu(state) {
  return {
    title: 'NEÓN Y RUEDAS — Tuning Shop',
    items: NEON_COLORS.map((c, i) => ({ label: `Neon underglow ${c}`, price: 300, color: c, apply: () => fitNeonUnderglow(state, state.player.vehicle, c) })),
    wheels: [
      { label: 'Chrome rims', price: 250, apply: () => fitTuningWheels(state, state.player.vehicle, 'chrome') },
      { label: 'Black steel', price: 250, apply: () => fitTuningWheels(state, state.player.vehicle, 'steel') },
      { label: 'Gold spokes', price: 250, apply: () => fitTuningWheels(state, state.player.vehicle, 'gold') },
    ],
    spoilers: [
      { label: 'GT wing', price: 200, apply: () => fitTuningSpoiler(state, state.player.vehicle, 'gt-wing') },
      { label: 'Ducktail', price: 200, apply: () => fitTuningSpoiler(state, state.player.vehicle, 'ducktail') },
    ],
  };
}

export function drawCarUnderglow(ctx, car, sx, sy) {
  if (!car.underglow) return;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = car.underglow;
  ctx.beginPath(); ctx.ellipse(sx, sy, 52, 30, car.angle || 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.ellipse(sx, sy, 40, 20, car.angle || 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawTuningShop(ctx, state, camX, camY) {
  const shop = { x: 4100, y: 500, w: 420, h: 260 };
  ctx.save();
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(shop.x - camX, shop.y - camY, shop.w, shop.h);
  ctx.fillStyle = '#ff4fd8';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEÓN Y RUEDAS', shop.x + shop.w / 2 - camX, shop.y + 60 - camY);
  ctx.fillStyle = '#37e8ff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('TUNING · NEON · WHEELS', shop.x + shop.w / 2 - camX, shop.y + 105 - camY);
  // Neon strip along the roofline.
  const colors = ['#ff4fd8', '#37e8ff', '#7dff5c', '#ffd21f'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(shop.x + 20 + i * 100 - camX, shop.y + 130 - camY, 80, 16);
  }
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press T to tune your ride', shop.x + shop.w / 2 - camX, shop.y + 200 - camY);
  ctx.restore();
}

export function playerNearTuningShop(state) {
  const p = state.player;
  return p.x > 4000 && p.x < 4650 && p.y > 420 && p.y < 850;
}

// ---- Performance parts: engine, brakes, suspension ----

export function fitPerformanceEngine(state, vehicle, level) {
  const cost = 500 * level;
  if (!vehicle || state.player.cash < cost) return false;
  state.player.cash -= cost;
  vehicle.top = Math.round(vehicle.top * (1 + 0.12 * level));
  vehicle.engineLevel = level;
  state.message = `Stage ${level} engine fitted — top speed up ${12 * level}%.`;
  state.messageTimer = 3;
  return true;
}

export function fitPerformanceBrakes(state, vehicle) {
  const cost = 300;
  if (!vehicle || state.player.cash < cost) return false;
  state.player.cash -= cost;
  vehicle.brakes = true;
  state.message = 'Racing brakes fitted — stopping distance halved.';
  state.messageTimer = 3;
  return true;
}

export function fitPerformanceSuspension(state, vehicle) {
  const cost = 350;
  if (!vehicle || state.player.cash < cost) return false;
  state.player.cash -= cost;
  vehicle.grip = Math.min(1, (vehicle.grip || 0.9) + 0.06);
  vehicle.suspension = true;
  state.message = 'Sport suspension fitted — the car corners flat now.';
  state.messageTimer = 3;
  return true;
}

export function tuningShopCatalogue(state) {
  return [
    { name: 'Neon underglow', price: 300, desc: 'Six colours, visible at night' },
    { name: 'Chrome rims', price: 250, desc: 'Mirror finish' },
    { name: 'GT wing', price: 200, desc: 'Downforce you can see' },
    { name: 'Stage 1 engine', price: 500, desc: '+12% top speed' },
    { name: 'Stage 2 engine', price: 1000, desc: '+24% top speed' },
    { name: 'Racing brakes', price: 300, desc: 'Stop on a coin' },
    { name: 'Sport suspension', price: 350, desc: '+grip in the corners' },
  ];
}

export function drawTuningCatalogue(ctx, state, x, y) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NEÓN Y RUEDAS — CATALOGUE', x, y);
  ctx.font = '24px sans-serif';
  tuningShopCatalogue(state).forEach((item, i) => {
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`${item.name} — $${item.price}`, x, y + 40 + i * 32);
    ctx.fillStyle = '#cfd8e8';
    ctx.fillText(item.desc, x + 420, y + 40 + i * 32);
  });
  ctx.restore();
}

// ---- Paint jobs: matte, chrome, pearlescent ----

export function paintJobFinishes() {
  return [
    { id: 'gloss', name: 'Gloss', price: 150 },
    { id: 'matte', name: 'Matte', price: 250 },
    { id: 'chrome', name: 'Chrome', price: 800 },
    { id: 'pearl', name: 'Pearlescent', price: 600 },
    { id: 'candy', name: 'Candy', price: 500 },
  ];
}

export function applyPaintFinish(state, vehicle, finishId) {
  const finish = paintJobFinishes().find(f => f.id === finishId);
  if (!finish || !vehicle) return false;
  if (state.player.cash < finish.price) return false;
  state.player.cash -= finish.price;
  vehicle.finish = finishId;
  state.message = `${finish.name} finish applied — the car turns heads now.`;
  state.messageTimer = 3;
  return true;
}

export function neonUnderglowPatterns() {
  return [
    { id: 'solid', name: 'Solid glow' },
    { id: 'pulse', name: 'Pulsing glow' },
    { id: 'chase', name: 'Chasing glow' },
    { id: 'rainbow', name: 'Rainbow cycle' },
  ];
}

export function underglowBrightness(state, t) {
  const pattern = state.tuning.underglowPattern || 'solid';
  if (pattern === 'pulse') return 0.5 + 0.5 * Math.sin(t * 4);
  if (pattern === 'chase') return 0.6 + 0.4 * Math.sin(t * 8);
  return 0.85;
}
