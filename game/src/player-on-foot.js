// Puerto Alba — High Water. Dana Ríos on foot: walk and run in eight
// directions, sprint stamina, enter and exit any vehicle with one key,
// shove pedestrians, carjack drivers, and talk to mission givers. Falling
// in the water sends you back to the dock with a small fine.

import { G, CFG, clamp, pointInWater } from './config.js';
import { collideWithBuildings } from './city-map.js';
import { nearestVehicle, carjackVehicle } from './vehicles-cars.js';
import { nearestBoat } from './boats.js';
import { nearestHelicopter } from './helicopter.js';
import { raiseWantedLevel } from './police-pursuit.js';

export function movePlayerOnFoot(state, dt) {
  const p = state.player;
  const keys = state.keys;
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  const sprinting = keys['shift'] && p.stamina > 0;
  const speed = sprinting ? CFG.PLAYER_RUN : CFG.PLAYER_WALK;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    p.angle = Math.atan2(dy, dx);
    p.moving = true;
    if (sprinting) p.stamina = Math.max(0, p.stamina - 26 * dt);
  } else {
    p.moving = false;
  }
  if (!sprinting) p.stamina = Math.min(100, p.stamina + 14 * dt);
  const nx = p.x + dx * speed * dt;
  const ny = p.y + dy * speed * dt;
  if (!collideWithBuildings(state, nx, p.y, 18)) p.x = clamp(nx, 40, CFG.WORLD_W - 40);
  if (!collideWithBuildings(state, p.x, ny, 18)) p.y = clamp(ny, 40, CFG.WORLD_H - 40);
  // Aim follows the mouse.
  const wx = state.camera.x + state.mouse.x;
  const wy = state.camera.y + state.mouse.y;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
  // Falling in the water: respawn at the dock with a small fine.
  if (pointInWater(p.x, p.y)) {
    const fine = Math.min(p.cash, 50);
    p.cash -= fine;
    p.x = 4600; p.y = 2750;
    p.health -= 10;
    state.message = `You fell in the harbour — dock fine $${fine}.`;
    state.messageTimer = 4;
  }
  state.stats.distance += (p.moving ? speed * dt : 0) / 100;
}

export function enterNearestVehicle(state) {
  const p = state.player;
  if (!p.onFoot) {
    exitCurrentVehicle(state);
    return false;
  }
  const heli = nearestHelicopter(state, p.x, p.y, 90);
  if (heli) {
    state.player.vehicle = heli;
    state.player.onFoot = false;
    if (heli.police && state.missions.current?.n !== 11) raiseWantedLevel(state, 2, 'police helicopter stolen');
    state.message = 'Helicopter — W/S for altitude, A/D to steer.';
    state.messageTimer = 4;
    return true;
  }
  const boat = nearestBoat(state, p.x, p.y, 90);
  if (boat && pointInWater(p.x, p.y + 40)) {
    state.player.vehicle = boat;
    state.player.onFoot = false;
    state.message = `${boat.name} — W/S throttle, A/D steer.`;
    state.messageTimer = 3;
    return true;
  }
  const car = nearestVehicle(state, p.x, p.y, 90);
  if (car) {
    carjackVehicle(state, car);
    if (car.marked) raiseWantedLevel(state, 1, 'carjacking witnessed');
    return true;
  }
  return false;
}

export function exitCurrentVehicle(state) {
  const p = state.player;
  const v = p.vehicle;
  if (!v) return;
  p.vehicle = null;
  p.onFoot = true;
  p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 70;
  p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 70;
  if (v.kind === 'heli') {
    v.targetAlt = 0;
    v.alt = 0;
  }
}

export function shovePedestrian(state) {
  const p = state.player;
  let best = null, bestD = 70 * 70;
  for (const ped of state.peds) {
    const d = (ped.x - p.x) * (ped.x - p.x) + (ped.y - p.y) * (ped.y - p.y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  if (!best) return false;
  best.state = 'flee';
  best.panic = 4;
  best.x += Math.cos(p.angle) * 60;
  best.y += Math.sin(p.angle) * 60;
  raiseWantedLevel(state, 1, 'assault witnessed');
  return true;
}

export function talkToMissionGiver(state) {
  const p = state.player;
  const givers = [
    { name: 'Celia Marín', x: 1000, y: 760 },
    { name: 'Rook', x: 4600, y: 2200 },
  ];
  for (const g of givers) {
    if (Math.hypot(p.x - g.x, p.y - g.y) < 90) {
      const next = state.missions.next || 1;
      if (!state.missions.current && next <= 12 && !state.missions.done.includes(next)) {
        state.message = `${g.name}: "Mission ${next} is yours, Dana. Check the board with J."`;
        state.messageTimer = 4;
        return g.name;
      }
      state.message = `${g.name}: "Keep moving, Dana. The city is watching."`;
      state.messageTimer = 3;
      return g.name;
    }
  }
  return null;
}

// ---- More on-foot interactions: pickpocket, hitchhike, hide ----

export function pickpocketPedestrian(state) {
  const p = state.player;
  let best = null, bestD = 60 * 60;
  for (const ped of state.peds) {
    if (ped.crew === 'aldana') continue;
    const d = (ped.x - p.x) * (ped.x - p.x) + (ped.y - p.y) * (ped.y - p.y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  if (!best) return 0;
  const take = 20 + Math.floor(Math.random() * 60);
  p.cash += take;
  best.state = 'flee';
  best.panic = 3;
  state.message = `Pickpocketed $${take} — the mark is running for the police.`;
  state.messageTimer = 3;
  return take;
}

export function hideFromPolice(state) {
  const p = state.player;
  const nearAlley = state.city.buildings.some(b => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return Math.hypot(p.x - cx, p.y - cy) < 120;
  });
  if (nearAlley && p.wanted > 0) {
    p.heat = Math.max(0, p.heat - 0.3);
    state.message = 'Hidden in the alley — the heat is fading.';
    state.messageTimer = 3;
    return true;
  }
  return false;
}

export function playerStaminaPercent(state) {
  return Math.round(state.player.stamina);
}

export function playerHealthPercent(state) {
  return Math.round(state.player.health);
}

// ---- Gestures, stamina and the sprint ----

export function playerGesture(state, gesture) {
  const gestures = {
    wave: 'Dana waves at the crowd.',
    taunt: 'Dana taunts the Aldana crew.',
    cheer: 'Dana cheers the league crowd.',
    hide: 'Dana ducks behind cover.',
  };
  state.message = gestures[gesture] || 'Dana shrugs.';
  state.messageTimer = 2;
  return state.message;
}

export function staminaCostForSprint(dt) {
  return 26 * dt;
}

export function staminaRegenRate(dt) {
  return 14 * dt;
}

export function canSprint(state) {
  return state.player.stamina > 5;
}

export function exhaustedWarning(state) {
  if (state.player.stamina <= 0) {
    state.message = 'Exhausted — catch your breath.';
    state.messageTimer = 2;
    return true;
  }
  return false;
}
