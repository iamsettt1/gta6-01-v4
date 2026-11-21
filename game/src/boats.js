// Puerto Alba — High Water. Boats: three classes from the marina docks —
// skiff, speedboat and the syndicate cigarette boat — with wake trails,
// buoyancy bob, dock and undock at the marinas, and drive-by shooting from
// the deck. The lagoon, the island and the finale all need them.

import { G, CFG, BOAT_CLASSES, DOCKS, clamp, lerp, pointInWater } from './config.js';
import { rngRange } from './random.js';

export function launchSpeedboat(state, x, y, clsId) {
  const cls = BOAT_CLASSES.find(c => c.id === clsId) || BOAT_CLASSES[1];
  const boat = {
    kind: 'boat', cls: cls.id, name: cls.name, x, y, angle: -Math.PI / 2,
    speed: 0, top: cls.top, color: cls.color, health: 100,
    bob: 0, wake: [],
  };
  state.boats.push(boat);
  return boat;
}

export function dockBoatAtMarina(state, boat) {
  boat.speed = 0;
  boat.docked = true;
  state.message = `${boat.name} docked at the marina.`;
  state.messageTimer = 3;
  return boat;
}

export function driveBoat(state, boat, dt) {
  const keys = state.keys;
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];
  if (up) boat.speed = Math.min(boat.top, boat.speed + 380 * dt);
  if (down) boat.speed = Math.max(-120, boat.speed - 320 * dt);
  if (!up && !down) boat.speed = lerp(boat.speed, 0, dt * 0.7);
  if (left) boat.angle -= 1.5 * dt * (0.5 + Math.abs(boat.speed) / boat.top);
  if (right) boat.angle += 1.5 * dt * (0.5 + Math.abs(boat.speed) / boat.top);
  boat.x += Math.cos(boat.angle) * boat.speed * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * dt;
  boat.x = clamp(boat.x, 60, CFG.WORLD_W - 60);
  boat.y = clamp(boat.y, 60, CFG.WORLD_H - 60);
  boat.bob += dt * 3;
  // Wake trail behind the boat, and spray at speed.
  if (Math.abs(boat.speed) > 60 && state.frame % 3 === 0) {
    state.particles.push({
      kind: 'wake', x: boat.x - Math.cos(boat.angle) * 46, y: boat.y - Math.sin(boat.angle) * 46,
      vx: -Math.cos(boat.angle) * 40, vy: -Math.sin(boat.angle) * 40,
      life: 1.1, max: 1.1, size: 22 + Math.abs(boat.speed) / 30, color: '#dff2ff',
    });
  }
  // Boats belong on water: beaching slows them hard and hurts the hull.
  if (!pointInWater(boat.x, boat.y)) {
    boat.speed *= 0.94;
    boat.health -= 4 * dt;
    if (boat.health <= 0) sinkBoat(state, boat);
  }
  state.player.x = boat.x;
  state.player.y = boat.y;
  state.player.angle = boat.angle;
  state.stats.boatsDriven += 1;
  state.stats.distance += Math.abs(boat.speed) * dt / 100;
}

export function sinkBoat(state, boat) {
  state.boats = state.boats.filter(b => b !== boat);
  if (state.player.vehicle === boat) {
    state.player.vehicle = null;
    state.player.onFoot = true;
    state.player.x = DOCKS.x + DOCKS.w / 2;
    state.player.y = DOCKS.y + DOCKS.h + 60;
    state.player.health -= 25;
    state.message = 'Your boat sank — you washed up at the marina dock.';
    state.messageTimer = 4;
  }
}

export function spawnPoliceBoat(state, x, y) {
  const boat = {
    kind: 'police-boat', cls: 'speedboat', name: 'Police Boat', x, y, angle: 0,
    speed: 0, top: 560, color: '#20242e', health: 100, bob: 0, isPolice: true,
  };
  state.boats.push(boat);
  state.police.push(boat);
  return boat;
}

export function updatePoliceBoats(state, dt) {
  const p = state.player;
  for (const b of state.boats) {
    if (b.kind !== 'police-boat') continue;
    const dx = p.x - b.x, dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.angle = Math.atan2(dy, dx);
    b.speed = Math.min(b.top, b.speed + 300 * dt);
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.bob += dt * 3;
    if (d < 80 && p.vehicle && p.vehicle.kind === 'boat') {
      p.vehicle.health -= 6 * dt;
      state.shake = Math.max(state.shake, 3);
    }
  }
}

