// Puerto Alba — High Water. Twelve story missions for Dana Ríos, working
// for fixer Celia Marín against the Aldana family: a chained story from a
// first courier job to a storm-season bridge heist with a helicopter escape.
// Each mission has a giver, a briefing, objectives, a fail state, and cash
// plus respect rewards, shown on an on-screen objective checklist.

import { G, MISSIONS, clamp } from './config.js';

export function startStoryMission(state, n) {
  const def = MISSIONS[n - 1];
  if (!def) return null;
  const m = {
    n: def.n, name: def.name, giver: def.giver, cash: def.cash, respect: def.respect,
    brief: def.brief, stage: 0, active: true, failed: false, timer: 0,
    target: missionTarget(state, n, 0),
    progress: 0, progressMax: missionProgressMax(n),
  };
  state.missions.current = m;
  state.missions.started[n] = true;
  state.banner = {
    title: `MISSION ${n}/12 — ${def.name.toUpperCase()}`,
    sub: `${def.giver}: ${def.brief}`,
    checklist: missionChecklist(n, 0),
  };
  state.objectives = missionChecklist(n, 0);
  state.message = `Mission ${n}: ${def.name} — ${def.brief}`;
  state.messageTimer = 6;
  return m;
}

export function missionProgressMax(n) {
  if (n === 7) return 3;
  if (n === 10) return 3;
  if (n === 4) return 6;
  if (n === 2) return 100;
  return 1;
}

export function missionChecklist(n, stage) {
  const lists = {
    1: ['Steal the marked sedan', 'Deliver it to the marina'],
    2: ['Follow the courier', 'Do not get spotted', 'Do not lose him'],
    3: ['Deliver the package', 'Beat the clock'],
    4: ['Clear the Aldana crew off the docks', 'Survive the shootout'],
    5: ['Win the 3-lap street race', 'Beat the crown time'],
    6: ['Reach Isla Faro by boat', 'Lose the police boats'],
    7: ['Steal 3 named cars', 'Deliver each to the Zona Franca garage'],
    8: ['Survive the Barrio Lumen ambush', 'Hold out until the storm breaks'],
    9: ['Chase the armoured van', 'Stop it on the bridges'],
    10: ['Take 3 Aldana blocks', 'Hold the plaza'],
    11: ['Steal the police helicopter', 'Lose the 5-star pursuit in the air'],
    12: ['Crack the marina vault convoy', 'Escape at 5 stars — car, boat or helicopter'],
  };
  return lists[n] || ['Complete the objective'];
}

export function missionTarget(state, n, stage) {
  const T = {
    1: [{ x: 1000, y: 800, label: 'Marked sedan' }, { x: 4600, y: 2600, label: 'Marina drop-off' }],
    2: [{ x: 1200, y: 1000, label: 'Courier' }],
    3: [{ x: 1000, y: 2000, label: 'Lumen drop-off' }],
    4: [{ x: 4600, y: 2300, label: 'Dockside shootout' }],
    5: [{ x: 2800, y: 800, label: 'Race start' }],
    6: [{ x: 5200, y: 3350, label: 'Isla Faro cove' }],
    7: [{ x: 5200, y: 560, label: 'Zona Franca garage' }],
    8: [{ x: 1000, y: 2000, label: 'Ambush in Barrio Lumen' }],
    9: [{ x: 5200, y: 3350, label: 'Island bridges' }],
    10: [{ x: 1000, y: 800, label: 'Casco Viejo plaza' }],
    11: [{ x: 5200, y: 560, label: 'Police helicopter' }],
    12: [{ x: 4600, y: 2300, label: 'Marina vault convoy' }],
  };
  const list = T[n] || [{ x: 1000, y: 800, label: 'Objective' }];
  return list[Math.min(stage, list.length - 1)];
}

