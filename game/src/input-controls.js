// Puerto Alba — High Water. Controls: keyboard and mouse, one binding table
// the whole game reads. WASD move and drive, E enter a vehicle, mouse aim,
// click shoot, Shift sprint, Esc pause and the full-city map, J missions,
// P phone, T tune, 1–4 weapons, B buy a safehouse, M mute.

import { G } from './config.js';
import { enterNearestVehicle, shovePedestrian, talkToMissionGiver } from './player-on-foot.js';
import { openPhoneContacts, handlePhoneBribe } from './phone.js';
import { enterSafehouse } from './safehouses.js';
import { fitNeonUnderglow, playerNearTuningShop } from './tuning-shop.js';
import { switchWeapon, fireWeapon } from './combat-weapons.js';
import { startStoryMission } from './missions-story.js';

export function bindKeyboardControls(state, canvas) {
  const down = (e) => {
    const k = e.key.toLowerCase();
    state.keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    handleKeyPress(state, k, e);
  };
  const up = (e) => { state.keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - r.left;
    state.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    state.mouse.down = true;
    if (e.button === 0) handleMouseClick(state);
  });
  window.addEventListener('mouseup', () => { state.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return { down, up };
}

export function handleKeyPress(state, k, e) {
  const p = state.player;
  if (!p) return;
  // Title and end screens answer Enter first.
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) {
    startPlayFromTitle(state);
    return;
  }
  if ((state.screen === 'busted' || state.screen === 'wasted') && k === 'enter') {
    state.screen = 'play';
    return;
  }
  if (k === 'escape') {
    if (state.screen === 'play') state.screen = 'pause';
    else if (state.screen === 'pause') state.screen = 'play';
    else if (state.screen === 'map') state.screen = 'pause';
    else if (state.screen === 'board' || state.screen === 'phone' || state.screen === 'help' || state.screen === 'progress') state.screen = 'play';
    return;
  }
  if (state.screen !== 'play') return;
  if (k === 'h') state.screen = 'help';
  if (k === 'u') state.screen = 'progress';
  if (k === 'e') enterNearestVehicle(state);
  if (k === 'm') state.screen = 'map';
  if (k === 'j') state.screen = 'board';
  if (k === 'p') openPhoneContacts(state);
  if (k === 'b') {
    if (state.player.wanted > 0) handlePhoneBribe(state);
    else enterSafehouse(state);
  }
  if (k === 't') {
    if (playerNearTuningShop(state) && state.player.vehicle) {
      fitNeonUnderglow(state, state.player.vehicle, '#37e8ff');
    }
  }
  if (k === '1') switchWeapon(state, 'pistol');
  if (k === '2') switchWeapon(state, 'scattergun');
  if (k === '3') switchWeapon(state, 'smg');
  if (k === '4') switchWeapon(state, 'rifle');
  if (k === 'f') shovePedestrian(state);
  if (k === 'g') talkToMissionGiver(state);
}

export function handleMouseClick(state) {
  const p = state.player;
  if (!p || state.screen !== 'play') return;
  // Aim and fire toward the mouse — on foot, or drive-by from a vehicle.
  const wx = state.camera.x + state.mouse.x;
  const wy = state.camera.y + state.mouse.y;
  fireWeapon(state, p.weapon, wx, wy);
}

export function startPlayFromTitle(state) {
  state.screen = 'play';
  if (!state.missions.current && state.missions.next <= 12) {
    startStoryMission(state, state.missions.next);
  }
}

export function controlHelpLines() {
  return [
    'WASD — move / drive / fly',
    'E — enter or exit a vehicle',
    'Mouse — aim, Click — shoot',
    'Shift — sprint',
    'Esc — pause, M — full-city map',
    'J — missions board, P — phone',
    'T — tune at the shop, B — safehouse',
    '1–4 — pistol, scattergun, SMG, rifle',
  ];
}

// ---- Gamepad support (optional, keyboard stays primary) ----

export function pollGamepadControls(state) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[0];
  if (!pad) return false;
  const dead = (v) => Math.abs(v) > 0.2 ? v : 0;
  const lx = dead(pad.axes[0] || 0);
  const ly = dead(pad.axes[1] || 0);
  state.keys['w'] = ly < -0.3 || state.keys['w'];
  state.keys['s'] = ly > 0.3 || state.keys['s'];
  state.keys['a'] = lx < -0.3 || state.keys['a'];
  state.keys['d'] = lx > 0.3 || state.keys['d'];
  if (pad.buttons[0] && pad.buttons[0].pressed) handleMouseClick(state);
  if (pad.buttons[2] && pad.buttons[2].pressed) enterNearestVehicle(state);
  return true;
}

export function gamepadConnected() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return !!(pads && pads[0]);
}

// ---- Key remapping table and touch controls ----

export const KEY_BINDINGS = {
  up: ['w', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
  enterVehicle: ['e'],
  shoot: ['mouse'],
  sprint: ['shift'],
  pause: ['escape'],
  map: ['m'],
  board: ['j'],
  phone: ['p'],
  tune: ['t'],
  safehouse: ['b'],
  shove: ['f'],
  talk: ['g'],
};

export function bindingFor(action) {
  return KEY_BINDINGS[action] || [];
}

export function isKeyBound(state, action, key) {
  return bindingFor(action).includes(key);
}

export function drawTouchControls(ctx, state) {
  // On-screen buttons for touch play: left stick area and action buttons.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(140, 640, 90, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(1140, 640, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('E', 1140, 650);
  ctx.beginPath(); ctx.arc(1140, 520, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.fillText('FIRE', 1140, 530);
  ctx.restore();
}
