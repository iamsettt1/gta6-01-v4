// Puerto Alba — High Water. Boot and the game loop: builds the world, reads
// the ?shot= scene parameter, runs the update and render loop, and exposes
// the live state on window.__game for the screenshot harness. In shot mode
// it paints the staged scene twice and sets window.__shotReady.

import { G, CFG, MISSIONS, OPENING_CRAWL } from './config.js';
import { initNewGameState } from './new-game.js';
import { buildPuertoAlbaCity } from './city-map.js';
import { renderWorldFrame, updateCameraFollow } from './renderer-camera.js';
import { bindKeyboardControls } from './input-controls.js';
import { movePlayerOnFoot } from './player-on-foot.js';
import { drivePlayerCar } from './vehicles-cars.js';
import { rideMotorcycle } from './motorcycles.js';
import { driveBoat, updatePoliceBoats } from './boats.js';
import { flyHelicopter, policeHelicopterPursuit } from './helicopter.js';
import { updateTraffic } from './traffic-ai.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolicePursuit, bustPlayer, wastePlayer } from './police-pursuit.js';
import { updateStoryMission } from './missions-story.js';
import { updateLeagueRace } from './races-league.js';
import { updateTaxiFare, collectNearbyPickups } from './side-activities.js';
import { updateTerritory } from './territory.js';
import { updateParticles, updateWeatherParticles } from './effects-particles.js';
import { advanceDayCycle } from './daycycle-weather.js';
import { updateStormWeather, applyStormSlowdown } from './storm-weather.js';
import { rivalCrewAI, collectAmmoPickups } from './combat-weapons.js';
import { stageScreenshotScene, drawSceneOverlay } from './screenshot-scenes.js';
import { drawFullCityMap } from './city-map-screen.js';
import { drawPhoneScreen } from './phone.js';
import { synthesizeEngineHum, synthesizeRadioLoop, ambientSoundTick } from './audio-synth.js';
import { loadSavedGame, autosaveGame } from './save-game.js';
import { updateVigilanteJob } from './side-activities.js';
import { updateAirTraffic } from './helicopter.js';
import { defendContestedBlock } from './territory.js';
import { arrestTimer, drawArrestMeter } from './police-pursuit.js';
import { drawProgressScreen } from './hud-minimap.js';

export function bootPuertoAlbaGame() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || 7);
  const shot = params.get('shot');
  initNewGameState(G, seed);
  bindKeyboardControls(G, canvas);
  window.__game = G;
  window.__shotReady = false;
  if (shot) {
    stageScreenshotScene(G, shot, seed);
    renderWorldFrame(ctx, G);
    drawSceneOverlay(ctx, G);
    renderWorldFrame(ctx, G);
    drawSceneOverlay(ctx, G);
    G.shotReady = true;
    window.__shotReady = true;
    return { canvas, ctx, shot: true };
  }
  loadSavedGame(G); // saves only affect real play, never a staged screenshot
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updatePuertoAlbaGame(G, dt);
    renderWorldFrame(ctx, G);
    if (G.screen === 'map') drawFullCityMap(ctx, G);
    if (G.screen === 'board') drawMissionsBoard(ctx, G);
    if (G.screen === 'phone') drawPhoneScreen(ctx, G);
    if (G.screen === 'help') drawHelpScreen(ctx, G);
    if (G.screen === 'progress') drawProgressScreen(ctx, G);
    drawArrestMeter(ctx, G);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { canvas, ctx, shot: false };
}

export function updatePuertoAlbaGame(state, dt) {
  state.elapsed += dt;
  state.frame += 1;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  advanceDayCycle(state, dt);
  updateStormWeather(state, dt);
  applyStormSlowdown(state, dt);
  updateParticles(state, dt);
  updateWeatherParticles(state, dt);
  ambientSoundTick(state, dt);
  arrestTimer(state, dt);
  updateVigilanteJob(state, dt);
  updateAirTraffic(state, dt);
  defendContestedBlock(state, dt);
  autosaveGame(state, dt);
  if (state.screen !== 'play') return;
  const p = state.player;
  if (p.onFoot) {
    movePlayerOnFoot(state, dt);
  } else if (p.vehicle) {
    const v = p.vehicle;
    if (v.kind === 'car') drivePlayerCar(state, v, dt);
    else if (v.kind === 'bike') rideMotorcycle(state, v, dt);
    else if (v.kind === 'boat') driveBoat(state, v, dt);
    else if (v.kind === 'heli') flyHelicopter(state, v, dt);
  }
  updateTraffic(state, dt);
  updatePedestrians(state, dt);
  updatePolicePursuit(state, dt);
  policeHelicopterPursuit(state, dt);
  updatePoliceBoats(state, dt);
  updateStoryMission(state, dt);
  updateLeagueRace(state, dt);
  updateTaxiFare(state, dt);
  updateTerritory(state, dt);
  collectNearbyPickups(state);
  collectAmmoPickups(state);
  for (const ped of state.peds) {
    if (ped.crew === 'aldana' && ped.state !== 'down') rivalCrewAI(state, ped, dt);
  }
  if (p.health <= 0) wastePlayer(state);
  if (p.vehicle) synthesizeEngineHum(state, Math.abs(p.vehicle.speed || 0));
  if (p.vehicle && p.vehicle.kind === 'car') synthesizeRadioLoop(state, dt);
  updateCameraFollow(state, dt);
}

