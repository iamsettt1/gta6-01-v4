// Puerto Alba — High Water. District painting: each of the eight districts
// gets its own ground, rooftops, signage and street dressing, so the city
// reads as eight different places instead of one grey grid.

import { DISTRICTS } from './config.js';

export function paintDistrictSignage(ctx, state, camX, camY) {
  const city = state.city;
  if (!city) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const sign of city.signs) {
    const sx = sign.x - camX, sy = sign.y - camY;
    if (sx < -260 || sx > 1540 || sy < -60 || sy > 860) continue;
    ctx.fillStyle = 'rgba(10,10,18,0.72)';
    const w = ctx.measureText(sign.label).width + 44;
    ctx.fillRect(sx - w / 2, sy - 26, w, 52);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx - w / 2, sy - 26, w, 52);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(sign.label, sx, sy + 1);
  }
  ctx.restore();
}

export function districtGroundColor(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.ground;
  }
  return '#8a8a72'; // scrub land between districts
}

export function paintDistrictGround(ctx, state, vx, vy, vw, vh) {
  // Base land colour, then one big tinted slab per visible district.
  ctx.fillStyle = '#8a8a72';
  ctx.fillRect(vx, vy, vw, vh);
  for (const d of DISTRICTS) {
    const x = Math.max(d.x, vx), y = Math.max(d.y, vy);
    const w = Math.min(d.x + d.w, vx + vw) - x, h = Math.min(d.y + d.h, vy + vh) - y;
    if (w <= 0 || h <= 0) continue;
    ctx.fillStyle = d.ground;
    ctx.fillRect(x, y, w, h);
  }
  // Beach sand along Playa Alba's south edge.
  ctx.fillStyle = '#f0dca0';
  ctx.fillRect(200, 3600, 1600, 200);
}

export function paintNeonSigns(ctx, state, camX, camY, t) {
  const city = state.city;
  if (!city) return;
  const names = [
    ['CLUB LUMEN', '#ff4fd8', 700, 1900], ['NEÓN', '#37e8ff', 1100, 2050],
    ['LA LUNA', '#ffd21f', 1500, 1900], ['BAR FARO', '#7dff5c', 500, 2200],
    ['DISCO SOL', '#ff5c5c', 1300, 2350], ['CAFÉ NOCHE', '#9a6bff', 900, 2500],
  ];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glow = 0.7 + 0.3 * Math.sin(t * 3);
  for (const [label, color, x, y] of names) {
    const sx = x - camX, sy = y - camY;
    if (sx < -200 || sx > 1480 || sy < -80 || sy > 880) continue;
    ctx.globalAlpha = glow;
    ctx.fillStyle = color;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(label, sx, sy);
    ctx.globalAlpha = 0.35 * glow;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(label, sx, sy);
  }
  ctx.restore();
}

export function paintDistrictProps(ctx, state, camX, camY) {
  const city = state.city;
  if (!city) return;
  // Palms: trunk + five fat fronds, big enough to read at thumbnail size.
  ctx.save();
  for (const p of city.palms) {
    const px = p.x - camX, py = p.y - camY;
    if (px < -80 || px > 1360 || py < -80 || py > 880) continue;
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 10 * p.s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 8 * p.s, py - 46 * p.s); ctx.stroke();
    ctx.fillStyle = '#2f7a3a';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      ctx.beginPath();
      ctx.ellipse(px + 8 * p.s + Math.cos(a) * 30 * p.s, py - 46 * p.s + Math.sin(a) * 18 * p.s, 30 * p.s, 10 * p.s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Market stalls in Casco Viejo.
  for (const pr of city.props) {
    if (pr.kind === 'stall') {
      const sx = pr.x - camX, sy = pr.y - camY;
      if (sx < -80 || sx > 1360 || sy < -80 || sy > 880) continue;
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(sx - 34, sy - 22, 68, 44);
      ctx.fillStyle = '#ff5c5c';
      ctx.fillRect(sx - 38, sy - 30, 76, 14);
      ctx.fillStyle = '#20202e';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pr.label, sx, sy + 6);
    }
  }
  ctx.restore();
}

// ---- Beach, harbour and plaza dressing ----

