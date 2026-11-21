// Puerto Alba — High Water. The oversized HUD: a 340px minimap, 58px wanted
// stars, a 42px objective banner on a dark plate, and 34px cash, health and
// weapon readouts — built so the game still reads in a 200px contact-sheet
// cell. Also the title, pause, busted and wasted screens.

import { G, CFG, DISTRICTS, WATER, ISLAND, WEAPONS } from './config.js';
import { drawWantedStars } from './police-pursuit.js';
import { territoryOnMinimap } from './territory.js';

export function drawOversizedHud(ctx, state) {
  if (state.screen === 'title') { drawTitleScreen(ctx, state); return; }
  if (state.screen === 'garage') return; // the garage panel draws its own UI
  drawObjectiveBanner(ctx, state);
  drawWantedStars(ctx, state);
  drawMinimap(ctx, state);
  drawPlayerReadouts(ctx, state);
  drawSpeedometer(ctx, state);
  drawStaminaBar(ctx, state);
  drawMessageBar(ctx, state);
  if (state.screen === 'pause') drawPauseScreen(ctx, state);
  if (state.screen === 'busted') drawBustedScreen(ctx, state);
  if (state.screen === 'wasted') drawWastedScreen(ctx, state);
}

export function drawObjectiveBanner(ctx, state) {
  const b = state.banner;
  if (!b) return;
  ctx.save();
  // Plate sits right of the wanted stars (stars end at x 334), so the
  // 40px title has room and never collides with them. A title too wide
  // for one line splits at the em dash onto two 40px lines.
  const w = 896;
  const x = 360;
  const y = 18;
  ctx.font = 'bold 40px sans-serif';
  const oneLine = ctx.measureText(b.title).width <= w - 30;
  const plateH = oneLine ? 118 : 150;
  ctx.fillStyle = 'rgba(8,8,16,0.78)';
  ctx.fillRect(x, y, w, plateH);
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, plateH);
  ctx.fillStyle = '#ffd21f';
  ctx.textAlign = 'center';
  if (oneLine) {
    ctx.fillText(b.title, x + w / 2, y + 50);
  } else {
    const parts = b.title.split(' — ');
    ctx.fillText(fitBannerText(ctx, parts[0] + ' —', w - 30), x + w / 2, y + 42);
    ctx.fillText(fitBannerText(ctx, parts.slice(1).join(' — '), w - 30), x + w / 2, y + 84);
  }
  ctx.fillStyle = '#fff';
  ctx.font = '26px sans-serif';
  ctx.fillText(fitBannerText(ctx, b.sub, w - 30), x + w / 2, y + (oneLine ? 92 : 122));
  // Objective checklist beneath the banner, big and plain.
  if (b.checklist && b.checklist.length) {
    ctx.textAlign = 'left';
    ctx.font = '30px sans-serif';
    const startY = y + (oneLine ? 138 : 170);
    b.checklist.forEach((line, i) => {
      const yy = startY + i * 38;
      ctx.fillStyle = 'rgba(8,8,16,0.7)';
      ctx.fillRect(x + 8, yy - 28, w - 16, 36);
      ctx.fillStyle = '#37e8ff';
      ctx.fillText('▸ ' + line, x + 22, yy);
    });
  }
  ctx.restore();
}

export function fitBannerText(ctx, text, maxW) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

