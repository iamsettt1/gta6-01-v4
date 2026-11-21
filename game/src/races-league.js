// Puerto Alba — High Water. The six-race street league: checkpoint races
// across the districts with best-time medals and a league table, open after
// mission 5. A race is a loop of glowing checkpoints around the district.

import { G, LEAGUE_RACES, clamp } from './config.js';
import { rngRange } from './random.js';

export function startLeagueRace(state, n) {
  const def = LEAGUE_RACES[n - 1];
  if (!def) return null;
  const race = {
    n: def.n, name: def.name, district: def.district, laps: def.laps,
    checkpoints: buildRaceCheckpoints(state, def),
    cpIndex: 0, lap: 1, time: 0, best: def.best, active: true, finished: false,
    rivals: spawnRaceRivals(state, def),
  };
  state.league.current = race;
  state.banner = {
    title: `STREET LEAGUE — RACE ${def.n}: ${def.name.toUpperCase()}`,
    sub: `${def.laps} laps · ${def.district} · beat your best time`,
    checklist: [`Lap 1/${def.laps}`, 'Follow the amber checkpoints', 'Win for the league table'],
  };
  state.message = `LEAGUE RACE ${def.n}/6 — ${def.name}! Hit every checkpoint.`;
  state.messageTimer = 4;
  return race;
}

export function buildRaceCheckpoints(state, def) {
  const spots = {
    'Avenida del Sol': [[2300, 500], [3300, 500], [3300, 1100], [2300, 1100], [2800, 800]],
    'Casco Viejo': [[600, 500], [1400, 500], [1400, 1100], [600, 1100], [1000, 800]],
    'Barrio Lumen': [[600, 1700], [1400, 1700], [1400, 2300], [600, 2300], [1000, 2000]],
    'Puerto Alba Marina': [[4200, 1700], [5200, 1700], [5200, 2300], [4200, 2300], [4700, 2000]],
    'Las Colinas': [[2300, 1700], [3300, 1700], [3300, 2300], [2300, 2300], [2800, 2000]],
    'Isla Faro': [[4900, 3100], [5500, 3100], [5500, 3600], [4900, 3600], [5200, 3350]],
  };
  const base = spots[def.district] || spots['Avenida del Sol'];
  const cps = [];
  for (let lap = 0; lap < def.laps; lap++) {
    for (const [x, y] of base) cps.push({ x, y, r: 90, lap: lap + 1 });
  }
  return cps;
}

export function spawnRaceRivals(state, def) {
  const rivals = [];
  const colors = ['#ff5c5c', '#7dff5c', '#9a6bff'];
  for (let i = 0; i < 3; i++) {
    rivals.push({
      kind: 'rival', x: state.player.x - 120 - i * 70, y: state.player.y + 60 + i * 20,
      angle: -Math.PI / 2, speed: 0, color: colors[i], cpIndex: 0, lap: 1,
      name: ['Vela', 'Toro', 'Faro'][i],
    });
  }
  return rivals;
}

export function updateLeagueRace(state, dt) {
  const race = state.league.current;
  if (!race || !race.active) return;
  race.time += dt;
  const cp = race.checkpoints[race.cpIndex];
  if (!cp) return;
  const d = Math.hypot(state.player.x - cp.x, state.player.y - cp.y);
  if (d < cp.r) {
    race.cpIndex += 1;
    state.stats.distance += 0.1;
    if (race.cpIndex >= race.checkpoints.length) {
      finishLeagueRace(state, race);
      return;
    }
    const next = race.checkpoints[race.cpIndex];
    race.lap = next.lap;
    if (race.banner) state.banner.checklist[0] = `Lap ${race.lap}/${race.laps}`;
  }
  // Rival cars chase the same checkpoints at their own pace.
  for (const r of race.rivals) {
    const rcp = race.checkpoints[Math.min(r.cpIndex, race.checkpoints.length - 1)];
    const dx = rcp.x - r.x, dy = rcp.y - r.y;
    const dd = Math.hypot(dx, dy) || 1;
    r.angle += clamp(Math.atan2(dy, dx) - r.angle, -2.4 * dt, 2.4 * dt);
    r.speed = Math.min(560, r.speed + 300 * dt);
    r.x += Math.cos(r.angle) * r.speed * dt;
    r.y += Math.sin(r.angle) * r.speed * dt;
    if (dd < rcp.r) r.cpIndex += 1;
  }
}

