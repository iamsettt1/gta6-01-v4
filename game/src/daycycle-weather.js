// Puerto Alba — High Water. The day cycle: dawn, noon, golden hour, neon
// night — driving the palette, the streetlights, the neon glow and the
// headlight cones. Time advances slowly while you play.

import { G, clamp, lerp } from './config.js';

export function advanceDayCycle(state, dt) {
  // One full day every 8 minutes of play.
  state.timeOfDay = (state.timeOfDay + dt / 480) % 1;
  return dayPhase(state.timeOfDay);
}

export function dayPhase(t) {
  if (t < 0.2) return 'dawn';
  if (t < 0.45) return 'morning';
  if (t < 0.62) return 'golden';
  if (t < 0.78) return 'dusk';
  return 'night';
}

export function dayPalette(state) {
  const phase = dayPhase(state.timeOfDay);
  const palettes = {
    dawn: { sky: '#f0b070', light: 0.92, ambient: 'rgba(240,176,112,0.10)', night: false },
    morning: { sky: '#cfe8ff', light: 1.0, ambient: 'rgba(255,255,255,0)', night: false },
    golden: { sky: '#ffb35c', light: 0.95, ambient: 'rgba(255,179,92,0.16)', night: false },
    dusk: { sky: '#e87a5c', light: 0.8, ambient: 'rgba(232,122,92,0.22)', night: false },
    night: { sky: '#1a1a3a', light: 0.55, ambient: 'rgba(26,26,58,0.42)', night: true },
  };
  return palettes[phase];
}

export function isNightTime(state) {
  return dayPalette(state).night;
}

export function paintDayTint(ctx, state) {
  const pal = dayPalette(state);
  ctx.save();
  ctx.fillStyle = pal.ambient;
  ctx.fillRect(0, 0, 1280, 800);
  ctx.restore();
}

export function drawHeadlightCones(ctx, state, camX, camY) {
  if (!isNightTime(state) && state.weather !== 'storm') return;
  ctx.save();
  for (const v of state.vehicles) {
    if (Math.abs(v.speed) < 20) continue;
    const sx = v.x - camX, sy = v.y - camY;
    if (sx < -200 || sx > 1480 || sy < -200 || sy > 1000) continue;
    ctx.translate(sx, sy);
    ctx.rotate(v.angle);
    const grad = ctx.createLinearGradient(0, 0, 260, 0);
    grad.addColorStop(0, 'rgba(255,244,180,0.35)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(40, -8); ctx.lineTo(260, -60); ctx.lineTo(260, 60); ctx.lineTo(40, 8); ctx.closePath(); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // The player's own headlights, always on at night.
  const p = state.player;
  if (p.vehicle && p.vehicle.kind === 'car') {
    const sx = p.x - camX, sy = p.y - camY;
    ctx.translate(sx, sy);
    ctx.rotate(p.angle);
    const grad = ctx.createLinearGradient(0, 0, 320, 0);
    grad.addColorStop(0, 'rgba(255,244,180,0.45)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(40, -10); ctx.lineTo(320, -80); ctx.lineTo(320, 80); ctx.lineTo(40, 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawStreetlights(ctx, state, camX, camY, t) {
  if (!isNightTime(state) && state.weather !== 'storm') return;
  const city = state.city;
  if (!city) return;
  ctx.save();
  for (const lamp of city.lamps) {
    const sx = lamp.x - camX, sy = lamp.y - camY;
    if (sx < -80 || sx > 1360 || sy < -80 || sy > 880) continue;
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(sx - 3, sy - 26, 6, 26);
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.arc(sx, sy - 28, 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.arc(sx, sy - 28, 34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---- Sunrise, sunset and the golden hour ----

export function sunPosition(state) {
  const t = state.timeOfDay;
  return {
    x: 640 + Math.cos(t * Math.PI * 2) * 500,
    y: 400 - Math.sin(t * Math.PI * 2) * 300,
    elevation: Math.sin(t * Math.PI),
  };
}

export function goldenHourGlow(state) {
  const phase = dayPhase(state.timeOfDay);
  if (phase !== 'golden' && phase !== 'dusk') return 0;
  return phase === 'golden' ? 0.25 : 0.35;
}

export function paintSunsetBand(ctx, state) {
  const glow = goldenHourGlow(state);
  if (glow <= 0) return;
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, `rgba(255,179,92,${glow})`);
  grad.addColorStop(1, 'rgba(255,179,92,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 300);
  ctx.restore();
}

export function nightVisionTint(state) {
  return isNightTime(state) ? 0.35 : 0;
}

// ---- Long shadows and the moon ----

export function shadowDirection(state) {
  const t = state.timeOfDay;
  return { x: Math.cos(t * Math.PI * 2), y: Math.sin(t * Math.PI * 2) };
}

export function shadowLength(state) {
  const phase = dayPhase(state.timeOfDay);
  if (phase === 'golden' || phase === 'dusk') return 2.2;
  if (phase === 'dawn') return 1.8;
  if (phase === 'night') return 0.4;
  return 0.8;
}

export function drawMoon(ctx, state) {
  if (!isNightTime(state)) return;
  ctx.save();
  ctx.fillStyle = '#f0ead0';
  ctx.beginPath(); ctx.arc(1120, 90, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8d0b0';
  ctx.beginPath(); ctx.arc(1110, 82, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1132, 100, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawLongShadows(ctx, state, camX, camY) {
  const len = shadowLength(state);
  if (len < 1) return;
  const dir = shadowDirection(state);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  for (const b of state.city.buildings) {
    const sx = b.x - camX, sy = b.y - camY;
    if (sx > 1280 || sy > 800 || sx + b.w < 0 || sy + b.h < 0) continue;
    ctx.fillRect(sx + dir.x * 20 * len, sy + dir.y * 20 * len, b.w, b.h);
  }
  ctx.restore();
}