export function paintBeachFront(ctx, state, camX, camY) {
  ctx.save();
  // Sand, then the waterline foam, then a row of umbrellas.
  ctx.fillStyle = '#f0dca0';
  ctx.fillRect(200 - camX, 3600 - camY, 1600, 200);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.ellipse(240 + i * 140 - camX, 3790 - camY, 46, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function paintHarbourWaterline(ctx, state, camX, camY, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const y = 2700 + i * 12 - camY;
    const x = 4000 - camX + Math.sin(t + i) * 10;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1200, y); ctx.stroke();
  }
  ctx.restore();
}

export function paintPlazaTiles(ctx, state, camX, camY) {
  const plaza = state.city.plaza;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(plaza.x - plaza.w / 2 + (plaza.w / 6) * i - camX, plaza.y - plaza.h / 2 - camY);
    ctx.lineTo(plaza.x - plaza.w / 2 + (plaza.w / 6) * i - camX, plaza.y + plaza.h / 2 - camY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(plaza.x - plaza.w / 2 - camX, plaza.y - plaza.h / 2 + (plaza.h / 6) * i - camY);
    ctx.lineTo(plaza.x + plaza.w / 2 - camX, plaza.y - plaza.h / 2 + (plaza.h / 6) * i - camY); ctx.stroke();
  }
  ctx.restore();
}

export function paintIslandCove(ctx, state, camX, camY) {
  ctx.save();
  ctx.fillStyle = '#f0dca0';
  ctx.beginPath();
  ctx.ellipse(5200 - camX, 3620 - camY, 160, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a4a2a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("SMUGGLERS' COVE", 5200 - camX, 3660 - camY);
  ctx.restore();
}

// ---- Murals and street art ----

export function paintMurals(ctx, state, camX, camY) {
  const murals = [
    { x: 700, y: 600, w: 200, h: 90, colors: ['#ff4fd8', '#37e8ff', '#ffd21f'], label: 'ALBA' },
    { x: 1000, y: 1900, w: 240, h: 100, colors: ['#ff5c5c', '#7dff5c', '#9a6bff'], label: 'LUMEN' },
    { x: 4200, y: 2100, w: 220, h: 90, colors: ['#37c8e8', '#e8b13d', '#ff8a5c'], label: 'MARINA' },
  ];
  ctx.save();
  for (const m of murals) {
    const sx = m.x - camX, sy = m.y - camY;
    if (sx < -260 || sx > 1540 || sy < -120 || sy > 920) continue;
    m.colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(sx + i * (m.w / 3), sy, m.w / 3, m.h);
    });
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, sx + m.w / 2, sy + m.h / 2 + 15);
  }
  ctx.restore();
}

export function paintStreetArtTags(ctx, state, camX, camY) {
  const tags = [
    ['DANA', 1100, 800, '#37e8ff'], ['CREW', 1300, 1000, '#ff4fd8'],
    ['ALBA', 2400, 2000, '#7dff5c'], ['FARO', 5000, 3200, '#ffd21f'],
  ];
  ctx.save();
  ctx.textAlign = 'center';
  for (const [label, x, y, color] of tags) {
    const sx = x - camX, sy = y - camY;
    if (sx < -100 || sx > 1380 || sy < -60 || sy > 860) continue;
    ctx.fillStyle = color;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(label, sx, sy);
  }
  ctx.restore();
}

// ---- District events: the night market, the regatta, the festival ----

export function districtEventFor(state) {
  const phase = state.timeOfDay;
  if (phase > 0.8) return { district: 'lumen', name: 'Night Market', desc: 'Stalls, neon and crowds in Barrio Lumen.' };
  if (phase > 0.45 && phase < 0.62) return { district: 'playa', name: 'Beach Festival', desc: 'Music and umbrellas on Playa Alba.' };
  if (state.weather === 'storm') return { district: 'marina', name: 'Storm Watch', desc: 'The harbour rides out the storm.' };
  return { district: 'casco', name: 'Old Town Morning', desc: 'The market opens in Casco Viejo.' };
}

export function drawDistrictEventBanner(ctx, state) {
  const ev = districtEventFor(state);
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.7)';
  ctx.fillRect(24, 560, 420, 44);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`NOW: ${ev.name} — ${ev.district.toUpperCase()}`, 40, 590);
  ctx.restore();
}

export function eventCrowdFor(state, ev) {
  const spots = {
    lumen: [1000, 2000], playa: [1000, 3400], marina: [4600, 2300], casco: [1000, 800],
  };
  return spots[ev.district] || [1000, 800];
}
