// Puerto Alba — High Water. The four deterministic screenshot scenes. Each
// one stages the real game state from a fresh seeded world — real rules,
// staged spawns around the player for density — paints twice, and sets
// window.__shotReady. Every scene is composed for the small contact-sheet
// cell first: few, big actors, bold colour blocks, nothing thinner than
// about eight pixels at full size.

import { G, CFG, DISTRICTS, MISSIONS, LEAGUE_RACES, clamp } from './config.js';
import { buildPuertoAlbaCity } from './city-map.js';
import { initTerritory, claimTurfBlock } from './territory.js';
import { startStoryMission } from './missions-story.js';
import { startLeagueRace } from './races-league.js';
import { stealPoliceHelicopter, spawnParkedHelicopter } from './helicopter.js';
import { launchSpeedboat, spawnPoliceBoat } from './boats.js';
import { spawnTrafficCar, spawnMarkedSedan } from './vehicles-cars.js';
import { mountMotorcycle } from './motorcycles.js';
import { spawnPedestrianCrowd, spawnAldanaRivals } from './pedestrians.js';
import { seedTrafficAround } from './traffic-ai.js';
import { triggerStormFront } from './storm-weather.js';
import { fitNeonUnderglow } from './tuning-shop.js';
import { initNewGameState } from './new-game.js';

export function stageScreenshotScene(state, name, seed) {
  initNewGameState(state, seed);
  state.shot = name;
  state.screen = 'play';
  if (name === 'heli') stageHeliScene(state);
  else if (name === 'race') stageRaceScene(state);
  else if (name === 'rifle') stageRifleScene(state);
  else if (name === 'garage') stageGarageScene(state);
  else stageHeliScene(state);
  // Centre the camera on the staged player and paint twice. A scene may
  // shift the camera (the helicopter's altitude lifts it off-centre).
  const offY = state.cameraOffsetY || 0;
  state.camera.x = clamp(state.player.x - 640, 0, CFG.WORLD_W - CFG.VIEW_W);
  state.camera.y = clamp(state.player.y - 400 + offY, 0, CFG.WORLD_H - CFG.VIEW_H);
  return state;
}

export function stageHeliScene(state) {
  // Puerto Alba Marina, dusk storm. The player in a stolen police
  // helicopter above the harbour, searchlight sweeping the docks.
  state.timeOfDay = 0.74;
  triggerStormFront(state, 0.9);
  state.storm.flash = 0.55;
  const heli = stealPoliceHelicopter(state, 4700, 2250);
  heli.alt = 140; heli.targetAlt = 140;
  heli.speed = 200;
  heli.searchlight = Math.PI / 2;
  // The altitude lifts the helicopter 140px up-screen; shift the camera
  // down the same amount so the helicopter sits dead centre.
  state.cameraOffsetY = -140;
  state.player.weapon = 'rifle';
  state.player.ammo = { pistol: 48, scattergun: 12, smg: 90, rifle: 24 };
  state.player.cash = 12500;
  state.player.respect = 7;
  state.player.wanted = 5;
  state.player.heat = 1;
  // A speedboat with a white wake and two police boats in pursuit below,
  // all inside the frame under the helicopter.
  const boat = launchSpeedboat(state, 4650, 2420, 'speedboat');
  boat.speed = 420; boat.angle = Math.PI / 2;
  spawnPoliceBoat(state, 4400, 2460);
  spawnPoliceBoat(state, 4980, 2440);
  launchSpeedboat(state, 4300, 2420, 'skiff');
  // Density: traffic on the marina roads, a crowd on the docks.
  seedTrafficAround(state, 4700, 2350, 10);
  spawnPedestrianCrowd(state, 4700, 2600, 14);
  spawnParkedHelicopter(state, 5200, 560, true);
  const m = startStoryMission(state, 12);
  m.stage = 1;
  state.banner = {
    title: 'HIGH-WATER HEIST — LOSE THE HELICOPTER',
    sub: 'Celia Marín: the vault is cracked — get clear at five stars',
    checklist: ['Vault convoy cracked', 'Escape at 5 stars', 'Lose the police helicopter'],
  };
  state.objectives = state.banner.checklist;
}

