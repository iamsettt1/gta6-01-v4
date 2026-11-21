// Puerto Alba — High Water. Combat: four weapons — pistol, scattergun, SMG
// and the rifle (long range, scope glint, slow rate, heavy damage) — with
// distinct spread, rate, range, tracers, muzzle flash, hit sparks and shell
// sounds. Mouse aim on foot; drive-by from cars and boats.

import { G, WEAPONS, clamp } from './config.js';
import { rngRange } from './random.js';

export function fireRifle(state, tx, ty) {
  return fireWeapon(state, 'rifle', tx, ty);
}

export function fireWeapon(state, weaponId, tx, ty) {
  const p = state.player;
  const w = WEAPONS[weaponId];
  if (!w) return false;
  const now = state.elapsed;
  if (p.lastShot && now - p.lastShot < w.rate) return false;
  if ((p.ammo[weaponId] ?? 0) <= 0 && weaponId !== 'pistol') {
    state.message = `${w.name} is out of ammo — pick up ammo or switch weapon.`;
    state.messageTimer = 2;
    return false;
  }
  p.lastShot = now;
  if (weaponId !== 'pistol') p.ammo[weaponId] -= 1;
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const base = Math.atan2(ty - p.y, tx - p.x);
    const a = base + rngRange(state.rng, -w.spread, w.spread);
    const ex = p.x + Math.cos(a) * w.range;
    const ey = p.y + Math.sin(a) * w.range;
    state.tracers.push({ x1: p.x, y1: p.y, x2: ex, y2: ey, life: 0.12, max: 0.12, color: w.color, wide: weaponId === 'rifle' });
    // Hit test against rival crew and police officers.
    for (const ped of state.peds) {
      if (ped.crew !== 'aldana' && ped.kind !== 'officer') continue;
      const d = pointToSegmentDistance(ped.x, ped.y, p.x, p.y, ex, ey);
      if (d < 26) {
        ped.health = (ped.health ?? 60) - w.damage;
        state.particles.push({ kind: 'spark', x: ped.x, y: ped.y, vx: 0, vy: -40, life: 0.4, max: 0.4, size: 16, color: '#ffd76a' });
        if (ped.health <= 0) {
          ped.state = 'down';
          p.cash += 25;
          if (state.missions.current && state.missions.current.n === 4) {
            state.missions.current.progress += 1;
            if (state.missions.current.progress >= 6) {
              state.missions.current.progress = 6;
            }
          }
        }
      }
    }
  }
  // Muzzle flash and a shell casing.
  state.particles.push({
    kind: 'flash', x: p.x + Math.cos(Math.atan2(ty - p.y, tx - p.x)) * 26, y: p.y + Math.sin(Math.atan2(ty - p.y, tx - p.x)) * 26,
    vx: 0, vy: 0, life: 0.08, max: 0.08, size: weaponId === 'rifle' ? 30 : 20, color: '#ffe9a0',
  });
  state.shake = Math.max(state.shake, weaponId === 'rifle' ? 5 : 2);
  if (p.wanted < 2) {
    // Gunfire in public draws the police.
    p.wanted = Math.max(p.wanted, 1);
  }
  return true;
}

export function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function switchWeapon(state, weaponId) {
  if (!WEAPONS[weaponId]) return false;
  if (!state.player.weapons.includes(weaponId)) {
    state.message = `You do not own the ${WEAPONS[weaponId].name} yet.`;
    state.messageTimer = 2;
    return false;
  }
  state.player.weapon = weaponId;
  state.message = `${WEAPONS[weaponId].name} ready.`;
  state.messageTimer = 2;
  return true;
}

export function rivalCrewAI(state, ped, dt) {
  // Aldana rivals take cover behind crates and cars, advance, and flee
  // when outnumbered.
  const p = state.player;
  const d = Math.hypot(p.x - ped.x, p.y - ped.y);
  ped.think = (ped.think || 0) - dt;
  if (ped.think <= 0) {
    ped.think = rngRange(state.rng, 0.6, 1.4);
    const nearbyCrew = state.peds.filter(q => q.crew === 'aldana' && q.state !== 'down').length;
    if (p.weapon === 'rifle' || nearbyCrew < 2) {
      ped.mode = 'flee';
    } else if (d > 420) {
      ped.mode = 'advance';
    } else {
      ped.mode = 'cover';
    }
  }
  const speed = 130;
  if (ped.mode === 'advance') {
    ped.x += ((p.x - ped.x) / (d || 1)) * speed * dt;
    ped.y += ((p.y - ped.y) / (d || 1)) * speed * dt;
  } else if (ped.mode === 'flee') {
    ped.x -= ((p.x - ped.x) / (d || 1)) * speed * dt;
    ped.y -= ((p.y - ped.y) / (d || 1)) * speed * dt;
  } else if (ped.mode === 'cover') {
    // Strafe sideways behind the nearest crate or car.
    const cover = nearestCover(state, ped.x, ped.y);
    if (cover) {
      ped.x += ((cover.x - ped.x) / (Math.hypot(cover.x - ped.x, cover.y - ped.y) || 1)) * 60 * dt;
      ped.y += ((cover.y - ped.y) / (Math.hypot(cover.x - ped.x, cover.y - ped.y) || 1)) * 60 * dt;
    }
    // Return fire in bursts.
    ped.shotTimer = (ped.shotTimer || 0) - dt;
    if (ped.shotTimer <= 0 && d < 500) {
      ped.shotTimer = rngRange(state.rng, 1.2, 2.4);
      state.tracers.push({ x1: ped.x, y1: ped.y, x2: p.x, y2: p.y, life: 0.1, max: 0.1, color: '#ff8a8a', wide: false });
      if (Math.random() < 0.25) {
        p.health -= 8;
        state.shake = Math.max(state.shake, 3);
      }
    }
  }
}