export function finishLeagueRace(state, race) {
  race.active = false;
  race.finished = true;
  const def = LEAGUE_RACES[race.n - 1];
  const playerCps = race.cpIndex;
  const bestRival = Math.max(...race.rivals.map(r => r.cpIndex), 0);
  const won = playerCps >= race.checkpoints.length && playerCps >= bestRival;
  if (!def.best || race.time < def.best) def.best = race.time;
  if (won) {
    state.league.won += 1;
    const payout = 800 + race.n * 200;
    state.player.cash += payout;
    state.player.respect = Math.min(10, state.player.respect + 1);
    state.banner = {
      title: `RACE WON — ${race.name.toUpperCase()}`,
      sub: `Time ${race.time.toFixed(1)}s · +$${payout} · League ${state.league.won}/6`,
      checklist: ['League table updated', 'Medal: GOLD', 'Next race unlocked'],
    };
    state.message = `YOU WON ${race.name}! +$${payout}`;
  } else {
    state.banner = {
      title: `RACE LOST — ${race.name.toUpperCase()}`,
      sub: `Time ${race.time.toFixed(1)}s · the rivals were faster this time`,
      checklist: ['Try again from the league board', 'Tune your car at the shop', 'League stands at ' + state.league.won + '/6'],
    };
    state.message = 'Race lost — the league board is waiting.';
  }
  state.messageTimer = 5;
  state.league.current = null;
  state.league.table = leagueTable(state);
}

export function leagueTable(state) {
  const rows = LEAGUE_RACES.map(r => ({
    n: r.n, name: r.name, best: r.best ? r.best.toFixed(1) + 's' : '—',
    medal: r.best ? (r.best < 95 ? 'GOLD' : r.best < 130 ? 'SILVER' : 'BRONZE') : '—',
    won: state.league.wonByRace[r.n] ? 'WON' : '—',
  }));
  return rows;
}

export function drawRaceCheckpoints(ctx, state, camX, camY, t) {
  const race = state.league.current;
  if (!race || !race.active) return;
  const cp = race.checkpoints[race.cpIndex];
  if (!cp) return;
  const pulse = 1 + 0.12 * Math.sin(t * 6);
  ctx.save();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 10;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(cp.x - camX, cp.y - camY, cp.r * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffd21f';
  ctx.beginPath(); ctx.arc(cp.x - camX, cp.y - camY, cp.r * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#20202e';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', cp.x - camX, cp.y - camY + 15);
  // Next checkpoint after this one, faint, so the route reads.
  const nxt = race.checkpoints[race.cpIndex + 1];
  if (nxt) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(nxt.x - camX, nxt.y - camY, 60, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ---- League medals, rivals and the season table ----

export function leagueMedalForTime(time) {
  if (time <= 0) return '—';
  if (time < 95) return 'GOLD';
  if (time < 130) return 'SILVER';
  return 'BRONZE';
}

export function leagueRivalNames() {
  return [
    { name: 'Vela', color: '#ff5c5c', car: 'muscle', skill: 0.92 },
    { name: 'Toro', color: '#7dff5c', car: 'sports', skill: 0.88 },
    { name: 'Faro', color: '#9a6bff', car: 'supercar', skill: 0.95 },
  ];
}

export function leagueSeasonStandings(state) {
  const rows = LEAGUE_RACES.map(r => ({
    n: r.n,
    name: r.name,
    best: r.best ? r.best.toFixed(1) + 's' : '—',
    medal: leagueMedalForTime(r.best || 0),
    won: !!state.league.wonByRace[r.n],
  }));
  rows.sort((a, b) => (a.won === b.won ? a.n - b.n : a.won ? -1 : 1));
  return rows;
}

export function leagueCountdown(state) {
  // 3-2-1-GO at the start line, drawn big over the world.
  const race = state.league.current;
  if (!race || !race.active) return null;
  if (race.time < 1) return '3';
  if (race.time < 2) return '2';
  if (race.time < 3) return '1';
  return 'GO';
}

export function drawLeagueCountdown(ctx, state) {
  const text = leagueCountdown(state);
  if (!text) return;
  ctx.save();
  ctx.fillStyle = text === 'GO' ? '#37e87a' : '#ffd21f';
  ctx.font = 'bold 140px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 10;
  ctx.strokeText(text, 640, 420);
  ctx.fillText(text, 640, 420);
  ctx.restore();
}

export function drawRaceStartLine(ctx, state, camX, camY) {
  const race = state.league.current;
  if (!race || !race.active) return;
  const sx = state.player.x - camX, sy = state.player.y - camY;
  ctx.save();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) ctx.fillRect(sx - 200 + i * 50, sy - 130, 50, 16);
    else ctx.fillRect(sx - 200 + i * 50, sy - 114, 50, 16);
  }
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('START', sx, sy - 150);
  ctx.restore();
}

// ---- League seasons and the championship ----

export function leagueSeasonPoints(state) {
  // 10 points for a win, 6 for second, 4 for third, 2 to finish.
  const table = {};
  for (const r of LEAGUE_RACES) {
    if (state.league.wonByRace[r.n]) table['Dana Ríos'] = (table['Dana Ríos'] || 0) + 10;
  }
  table['Vela'] = 24;
  table['Toro'] = 18;
  table['Faro'] = 30;
  return table;
}

export function leagueChampion(state) {
  const points = leagueSeasonPoints(state);
  let best = null, bestScore = -1;
  for (const [name, score] of Object.entries(points)) {
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return { name: best, points: bestScore };
}

export function leagueSeasonSummary(state) {
  const champ = leagueChampion(state);
  return `Season leader: ${champ.name} (${champ.points} pts) · You: ${state.league.won}/6 races won.`;
}
