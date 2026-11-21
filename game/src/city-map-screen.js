// Puerto Alba — High Water. The full-city map screen (Esc, then M): all
// eight district names, the roads, the water, the island, the airstrip,
// mission markers and the player blip — it must read as a real city map.

import { G, CFG, DISTRICTS, WATER, ISLAND, BRIDGES, AIRSTRIP } from './config.js';

export function drawFullCityMap(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,18,0.94)';
  ctx.fillRect(0, 0, 1280, 800);
  const mapX = 90, mapY = 90, mapW = 760, mapH = 620;
  const scale = Math.min(mapW / CFG.WORLD_W, mapH / CFG.WORLD_H);
  const ox = mapX, oy = mapY;
  // Sea, then land.
  ctx.fillStyle = '#1d6a8a';
  ctx.fillRect(ox, oy, CFG.WORLD_W * scale, CFG.WORLD_H * scale);
  ctx.fillStyle = '#8a8a72';
  ctx.fillRect(ox, oy, CFG.WORLD_W * scale, 3800 * scale);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(ox + d.x * scale, oy + d.y * scale, d.w * scale, d.h * scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + d.x * scale, oy + d.y * scale, d.w * scale, d.h * scale);
  }
  // Roads.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(ox + rx * scale, oy); ctx.lineTo(ox + rx * scale, oy + CFG.WORLD_H * scale); ctx.stroke();
  }
  for (const ry of state.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(ox, oy + ry * scale); ctx.lineTo(ox + CFG.WORLD_W * scale, oy + ry * scale); ctx.stroke();
  }
  // Bridges to the island.
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 4;
  for (const b of BRIDGES) {
    ctx.beginPath(); ctx.moveTo(ox + (b.x + b.w / 2) * scale, oy + b.y * scale); ctx.lineTo(ox + (b.x + b.w / 2) * scale, oy + (b.y + b.h) * scale); ctx.stroke();
  }
  // District names, big enough to read at a glance.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  for (const d of DISTRICTS) {
    ctx.fillText(d.name.toUpperCase(), ox + (d.x + d.w / 2) * scale, oy + (d.y + d.h / 2) * scale);
  }
  // Airstrip, lighthouse, mission marker, safehouses, player.
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('✈ AIRSTRIP', ox + 5200 * scale, oy + 420 * scale);
  ctx.fillText('♜ LIGHTHOUSE', ox + 5200 * scale, oy + 3300 * scale);
  const m = state.missions.current;
  if (m && m.active && m.target) {
    ctx.fillStyle = '#ffd21f';
    ctx.beginPath(); ctx.arc(ox + m.target.x * scale, oy + m.target.y * scale, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#20202e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  for (const h of state.safehouses) {
    ctx.fillStyle = h.owned ? '#37e87a' : '#ffd21f';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⌂', ox + h.x * scale, oy + h.y * scale);
  }
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(ox + state.player.x * scale, oy + state.player.y * scale, 12, 0, Math.PI * 2); ctx.fill();
  ctx.stroke();
  // Side panel: legend and the next objective.
  const px = 900;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PUERTO ALBA', px, 150);
  ctx.font = '30px sans-serif';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('8 districts · 1 island', px, 195);
  ctx.fillText('2 bridges · 1 airstrip', px, 235);
  ctx.fillStyle = '#fff';
  ctx.fillText('— You are the white dot', px, 300);
  ctx.fillText('— Yellow is your objective', px, 340);
  ctx.fillText('— Red is the police', px, 380);
  ctx.fillText('— Green is a safehouse', px, 420);
  if (m && m.active) {
    ctx.fillStyle = '#37e8ff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`Mission ${m.n}: ${m.name}`, px, 490);
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#fff';
    wrapText(ctx, m.brief, px, 530, 340, 32);
  }
  ctx.fillStyle = '#cfd8e8';
  ctx.font = '28px sans-serif';
  ctx.fillText('Esc / M — back to the game', px, 700);
  ctx.restore();
}

export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

// ---- Map legend and the district index ----

export function drawMapLegend(ctx, state, x, y) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '26px sans-serif';
  const items = [
    ['#fff', 'You'],
    ['#ffd21f', 'Objective'],
    ['#ff2a2a', 'Police'],
    ['#37e87a', 'Safehouse'],
    ['#37c8e8', 'Crew turf'],
    ['#c23a3a', 'Aldana turf'],
  ];
  items.forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + 14, y + i * 36, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 34, y + i * 36 + 9);
  });
  ctx.restore();
}

export function districtIndexList() {
  return DISTRICTS.map(d => ({ name: d.name, mood: d.mood }));
}

// ---- Map zoom and the pinned locations ----

export function mapZoomLevels() {
  return [0.5, 1, 1.5, 2];
}

export function pinnedMapLocations() {
  return [
    { name: 'Celia’s Office', x: 1000, y: 760, icon: '★' },
    { name: 'Tuning Shop', x: 4300, y: 620, icon: '🔧' },
    { name: 'Paint Shop', x: 1700, y: 620, icon: '🎨' },
    { name: 'Airstrip', x: 5200, y: 560, icon: '✈' },
    { name: 'Marina Docks', x: 4600, y: 2600, icon: '⚓' },
    { name: 'Lighthouse', x: 5200, y: 3300, icon: '♜' },
  ];
}

export function drawPinnedLocations(ctx, state, ox, oy, scale) {
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  for (const pin of pinnedMapLocations()) {
    ctx.fillStyle = '#ffd21f';
    ctx.fillText(pin.icon, ox + pin.x * scale, oy + pin.y * scale);
  }
  ctx.restore();
}

// ---- Route planning on the map ----

export function planRouteOnMap(state, dest) {
  const from = { x: state.player.x, y: state.player.y };
  const waypoints = [
    from,
    { x: dest.x, y: from.y },
    { x: dest.x, y: dest.y },
  ];
  state.plannedRoute = waypoints;
  return waypoints;
}

export function drawPlannedRoute(ctx, state, ox, oy, scale) {
  if (!state.plannedRoute) return;
  ctx.save();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  state.plannedRoute.forEach((p, i) => {
    const x = ox + p.x * scale, y = oy + p.y * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function clearPlannedRoute(state) {
  state.plannedRoute = null;
}