export function nearestCover(state, x, y) {
  let best = null, bestD = 400 * 400;
  for (const c of state.city.crates) {
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  for (const v of state.vehicles) {
    const d = (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

export function drawTracers(ctx, state, camX, camY) {
  ctx.save();
  for (const tr of state.tracers) {
    ctx.globalAlpha = Math.max(0, tr.life / tr.max);
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.wide ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(tr.x1 - camX, tr.y1 - camY);
    ctx.lineTo(tr.x2 - camX, tr.y2 - camY);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawScopeGlint(ctx, state, camX, camY, t) {
  if (state.player.weapon !== 'rifle') return;
  const p = state.player;
  const sx = p.x - camX, sy = p.y - camY;
  const glint = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.save();
  ctx.globalAlpha = 0.4 + 0.6 * glint;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(sx + 18, sy - 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Ammo, pickups and explosive barrels ----

export function spawnAmmoPickup(state, x, y, weaponId) {
  state.pickups.push({ kind: 'ammo', weapon: weaponId, x, y, taken: false });
}

export function collectAmmoPickups(state) {
  const p = state.player;
  for (const pk of state.pickups) {
    if (pk.kind !== 'ammo' || pk.taken) continue;
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 60) {
      pk.taken = true;
      const give = { scattergun: 12, smg: 60, rifle: 12 }[pk.weapon] || 12;
      p.ammo[pk.weapon] = (p.ammo[pk.weapon] || 0) + give;
      state.message = `Picked up ${give} ${pk.weapon} rounds.`;
      state.messageTimer = 2;
    }
  }
}

export function spawnExplosiveBarrel(state, x, y) {
  state.pickups.push({ kind: 'barrel', x, y, taken: false, health: 20 });
}

export function shootExplosiveBarrel(state, barrel) {
  barrel.taken = true;
  state.shake = 16;
  for (let i = 0; i < 30; i++) {
    state.particles.push({
      kind: 'fire', x: barrel.x + (Math.random() - 0.5) * 60, y: barrel.y + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300,
      life: 0.9, max: 0.9, size: 20, color: ['#ff5c5c', '#ff9a3d', '#ffd21f'][i % 3],
    });
  }
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - barrel.x, ped.y - barrel.y) < 160) {
      ped.health = (ped.health ?? 60) - 100;
      if (ped.health <= 0) ped.state = 'down';
    }
  }
  state.pickups = state.pickups.filter(pk => pk !== barrel);
}

export function weaponKickback(state, weaponId) {
  return weaponId === 'rifle' ? 5 : weaponId === 'scattergun' ? 4 : 2;
}

// ---- The weapon stats table and the gun shop ----

export function weaponStatsTable() {
  return Object.entries(WEAPONS).map(([id, w]) => ({
    id, name: w.name, damage: w.damage, rate: w.rate,
    range: w.range, dps: Math.round(w.damage / w.rate),
  }));
}

export function bestWeaponForRange(dist) {
  if (dist > 600) return 'rifle';
  if (dist > 300) return 'smg';
  if (dist > 120) return 'scattergun';
  return 'pistol';
}

export function gunShopStock() {
  return [
    { id: 'pistol', name: 'Pistol', price: 0, note: 'Standard issue, always with you' },
    { id: 'scattergun', name: 'Scattergun', price: 400, note: 'Close quarters, six pellets' },
    { id: 'smg', name: 'SMG', price: 900, note: 'Fast, hungry, honest' },
    { id: 'rifle', name: 'Rifle', price: 1800, note: 'Long range, scope glint, heavy damage' },
  ];
}

export function buyWeaponAtShop(state, weaponId) {
  const item = gunShopStock().find(g => g.id === weaponId);
  if (!item) return false;
  if (state.player.weapons.includes(weaponId)) return false;
  if (state.player.cash < item.price) {
    state.message = `The ${item.name} costs $${item.price}.`;
    state.messageTimer = 3;
    return false;
  }
  state.player.cash -= item.price;
  state.player.weapons.push(weaponId);
  state.player.ammo[weaponId] = { scattergun: 24, smg: 120, rifle: 30 }[weaponId] || 0;
  state.message = `${item.name} bought — ${item.note}.`;
  state.messageTimer = 4;
  return true;
}
