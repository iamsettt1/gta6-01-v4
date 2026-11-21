// Puerto Alba — High Water. Cars: ten classes with distinct speed, grip and
// look — compact to supercar, taxi to police interceptor — plus the parked
// cars on every street. Steal any of them, drive them, wreck them, repaint
// them, tune them.

import { G, CFG, CAR_CLASSES, EXPORT_CARS, clamp, lerp } from './config.js';
import { rngPick, rngRange } from './random.js';

export function spawnTrafficCar(state, clsId, x, y) {
  const cls = CAR_CLASSES.find(c => c.id === clsId) || rngPick(state.rng, CAR_CLASSES);
  const car = {
    kind: 'car', cls: cls.id, name: cls.name, x, y,
    angle: rngPick(state.rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: 0, top: cls.top, grip: cls.grip, color: cls.color,
    health: 100, driver: true, underglow: null, wheels: 'stock', spoiler: null,
    marked: false, taxi: cls.id === 'taxi',
  };
  state.vehicles.push(car);
  return car;
}

export function spawnMarkedSedan(state, x, y) {
  const car = spawnTrafficCar(state, 'sedan', x, y);
  car.marked = true;
  car.color = '#ffd21f';
  car.driver = true;
  return car;
}

export function drivePlayerCar(state, car, dt) {
  const keys = state.keys;
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];
  const handbrake = keys[' '];
  if (up) car.speed = Math.min(car.top, car.speed + 520 * dt);
  if (down) car.speed = Math.max(-160, car.speed - 420 * dt);
  if (!up && !down) car.speed = lerp(car.speed, 0, dt * (handbrake ? 4 : 0.9));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * 2.3 * dt * dir * clamp(Math.abs(car.speed) / 200, 0.25, 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Skid marks and dust when the wheels break loose.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 260 && state.frame % 3 === 0) {
    state.particles.push({
      kind: 'skid', x: car.x - Math.cos(car.angle) * 30, y: car.y - Math.sin(car.angle) * 30,
      vx: 0, vy: 0, life: 0.9, max: 0.9, size: 10, color: 'rgba(20,20,20,0.7)',
    });
  }
  car.x = clamp(nx, 60, CFG.WORLD_W - 60);
  car.y = clamp(ny, 60, CFG.WORLD_H - 60);
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  state.stats.carsDriven += 1;
  state.stats.distance += Math.abs(car.speed) * dt / 100;
  return car;
}

export function carjackVehicle(state, car) {
  if (!car) return false;
  if (car.driver) {
    car.driver = false;
    // Pull the driver out onto the sidewalk as a pedestrian.
    state.peds.push({
      kind: 'ped', x: car.x + 60, y: car.y + 60, angle: 0, speed: 0,
      color: '#e8d49a', state: 'flee', panic: 3,
    });
    state.message = 'Driver pulled out — the car is yours.';
    state.messageTimer = 3;
  }
  state.player.vehicle = car;
  state.player.onFoot = false;
  return true;
}