export function drawBoat(ctx, boat, camX, camY, t) {
  const bobY = Math.sin(boat.bob + t * 2) * 3;
  const sx = boat.x - camX, sy = boat.y - camY + bobY;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(boat.angle);
  // Hull, deck, windshield, outboard — big bold shapes.
  ctx.fillStyle = boat.color;
  ctx.beginPath();
  ctx.moveTo(52, 0); ctx.lineTo(28, -20); ctx.lineTo(-48, -18); ctx.lineTo(-52, 0); ctx.lineTo(-48, 18); ctx.lineTo(28, 20);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,20,30,0.85)';
  ctx.fillRect(-30, -12, 34, 24);
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(2, -12, 12, 24);
  if (boat.cls === 'cigarette') {
    ctx.fillStyle = '#c23a3a';
    ctx.fillRect(-52, -20, 104, 6);
    ctx.fillRect(-52, 14, 104, 6);
  }
  if (boat.kind === 'police-boat') {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', -8, 4);
    const phase = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2a2a' : '#2a6bff';
    ctx.beginPath(); ctx.arc(16, 0, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // White wake V behind a moving boat.
  if (Math.abs(boat.speed) > 80) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(boat.angle) * 50, sy - Math.sin(boat.angle) * 50);
    ctx.lineTo(sx - Math.cos(boat.angle) * 130 - Math.sin(boat.angle) * 30, sy - Math.sin(boat.angle) * 130 + Math.cos(boat.angle) * 30);
    ctx.moveTo(sx - Math.cos(boat.angle) * 50, sy - Math.sin(boat.angle) * 50);
    ctx.lineTo(sx - Math.cos(boat.angle) * 130 + Math.sin(boat.angle) * 30, sy - Math.sin(boat.angle) * 130 - Math.cos(boat.angle) * 30);
    ctx.stroke();
    ctx.restore();
  }
}

export function nearestBoat(state, x, y, maxD) {
  let best = null, bestD = maxD * maxD;
  for (const b of state.boats) {
    if (b.kind === 'police-boat') continue;
    const d = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// ---- Boat races, fishing spots and the smugglers' cove ----

export function boatRaceCheckpoints(state) {
  return [
    { x: 4400, y: 3900, r: 100 },
    { x: 5200, y: 4100, r: 100 },
    { x: 6000, y: 3900, r: 100 },
    { x: 5200, y: 3300, r: 100 },
  ];
}

export function smugglersCoveLocation() {
  return { x: 5200, y: 3620, name: "Smugglers' Cove" };
}

export function dockFee(state, boat) {
  return boat.cls === 'cigarette' ? 200 : 50;
}

export function boatWakeStrength(boat) {
  return Math.min(1, Math.abs(boat.speed) / boat.top);
}

export function drawBoatWakeTrail(ctx, boat, camX, camY) {
  if (Math.abs(boat.speed) < 80) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(boat.x - Math.cos(boat.angle) * 50 - camX, boat.y - Math.sin(boat.angle) * 50 - camY);
  ctx.lineTo(boat.x - Math.cos(boat.angle) * 160 - camX, boat.y - Math.sin(boat.angle) * 160 - camY);
  ctx.stroke();
  ctx.restore();
}

// ---- The marina office and the boat yard ----

export function marinaOfficeHours() {
  return { open: '06:00', close: '22:00', note: 'Boats after dark cost double.' };
}

export function boatYardInventory(state) {
  return state.boats.map(b => ({
    name: b.name, cls: b.cls, health: Math.round(b.health),
    docked: !!b.docked, police: b.kind === 'police-boat',
  }));
}

export function repairBoatAtMarina(state, boat) {
  const cost = Math.round((100 - boat.health) * 4);
  if (state.player.cash < cost) return false;
  state.player.cash -= cost;
  boat.health = 100;
  state.message = `Boat repaired for $${cost}.`;
  state.messageTimer = 3;
  return true;
}

export function fuelBoat(state, boat) {
  boat.fuel = 100;
  state.message = `${boat.name} fuelled and ready.`;
  state.messageTimer = 2;
  return true;
}

export function drawMarinaOffice(ctx, state, camX, camY) {
  const office = { x: 4100, y: 2300, w: 300, h: 180 };
  ctx.save();
  ctx.fillStyle = '#4a6a7a';
  ctx.fillRect(office.x - camX, office.y - camY, office.w, office.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARINA OFFICE', office.x + office.w / 2 - camX, office.y + 50 - camY);
  ctx.font = '22px sans-serif';
  ctx.fillText('BOATS · FUEL · REPAIR', office.x + office.w / 2 - camX, office.y + 90 - camY);
  ctx.restore();
}
