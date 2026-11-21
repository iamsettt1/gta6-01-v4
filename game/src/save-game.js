// Puerto Alba — High Water. Saving: safehouses write the whole run to
// localStorage — cash, respect, missions done, league, territory, shells,
// exports and safehouses owned — and load it back on the title screen.

import { G } from './config.js';

export function saveGameToSafehouse(state) {
  try {
    const data = {
      cash: state.player.cash,
      respect: state.player.respect,
      health: state.player.health,
      armor: state.player.armor,
      missionsDone: state.missions.done,
      next: state.missions.next,
      leagueWon: state.league.won,
      leagueWonByRace: state.league.wonByRace,
      territoryHeld: state.territory.blocks.filter(b => b.owner === 'crew').map(b => b.id),
      shells: state.side.shells,
      exportsDone: state.side.exportsDone,
      safehouses: state.safehouses.filter(h => h.owned).map(h => h.id),
      completion: state.stats.completion,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('puerto-alba-save-v4', JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSavedGame(state) {
  try {
    const raw = localStorage.getItem('puerto-alba-save-v4');
    if (!raw) return null;
    const data = JSON.parse(raw);
    state.player.cash = data.cash ?? state.player.cash;
    state.player.respect = data.respect ?? state.player.respect;
    state.player.health = data.health ?? 100;
    state.player.armor = data.armor ?? 0;
    state.missions.done = data.missionsDone || [];
    state.missions.next = data.next || 1;
    state.league.won = data.leagueWon || 0;
    state.league.wonByRace = data.leagueWonByRace || {};
    for (const id of data.territoryHeld || []) {
      const b = state.territory.blocks.find(x => x.id === id);
      if (b) { b.owner = 'crew'; state.territory.held += 1; }
    }
    state.side.shells = data.shells || 0;
    state.side.exportsDone = data.exportsDone || 0;
    for (const id of data.safehouses || []) {
      const h = state.safehouses.find(x => x.id === id);
      if (h) h.owned = true;
    }
    state.stats.completion = data.completion || 0;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSavedGame() {
  try {
    return !!localStorage.getItem('puerto-alba-save-v4');
  } catch (e) {
    return false;
  }
}

export function clearSavedGame() {
  try { localStorage.removeItem('puerto-alba-save-v4'); } catch (e) { /* no storage */ }
}

// ---- Autosave and the save slot ----

export function autosaveGame(state, dt) {
  // Save quietly every two minutes of play, and after every mission.
  state.saveTimer = (state.saveTimer || 0) + (dt || 0.016);
  if (state.saveTimer >= 120) {
    state.saveTimer = 0;
    return saveGameToSafehouse(state);
  }
  return false;
}

export function saveSlotSummary() {
  try {
    const raw = localStorage.getItem('puerto-alba-save-v4');
    if (!raw) return 'No save yet — buy a safehouse to save.';
    const d = JSON.parse(raw);
    return `Save: $${d.cash} · respect ${d.respect} · ${d.missionsDone.length}/12 missions · saved ${d.savedAt}`;
  } catch (e) {
    return 'Save slot unreadable.';
  }
}

export function saveGameVersion() {
  return 'puerto-alba-save-v4';
}

// ---- Multiple save slots and export ----

export function saveGameSlot(state, slot) {
  try {
    const key = `puerto-alba-save-v4-${slot}`;
    const data = {
      cash: state.player.cash,
      respect: state.player.respect,
      missionsDone: state.missions.done,
      next: state.missions.next,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGameSlot(state, slot) {
  try {
    const raw = localStorage.getItem(`puerto-alba-save-v4-${slot}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    state.player.cash = data.cash ?? state.player.cash;
    state.player.respect = data.respect ?? state.player.respect;
    state.missions.done = data.missionsDone || [];
    state.missions.next = data.next || 1;
    return data;
  } catch (e) {
    return null;
  }
}

export function listSaveSlots() {
  const slots = [];
  for (let i = 1; i <= 3; i++) {
    try {
      const raw = localStorage.getItem(`puerto-alba-save-v4-${i}`);
      slots.push({ slot: i, has: !!raw, summary: raw ? JSON.parse(raw).savedAt : null });
    } catch (e) {
      slots.push({ slot: i, has: false, summary: null });
    }
  }
  return slots;
}