export function stageRaceScene(state) {
  // Barrio Lumen, night, rain. Four neon-underglow cars at a street-race
  // start line, a crowd behind barriers, club signage, wet asphalt.
  state.timeOfDay = 0.86;
  state.weather = 'rain';
  state.storm.active = true;
  state.storm.intensity = 0.55;
  state.storm.flash = 0;
  const px = 1000, py = 2000;
  const playerCar = spawnTrafficCar(state, 'sports', px, py);
  playerCar.color = '#37c8e8';
  playerCar.underglow = '#37e8ff';
  playerCar.tuned = true;
  playerCar.speed = 140;
  state.player.vehicle = playerCar;
  state.player.onFoot = false;
  state.player.x = px; state.player.y = py; state.player.angle = -Math.PI / 2;
  const rivals = [
    ['muscle', '#ff5c5c', '#ff4fd8', px - 140, py - 70],
    ['supercar', '#7dff5c', '#7dff5c', px + 140, py - 70],
    ['sedan', '#ffd21f', '#ffd21f', px - 140, py + 90],
  ];
  for (const [cls, color, glow, x, y] of rivals) {
    const c = spawnTrafficCar(state, cls, x, y);
    c.color = color;
    c.underglow = glow;
    c.angle = -Math.PI / 2;
  }
  // The crowd: twelve-plus pedestrians behind the barriers.
  spawnPedestrianCrowd(state, px, py, 16);
  seedTrafficAround(state, px, py, 6);
  const race = startLeagueRace(state, 3);
  race.time = 42.6;
  // The next checkpoint sits right of the player, clear of the banner,
  // the league table and the minimap.
  race.checkpoints[0] = { x: 840, y: 1980, r: 90, lap: 1 };
  state.player.wanted = 1;
  state.player.cash = 8400;
  state.player.respect = 5;
  state.player.weapon = 'smg';
  state.player.ammo = { pistol: 48, scattergun: 12, smg: 90, rifle: 0 };
}

export function stageRifleScene(state) {
  // Casco Viejo rooftops, golden hour. The player on foot with the rifle,
  // three Aldana rivals taking cover, the plaza fountain framing the scene.
  state.timeOfDay = 0.55;
  state.weather = 'clear';
  const px = 1000, py = 900;
  state.player.x = px; state.player.y = py;
  state.player.angle = -Math.PI / 4;
  state.player.onFoot = true;
  state.player.vehicle = null;
  state.player.weapon = 'rifle';
  state.player.weapons = ['pistol', 'scattergun', 'smg', 'rifle'];
  state.player.ammo = { pistol: 48, scattergun: 12, smg: 90, rifle: 24 };
  state.player.wanted = 3;
  state.player.cash = 9200;
  state.player.respect = 6;
  // Three Aldana rivals taking cover behind crates and a parked car.
  spawnAldanaRivals(state, 1150, 760, 3);
  spawnTrafficCar(state, 'sedan', 1180, 980);
  spawnTrafficCar(state, 'suv', 820, 1050);
  // The mission-1 sedan spawns on this plaza too — unmark it here so its
  // ring and label do not fight the rifle scene.
  for (const v of state.vehicles) v.marked = false;
  seedTrafficAround(state, px, py, 8);
  spawnPedestrianCrowd(state, px, py, 10);
  // Territory: two of three blocks held, the plaza is the fight.
  claimTurfBlock(state, 'plaza');
  claimTurfBlock(state, 'arcade');
  const m = startStoryMission(state, 10);
  m.progress = 2;
  state.banner = {
    title: 'TURF WAR — HOLD THE PLAZA 2/3',
    sub: 'Rook: two blocks are ours. Hold the plaza and Casco Viejo is crew.',
    checklist: ['Plaza del Faro — HELD', 'Los Arcos Arcade — HELD', 'Mercado Viejo — TAKE IT'],
  };
  state.objectives = state.banner.checklist;
  // A long rifle tracer across the plaza, frozen mid-shot.
  state.tracers.push({
    x1: px + 30, y1: py - 10, x2: px + 420, y2: py - 160,
    life: 0.12, max: 0.12, color: '#ff5c5c', wide: true,
  });
}

export function stageGarageScene(state) {
  // Pause over the Playa Alba beachfront at dusk, the world alive behind a
  // translucent panel: the full-city map, the garage, the story panel and
  // the stats row — progression, story, tuning and safehouses in one frame.
  state.timeOfDay = 0.72;
  state.weather = 'clear';
  state.screen = 'garage';
  state.player.x = 900; state.player.y = 3350;
  state.player.cash = 24800;
  state.player.respect = 7;
  state.player.wanted = 0;
  state.player.weapon = 'rifle';
  state.player.ammo = { pistol: 48, scattergun: 12, smg: 90, rifle: 24 };
  state.missions.done = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  state.missions.next = 10;
  const m = startStoryMission(state, 10);
  state.banner = null;
  state.side.shells = 11;
  state.side.exportsDone = 5;
  state.league.won = 4;
  state.league.wonByRace = { 1: true, 2: true, 3: true, 5: true };
  state.stats.completion = 74;
  state.stats.carsDriven = 42;
  state.stats.boatsDriven = 9;
  state.stats.heliFlights = 3;
  state.stats.distance = 184;
  state.safehouses[0].owned = true;
  state.safehouses[1].owned = true;
  state.garageCars = [
    { name: 'Vela Sports', color: '#37c8e8', underglow: '#37e8ff' },
    { name: 'Faro Supercar', color: '#ff4fd8', underglow: '#ff4fd8' },
    { name: 'Toro Muscle', color: '#c23a3a', underglow: '#7dff5c' },
  ];
  // A living beachfront behind the panel: traffic, peds, a boat offshore.
  seedTrafficAround(state, 900, 3350, 8);
  spawnPedestrianCrowd(state, 900, 3350, 12);
  launchSpeedboat(state, 900, 3950, 'speedboat');
}

