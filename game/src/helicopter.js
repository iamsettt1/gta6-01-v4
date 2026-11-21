// Puerto Alba — High Water. The flyable helicopter: steal one from the Zona
// Franca airstrip (or a police helicopter at five stars), fly it over the
// city with rotor wash, a searchlight cone you control, an altitude shadow,
// and land it on rooftops and the airstrip. The finale escapes by helicopter.

import { G, CFG, AIRSTRIP, clamp, lerp } from './config.js';
import { rngRange } from './random.js';

export function stealPoliceHelicopter(state, x, y) {
  const heli = {
    kind: 'heli', x, y, angle: -Math.PI / 2, speed: 0, alt: 0, targetAlt: 0,
    police: true, searchlight: 0, rotor: 0, health: 100,
    color: '#20242e', stripe: '#c23a3a', label: 'POLICÍA',
  };
  state.helis.push(heli);
  state.player.vehicle = heli;
  state.player.onFoot = false;
  // The pilot rides the helicopter: sync the player to the cockpit.
  state.player.x = x;
  state.player.y = y;
  state.player.angle = heli.angle;
  state.stats.heliFlights += 1;
  state.message = 'HELICOPTER STOLEN — fly with W/S, steer with A/D, land with S';
  state.messageTimer = 5;
  return heli;
}

export function spawnParkedHelicopter(state, x, y, police) {
  const heli = {
    kind: 'heli', x, y, angle: -Math.PI / 2, speed: 0, alt: 0, targetAlt: 0,
    police: !!police, searchlight: 0, rotor: 0, health: 100,
    color: police ? '#20242e' : '#e8b13d', stripe: police ? '#c23a3a' : '#20242e',
    label: police ? 'POLICÍA' : 'ALBA AIR',
  };
  state.helis.push(heli);
  return heli;
}

export function flyHelicopter(state, heli, dt) {
  const keys = state.keys;
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];
  if (up) { heli.targetAlt = Math.min(260, heli.targetAlt + 160 * dt); heli.speed = Math.min(560, heli.speed + 420 * dt); }
  if (down) { heli.targetAlt = Math.max(0, heli.targetAlt - 200 * dt); heli.speed = Math.max(0, heli.speed - 300 * dt); }
  if (left) heli.angle -= 1.9 * dt;
  if (right) heli.angle += 1.9 * dt;
  if (!up && !down) heli.speed = lerp(heli.speed, heli.targetAlt > 0 ? 240 : 0, dt * 0.8);
  heli.alt = lerp(heli.alt, heli.targetAlt, dt * 1.4);
  heli.x += Math.cos(heli.angle) * heli.speed * dt;
  heli.y += Math.sin(heli.angle) * heli.speed * dt;
  heli.x = clamp(heli.x, 80, CFG.WORLD_W - 80);
  heli.y = clamp(heli.y, 80, CFG.WORLD_H - 80);
  heli.rotor += dt * (18 + heli.speed / 40);
  heli.searchlight = Math.atan2(state.mouse.y - 400, state.mouse.x - 640);
  // Rotor wash: ripple rings on the water and dust on land below.
  if (heli.alt > 4 && heli.alt < 120 && state.frame % 4 === 0) {
    for (let i = 0; i < 3; i++) {
      state.particles.push({
        kind: 'wash', x: heli.x + rngRange(state.rng, -70, 70), y: heli.y + rngRange(state.rng, -70, 70),
        vx: rngRange(state.rng, -40, 40), vy: rngRange(state.rng, -40, 40),
        life: 0.7, max: 0.7, size: rngRange(state.rng, 14, 30), color: '#cfe8ff',
      });
    }
  }
  // The player rides the helicopter.
  state.player.x = heli.x;
  state.player.y = heli.y;
  state.player.angle = heli.angle;
  state.stats.distance += heli.speed * dt / 100;
}

export function policeHelicopterPursuit(state, dt) {
  // At five stars a police helicopter spawns above the city and tracks the
  // player with its searchlight cone.
  const wanted = state.player.wanted;
  let ph = state.helis.find(h => h.police && h !== state.player.vehicle && h.pursuit);
  if (wanted >= 5 && !ph) {
    ph = spawnParkedHelicopter(state, state.player.x + 500, state.player.y - 600, true);
    ph.pursuit = true;
    ph.alt = 240; ph.targetAlt = 240;
    state.message = 'POLICE HELICOPTER INBOUND — break line of sight!';
    state.messageTimer = 4;
  }
  if (ph) {
    if (wanted < 5) { ph.pursuit = false; ph.targetAlt = 0; }
    const dx = state.player.x - ph.x, dy = state.player.y - ph.y;
    const d = Math.hypot(dx, dy) || 1;
    ph.angle = Math.atan2(dy, dx);
    ph.speed = Math.min(520, ph.speed + 300 * dt);
    ph.x += Math.cos(ph.angle) * ph.speed * dt * 0.6;
    ph.y += Math.sin(ph.angle) * ph.speed * dt * 0.6;
    ph.rotor += dt * 22;
    ph.searchlight = Math.atan2(state.player.y - ph.y, state.player.x - ph.x);
    if (d < 90) state.player.health -= 6 * dt; // searchlight pin + rotor fire
  }
}