export function drawMinimap(ctx, state) {
  const size = CFG.MINIMAP_SIZE;
  const ox = 1280 - CFG.MINIMAP_MARGIN - size;
  const oy = 186;
  const scale = size / CFG.WORLD_W;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.82)';
  ctx.fillRect(ox - 8, oy - 8, size + 16, size + 16);
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 5;
  ctx.strokeRect(ox - 8, oy - 8, size + 16, size + 16);
  // Water, then land, then roads.
  ctx.fillStyle = '#1d6a8a';
  ctx.fillRect(ox, oy, size, size);
  ctx.fillStyle = '#8a8a72';
  ctx.fillRect(ox, oy, size, (3800 / CFG.WORLD_H) * size);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(ox + d.x * scale, oy + d.y * scale, d.w * scale, d.h * scale);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(ox + rx * scale, oy); ctx.lineTo(ox + rx * scale, oy + size); ctx.stroke();
  }
  for (const ry of state.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(ox, oy + ry * scale); ctx.lineTo(ox + size, oy + ry * scale); ctx.stroke();
  }
  territoryOnMinimap(ctx, state, scale, ox, oy);
  // Island and airstrip.
  ctx.fillStyle = '#a8b878';
  ctx.fillRect(ox + ISLAND.x * scale, oy + ISLAND.y * scale, ISLAND.w * scale, ISLAND.h * scale);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✈', ox + 5200 * scale, oy + 560 * scale);
  // Mission beacon, police blips, safehouses, player.
  const m = state.missions.current;
  if (m && m.active && m.target) {
    ctx.fillStyle = '#ffd21f';
    ctx.beginPath(); ctx.arc(ox + m.target.x * scale, oy + m.target.y * scale, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#20202e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  for (const c of state.police) {
    ctx.fillStyle = c.kind === 'police-boat' ? '#2a6bff' : '#ff2a2a';
    ctx.beginPath(); ctx.arc(ox + c.x * scale, oy + c.y * scale, 6, 0, Math.PI * 2); ctx.fill();
  }
  for (const h of state.safehouses) {
    if (!h.owned) continue;
    ctx.fillStyle = '#37e87a';
    ctx.fillRect(ox + h.x * scale - 5, oy + h.y * scale - 5, 10, 10);
  }
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ox + state.player.x * scale, oy + state.player.y * scale, 9, 0, Math.PI * 2); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PUERTO ALBA', ox, oy - 16);
  ctx.restore();
}

export function drawPlayerReadouts(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.78)';
  ctx.fillRect(24, 640, 470, 132);
  ctx.strokeStyle = '#37c8e8';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 640, 470, 132);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#37e87a';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(`$${p.cash.toLocaleString()}`, 44, 676);
  ctx.fillStyle = '#ff5c5c';
  ctx.fillText(`♥ ${Math.ceil(p.health)}`, 44, 716);
  if (p.armor > 0) {
    ctx.fillStyle = '#37e8ff';
    ctx.fillText(`ARMOR ${Math.ceil(p.armor)}`, 220, 716);
  }
  const w = WEAPONS[p.weapon];
  ctx.fillStyle = '#fff';
  ctx.fillText(`${w.name}  ${p.ammo[p.weapon] ?? '∞'}`, 44, 752);
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(`RESPECT ${p.respect}`, 260, 676);
  ctx.restore();
}

export function drawSpeedometer(ctx, state) {
  const p = state.player;
  const v = p.vehicle;
  const speed = v ? Math.abs(Math.round(v.speed * 2.2)) : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.78)';
  ctx.fillRect(1080, 640, 176, 132);
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 4;
  ctx.strokeRect(1080, 640, 176, 132);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(speed), 1168, 700);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(v ? (v.name || v.label || 'HELICOPTER').toUpperCase() : 'ON FOOT', 1168, 748);
  ctx.restore();
}

export function drawStaminaBar(ctx, state) {
  const p = state.player;
  if (!p.onFoot) return;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.7)';
  ctx.fillRect(24, 610, 300, 22);
  ctx.fillStyle = '#7dff5c';
  ctx.fillRect(26, 612, 296 * (p.stamina / 100), 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SPRINT', 330, 621);
  ctx.restore();
}

export function drawMessageBar(ctx, state) {
  if (!state.message || state.messageTimer <= 0) return;
  ctx.save();
  ctx.font = '30px sans-serif';
  let text = state.message;
  let w = ctx.measureText(text).width + 60;
  if (w > 1200) {
    ctx.font = '24px sans-serif';
    w = ctx.measureText(text).width + 60;
    while (w > 1200 && text.length > 10) {
      text = text.slice(0, -1);
      w = ctx.measureText(text + '…').width + 60;
    }
    text += '…';
    w = ctx.measureText(text).width + 60;
  }
  ctx.fillStyle = 'rgba(8,8,16,0.8)';
  ctx.fillRect((1280 - w) / 2, 560, w, 46);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, 640, 590);
  ctx.restore();
}