export function drawSceneOverlay(ctx, state) {
  if (state.shot === 'race') drawRaceLeaguePanel(ctx, state);
  else if (state.shot === 'rifle') drawTurfProgressBar(ctx, state);
  else if (state.shot === 'garage') drawGaragePanel(ctx, state);
}

export function drawRaceLeaguePanel(ctx, state) {
  ctx.save();
  const x = 24, y = 300, w = 330;
  ctx.fillStyle = 'rgba(8,8,16,0.8)';
  ctx.fillRect(x, y, w, 250);
  ctx.strokeStyle = '#ff4fd8';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, 250);
  ctx.fillStyle = '#ff4fd8';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LEAGUE TABLE', x + 16, y + 40);
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#fff';
  LEAGUE_RACES.forEach((r, i) => {
    const yy = y + 76 + i * 28;
    const mark = r.n === 3 ? '▶ ' : '   ';
    const best = state.league.wonByRace[r.n] ? 'WON' : (r.best ? r.best.toFixed(1) + 's' : '—');
    ctx.fillText(`${mark}${r.n}. ${r.name}`, x + 16, yy);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(best, x + 250, yy);
    ctx.fillStyle = '#fff';
  });
  ctx.restore();
}

export function drawTurfProgressBar(ctx, state) {
  ctx.save();
  // Under the objective banner, clear of the readouts and the speedometer.
  const x = 310, y = 268, w = 660, h = 44;
  ctx.fillStyle = 'rgba(8,8,16,0.8)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#37c8e8';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#37c8e8';
  ctx.fillRect(x + 4, y + 4, (w - 8) * (2 / 3), h - 8);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TURF HELD 2 / 3 — HOLD THE PLAZA', 640, y + h + 34);
  ctx.restore();
}

