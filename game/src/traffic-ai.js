// Puerto Alba — High Water. Traffic: about twenty-eight cars following the
// lanes, stopping at junctions, fleeing from gunfire and sirens. The city
// feels alive because the traffic never stops moving around the player.

import { G, CFG, clamp } from './config.js';
import { rngRange, rngPick, rngChance } from './random.js';
import { spawnTrafficCar } from './vehicles-cars.js';

export function driveTrafficCar(state, car, dt) {
  // Traffic follows the road grid: pick a lane, cruise, turn at junctions.
  car.junctionTimer = (car.junctionTimer || 0) - dt;
  const onV = nearestRoadV(state, car.x);
  const onH = nearestRoadH(state, car.y);
  if (car.junctionTimer <= 0 && (onV !== null || onH !== null)) {
    car.junctionTimer = rngRange(state.rng, 2, 5);
    if (rngChance(state.rng, 0.35)) {
      // Turn onto the crossing road.
      if (onV !== null) car.angle = rngPick(state.rng, [0, Math.PI]);
      else car.angle = rngPick(state.rng, [Math.PI / 2, -Math.PI / 2]);
    }
  }
  // Flee from gunfire and sirens: faster, and away from the player.
  const p = state.player;
  const dPlayer = Math.hypot(p.x - car.x, p.y - car.y);
  const fleeing = (p.wanted >= 2 && dPlayer < 420) || state.tracers.length > 0;
  const targetSpeed = fleeing ? car.top * 0.85 : car.top * 0.45;
  car.speed = Math.min(targetSpeed, car.speed + 260 * dt);
  if (fleeing && dPlayer < 300) {
    const away = Math.atan2(car.y - p.y, car.x - p.x);
    let diff = away - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += clamp(diff, -2 * dt, 2 * dt);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Stay inside the city; wrap around the edges so traffic never runs out.
  if (car.x < 120) { car.x = 120; car.angle = 0; }
  if (car.x > CFG.WORLD_W - 120) { car.x = CFG.WORLD_W - 120; car.angle = Math.PI; }
  if (car.y < 120) { car.y = 120; car.angle = Math.PI / 2; }
  if (car.y > CFG.WORLD_H - 120) { car.y = CFG.WORLD_H - 120; car.angle = -Math.PI / 2; }
  // Gentle separation so cars do not stack on each other.
  for (const other of state.vehicles) {
    if (other === car || other.kind !== 'car') continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d > 0 && d < 90) {
      car.x -= ((other.x - car.x) / d) * (90 - d) * 0.3;
      car.y -= ((other.y - car.y) / d) * (90 - d) * 0.3;
    }
  }
}

export function nearestRoadV(state, x) {
  let best = null, bestD = 60;
  for (const rx of state.city.roadsV) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = rx; }
  }
  return best;
}

export function nearestRoadH(state, y) {
  let best = null, bestD = 60;
  for (const ry of state.city.roadsH) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = ry; }
  }
  return best;
}

export function seedTrafficAround(state, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const vertical = rngChance(state.rng, 0.5);
    let x, y;
    if (vertical) {
      x = rngPick(state.rng, state.city.roadsV) + rngPick(state.rng, [-24, 24]);
      y = clamp(cy + rngRange(state.rng, -700, 700), 200, 3600);
    } else {
      x = clamp(cx + rngRange(state.rng, -700, 700), 200, 5800);
      y = rngPick(state.rng, state.city.roadsH) + rngPick(state.rng, [-24, 24]);
    }
    spawnTrafficCar(state, null, x, y);
  }
}

export function updateTraffic(state, dt) {
  for (const v of state.vehicles) {
    if (v.kind !== 'car') continue;
    if (v === state.player.vehicle) continue;
    driveTrafficCar(state, v, dt);
  }
}

// ---- Junctions, taxis and the rush hour ----

export function trafficAtJunction(state, car) {
  const onV = nearestRoadV(state, car.x);
  const onH = nearestRoadH(state, car.y);
  return onV !== null && onH !== null;
}

export function taxiCruiseForFare(state, taxi) {
  // Taxis cruise the avenues looking for a fare, slow and predictable.
  taxi.speed = Math.min(taxi.top * 0.35, taxi.speed + 120 * 0.016);
  const p = state.player;
  if (p.onFoot && Math.hypot(p.x - taxi.x, p.y - taxi.y) < 120) {
    taxi.speed = 0;
    return true;
  }
  return false;
}

export function rushHourDensity(state) {
  const phase = state.timeOfDay;
  if (phase > 0.3 && phase < 0.4) return 1.5; // morning rush
  if (phase > 0.66 && phase < 0.76) return 1.4; // evening rush
  if (phase > 0.8) return 0.7; // late night, quiet streets
  return 1;
}

export function despawnFarTraffic(state) {
  const p = state.player;
  state.vehicles = state.vehicles.filter(v => {
    if (v === p.vehicle) return true;
    if (v.marked) return true;
    return Math.hypot(v.x - p.x, v.y - p.y) < 1600;
  });
}

// ---- Bus routes and delivery vans ----

export function busRouteStops() {
  return [
    { x: 600, y: 500, name: 'Casco Viejo' },
    { x: 2200, y: 500, name: 'Avenida del Sol' },
    { x: 3800, y: 500, name: 'Zona Franca' },
    { x: 600, y: 1700, name: 'Barrio Lumen' },
    { x: 2200, y: 1700, name: 'Las Colinas' },
    { x: 3800, y: 1700, name: 'Marina' },
  ];
}

export function spawnCityBus(state, x, y) {
  const bus = {
    kind: 'bus', cls: 'van', name: 'Alba Bus', x, y, angle: 0,
    speed: 0, top: 320, color: '#37c8e8', health: 100,
    routeIndex: 0, stopTimer: 0,
  };
  state.vehicles.push(bus);
  return bus;
}

export function driveCityBus(state, bus, dt) {
  const stops = busRouteStops();
  const target = stops[bus.routeIndex % stops.length];
  const d = Math.hypot(target.x - bus.x, target.y - bus.y);
  if (d < 80) {
    bus.stopTimer += dt;
    bus.speed = 0;
    if (bus.stopTimer > 4) {
      bus.stopTimer = 0;
      bus.routeIndex += 1;
    }
    return;
  }
  bus.angle = Math.atan2(target.y - bus.y, target.x - bus.x);
  bus.speed = Math.min(bus.top, bus.speed + 200 * dt);
  bus.x += Math.cos(bus.angle) * bus.speed * dt;
  bus.y += Math.sin(bus.angle) * bus.speed * dt;
}

export function deliveryVanSchedule(state) {
  return [
    { from: 'Zona Franca', to: 'Marina', at: '08:00' },
    { from: 'Marina', to: 'Casco Viejo', at: '12:00' },
    { from: 'Casco Viejo', to: 'Barrio Lumen', at: '18:00' },
    { from: 'Barrio Lumen', to: 'Zona Franca', at: '22:00' },
  ];
}
