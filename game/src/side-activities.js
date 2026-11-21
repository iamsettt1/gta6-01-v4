// Puerto Alba — High Water. Side activities between missions: taxi fares,
// the export list, and eighteen sun shells hidden across the districts and
// the island. Small money, steady respect, and a reason to drive everywhere.

import { G, EXPORT_CARS, clamp } from './config.js';
import { rngRange, rngPick } from './random.js';

export function startTaxiFare(state) {
  if (state.side.taxi) return state.side.taxi;
  const p = state.player;
  const dest = {
    x: clamp(p.x + rngRange(state.rng, -1200, 1200), 300, 5800),
    y: clamp(p.y + rngRange(state.rng, -900, 900), 300, 3500),
  };
  const fare = {
    active: true, dest, timer: 0,
    payout: 120 + Math.round(Math.hypot(dest.x - p.x, dest.y - p.y) / 10),
  };
  state.side.taxi = fare;
  state.banner = {
    title: 'TAXI FARE',
    sub: `Drive your passenger to the marker — $${fare.payout}, tip for speed`,
    checklist: ['Passenger aboard', 'Drive to the marker', 'Faster = bigger tip'],
  };
  state.message = 'Taxi fare! Get your passenger to the marker.';
  state.messageTimer = 3;
  return fare;
}

export function updateTaxiFare(state, dt) {
  const fare = state.side.taxi;
  if (!fare || !fare.active) return;
  fare.timer += dt;
  const p = state.player;
  const d = Math.hypot(p.x - fare.dest.x, p.y - fare.dest.y);
  if (d < 110) {
    const tip = fare.timer < 45 ? 80 : fare.timer < 75 ? 30 : 0;
    const total = fare.payout + tip;
    p.cash += total;
    state.side.taxi = null;
    state.side.faresDone += 1;
    state.message = `Fare complete — $${total} (tip $${tip}).`;
    state.messageTimer = 4;
  } else if (fare.timer > 150) {
    state.side.taxi = null;
    state.message = 'The passenger gave up and walked away.';
    state.messageTimer = 3;
  }
}

export function deliverExportCar(state, car) {
  const match = EXPORT_CARS.find(e => e.id === car.cls && !e.done);
  if (!match) return false;
  match.done = true;
  state.side.exportsDone += 1;
  const payout = 900;
  state.player.cash += payout;
  state.player.respect = Math.min(10, state.player.respect + 1);
  state.message = `EXPORT DELIVERED — ${match.name} +$${payout} (${state.side.exportsDone}/6).`;
  state.messageTimer = 5;
  state.vehicles = state.vehicles.filter(v => v !== car);
  if (state.player.vehicle === car) {
    state.player.vehicle = null;
    state.player.onFoot = true;
  }
  return true;
}

export function scatterSunShells(state) {
  const spots = [
    [700, 600], [1500, 1200], [2400, 400], [3200, 1000], [4200, 400], [5400, 900],
    [500, 1900], [1500, 2400], [2400, 2000], [3300, 2500], [4200, 2000], [5400, 2400],
    [600, 3300], [1400, 3700], [3000, 3400], [4900, 3200], [5500, 3600], [5200, 3350],
  ];
  for (const [x, y] of spots) {
    state.pickups.push({ kind: 'shell', x, y, taken: false });
  }
  return state.pickups;
}

export function collectNearbyPickups(state) {
  const p = state.player;
  for (const pk of state.pickups) {
    if (pk.taken) continue;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < 60) {
      pk.taken = true;
      if (pk.kind === 'shell') {
        state.side.shells += 1;
        p.cash += 50;
        state.message = `Sun shell ${state.side.shells}/18 — +$50.`;
        state.messageTimer = 3;
      } else if (pk.kind === 'armor') {
        p.armor = Math.min(100, p.armor + 50);
        state.message = 'Armour +50.';
        state.messageTimer = 2;
      } else if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 40);
        state.message = 'Health +40.';
        state.messageTimer = 2;
      }
    }
  }
  state.pickups = state.pickups.filter(pk => !pk.taken);
}