export function nearestVehicle(state, x, y, maxD) {
  let best = null, bestD = maxD * maxD;
  for (const v of state.vehicles) {
    const d = (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

export function damageCar(state, car, amount) {
  car.health -= amount;
  state.shake = Math.max(state.shake, 3);
  if (car.health <= 0) {
    explodeCar(state, car);
    return true;
  }
  return false;
}

export function explodeCar(state, car) {
  state.vehicles = state.vehicles.filter(v => v !== car);
  if (state.player.vehicle === car) {
    state.player.vehicle = null;
    state.player.onFoot = true;
    state.player.health -= 30;
  }
  for (let i = 0; i < 26; i++) {
    state.particles.push({
      kind: 'fire', x: car.x + rngRange(state.rng, -30, 30), y: car.y + rngRange(state.rng, -30, 30),
      vx: rngRange(state.rng, -160, 160), vy: rngRange(state.rng, -160, 160),
      life: rngRange(state.rng, 0.4, 1.1), max: 1.1, size: rngRange(state.rng, 14, 34),
      color: rngPick(state.rng, ['#ff5c5c', '#ff9a3d', '#ffd21f', '#3a3a3a']),
    });
  }
  state.shake = 14;
  state.message = 'Car destroyed!';
  state.messageTimer = 3;
}

export function drawCar(ctx, car, camX, camY, t) {
  const sx = car.x - camX, sy = car.y - camY;
  // Neon underglow spills onto the asphalt first.
  if (car.underglow) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = car.underglow;
    ctx.beginPath(); ctx.ellipse(sx, sy, 56, 32, car.angle, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  // Body: a big bold slab with a cabin, headlights and tail lights.
  ctx.fillStyle = car.color;
  const L = car.cls === 'van' ? 96 : 84;
  ctx.fillRect(-L / 2, -20, L, 40);
  ctx.fillStyle = 'rgba(20,24,34,0.9)';
  ctx.fillRect(-L / 2 + 14, -17, 30, 34);
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(L / 2 - 26, -15, 10, 30);
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(L / 2 - 4, -18, 5, 8);
  ctx.fillRect(L / 2 - 4, 10, 5, 8);
  ctx.fillStyle = '#ff2a2a';
  ctx.fillRect(-L / 2, -18, 5, 8);
  ctx.fillRect(-L / 2, 10, 5, 8);
  // Wheels.
  ctx.fillStyle = car.wheels === 'chrome' ? '#d8d8e8' : car.wheels === 'gold' ? '#ffd21f' : '#181818';
  ctx.fillRect(-28, -24, 18, 8);
  ctx.fillRect(12, -24, 18, 8);
  ctx.fillRect(-28, 16, 18, 8);
  ctx.fillRect(12, 16, 18, 8);
  // Spoiler.
  if (car.spoiler) {
    ctx.fillStyle = car.color;
    ctx.fillRect(-L / 2 - 10, -26, 8, 52);
  }
  // Taxi checker, police livery, marked-mission beacon.
  if (car.taxi) {
    ctx.fillStyle = '#20202e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 4);
  }
  if (car.cls === 'interceptor') {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 4);
  }
  ctx.restore();
  if (car.marked) {
    ctx.save();
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(sx, sy, 62 + Math.sin(t * 5) * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd21f';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STEAL THIS', sx, sy - 72);
    ctx.restore();
  }
  if (car.health < 50) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(sx - 20, sy - 10, 18 + Math.sin(t * 9) * 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---- Damage smoke, horns and the export check ----

export function carDamageSmoke(state, car) {
  if (car.health > 50) return;
  if (state.frame % 6 !== 0) return;
  state.particles.push({
    kind: 'smoke', x: car.x - Math.cos(car.angle) * 30, y: car.y - Math.sin(car.angle) * 30,
    vx: 0, vy: -30, life: 1.2, max: 1.2, size: 22, color: 'rgba(60,60,60,0.7)',
  });
}

export function honkCarHorn(state, car) {
  state.message = `${car.name} — beep beep!`;
  state.messageTimer = 1;
}

export function isExportCar(state, car) {
  return EXPORT_CARS.some(e => e.id === car.cls && !e.done);
}

export function vehicleConditionLabel(car) {
  if (car.health > 75) return 'Mint';
  if (car.health > 50) return 'Scuffed';
  if (car.health > 25) return 'Battered';
  return 'About to blow';
}

export function carValueEstimate(car) {
  const base = { compact: 800, sedan: 1200, muscle: 2400, sports: 3600, supercar: 8000, suv: 1800, pickup: 1500, van: 900, taxi: 1100, interceptor: 0, bike: 2200 }[car.cls] || 1000;
  return Math.round(base * (car.health / 100));
}

// ---- The car showroom and the impound lot ----

export function showroomCars() {
  return CAR_CLASSES.map(c => ({
    id: c.id, name: c.name, top: c.top, grip: c.grip, color: c.color,
    blurb: c.id === 'supercar' ? 'The fastest thing on the island bridges.' : 'A Puerto Alba classic.',
  }));
}

export function showroomPrice(cls) {
  const prices = {
    compact: 800, sedan: 1200, muscle: 2400, sports: 3600, supercar: 8000,
    suv: 1800, pickup: 1500, van: 900, taxi: 1100, interceptor: 0,
  };
  return prices[cls] || 1000;
}

export function impoundLotCars(state) {
  return state.vehicles.filter(v => v.health <= 0 || v.impounded);
}

export function impoundCar(state, car) {
  car.impounded = true;
  car.health = 20;
  state.message = `${car.name} impounded — pay the fee at the lot to get it back.`;
  state.messageTimer = 4;
  return true;
}

export function reclaimImpoundedCar(state, car) {
  const fee = 250;
  if (state.player.cash < fee) return false;
  state.player.cash -= fee;
  car.impounded = false;
  car.health = 60;
  state.message = `${car.name} reclaimed for $${fee}.`;
  state.messageTimer = 3;
  return true;
}