export function drawTitleScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, 1280, 800);
  // Golden-hour sky band and a skyline silhouette.
  const grad = ctx.createLinearGradient(0, 0, 0, 500);
  grad.addColorStop(0, '#ffb35c');
  grad.addColorStop(1, '#e87a5c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 500);
  ctx.fillStyle = '#1a1a2e';
  for (let i = 0; i < 14; i++) {
    const bw = 70 + ((i * 53) % 60);
    ctx.fillRect(i * 92, 500 - 120 - ((i * 37) % 180), bw, 120 + ((i * 37) % 180));
  }
  ctx.fillStyle = '#37e8ff';
  ctx.fillRect(0, 496, 1280, 8);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 92px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PUERTO ALBA', 640, 210);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('— HIGH WATER —', 640, 280);
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.fillText('Dana Ríos · Celia Marín · the Aldana family · twelve missions', 640, 360);
  ctx.fillText('A storm-season open world: drive, fly, race, fight, take the turf.', 640, 404);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PRESS ENTER TO PLAY', 640, 560);
  ctx.fillStyle = '#cfd8e8';
  ctx.font = '28px sans-serif';
  ctx.fillText('WASD move / drive · E enter vehicle · Mouse aim · Click shoot', 640, 640);
  ctx.fillText('Shift sprint · Esc pause + full map · J missions · P phone · T tune', 640, 682);
  ctx.fillText('1-4 weapons · B buy safehouse · M mute', 640, 724);
  ctx.restore();
}

export function drawPauseScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.82)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 200);
  ctx.font = '34px sans-serif';
  ctx.fillText('Esc resume · M full-city map · J missions board · P phone', 640, 280);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`Cash $${state.player.cash} · Respect ${state.player.respect} · Completion ${state.stats.completion}%`, 640, 360);
  ctx.restore();
}

export function drawBustedScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,60,0.9)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ff5c5c';
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED', 640, 340);
  ctx.fillStyle = '#fff';
  ctx.font = '36px sans-serif';
  ctx.fillText(`The police took $${state.bustedFine || 0} and dropped you at the precinct.`, 640, 430);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PRESS ENTER TO CONTINUE', 640, 520);
  ctx.restore();
}

export function drawWastedScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,10,10,0.9)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ff5c5c';
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASTED', 640, 340);
  ctx.fillStyle = '#fff';
  ctx.font = '36px sans-serif';
  ctx.fillText(`Hospital bill $${state.wastedFine || 0}. Dana Ríos walks out again.`, 640, 430);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PRESS ENTER TO CONTINUE', 640, 520);
  ctx.restore();
}

// ---- Weapon wheel, radio display and the progress screen ----

export function drawWeaponWheel(ctx, state) {
  const p = state.player;
  const cx = 640, cy = 400;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.85)';
  ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 5;
  ctx.stroke();
  const weapons = ['pistol', 'scattergun', 'smg', 'rifle'];
  weapons.forEach((w, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const x = cx + Math.cos(a) * 95, y = cy + Math.sin(a) * 95;
    ctx.fillStyle = p.weapon === w ? '#ffd21f' : '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(WEAPONS[w].name.toUpperCase(), x, y);
    ctx.font = '22px sans-serif';
    ctx.fillText(p.weapons.includes(w) ? `${p.ammo[w] ?? '∞'}` : 'LOCKED', x, y + 28);
  });
  ctx.restore();
}

export function drawRadioDisplay(ctx, state) {
  const stations = ['LUMEN FM', 'RADIO FARO', 'STORM FM'];
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.75)';
  ctx.fillRect(1080, 560, 176, 60);
  ctx.fillStyle = '#ff4fd8';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('♪ ' + stations[state.radio.station % 3], 1168, 598);
  ctx.restore();
}

export function drawProgressScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PROGRESS', 640, 120);
  const rows = [
    ['Missions', `${state.missions.done.length}/12`],
    ['Completion', `${state.stats.completion}%`],
    ['Cash', `$${state.player.cash.toLocaleString()}`],
    ['Respect', `${state.player.respect}/10`],
    ['League races won', `${state.league.won}/6`],
    ['Sun shells', `${state.side.shells}/18`],
    ['Exports delivered', `${state.side.exportsDone}/6`],
    ['Turf held', `${state.territory.held}/3`],
    ['Safehouses', `${state.safehouses.filter(h => h.owned).length}/3`],
    ['Distance driven', `${(state.stats.distance / 10).toFixed(1)} km`],
  ];
  ctx.font = '32px sans-serif';
  rows.forEach((r, i) => {
    const y = 190 + i * 52;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], 380, y);
    ctx.fillStyle = '#37e8ff';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], 900, y);
  });
  ctx.restore();
}