export function updateStoryMission(state, dt) {
  const m = state.missions.current;
  if (!m || !m.active) return;
  m.timer += dt;
  const p = state.player;
  const t = m.target;
  if (!t) return;
  const d = Math.hypot(p.x - t.x, p.y - t.y);
  // Reaching a mission target advances the stage.
  if (d < 130) {
    if (m.n === 1 && m.stage === 0) {
      if (p.vehicle && p.vehicle.marked) { advanceMissionStage(state, m); }
      else if (p.onFoot) { state.message = 'This is the marked sedan — press E to steal it.'; state.messageTimer = 2; }
    } else if (m.n === 7) {
      m.progress += 1;
      if (m.progress >= m.progressMax) completeStoryMission(state, m);
      else { m.target = missionTarget(state, m.n, m.stage + 1); state.message = `Export car ${m.progress}/3 delivered.`; state.messageTimer = 3; }
    } else if (m.n === 10) {
      m.progress += 1;
      if (m.progress >= 3) completeStoryMission(state, m);
      else state.message = `Block taken ${m.progress}/3 — hold the plaza!`;
    } else if (m.n === 5) {
      // Hand the race off to the league module.
      state.message = 'Race start — the league is watching.';
    } else {
      advanceMissionStage(state, m);
    }
  }
  // Mission 2: the detection meter.
  if (m.n === 2) {
    const courier = state.missions.courier;
    if (courier) {
      const cd = Math.hypot(p.x - courier.x, p.y - courier.y);
      if (cd < 120) m.progress = Math.min(100, m.progress + 30 * dt);
      else if (cd > 700) m.progress = Math.min(100, m.progress + 20 * dt);
      else m.progress = Math.max(0, m.progress - 12 * dt);
      if (m.progress >= 100) failStoryMission(state, m, 'The courier spotted you.');
    }
  }
  // Mission 3: the clock.
  if (m.n === 3 && m.timer > 90) failStoryMission(state, m, 'Out of time on the Lumen Run.');
  // Mission 8: survive the ambush timer.
  if (m.n === 8 && m.timer > 75) completeStoryMission(state, m);
  // Mission 11: stealing the helicopter completes stage one.
  if (m.n === 11 && m.stage === 0 && p.vehicle && p.vehicle.kind === 'heli' && p.vehicle.police) {
    advanceMissionStage(state, m);
    state.player.wanted = 5;
  }
  if (m.n === 11 && m.stage === 1 && p.wanted === 0) completeStoryMission(state, m);
  // Mission 12: reach the convoy, then escape at five stars.
  if (m.n === 12 && m.stage === 0 && d < 130) {
    advanceMissionStage(state, m);
    state.player.wanted = 5;
    state.message = 'VAULT CRACKED — escape at five stars!';
    state.messageTimer = 4;
  }
  if (m.n === 12 && m.stage === 1 && (p.x < 1500 || p.y < 600 || p.vehicle?.kind === 'heli')) {
    completeStoryMission(state, m);
  }
}

export function advanceMissionStage(state, m) {
  m.stage += 1;
  m.target = missionTarget(state, m.n, m.stage);
  state.objectives = missionChecklist(m.n, m.stage);
  if (state.banner) state.banner.checklist = state.objectives;
  const last = missionTarget(state, m.n, m.stage);
  if (m.stage >= 2 && [1, 4, 6, 9].includes(m.n)) { completeStoryMission(state, m); return; }
  state.message = `Objective updated — head to ${last.label}.`;
  state.messageTimer = 3;
}