export function drawHelicopter(ctx, heli, camX, camY, t) {
  const sx = heli.x - camX, sy = heli.y - camY - heli.alt;
  // Altitude shadow on the ground, shrinking as the helicopter climbs.
  const shScale = Math.max(0.35, 1 - heli.alt / 320);
  ctx.save();
  ctx.globalAlpha = 0.3 * shScale;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(heli.x - camX, heli.y - camY, 46 * shScale, 20 * shScale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Searchlight cone the pilot controls.
  if (heli.alt > 10 || heli.pursuit) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(heli.searchlight);
    const grad = ctx.createLinearGradient(0, 0, 560, 0);
    grad.addColorStop(0, 'rgba(255,244,180,0.5)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(560, -90); ctx.lineTo(560, 90); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(heli.angle);
  // Rotor blur disc.
  ctx.strokeStyle = 'rgba(220,230,240,0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 64 + Math.sin(t * 40) * 2, 12, 0, 0, Math.PI * 2); ctx.stroke();
  // Tail boom, body, cockpit, skids — big bold shapes.
  ctx.fillStyle = heli.color;
  ctx.fillRect(-58, -8, 92, 16);
  ctx.beginPath(); ctx.ellipse(10, 0, 42, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9fe8ff';
  ctx.beginPath(); ctx.ellipse(38, 0, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = heli.stripe;
  ctx.fillRect(-20, -26, 60, 8);
  ctx.fillRect(-20, 18, 60, 8);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(heli.label, 8, 4);
  ctx.strokeStyle = '#30303a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-30, 26); ctx.lineTo(-30, 40); ctx.moveTo(30, 26); ctx.lineTo(30, 40); ctx.stroke();
  ctx.restore();
}

export function nearestHelicopter(state, x, y, maxD) {
  let best = null, bestD = maxD * maxD;
  for (const h of state.helis) {
    const d = (h.x - x) * (h.x - x) + (h.y - y) * (h.y - y);
    if (d < bestD) { bestD = d; best = h; }
  }
  return best;
}

// ---- Landing pads, rooftop landings and the airshow ----

export function landingPadLocations() {
  return [
    { name: 'Airstrip', x: 5200, y: 560 },
    { name: 'Marina Helipad', x: 4800, y: 1900 },
    { name: 'Avenida Tower', x: 2800, y: 800 },
    { name: 'Isla Faro', x: 5200, y: 3350 },
  ];
}

export function nearestLandingPad(state, x, y) {
  let best = null, bestD = Infinity;
  for (const pad of landingPadLocations()) {
    const d = (pad.x - x) * (pad.x - x) + (pad.y - y) * (pad.y - y);
    if (d < bestD) { bestD = d; best = pad; }
  }
  return best;
}

export function landHelicopter(state, heli) {
  heli.targetAlt = 0;
  heli.alt = 0;
  heli.speed = 0;
  const pad = nearestLandingPad(state, heli.x, heli.y);
  if (pad) {
    state.message = `Landed — ${pad.name}.`;
    state.messageTimer = 3;
  }
  return pad;
}

export function drawLandingPads(ctx, state, camX, camY) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const pad of landingPadLocations()) {
    const sx = pad.x - camX, sy = pad.y - camY;
    if (sx < -80 || sx > 1360 || sy < -80 || sy > 880) continue;
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(sx, sy, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd21f';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('H', sx, sy + 14);
  }
  ctx.restore();
}

// ---- Air traffic: the news chopper and the cargo plane ----

export function spawnNewsHelicopter(state, x, y) {
  const heli = spawnParkedHelicopter(state, x, y, false);
  heli.label = 'ALBA NEWS';
  heli.color = '#e8e8e8';
  heli.news = true;
  heli.alt = 200;
  heli.targetAlt = 200;
  return heli;
}

export function updateAirTraffic(state, dt) {
  for (const h of state.helis) {
    if (h === state.player.vehicle || h.pursuit) continue;
    if (h.news) {
      // The news chopper circles the city, filming the chase.
      h.angle += dt * 0.15;
      const cx = 2800, cy = 1800;
      const targetX = cx + Math.cos(h.angle) * 1400;
      const targetY = cy + Math.sin(h.angle) * 1000;
      h.x += (targetX - h.x) * dt * 0.3;
      h.y += (targetY - h.y) * dt * 0.3;
      h.rotor += dt * 20;
    }
  }
}

export function airTrafficReport(state) {
  return state.helis.map(h => ({
    label: h.label, alt: Math.round(h.alt), police: h.police,
    news: !!h.news, pursuit: !!h.pursuit,
  }));
}