export function drawGaragePanel(ctx, state) {
  ctx.save();
  // Translucent panel over the living beachfront.
  ctx.fillStyle = 'rgba(8,10,18,0.88)';
  ctx.fillRect(60, 50, 1160, 700);
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 5;
  ctx.strokeRect(60, 50, 1160, 700);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PUERTO ALBA — GARAGE & STORY', 640, 110);
  // LEFT: the full-city map, all eight districts labelled.
  const mapX = 90, mapY = 140, mapW = 520, mapH = 420;
  const scale = Math.min(mapW / CFG.WORLD_W, mapH / CFG.WORLD_H);
  ctx.fillStyle = '#1d6a8a';
  ctx.fillRect(mapX, mapY, CFG.WORLD_W * scale, CFG.WORLD_H * scale);
  ctx.fillStyle = '#8a8a72';
  ctx.fillRect(mapX, mapY, CFG.WORLD_W * scale, 3800 * scale);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(mapX + d.x * scale, mapY + d.y * scale, d.w * scale, d.h * scale);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(mapX + rx * scale, mapY); ctx.lineTo(mapX + rx * scale, mapY + CFG.WORLD_H * scale); ctx.stroke();
  }
  for (const ry of state.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(mapX, mapY + ry * scale); ctx.lineTo(mapX + CFG.WORLD_W * scale, mapY + ry * scale); ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    ctx.fillText(d.name.toUpperCase(), mapX + (d.x + d.w / 2) * scale, mapY + (d.y + d.h / 2) * scale);
  }
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('✈ AIRSTRIP', mapX + 5200 * scale, mapY + 500 * scale);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(mapX + state.player.x * scale, mapY + state.player.y * scale, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 3;
  ctx.stroke();
  // RIGHT: garage cars, safehouses, story panel.
  const rx = 650;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#37e8ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('GARAGE — 3 CARS', rx, 170);
  state.garageCars.forEach((c, i) => {
    const y = 195 + i * 44;
    ctx.fillStyle = c.color;
    ctx.fillRect(rx, y, 60, 28);
    ctx.fillStyle = c.underglow;
    ctx.fillRect(rx, y + 28, 60, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.fillText(c.name, rx + 76, y + 24);
  });
  ctx.fillStyle = '#37e87a';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SAFEHOUSES — 2/3 OWNED', rx, 350);
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#fff';
  state.safehouses.forEach((h, i) => {
    ctx.fillText(`${h.owned ? '✓' : '○'} ${h.name}`, rx, 382 + i * 30);
  });
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('STORY — 9/12 DONE', rx, 480);
  ctx.font = '18px sans-serif';
  MISSIONS.forEach((m, i) => {
    const done = state.missions.done.includes(m.n);
    const current = state.missions.current && state.missions.current.n === m.n;
    ctx.fillStyle = done ? '#37e87a' : current ? '#ffd21f' : '#8a8a9a';
    const colX = rx + (i >= 6 ? 250 : 0);
    const rowY = 506 + (i % 6) * 26;
    ctx.fillText(`${done ? '✓' : current ? '▶' : '·'} ${m.n}. ${m.name} — $${m.cash}`, colX, rowY);
  });
  // Stats row beneath, sized to fit the panel, with a controls hint below.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CASH $24,800  ·  RESPECT 7  ·  LEAGUE 4/6  ·  SHELLS 11/18  ·  EXPORTS 5/6  ·  74%', 640, 668);
  ctx.fillStyle = '#cfd8e8';
  ctx.font = '22px sans-serif';
  ctx.fillText('WASD move · E enter vehicle · Esc map · J missions · P phone', 640, 706);
  ctx.restore();
}

// ---- Scene notes and alternate staging ----

export function sceneNotes(name) {
  const notes = {
    heli: 'Cover: police helicopter over the marina in a dusk storm, five stars, the heist banner, boats below.',
    race: 'Night rain in Barrio Lumen: four neon cars at the start line, the league table, the crowd behind barriers.',
    rifle: 'Golden hour in Casco Viejo: Dana on foot with the rifle, Aldana rivals in cover, turf at 2/3.',
    garage: 'Pause over Playa Alba at dusk: the full-city map, the garage, the story panel and the stats row.',
  };
  return notes[name] || 'A scene from Puerto Alba.';
}

export function stageSceneTraffic(state, cx, cy) {
  seedTrafficAround(state, cx, cy, 8);
  spawnPedestrianCrowd(state, cx, cy, 10);
}

export function sceneCameraFor(state, x, y) {
  state.camera.x = clamp(x - 640, 0, CFG.WORLD_W - CFG.VIEW_W);
  state.camera.y = clamp(y - 400, 0, CFG.WORLD_H - CFG.VIEW_H);
  return state.camera;
}

export function verifySceneReady(state) {
  return {
    shot: state.shot,
    ready: state.shotReady,
    wanted: state.player.wanted,
    banner: state.banner ? state.banner.title : null,
    vehicles: state.vehicles.length,
    peds: state.peds.length,
    boats: state.boats.length,
    helis: state.helis.length,
  };
}

// ---- Behind the scenes: how each shot was staged ----

export function sceneStagingLog(state) {
  return {
    shot: state.shot,
    seed: state.seed,
    timeOfDay: state.timeOfDay,
    weather: state.weather,
    wanted: state.player.wanted,
    player: { x: Math.round(state.player.x), y: Math.round(state.player.y) },
    camera: { x: Math.round(state.camera.x), y: Math.round(state.camera.y) },
  };
}

export function sceneActorCount(state) {
  return {
    vehicles: state.vehicles.length,
    pedestrians: state.peds.length,
    boats: state.boats.length,
    helicopters: state.helis.length,
    police: state.police.length,
    particles: state.particles.length,
  };
}

// ---- Scene variants for testing the staging ----

export function stageSceneVariant(state, name, variant) {
  stageScreenshotScene(state, name, state.seed + variant);
  return state;
}

export function sceneVariantSeeds() {
  return {
    heli: [11, 12, 13],
    race: [23, 24, 25],
    rifle: [37, 38, 39],
    garage: [41, 42, 43],
  };
}

export function pickSceneSeed(name, variant) {
  const seeds = sceneVariantSeeds()[name] || [7];
  return seeds[variant % seeds.length];
}

// ---- Scene comparison: which shot shows the most ----

export function sceneBreadthScore(state) {
  const actors = sceneActorCount(state);
  let score = 0;
  score += actors.vehicles > 20 ? 2 : 1;
  score += actors.pedestrians > 30 ? 2 : 1;
  score += actors.boats >= 2 ? 1 : 0;
  score += actors.helicopters >= 1 ? 2 : 0;
  score += state.player.wanted >= 3 ? 1 : 0;
  score += state.banner ? 1 : 0;
  return score;
}

export function bestSceneByBreadth(states) {
  let best = null, bestScore = -1;
  for (const s of states) {
    const score = sceneBreadthScore(s);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return { scene: best, score: bestScore };
}
