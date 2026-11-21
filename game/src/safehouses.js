// Puerto Alba — High Water. Three buyable safehouses — Casco Viejo, Playa
// Alba and Isla Faro — where you save the game, refill armour, and check
// the garage stats: cars driven, boats driven, helicopter flights, distance.

import { G, SAFEHOUSES } from './config.js';
import { saveGameToSafehouse } from './save-game.js';

export function buySafehouse(state, id) {
  const house = state.safehouses.find(h => h.id === id);
  if (!house) return false;
  if (house.owned) {
    state.message = `${house.name} is already yours.`;
    state.messageTimer = 2;
    return false;
  }
  if (state.player.cash < house.price) {
    state.message = `${house.name} costs $${house.price} — you have $${state.player.cash}.`;
    state.messageTimer = 3;
    return false;
  }
  state.player.cash -= house.price;
  house.owned = true;
  state.player.armor = 100;
  saveGameToSafehouse(state);
  state.message = `SAFEHOUSE BOUGHT — ${house.name}. Armour refilled, game saved.`;
  state.messageTimer = 5;
  return true;
}

export function enterSafehouse(state) {
  const p = state.player;
  for (const h of state.safehouses) {
    if (Math.hypot(p.x - h.x, p.y - h.y) < 90) {
      if (!h.owned) {
        state.message = `${h.name} — press B to buy for $${h.price}.`;
        state.messageTimer = 3;
        return h;
      }
      p.armor = 100;
      p.health = 100;
      saveGameToSafehouse(state);
      state.message = `${h.name} — rested, armour refilled, game saved.`;
      state.messageTimer = 4;
      return h;
    }
  }
  return null;
}

export function garageStats(state) {
  return {
    carsDriven: state.stats.carsDriven,
    boatsDriven: state.stats.boatsDriven,
    heliFlights: state.stats.heliFlights,
    distanceKm: (state.stats.distance / 10).toFixed(1),
    missionsDone: state.missions.done.length,
    shells: state.side.shells,
    exports: state.side.exportsDone,
    leagueWon: state.league.won,
    safehouses: state.safehouses.filter(h => h.owned).length,
  };
}

export function drawSafehouseMarkers(ctx, state, camX, camY) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const h of state.safehouses) {
    const sx = h.x - camX, sy = h.y - camY;
    if (sx < -120 || sx > 1400 || sy < -120 || sy > 920) continue;
    ctx.fillStyle = h.owned ? '#37e87a' : '#ffd21f';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('⌂', sx, sy);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(h.owned ? 'SAFEHOUSE' : `FOR SALE $${h.price}`, sx, sy + 30);
  }
  ctx.restore();
}

// ---- The garage stats screen ----

export function drawGarageStatsScreen(ctx, state) {
  const s = garageStats(state);
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#37e8ff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAGE & SAFEHOUSES', 640, 120);
  const rows = [
    ['Cars driven', s.carsDriven],
    ['Boats driven', s.boatsDriven],
    ['Helicopter flights', s.heliFlights],
    ['Distance', s.distanceKm + ' km'],
    ['Missions done', s.missionsDone + '/12'],
    ['Sun shells', s.shells + '/18'],
    ['Exports delivered', s.exports + '/6'],
    ['League races won', s.leagueWon + '/6'],
    ['Safehouses owned', s.safehouses + '/3'],
  ];
  ctx.font = '32px sans-serif';
  rows.forEach((r, i) => {
    const y = 190 + i * 52;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], 380, y);
    ctx.fillStyle = '#37e8ff';
    ctx.textAlign = 'right';
    ctx.fillText(String(r[1]), 900, y);
  });
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press Esc to go back outside', 640, 720);
  ctx.restore();
}

export function safehouseIncome(state) {
  // Holding all three turf blocks pays a daily cut; safehouses add a
  // trickle of rent from the crew.
  const turf = state.territory.held >= 3 ? 1000 : 0;
  const rent = state.safehouses.filter(h => h.owned).length * 150;
  return turf + rent;
}

export function collectSafehouseIncome(state) {
  const income = safehouseIncome(state);
  if (income <= 0) return 0;
  state.player.cash += income;
  state.message = `Safehouse income +$${income} — the crew pays its rent.`;
  state.messageTimer = 4;
  return income;
}
