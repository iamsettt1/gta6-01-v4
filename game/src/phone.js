// Puerto Alba — High Water. The phone (key P): giver contacts, the next
// objective, the bribe option, the radio, and the league table — the
// pocket-sized version of the whole game.

import { G, MISSIONS } from './config.js';
import { bribePoliceOnPhone } from './police-pursuit.js';

export function openPhoneContacts(state) {
  state.screen = state.screen === 'phone' ? 'play' : 'phone';
  return state.screen;
}

export function phoneContacts(state) {
  const next = state.missions.next || 1;
  const nextDef = MISSIONS[next - 1];
  return [
    { name: 'Celia Marín', role: 'Fixer · Harbour Crew', note: nextDef ? `Next: Mission ${next} — ${nextDef.name}` : 'Story complete.' },
    { name: 'Rook', role: 'Crew muscle · Docks', note: 'Ammo and armour at the paint shop.' },
    { name: 'Lumen League', role: 'Street racing', note: `${state.league.won}/6 races won.` },
    { name: 'Precinct', role: 'Police bribe', note: state.player.wanted > 0 ? `Heat ${state.player.wanted}★ — bribe $${150 * state.player.wanted}` : 'No heat right now.' },
  ];
}

export function drawPhoneScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.85)';
  ctx.fillRect(0, 0, 1280, 800);
  // The phone itself, centred, big enough to read.
  const px = 440, py = 90, pw = 400, ph = 620;
  ctx.fillStyle = '#14141e';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#37e8ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = '#37e8ff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DANA · PHONE', 640, py + 52);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  let y = py + 110;
  for (const c of phoneContacts(state)) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(c.name, px + 30, y);
    ctx.fillStyle = '#cfd8e8';
    ctx.font = '24px sans-serif';
    ctx.fillText(c.role, px + 30, y + 32);
    ctx.fillStyle = '#fff';
    ctx.fillText(c.note, px + 30, y + 64);
    y += 104;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(px + 20, y - 18); ctx.lineTo(px + pw - 20, y - 18); ctx.stroke();
  }
  ctx.fillStyle = '#37e87a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('B — bribe the police (when wanted)', 640, py + ph - 70);
  ctx.fillText('R — change radio station', 640, py + ph - 34);
  ctx.fillStyle = '#cfd8e8';
  ctx.font = '26px sans-serif';
  ctx.fillText('P — close the phone', 640, py + ph + 44);
  ctx.restore();
}

export function handlePhoneBribe(state) {
  return bribePoliceOnPhone(state);
}

// ---- Phone actions: radio, bribe, league ----

export function phoneRadioStation(state) {
  state.radio.station = (state.radio.station + 1) % 3;
  const names = ['LUMEN FM', 'RADIO FARO', 'STORM FM'];
  state.message = `Radio: ${names[state.radio.station]}.`;
  state.messageTimer = 2;
  return names[state.radio.station];
}

export function phoneCallCelia(state) {
  const next = state.missions.next || 1;
  if (next > 12) {
    state.message = 'Celia: "Puerto Alba is yours, Dana. Enjoy the storm."';
  } else {
    const def = MISSIONS[next - 1];
    state.message = `Celia: "Mission ${next} — ${def.name}. ${def.brief}"`;
  }
  state.messageTimer = 5;
  return state.message;
}

export function phoneCallRook(state) {
  state.message = 'Rook: "Docks are quiet. For now. Keep your rifle close."';
  state.messageTimer = 4;
  return state.message;
}

export function drawPhoneContactsList(ctx, state, x, y) {
  const contacts = phoneContacts(state);
  ctx.save();
  ctx.textAlign = 'left';
  contacts.forEach((c, i) => {
    const yy = y + i * 60;
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(c.name, x, yy);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(c.note, x, yy + 26);
  });
  ctx.restore();
}

// ---- Text messages from the crew ----

export function crewTextMessages(state) {
  return [
    { from: 'Celia Marín', text: 'Dana. First job is waiting at the plaza. Do not be late.', at: '08:12' },
    { from: 'Rook', text: 'Docks are quiet tonight. Too quiet.', at: '21:40' },
    { from: 'Lumen League', text: 'Race 3 of 6 opens Friday. Bring something fast.', at: '19:05' },
    { from: 'Celia Marín', text: 'The Aldana family is moving cars through Zona Franca. Watch them.', at: '23:31' },
  ];
}

export function drawTextMessages(ctx, state, x, y) {
  ctx.save();
  ctx.textAlign = 'left';
  crewTextMessages(state).forEach((m, i) => {
    const yy = y + i * 70;
    ctx.fillStyle = '#37e8ff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${m.from} · ${m.at}`, x, yy);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(m.text, x, yy + 28);
  });
  ctx.restore();
}

export function unreadMessageCount(state) {
  return crewTextMessages(state).length;
}
