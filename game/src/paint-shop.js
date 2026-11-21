// Puerto Alba — High Water. The paint shop: repaint any car from a wall of
// colours, repair damage, and clear the wanted level for a fee. A fresh
// coat is the cheapest way out of a chase.

import { G } from './config.js';

export function repaintPlayerCar(state, color) {
  const car = state.player.vehicle;
  if (!car || car.kind !== 'car') {
    state.message = 'Bring a car into the paint shop first.';
    state.messageTimer = 3;
    return false;
  }
  const cost = 150;
  if (state.player.cash < cost) {
    state.message = `A repaint costs $${cost}.`;
    state.messageTimer = 3;
    return false;
  }
  state.player.cash -= cost;
  car.color = color;
  car.health = 100;
  state.message = `Fresh paint — ${color}. The car looks brand new.`;
  state.messageTimer = 3;
  return true;
}

export function repairAndClearWanted(state) {
  const car = state.player.vehicle;
  const cost = 100 + state.player.wanted * 120;
  if (state.player.cash < cost) {
    state.message = `Full service costs $${cost} — not enough cash.`;
    state.messageTimer = 3;
    return false;
  }
  state.player.cash -= cost;
  if (car) car.health = 100;
  state.player.wanted = 0;
  state.player.heat = 0;
  state.police = [];
  state.message = `Repaired, repainted, heat gone — $${cost}.`;
  state.messageTimer = 4;
  return true;
}

export function paintShopColors() {
  return ['#e8b13d', '#4a7ec2', '#c23a3a', '#37c8e8', '#ff4fd8', '#7fae62', '#ffd21f', '#e8e8e8', '#1a1a2a', '#ff8a5c'];
}

export function drawPaintShop(ctx, state, camX, camY) {
  const shop = { x: 1500, y: 500, w: 380, h: 240 };
  ctx.save();
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(shop.x - camX, shop.y - camY, shop.w, shop.h);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PINTURA', shop.x + shop.w / 2 - camX, shop.y + 56 - camY);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PAINT · REPAIR · LOSE HEAT', shop.x + shop.w / 2 - camX, shop.y + 96 - camY);
  const colors = paintShopColors();
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(shop.x + 24 + (i % 5) * 68 - camX, shop.y + 130 + Math.floor(i / 5) * 44 - camY, 56, 32);
  }
  ctx.restore();
}

export function playerNearPaintShop(state) {
  const p = state.player;
  return p.x > 1450 && p.x < 1950 && p.y > 450 && p.y < 800;
}

// ---- Paint finishes and the impound lot ----

export function paintFinishName(color) {
  const names = {
    '#e8b13d': 'Sun Gold', '#4a7ec2': 'Harbour Blue', '#c23a3a': 'Aldana Red',
    '#37c8e8': 'Marina Teal', '#ff4fd8': 'Lumen Pink', '#7fae62': 'Colinas Green',
    '#ffd21f': 'Taxi Yellow', '#e8e8e8': 'Pearl White', '#1a1a2a': 'Midnight',
    '#ff8a5c': 'Sunset Coral',
  };
  return names[color] || color;
}

export function paintShopQuote(state) {
  const car = state.player.vehicle;
  if (!car || car.kind !== 'car') return 'Bring a car in for a quote.';
  const damage = Math.round(100 - car.health);
  return `Repaint $150 · repair $${damage * 2} · lose the heat $${100 + state.player.wanted * 120}.`;
}

export function impoundFee(state) {
  return 250 + state.player.wanted * 100;
}

export function drawPaintShopQueue(ctx, state, camX, camY) {
  const shop = { x: 1500, y: 780, w: 380, h: 120 };
  ctx.save();
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(shop.x - camX, shop.y - camY, shop.w, shop.h);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT IN LINE — YOUR CAR', shop.x + shop.w / 2 - camX, shop.y + 60 - camY);
  ctx.restore();
}

// ---- Paint history and custom colours ----

export function paintHistory(state) {
  state.paintHistory = state.paintHistory || [];
  return state.paintHistory;
}

export function recordPaintJob(state, color) {
  state.paintHistory = state.paintHistory || [];
  state.paintHistory.push({ color, at: state.elapsed, car: state.player.vehicle?.name || 'car' });
  if (state.paintHistory.length > 10) state.paintHistory.shift();
  return state.paintHistory.length;
}

export function customPaintColor(r, g, b) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function paintShopLoyalty(state) {
  const jobs = (state.paintHistory || []).length;
  if (jobs >= 5) return 'Every fifth repaint is free.';
  return `${5 - jobs} more repaints until a free one.`;
}