export function drawMissionsBoard(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.9)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MISSIONS BOARD', 640, 110);
  ctx.textAlign = 'left';
  MISSIONS.forEach((m, i) => {
    const done = state.missions.done.includes(m.n);
    const current = state.missions.current && state.missions.current.n === m.n;
    const y = 160 + i * 48;
    ctx.fillStyle = done ? '#37e87a' : current ? '#ffd21f' : '#8a8a9a';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${done ? '✓' : current ? '▶' : '·'} ${m.n}. ${m.name}`, 120, y);
    ctx.fillStyle = '#fff';
    ctx.font = '26px sans-serif';
    ctx.fillText(`${m.giver} — $${m.cash}`, 700, y);
    ctx.fillStyle = '#cfd8e8';
    ctx.fillText(done ? 'DONE' : current ? 'CURRENT' : 'LOCKED', 1020, y);
  });
  ctx.fillStyle = '#fff';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.missions.done.length}/12 missions done · Completion ${state.stats.completion}%`, 640, 760);
  ctx.restore();
}

bootPuertoAlbaGame();

// ---- Help screen and the stats overlay ----

export function drawHelpScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOW TO PLAY', 640, 120);
  const lines = [
    'WASD — move, drive, fly',
    'E — enter or exit a vehicle',
    'Mouse — aim, Click — shoot',
    'Shift — sprint (stamina bar)',
    'Esc — pause, M — full-city map',
    'J — missions board, P — phone',
    'T — tune at the shop, B — safehouse',
    '1–4 — pistol, scattergun, SMG, rifle',
    'F — shove, G — talk to a mission giver',
  ];
  ctx.fillStyle = '#fff';
  ctx.font = '30px sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, 640, 190 + i * 48));
  ctx.fillStyle = '#37e8ff';
  ctx.fillText('Steal cars, lose the heat, take the turf, fly the helicopter.', 640, 700);
  ctx.restore();
}

