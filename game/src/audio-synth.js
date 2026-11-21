// Puerto Alba — High Water. Synthesized audio: everything is WebAudio, no
// files — engine hum by speed, rotor thump, sirens, gunshots, pickup chimes
// and a simple three-station radio loop while driving.

import { G } from './config.js';

export function synthesizeEngineHum(state, speed) {
  const ac = audioContext(state);
  if (!ac) return;
  if (!state.audio.engine) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    state.audio.engine = { osc, gain };
  }
  const e = state.audio.engine;
  e.osc.frequency.value = 55 + Math.abs(speed) * 0.28;
  e.gain.gain.value = state.audio.muted ? 0 : (speed > 10 ? 0.05 : 0.015);
}

export function synthesizeRotorThump(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.value = 11;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  osc.stop(ac.currentTime + 0.5);
}

export function synthesizeSirenWail(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(1100, ac.currentTime + 0.4);
  osc.frequency.linearRampToValueAtTime(700, ac.currentTime + 0.8);
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.8);
}

export function synthesizeGunshot(state, weaponId) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const dur = weaponId === 'rifle' ? 0.28 : 0.12;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = weaponId === 'rifle' ? 0.3 : 0.18;
  src.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

export function synthesizePickupChime(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const notes = [660, 880, 990];
  notes.forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + i * 0.09);
    osc.stop(ac.currentTime + i * 0.09 + 0.18);
  });
}

export function synthesizeRadioLoop(state, dt) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  state.audio.radioTimer = (state.audio.radioTimer || 0) - dt;
  if (state.audio.radioTimer > 0) return;
  state.audio.radioTimer = 0.42;
  const stations = [
    [220, 277, 330], // Lumen FM — neon synth
    [196, 247, 294], // Radio Faro — island groove
    [174, 220, 262], // Storm FM — low and slow
  ];
  const notes = stations[state.radio.station % 3];
  const f = notes[Math.floor(state.elapsed * 2.4) % 3];
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = f;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.4);
}

export function audioContext(state) {
  if (!state.audio) state.audio = {};
  if (state.audio.ctx) return state.audio.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    state.audio.ctx = new AC();
    return state.audio.ctx;
  } catch (e) {
    return null;
  }
}

export function toggleMuteAudio(state) {
  state.audio = state.audio || {};
  state.audio.muted = !state.audio.muted;
  if (state.audio.engine) state.audio.engine.gain.gain.value = 0;
  return state.audio.muted;
}

// ---- Explosions, sirens and the radio jingle ----

export function synthesizeExplosion(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const dur = 0.7;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = 0.4;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

export function synthesizeSirenLoop(state, dt) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  if (state.player.wanted < 2) return;
  state.audio.sirenTimer = (state.audio.sirenTimer || 0) - dt;
  if (state.audio.sirenTimer > 0) return;
  state.audio.sirenTimer = 1.6;
  synthesizeSirenWail(state);
}

export function synthesizeRadioJingle(state, station) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const jingles = [[523, 659, 784], [392, 494, 587], [330, 415, 494]];
  const notes = jingles[station % 3];
  notes.forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + i * 0.12);
    osc.stop(ac.currentTime + i * 0.12 + 0.14);
  });
}

export function synthesizeCashRegister(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  [880, 1174].forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + i * 0.08);
    osc.stop(ac.currentTime + i * 0.08 + 0.12);
  });
}

// ---- Ambient city sounds: gulls, traffic, the harbour ----

export function synthesizeSeagullCry(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.3);
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.35);
}

export function synthesizeTrafficHum(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 48;
  gain.gain.value = 0.015;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 1.2);
}

export function synthesizeHarbourBell(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 660;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.4);
  osc.stop(ac.currentTime + 1.4);
}

export function synthesizeThunderRoll(state) {
  const ac = audioContext(state);
  if (!ac || state.audio.muted) return;
  const dur = 1.8;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = 0.25;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 120;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

export function ambientSoundTick(state, dt) {
  // Every few seconds, the city makes a sound near the player.
  state.audio.ambientTimer = (state.audio.ambientTimer || 0) - dt;
  if (state.audio.ambientTimer > 0) return;
  state.audio.ambientTimer = 4 + Math.random() * 6;
  const nearWater = state.player.y > 3600 || state.player.x > 4400;
  if (nearWater && Math.random() < 0.5) synthesizeSeagullCry(state);
  else if (state.weather === 'storm') synthesizeThunderRoll(state);
  else synthesizeTrafficHum(state);
}