// ---- Blinking wanted stars and cash popups ----

export function drawBlinkingWanted(ctx, state, t) {
  if (state.player.wanted === 0) return;
  if (state.player.heat < 0.25 && Math.floor(t * 3) % 2 === 0) {
    // The stars blink when the heat is almost gone.
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawWantedStars(ctx, state);
    ctx.restore();
  }
}

export function drawCashPopup(ctx, state) {
  if (!state.cashPopup || state.cashPopup.timer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.cashPopup.timer);
  ctx.fillStyle = '#37e87a';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.cashPopup.text, 640, 480);
  ctx.restore();
}

export function showCashPopup(state, text) {
  state.cashPopup = { text, timer: 2 };
}

export function drawRespectToast(ctx, state) {
  if (!state.respectToast || state.respectToast.timer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.respectToast.timer);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.respectToast.text, 640, 300);
  ctx.restore();
}

// ---- Compass and the north star ----

export function drawCompass(ctx, state) {
  const angle = state.player.angle;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((angle + Math.PI / 2) / (Math.PI / 4)) % 8 + 8) % 8;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.75)';
  ctx.beginPath(); ctx.arc(640, 60, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dirs[idx], 640, 71);
  ctx.restore();
}

export function compassDirection(state) {
  const angle = state.player.angle;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((angle + Math.PI / 2) / (Math.PI / 4)) % 8 + 8) % 8;
  return dirs[idx];
}

// ---- Minimap zoom and the district label ----

export function minimapZoomLevel(state) {
  return state.minimapZoom || 1;
}

export function cycleMinimapZoom(state) {
  const levels = [1, 1.5, 2];
  const i = levels.indexOf(state.minimapZoom || 1);
  state.minimapZoom = levels[(i + 1) % levels.length];
  state.message = `Minimap zoom ${state.minimapZoom}x.`;
  state.messageTimer = 2;
  return state.minimapZoom;
}

export function drawMinimapDistrictLabel(ctx, state) {
  const p = state.player;
  for (const d of DISTRICTS) {
    if (p.x >= d.x && p.x < d.x + d.w && p.y >= d.y && p.y < d.y + d.h) return d.name;
  }
  return 'Puerto Alba';
}

export function drawMinimapNorth(ctx, state) {
  const size = CFG.MINIMAP_SIZE;
  const ox = 1280 - CFG.MINIMAP_MARGIN - size;
  const oy = 186;
  ctx.save();
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', ox + size - 14, oy + 24);
  ctx.restore();
}

// ---- Minimap pings and the wanted history ----

export function minimapPing(state, x, y, color) {
  state.minimapPings = state.minimapPings || [];
  state.minimapPings.push({ x, y, color, life: 3 });
  if (state.minimapPings.length > 8) state.minimapPings.shift();
}

export function updateMinimapPings(state, dt) {
  if (!state.minimapPings) return;
  for (const p of state.minimapPings) p.life -= dt;
  state.minimapPings = state.minimapPings.filter(p => p.life > 0);
}

export function drawMinimapPings(ctx, state) {
  if (!state.minimapPings) return;
  const size = CFG.MINIMAP_SIZE;
  const ox = 1280 - CFG.MINIMAP_MARGIN - size;
  const oy = 186;
  const scale = size / CFG.WORLD_W;
  ctx.save();
  for (const p of state.minimapPings) {
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ox + p.x * scale, oy + p.y * scale, 12 + (3 - p.life) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function wantedHistory(state) {
  state.wantedLog = state.wantedLog || [];
  return state.wantedLog;
}

export function logWantedChange(state, from, to, reason) {
  state.wantedLog = state.wantedLog || [];
  state.wantedLog.push({ from, to, reason, at: state.elapsed });
  if (state.wantedLog.length > 20) state.wantedLog.shift();
  return state.wantedLog.length;
}

export function drawWantedHistory(ctx, state) {
  const log = wantedHistory(state);
  if (log.length === 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.7)';
  ctx.fillRect(24, 200, 380, 30 + log.length * 26);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  log.slice(-6).forEach((e, i) => {
    ctx.fillText(`${e.from}★ → ${e.to}★ — ${e.reason}`, 40, 228 + i * 26);
  });
  ctx.restore();
}