export function spawnArmorPickup(state, x, y) {
  state.pickups.push({ kind: 'armor', x, y, taken: false });
}

export function drawTaxiMarker(ctx, state, camX, camY, t) {
  const fare = state.side.taxi;
  if (!fare || !fare.active) return;
  const x = fare.dest.x - camX, y = fare.dest.y - camY;
  ctx.save();
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.lineTo(x - 22, y - 90);
  ctx.lineTo(x + 22, y - 90);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20202e';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', x, y - 62);
  ctx.restore();
}

// ---- Vigilante work and stunt jumps ----

export function startVigilanteJob(state) {
  if (state.player.wanted > 0) {
    state.message = 'Lose the heat first — vigilantes work clean.';
    state.messageTimer = 3;
    return null;
  }
  const target = state.peds.find(p => p.crew === 'aldana' && p.state !== 'down');
  if (!target) {
    state.message = 'No Aldana crew on the streets right now.';
    state.messageTimer = 3;
    return null;
  }
  state.side.vigilante = { target, active: true, timer: 0 };
  state.banner = {
    title: 'VIGILANTE — CLEAN UP THE STREETS',
    sub: 'Take down the marked Aldana crew member for $300',
    checklist: ['Find the red-marked rival', 'Take him down', 'Stay clean — no wanted level'],
  };
  return state.side.vigilante;
}

export function updateVigilanteJob(state, dt) {
  const job = state.side.vigilante;
  if (!job || !job.active) return;
  job.timer += dt;
  if (job.target.state === 'down') {
    job.active = false;
    state.player.cash += 300;
    state.player.respect = Math.min(10, state.player.respect + 1);
    state.message = 'Vigilante job done — +$300, the streets are safer.';
    state.messageTimer = 4;
  } else if (job.timer > 120) {
    job.active = false;
    state.message = 'The target slipped away.';
    state.messageTimer = 3;
  }
}

export function stuntJumpBonus(state, airTime) {
  if (airTime < 0.5) return 0;
  const bonus = Math.round(airTime * 100);
  state.player.cash += bonus;
  state.message = `STUNT JUMP — ${airTime.toFixed(1)}s airtime, +$${bonus}!`;
  state.messageTimer = 3;
  return bonus;
}

export function exportListStatus(state) {
  return EXPORT_CARS.map(e => ({ name: e.name, color: e.color, done: e.done }));
}

// ---- The collectibles guide and the completion checklist ----

export function shellHintFor(index) {
  const hints = [
    'Casco Viejo plaza, by the fountain',
    'Casco Viejo, behind the market stalls',
    'Avenida del Sol, between the towers',
    'Avenida del Sol, by the taxi rank',
    'Zona Franca, near the airstrip fence',
    'Zona Franca, behind the warehouses',
    'Barrio Lumen, outside Club Lumen',
    'Barrio Lumen, by the neon signs',
    'Las Colinas, up the winding road',
    'Las Colinas, in the leafy park',
    'Marina, on the docks',
    'Marina, by the cranes',
    'Playa Alba, under a beach umbrella',
    'Playa Alba, at the waterline',
    'Las Colinas, near the hill houses',
    'Isla Faro, by the lighthouse',
    'Isla Faro, in the smugglers cove',
    'Isla Faro, on the island beach',
  ];
  return hints[index] || 'Somewhere in Puerto Alba';
}

export function completionChecklist(state) {
  return [
    { label: 'Story missions', done: state.missions.done.length, total: 12 },
    { label: 'League races won', done: state.league.won, total: 6 },
    { label: 'Sun shells', done: state.side.shells, total: 18 },
    { label: 'Exports delivered', done: state.side.exportsDone, total: 6 },
    { label: 'Turf blocks held', done: state.territory.held, total: 3 },
    { label: 'Safehouses owned', done: state.safehouses.filter(h => h.owned).length, total: 3 },
  ];
}

export function completionPercent(state) {
  const list = completionChecklist(state);
  let got = 0, total = 0;
  for (const item of list) { got += item.done; total += item.total; }
  return Math.round((got / total) * 100);
}
