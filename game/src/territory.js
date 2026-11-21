// Puerto Alba — High Water. Gang territory: three Aldana blocks in Casco
// Viejo recolour to crew teal as you take them, and holding all three pays
// a daily cut. The map, the plaza and the rifle screenshot all show it.

import { G } from './config.js';
import { spawnAldanaRivals } from './pedestrians.js';

export function claimTurfBlock(state, id) {
  const block = state.territory.blocks.find(b => b.id === id);
  if (!block) return false;
  if (block.owner === 'crew') return false;
  block.owner = 'crew';
  block.takenAt = state.elapsed;
  state.territory.held += 1;
  state.player.respect = Math.min(10, state.player.respect + 1);
  state.message = `TURF TAKEN — ${block.name} flies crew teal now (${state.territory.held}/3).`;
  state.messageTimer = 4;
  if (state.territory.held >= 3) {
    state.player.cash += 1000;
    state.message = 'ALL THREE BLOCKS HELD — daily cut +$1,000. Casco Viejo is yours.';
    state.messageTimer = 5;
  }
  return true;
}

export function initTerritory(state) {
  state.territory = {
    held: 0,
    blocks: [
      { id: 'plaza', name: 'Plaza del Faro', x: 700, y: 500, w: 600, h: 600, owner: 'aldana' },
      { id: 'arcade', name: 'Los Arcos Arcade', x: 1300, y: 600, w: 400, h: 500, owner: 'aldana' },
      { id: 'market', name: 'Mercado Viejo', x: 800, y: 1150, w: 500, h: 220, owner: 'aldana' },
    ],
  };
  return state.territory;
}

export function updateTerritory(state, dt) {
  const p = state.player;
  if (!state.territory) return;
  for (const b of state.territory.blocks) {
    if (b.owner === 'crew') continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < 160) {
      b.holdTime = (b.holdTime || 0) + dt;
      if (b.holdTime > 6) claimTurfBlock(state, b.id);
    } else {
      b.holdTime = 0;
    }
  }
}

export function drawTerritoryBlocks(ctx, state, camX, camY, t) {
  if (!state.territory) return;
  ctx.save();
  for (const b of state.territory.blocks) {
    const color = b.owner === 'crew' ? 'rgba(55,200,232,0.30)' : 'rgba(194,58,58,0.30)';
    ctx.fillStyle = color;
    ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.strokeStyle = b.owner === 'crew' ? '#37c8e8' : '#c23a3a';
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.setLineDash([]);
    ctx.fillStyle = b.owner === 'crew' ? '#37c8e8' : '#ff8a8a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2 - camX, b.y + 40 - camY);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(b.owner === 'crew' ? 'CREW TURF' : 'ALDANA TURF', b.x + b.w / 2 - camX, b.y + 78 - camY);
    if (b.holdTime > 0 && b.owner !== 'crew') {
      ctx.fillStyle = 'rgba(10,10,18,0.7)';
      ctx.fillRect(b.x + b.w / 2 - 110 - camX, b.y + b.h / 2 - 26 - camY, 220, 52);
      ctx.fillStyle = '#ffd21f';
      ctx.fillRect(b.x + b.w / 2 - 100 - camX, b.y + b.h / 2 - 16 - camY, 200 * Math.min(1, b.holdTime / 6), 32);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('TAKING TURF…', b.x + b.w / 2 - camX, b.y + b.h / 2 + 44 - camY);
    }
  }
  ctx.restore();
}

export function territoryOnMinimap(ctx, state, scale, ox, oy) {
  if (!state.territory) return;
  for (const b of state.territory.blocks) {
    ctx.fillStyle = b.owner === 'crew' ? '#37c8e8' : '#c23a3a';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(ox + b.x * scale, oy + b.y * scale, Math.max(4, b.w * scale), Math.max(4, b.h * scale));
    ctx.globalAlpha = 1;
  }
}

// ---- The daily cut and the turf economy ----

export function turfDailyCut(state) {
  return state.territory.held * 350;
}

export function collectTurfCut(state) {
  const cut = turfDailyCut(state);
  if (cut <= 0) return 0;
  state.player.cash += cut;
  state.message = `Turf cut +$${cut} — ${state.territory.held}/3 blocks paying out.`;
  state.messageTimer = 4;
  return cut;
}

export function territoryControlPercent(state) {
  return Math.round((state.territory.held / state.territory.blocks.length) * 100);
}

export function aldanaStrength(state) {
  return state.territory.blocks.filter(b => b.owner === 'aldana').length;
}

// ---- Gang wars: the Aldana family pushes back ----

export function aldanaCounterAttack(state) {
  if (state.territory.held === 0) return false;
  const block = state.territory.blocks.find(b => b.owner === 'crew');
  if (!block) return false;
  block.owner = 'contested';
  block.holdTime = 0;
  state.message = `ALDANA COUNTER-ATTACK — ${block.name} is contested! Hold it!`;
  state.messageTimer = 5;
  spawnAldanaRivals(state, block.x + block.w / 2, block.y + block.h / 2, 3);
  return true;
}

export function defendContestedBlock(state, dt) {
  for (const b of state.territory.blocks) {
    if (b.owner !== 'contested') continue;
    const p = state.player;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (Math.hypot(p.x - cx, p.y - cy) < 160) {
      b.holdTime = (b.holdTime || 0) + dt;
      if (b.holdTime > 6) {
        b.owner = 'crew';
        state.message = `${b.name} defended — still crew turf.`;
        state.messageTimer = 4;
      }
    }
  }
}

export function gangWarStatus(state) {
  const crew = state.territory.blocks.filter(b => b.owner === 'crew').length;
  const aldana = state.territory.blocks.filter(b => b.owner === 'aldana').length;
  const contested = state.territory.blocks.filter(b => b.owner === 'contested').length;
  return { crew, aldana, contested, total: state.territory.blocks.length };
}