export function completeStoryMission(state, m) {
  m.active = false;
  state.missions.done.push(m.n);
  state.player.cash += m.cash;
  state.player.respect = Math.min(10, state.player.respect + m.respect);
  // Weapon unlocks earned through the story: the scattergun after the
  // dockside shootout, the SMG after the storm ambush, the rifle after
  // the turf war.
  const unlocks = { 4: ['scattergun', 24], 8: ['smg', 120], 10: ['rifle', 30] };
  const unlock = unlocks[m.n];
  if (unlock && !state.player.weapons.includes(unlock[0])) {
    state.player.weapons.push(unlock[0]);
    state.player.ammo[unlock[0]] = unlock[1];
    state.message = `MISSION COMPLETE: ${m.name}! +$${m.cash} · new weapon: ${unlock[0]}`;
  }
  state.stats.completion = Math.round((state.missions.done.length / 12) * 100);
  state.banner = {
    title: `MISSION COMPLETE — ${m.name.toUpperCase()}`,
    sub: `+$${m.cash} · +${m.respect} respect · ${state.missions.done.length}/12 missions done`,
    checklist: ['Cash paid', 'Respect earned', 'Next mission from ' + m.giver],
  };
  state.message = `MISSION COMPLETE: ${m.name}! +$${m.cash}`;
  state.messageTimer = 6;
  // Confetti of cash.
  for (let i = 0; i < 40; i++) {
    state.particles.push({
      kind: 'cash', x: state.player.x + (Math.random() - 0.5) * 200, y: state.player.y + (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, life: 1.4, max: 1.4,
      size: 12, color: '#37e87a',
    });
  }
  state.missions.current = null;
  if (m.n < 12) {
    state.missions.next = m.n + 1;
  }
}

export function failStoryMission(state, m, reason) {
  m.active = false;
  m.failed = true;
  state.banner = {
    title: 'MISSION FAILED',
    sub: reason,
    checklist: ['Talk to ' + m.giver + ' to retry', 'No cash lost', 'Respect unchanged'],
  };
  state.message = `MISSION FAILED — ${reason}`;
  state.messageTimer = 5;
  state.missions.current = null;
}

export function drawMissionMarker(ctx, state, camX, camY, t) {
  const m = state.missions.current;
  if (!m || !m.active || !m.target) return;
  const x = m.target.x - camX, y = m.target.y - camY;
  const bob = Math.sin(t * 4) * 8;
  ctx.save();
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#20202e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 70 + bob);
  ctx.lineTo(x - 26, y - 130 + bob);
  ctx.lineTo(x + 26, y - 130 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20202e';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y - 96 + bob);
  ctx.restore();
}

// ---- Mission briefing cards, retries and the story arc ----

export function missionBriefingCard(state, n) {
  const def = MISSIONS[n - 1];
  if (!def) return null;
  return {
    title: `MISSION ${n}/12 — ${def.name}`,
    giver: def.giver,
    brief: def.brief,
    cash: def.cash,
    respect: def.respect,
    objectives: missionChecklist(n, 0),
    locked: n > (state.missions.next || 1),
    done: state.missions.done.includes(n),
  };
}

export function retryStoryMission(state, n) {
  const def = MISSIONS[n - 1];
  if (!def) return null;
  state.missions.current = null;
  const m = startStoryMission(state, n);
  state.message = `Retrying Mission ${n}: ${def.name}.`;
  state.messageTimer = 4;
  return m;
}

export function nextMissionGiver(state) {
  const next = state.missions.next || 1;
  if (next > 12) return null;
  return MISSIONS[next - 1].giver;
}

export function storyArcProgress(state) {
  const done = state.missions.done.length;
  if (done === 0) return 'Act I — Arrival: Dana is new in Puerto Alba.';
  if (done < 4) return 'Act I — The Courier: proving herself to Celia.';
  if (done < 8) return 'Act II — The Crew: races, boats and the export list.';
  if (done < 11) return 'Act III — Turf and Wings: taking Casco Viejo, stealing the helicopter.';
  if (done < 12) return 'Act IV — The High-Water Heist: the storm-season finale.';
  return 'Epilogue — Puerto Alba is Dana’s city now.';
}

export function drawMissionBriefing(ctx, state, m) {
  if (!m) return;
  ctx.save();
  const x = 290, y = 180, w = 700, h = 360;
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`MISSION ${m.n}/12 — ${m.name.toUpperCase()}`, 640, y + 60);
  ctx.fillStyle = '#37e8ff';
  ctx.font = '30px sans-serif';
  ctx.fillText(`${m.giver} — $${m.cash} · +${m.respect} respect`, 640, y + 110);
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  ctx.fillText(m.brief, 640, y + 160);
  ctx.textAlign = 'left';
  ctx.font = '28px sans-serif';
  missionChecklist(m.n, 0).forEach((line, i) => {
    ctx.fillStyle = '#37e8ff';
    ctx.fillText('▸ ' + line, x + 40, y + 210 + i * 40);
  });
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRESS ENTER TO START', 640, y + h - 40);
  ctx.restore();
}

export function grantMissionReward(state, m) {
  state.player.cash += m.cash;
  state.player.respect = Math.min(10, state.player.respect + m.respect);
  return { cash: m.cash, respect: m.respect };
}

export function missionFailStates(n) {
  const fails = {
    1: 'The sedan was wrecked or the police impounded it.',
    2: 'The courier spotted you or slipped away.',
    3: 'The clock ran out on the Lumen Run.',
    4: 'The crew was wiped out on the docks.',
    5: 'The crown went to a rival.',
    6: 'The cargo went down with the boat.',
    7: 'An export car was wrecked before delivery.',
    8: 'The ambush overwhelmed the crew.',
    9: 'The armoured van got away across the bridges.',
    10: 'The plaza fell back to the Aldana family.',
    11: 'The helicopter was shot down or lost.',
    12: 'The vault convoy escaped in the storm.',
  };
  return fails[n] || 'The mission failed.';
}

// ---- Per-mission intros and outros ----

export function missionIntroLine(n) {
  const intros = {
    1: 'Celia: "First job, Dana. A sedan, a marina, no questions."',
    2: 'Celia: "Follow the courier. Close enough to see, far enough to live."',
    3: 'Rook: "Lumen at night. Fast, quiet, and do not stop for anyone."',
    4: 'Rook: "The Aldana crew owns those docks. Not after tonight."',
    5: 'Celia: "Three laps, Avenida del Sol. Win the crown or walk home."',
    6: 'Rook: "Wet cargo. The boat is fast, the police are faster."',
    7: 'Celia: "Three cars, one garage. The export list pays well."',
    8: 'Rook: "Storm coming. They will use it. So will we."',
    9: 'Celia: "An armoured van, two bridges, one chance."',
    10: 'Rook: "Three blocks. Take them and Casco Viejo is ours."',
    11: 'Celia: "Steal their helicopter. Then lose five stars in the air."',
    12: 'Celia: "The vault convoy, the storm, the whole city watching. Go."',
  };
  return intros[n] || 'A new job from the crew.';
}

export function missionOutroLine(n) {
  const outros = {
    1: 'Celia: "Clean. You drive like you were born here."',
    2: 'Celia: "He never saw you. That is the whole job."',
    3: 'Rook: "Lumen Run, beat the clock. The crew is talking."',
    4: 'Rook: "The docks are ours again. The Aldana crew will remember."',
    5: 'Celia: "Street Crown. They will race you forever now."',
    6: 'Rook: "Dry cargo, dry crew. Isla Faro is open for business."',
    7: 'Celia: "Three cars, delivered. The garage is happy."',
    8: 'Rook: "You stood in the storm and it broke around you."',
    9: 'Celia: "Two bridges, one van, zero witnesses."',
    10: 'Rook: "Casco Viejo flies crew teal tonight."',
    11: 'Celia: "You stole their wings and flew away. Beautiful."',
    12: 'Celia: "The High-Water Heist. Puerto Alba is ours, Dana."',
  };
  return outros[n] || 'Job done.';
}

export function missionIntroSequence(state, n) {
  const def = MISSIONS[n - 1];
  if (!def) return null;
  state.banner = {
    title: `MISSION ${n}/12 — ${def.name.toUpperCase()}`,
    sub: missionIntroLine(n),
    checklist: missionChecklist(n, 0),
  };
  state.message = missionIntroLine(n);
  state.messageTimer = 6;
  return state.banner;
}

export function missionOutroSequence(state, m) {
  state.message = missionOutroLine(m.n);
  state.messageTimer = 6;
  return state.message;
}

export function missionDifficultyStars(n) {
  return Math.min(5, 1 + Math.floor((n - 1) / 3));
}

// ---- Mission rewards and the story ledger ----

export function missionRewardsTable() {
  return MISSIONS.map(m => ({
    n: m.n, name: m.name, giver: m.giver, cash: m.cash, respect: m.respect,
    stars: missionDifficultyStars(m.n),
  }));
}

export function totalStoryPayout() {
  return MISSIONS.reduce((sum, m) => sum + m.cash, 0);
}

export function totalStoryRespect() {
  return MISSIONS.reduce((sum, m) => sum + m.respect, 0);
}

export function storyLedger(state) {
  return {
    done: state.missions.done.length,
    total: 12,
    earned: state.missions.done.reduce((sum, n) => sum + (MISSIONS[n - 1]?.cash || 0), 0),
    remaining: MISSIONS.filter(m => !state.missions.done.includes(m.n)).map(m => m.name),
    arc: storyArcProgress(state),
  };
}

export function drawStoryLedger(ctx, state) {
  const ledger = storyLedger(state);
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.85)';
  ctx.fillRect(60, 120, 560, 300);
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 120, 560, 300);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STORY LEDGER', 340, 170);
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Missions done: ${ledger.done}/12`, 90, 220);
  ctx.fillText(`Cash earned: $${ledger.earned}`, 90, 260);
  ctx.fillText(`Total payout: $${totalStoryPayout()}`, 90, 300);
  ctx.fillText(`Respect earned: ${totalStoryRespect()}`, 90, 340);
  ctx.fillStyle = '#37e8ff';
  ctx.fillText(ledger.arc, 90, 390);
  ctx.restore();
}