export function drawStatsOverlay(ctx, state) {
  const s = state.stats;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.8)';
  ctx.fillRect(60, 560, 500, 180);
  ctx.strokeStyle = '#37c8e8';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 560, 500, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Cars driven: ${s.carsDriven}`, 90, 610);
  ctx.fillText(`Boats driven: ${s.boatsDriven}`, 90, 650);
  ctx.fillText(`Helicopter flights: ${s.heliFlights}`, 90, 690);
  ctx.fillText(`Distance: ${(s.distance / 10).toFixed(1)} km`, 90, 730);
  ctx.restore();
}

// ---- Pause menu options and the game-over flow ----

export function drawPauseMenuOptions(ctx, state) {
  const options = [
    'Esc — resume',
    'M — full-city map',
    'J — missions board',
    'P — phone',
    'H — help',
    'S — save at a safehouse',
  ];
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center';
  options.forEach((o, i) => ctx.fillText(o, 640, 440 + i * 44));
  ctx.restore();
}

export function gameOverSummary(state) {
  return {
    cash: state.player.cash,
    respect: state.player.respect,
    missions: state.missions.done.length,
    completion: state.stats.completion,
    message: state.missions.done.length >= 12
      ? 'The High-Water Heist is done. Puerto Alba is yours.'
      : 'The story continues — the crew is waiting.',
  };
}

export function restartAfterBusted(state) {
  state.screen = 'play';
  state.player.health = 100;
  state.player.wanted = 0;
  state.player.x = 1000;
  state.player.y = 800;
  state.player.onFoot = true;
  state.player.vehicle = null;
  state.message = 'Back on the streets. Stay out of the cells this time.';
  state.messageTimer = 4;
}

// ---- Attract mode: the city plays itself on the title screen ----

export function attractModeDemo(state, dt) {
  // A slow camera drift over the city behind the title screen.
  state.camera.x = (Math.sin(state.elapsed * 0.05) * 0.5 + 0.5) * (CFG.WORLD_W - CFG.VIEW_W);
  state.camera.y = (Math.cos(state.elapsed * 0.04) * 0.5 + 0.5) * (CFG.WORLD_H - CFG.VIEW_H);
  updateTraffic(state, dt);
  updatePedestrians(state, dt);
}

export function titleScreenStats(state) {
  return {
    districts: 8,
    missions: 12,
    races: 6,
    cars: 10,
    weapons: 4,
    safehouses: 3,
  };
}

// ---- Photo mode and the time trial ----

export function photoModeSnapshot(state) {
  // Photo mode hides the HUD for a clean shot of the city.
  state.photoMode = !state.photoMode;
  state.message = state.photoMode ? 'Photo mode — HUD hidden. Press P again to show it.' : 'Photo mode off.';
  state.messageTimer = 3;
  return state.photoMode;
}

export function startTimeTrial(state, from, to) {
  state.timeTrial = {
    from, to, start: state.elapsed, active: true,
    best: state.timeTrialBest || null,
  };
  state.banner = {
    title: 'TIME TRIAL',
    sub: `Drive from the marker to the beacon — beat ${state.timeTrialBest ? state.timeTrialBest.toFixed(1) + 's' : 'your best'}`,
    checklist: ['Reach the beacon', 'Any vehicle counts', 'No wanted level allowed'],
  };
  return state.timeTrial;
}

export function updateTimeTrial(state, dt) {
  const tt = state.timeTrial;
  if (!tt || !tt.active) return;
  const p = state.player;
  const d = Math.hypot(p.x - tt.to.x, p.y - tt.to.y);
  if (d < 120) {
    tt.active = false;
    const time = state.elapsed - tt.start;
    if (!tt.best || time < tt.best) {
      state.timeTrialBest = time;
      state.player.cash += 400;
      state.message = `TIME TRIAL — new best ${time.toFixed(1)}s! +$400.`;
    } else {
      state.message = `TIME TRIAL — ${time.toFixed(1)}s (best ${tt.best.toFixed(1)}s).`;
    }
    state.messageTimer = 5;
  } else if (p.wanted > 0) {
    tt.active = false;
    state.message = 'Time trial void — the police got involved.';
    state.messageTimer = 3;
  }
}

export function drawTimeTrialBeacon(ctx, state, camX, camY) {
  const tt = state.timeTrial;
  if (!tt || !tt.active) return;
  const x = tt.to.x - camX, y = tt.to.y - camY;
  ctx.save();
  ctx.strokeStyle = '#37e87a';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#37e87a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINISH', x, y - 84);
  ctx.restore();
}

// ---- Debug overlay and the frame timer ----

export function drawDebugOverlay(ctx, state, fps) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.7)';
  ctx.fillRect(24, 24, 340, 150);
  ctx.fillStyle = '#37e87a';
  ctx.font = '22px monospace';
  ctx.textAlign = 'left';
  const lines = [
    `fps ${fps}`,
    `entities ${state.vehicles.length + state.peds.length + state.boats.length + state.helis.length}`,
    `particles ${state.particles.length}`,
    `screen ${state.screen}`,
    `wanted ${state.player.wanted}★`,
    `pos ${Math.round(state.player.x)}, ${Math.round(state.player.y)}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, 40, 52 + i * 24));
  ctx.restore();
}

export function frameTimer() {
  let last = 0;
  return function tick(now) {
    const dt = last ? (now - last) / 1000 : 0.016;
    last = now;
    return Math.min(0.05, Math.max(0.001, dt));
  };
}

export function fpsCounter() {
  let frames = 0, last = performance.now(), fps = 60;
  return function tick(now) {
    frames += 1;
    if (now - last >= 1000) {
      fps = frames;
      frames = 0;
      last = now;
    }
    return fps;
  };
}

// ---- The opening crawl and the credits ----

export function openingCrawlLines() {
  return OPENING_CRAWL;
}

export function creditsLines() {
  return [
    'PUERTO ALBA — HIGH WATER',
    'A game by iamsettt1, built for make.fun gta6-01',
    'City, story, code and art: original, made for this entry',
    'Dana Ríos · Celia Marín · Rook · the Aldana family',
    'Thanks for playing. The storm is only the beginning.',
  ];
}

export function drawCredits(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  creditsLines().forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#ffd21f' : '#fff';
    ctx.font = i === 0 ? 'bold 44px sans-serif' : '28px sans-serif';
    ctx.fillText(line, 640, 240 + i * 56);
  });
  ctx.restore();
}
