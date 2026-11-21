// Puerto Alba — High Water. A new game: resets the state for a seed, builds
// the city, places the player, the traffic, the crowd, the boats, the
// helicopter and the collectibles, and wires up missions, league, territory,
// safehouses and stats. Screenshot scenes call this first, then stage.

import { G, CFG, SAFEHOUSES, resetGameState } from './config.js';
import { buildPuertoAlbaCity } from './city-map.js';
import { initTerritory } from './territory.js';
import { spawnTrafficCar, spawnMarkedSedan } from './vehicles-cars.js';
import { launchSpeedboat } from './boats.js';
import { spawnParkedHelicopter } from './helicopter.js';
import { mountMotorcycle } from './motorcycles.js';
import { spawnPedestrianCrowd } from './pedestrians.js';
import { seedTrafficAround } from './traffic-ai.js';
import { scatterSunShells, spawnArmorPickup } from './side-activities.js';
import { spawnStreetVendor, spawnJogger, spawnTouristGroup } from './pedestrians.js';
import { spawnExplosiveBarrel } from './combat-weapons.js';
import { mulberry32 } from './random.js';

export function initNewGameState(state, seed) {
  resetGameState(seed);
  state.rng = mulberry32(seed);
  buildPuertoAlbaCity(state, seed);
  initTerritory(state);
  state.player = {
    x: state.city.spawn.x, y: state.city.spawn.y, angle: -Math.PI / 2,
    onFoot: true, vehicle: null, health: 100, armor: 0,
    cash: CFG.START_CASH, respect: 1, wanted: 0, heat: 0, stamina: 100,
    weapon: 'pistol', weapons: ['pistol'],
    ammo: { pistol: 9999, scattergun: 0, smg: 0, rifle: 0 },
    aimAngle: 0, moving: false, lastShot: 0,
  };
  state.missions = { current: null, done: [], started: {}, next: 1, courier: null };
  state.league = { current: null, won: 0, wonByRace: {}, table: [] };
  state.side = { taxi: null, faresDone: 0, shells: 0, exportsDone: 0 };
  state.safehouses = SAFEHOUSES.map(h => ({ ...h }));
  state.tuning = { underglow: null, wheels: 'stock', spoiler: null, carsTuned: 0 };
  state.stats = { carsDriven: 0, boatsDriven: 0, heliFlights: 0, distance: 0, completion: 0 };
  state.audio = {};
  state.camera.x = state.player.x - 640;
  state.camera.y = state.player.y - 400;
  // The world, alive from the first frame: the marked sedan for mission 1,
  // traffic on the roads, a crowd on the sidewalks, boats at the docks, a
  // helicopter on the airstrip, a bike outside Club Lumen.
  spawnMarkedSedan(state, 1000, 800);
  seedTrafficAround(state, 1000, 800, 18);
  spawnPedestrianCrowd(state, 1000, 800, 34);
  launchSpeedboat(state, 4300, 2650, 'skiff');
  launchSpeedboat(state, 4500, 2680, 'speedboat');
  spawnParkedHelicopter(state, 5200, 560, true);
  spawnParkedHelicopter(state, 5050, 700, false);
  mountMotorcycle(state, 1100, 1950);
  scatterSunShells(state);
  spawnArmorPickup(state, 700, 600);
  spawnArmorPickup(state, 4600, 2300);
  state.pickups.push({ kind: 'health', x: 1000, y: 760, taken: false });
  spawnExtraWorldLife(state);
  spawnMissionProps(state);
  state.banner = {
    title: 'PUERTO ALBA — HIGH WATER',
    sub: 'Dana Ríos · Mission 1: First Wheels — steal the marked sedan',
    checklist: ['Steal the marked sedan', 'Deliver it to the marina'],
  };
  state.objectives = state.banner.checklist;
  return state;
}

export function resetWorldToSeed(state, seed) {
  return initNewGameState(state, seed);
}

// ---- Extra world dressing for a new game ----

export function spawnExtraWorldLife(state) {
  // Vendors in the old town, joggers on the beachfront, tourists at the
  // marina, rivals watching the turf blocks.
  spawnStreetVendor(state, 900, 700);
  spawnStreetVendor(state, 1200, 1100);
  spawnJogger(state, 600, 3400);
  spawnJogger(state, 1400, 3500);
  spawnTouristGroup(state, 4500, 2400);
  spawnTouristGroup(state, 5100, 3300);
  return state.peds.length;
}

export function spawnMissionProps(state) {
  // Crates for the dockside shootout, barrels near the marina, armour at
  // the safehouses and the paint shop.
  spawnExplosiveBarrel(state, 4400, 2200);
  spawnExplosiveBarrel(state, 4800, 2400);
  spawnExplosiveBarrel(state, 1000, 900);
  spawnArmorPickup(state, 1500, 500);
  spawnArmorPickup(state, 5200, 3300);
  return state.pickups.length;
}

// ---- Difficulty presets for a new game ----

export function difficultyPresets() {
  return {
    story: { name: 'Story', police: 0.7, damage: 0.7, payout: 1.2, note: 'The city is kinder.' },
    normal: { name: 'Normal', police: 1, damage: 1, payout: 1, note: 'Puerto Alba as it is.' },
    hard: { name: 'Hard', police: 1.4, damage: 1.4, payout: 1.5, note: 'The Aldana family is watching.' },
  };
}

export function applyDifficulty(state, presetId) {
  const preset = difficultyPresets()[presetId] || difficultyPresets().normal;
  state.difficulty = preset;
  state.player.cash = Math.round(CFG.START_CASH * preset.payout);
  return preset;
}

export function newGamePlus(state) {
  // After the finale, a new game keeps the garage and the respect.
  const keep = {
    cash: state.player.cash,
    respect: state.player.respect,
    garage: state.garageCars || [],
  };
  initNewGameState(state, state.seed + 1);
  state.player.cash = keep.cash;
  state.player.respect = keep.respect;
  state.garageCars = keep.garage;
  state.message = 'New Game+: the garage and the respect carry over.';
  state.messageTimer = 5;
  return keep;
}
