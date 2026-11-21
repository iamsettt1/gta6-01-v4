// Puerto Alba — High Water. The camera and the world renderer: one canvas,
// a smooth camera with look-ahead, and the draw order the whole game depends
// on — water, district ground, roads, territory, props, buildings, vehicles,
// boats, helicopters, pedestrians, the player, particles, weather, then HUD.

import { G, CFG, DISTRICTS, WATER, ISLAND, BRIDGES, AIRSTRIP, DOCKS, clamp, lerp, pointInWater } from './config.js';
import { paintDistrictGround, paintNeonSigns, paintDistrictProps, paintDistrictSignage, paintMurals, paintStreetArtTags, paintBeachFront, paintIslandCove, paintPlazaTiles } from './districts.js';
import { districtAt, drawHarbourDetails } from './city-map.js';
import { drawCar } from './vehicles-cars.js';
import { drawBoat } from './boats.js';
import { drawHelicopter } from './helicopter.js';
import { drawPoliceCar } from './police-pursuit.js';
import { drawTerritoryBlocks } from './territory.js';
import { drawTracers, drawScopeGlint } from './combat-weapons.js';
import { drawRaceCheckpoints } from './races-league.js';
import { drawMissionMarker } from './missions-story.js';
import { drawRainOverlay, drawLightningFlash, drawWetStreetReflections } from './storm-weather.js';
import { paintDayTint, drawHeadlightCones, drawStreetlights, dayPalette, drawLongShadows } from './daycycle-weather.js';
import { drawTuningShop } from './tuning-shop.js';
import { drawPaintShop } from './paint-shop.js';
import { drawSafehouseMarkers } from './safehouses.js';
import { drawLandingPads } from './helicopter.js';
import { drawMarinaOffice } from './boats.js';
import { drawMotorcycle } from './motorcycles.js';
import { drawOversizedHud } from './hud-minimap.js';

export function updateCameraFollow(state, dt) {
  const p = state.player;
  const lookX = Math.cos(p.angle) * 90;
  const lookY = Math.sin(p.angle) * 90;
  const tx = clamp(p.x + lookX - CFG.VIEW_W / 2, 0, CFG.WORLD_W - CFG.VIEW_W);
  const ty = clamp(p.y + lookY - CFG.VIEW_H / 2, 0, CFG.WORLD_H - CFG.VIEW_H);
  state.camera.x = lerp(state.camera.x, tx, Math.min(1, dt * 5));
  state.camera.y = lerp(state.camera.y, ty, Math.min(1, dt * 5));
}

export function renderWorldFrame(ctx, state) {
  const t = state.elapsed;
  const camX = state.camera.x + (state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0);
  const camY = state.camera.y + (state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0);
  state.shake = Math.max(0, state.shake - 0.6);
  drawWater(ctx, state, camX, camY, t);
  paintDistrictGround(ctx, state, camX, camY, CFG.VIEW_W, CFG.VIEW_H);
  drawRoads(ctx, state, camX, camY);
  drawBridges(ctx, state, camX, camY);
  drawTerritoryBlocks(ctx, state, camX, camY, t);
  drawAirstrip(ctx, state, camX, camY);
  drawDocks(ctx, state, camX, camY);
  paintDistrictProps(ctx, state, camX, camY);
  drawCrosswalksAndFurniture(ctx, state, camX, camY);
  drawHarbourDetails(ctx, state, camX, camY);
  paintMurals(ctx, state, camX, camY);
  paintStreetArtTags(ctx, state, camX, camY);
  paintBeachFront(ctx, state, camX, camY);
  paintIslandCove(ctx, state, camX, camY);
  paintPlazaTiles(ctx, state, camX, camY);
  drawRaceCheckpoints(ctx, state, camX, camY, t);
  drawBuildings(ctx, state, camX, camY);
  drawLongShadows(ctx, state, camX, camY);
  paintDistrictSignage(ctx, state, camX, camY);
  drawTuningShop(ctx, state, camX, camY);
  drawPaintShop(ctx, state, camX, camY);
  drawSafehouseMarkers(ctx, state, camX, camY);
  drawLandingPads(ctx, state, camX, camY);
  drawMarinaOffice(ctx, state, camX, camY);
  drawRoadblock(ctx, state, camX, camY, t);
  drawCrashBarriers(ctx, state, camX, camY);
  drawPickups(ctx, state, camX, camY, t);
  // Parked cars, then driven vehicles.
  for (const pk of state.city.parked) {
    if (pk.x < camX - 120 || pk.x > camX + 1400 || pk.y < camY - 120 || pk.y > camY + 920) continue;
    ctx.save();
    ctx.translate(pk.x - camX, pk.y - camY);
    ctx.rotate(pk.angle);
    ctx.fillStyle = pk.color;
    ctx.fillRect(-42, -20, 84, 40);
    ctx.fillStyle = 'rgba(20,24,34,0.9)';
    ctx.fillRect(-28, -17, 30, 34);
    ctx.restore();
  }
  for (const v of state.vehicles) {
    if (v.kind === 'bike') drawMotorcycle(ctx, v, camX, camY);
    else drawCar(ctx, v, camX, camY, t);
  }
  for (const b of state.boats) drawBoat(ctx, b, camX, camY, t);
  for (const pc of state.police) {
    if (pc.kind === 'police-car') drawPoliceCar(ctx, pc, camX, camY, t);
    else if (pc.kind === 'officer') drawPedestrian(ctx, pc, camX, camY, t);
  }
  drawPedestrians(ctx, state, camX, camY, t);
  drawPlayer(ctx, state, camX, camY, t);
  for (const h of state.helis) drawHelicopter(ctx, h, camX, camY, t);
  drawMissionMarker(ctx, state, camX, camY, t);
  drawParticles(ctx, state, camX, camY);
  drawTracers(ctx, state, camX, camY);
  drawScopeGlint(ctx, state, camX, camY, t);
  drawWetStreetReflections(ctx, state, camX, camY);
  drawHeadlightCones(ctx, state, camX, camY);
  drawStreetlights(ctx, state, camX, camY, t);
  paintNeonSigns(ctx, state, camX, camY, t);
  paintDayTint(ctx, state);
  drawRainOverlay(ctx, state, t);
  drawLightningFlash(ctx, state);
  drawOversizedHud(ctx, state);
}

export function drawWater(ctx, state, camX, camY, t) {
  ctx.fillStyle = '#1d6a8a';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.save();
  for (const w of WATER) {
    const x = w.x - camX, y = w.y - camY;
    if (x > CFG.VIEW_W || y > CFG.VIEW_H || x + w.w < 0 || y + w.h < 0) continue;
    const grad = ctx.createLinearGradient(0, y, 0, y + w.h);
    grad.addColorStop(0, '#2a8ab0');
    grad.addColorStop(1, '#155a78');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w.w, w.h);
    // Animated sparkle on the water.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 24; i++) {
      const sx = x + ((i * 173 + Math.floor(t * 30)) % Math.max(1, w.w));
      const sy = y + ((i * 97) % Math.max(1, w.h));
      ctx.fillRect(sx, sy, 10, 3);
    }
  }
  // Isla Faro, risen out of the lagoon.
  ctx.fillStyle = '#a8b878';
  ctx.fillRect(ISLAND.x - camX, ISLAND.y - camY, ISLAND.w, ISLAND.h);
  ctx.fillStyle = '#8a9a58';
  ctx.fillRect(ISLAND.x + 40 - camX, ISLAND.y + 40 - camY, ISLAND.w - 80, ISLAND.h - 80);
  ctx.restore();
}

export function drawRoads(ctx, state, camX, camY) {
  const city = state.city;
  ctx.save();
  ctx.fillStyle = '#33333e';
  for (const rx of city.roadsV) ctx.fillRect(rx - city.roadW / 2 - camX, -camY, city.roadW, CFG.WORLD_H);
  for (const ry of city.roadsH) ctx.fillRect(-camX, ry - city.roadW / 2 - camY, CFG.WORLD_W, city.roadW);
  // Sidewalks.
  ctx.fillStyle = '#8a8a80';
  for (const rx of city.roadsV) {
    ctx.fillRect(rx - city.roadW / 2 - 16 - camX, -camY, 16, CFG.WORLD_H);
    ctx.fillRect(rx + city.roadW / 2 - camX, -camY, 16, CFG.WORLD_H);
  }
  for (const ry of city.roadsH) {
    ctx.fillRect(-camX, ry - city.roadW / 2 - 16 - camY, CFG.WORLD_W, 16);
    ctx.fillRect(-camX, ry + city.roadW / 2 - camY, CFG.WORLD_W, 16);
  }
  // Lane markings and crosswalks.
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 5;
  ctx.setLineDash([34, 30]);
  for (const rx of city.roadsV) {
    ctx.beginPath(); ctx.moveTo(rx - camX, -camY); ctx.lineTo(rx - camX, CFG.WORLD_H - camY); ctx.stroke();
  }
  for (const ry of city.roadsH) {
    ctx.beginPath(); ctx.moveTo(-camX, ry - camY); ctx.lineTo(CFG.WORLD_W - camX, ry - camY); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of city.roadsV) {
    for (const ry of city.roadsH) {
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(rx - 34 + i * 14 - camX, ry - city.roadW / 2 + 8 - camY, 8, city.roadW - 16);
      }
    }
  }
  ctx.restore();
}

export function drawBridges(ctx, state, camX, camY) {
  ctx.save();
  for (const b of BRIDGES) {
    ctx.fillStyle = '#4a4a58';
    ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(b.x + b.w / 2 - 3 - camX, b.y - camY, 6, b.h);
    ctx.strokeStyle = '#c23a3a';
    ctx.lineWidth = 8;
    ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
  }
  ctx.restore();
}

export function drawAirstrip(ctx, state, camX, camY) {
  ctx.save();
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(AIRSTRIP.x - camX, AIRSTRIP.y - camY, AIRSTRIP.w, AIRSTRIP.h);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AIRSTRIP', AIRSTRIP.x + AIRSTRIP.w / 2 - camX, AIRSTRIP.y + 60 - camY);
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 26]);
  ctx.beginPath(); ctx.moveTo(AIRSTRIP.x + AIRSTRIP.w / 2 - camX, AIRSTRIP.y + 90 - camY); ctx.lineTo(AIRSTRIP.x + AIRSTRIP.w / 2 - camX, AIRSTRIP.y + AIRSTRIP.h - 40 - camY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff5c5c';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('H', AIRSTRIP.x + AIRSTRIP.w / 2 - camX, AIRSTRIP.y + AIRSTRIP.h - 70 - camY);
  ctx.restore();
}

export function drawDocks(ctx, state, camX, camY) {
  ctx.save();
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(DOCKS.x - camX, DOCKS.y - camY, DOCKS.w, DOCKS.h);
  ctx.fillStyle = '#8a6a3a';
  for (let i = 0; i < 14; i++) ctx.fillRect(DOCKS.x + i * 100 + 6 - camX, DOCKS.y - camY, 8, DOCKS.h);
  for (const pr of state.city.props) {
    if (pr.kind === 'container') {
      ctx.fillStyle = pr.c;
      ctx.fillRect(pr.x - camX, pr.y - camY, 200, 90);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(pr.x - camX, pr.y - camY, 200, 90);
    } else if (pr.kind === 'crane') {
      ctx.strokeStyle = '#ffd21f';
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(pr.x - camX, pr.y + 120 - camY); ctx.lineTo(pr.x - camX, pr.y - 120 - camY); ctx.lineTo(pr.x + 220 - camX, pr.y - 120 - camY); ctx.stroke();
      ctx.strokeStyle = '#20202e';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pr.x + 220 - camX, pr.y - 120 - camY); ctx.lineTo(pr.x + 180 - camX, pr.y + 40 - camY); ctx.stroke();
    } else if (pr.kind === 'lighthouse') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(pr.x - camX, pr.y - camY, 44, 130);
      ctx.fillStyle = '#c23a3a';
      ctx.fillRect(pr.x - camX, pr.y + 30 - camY, 44, 26);
      ctx.fillRect(pr.x - camX, pr.y + 80 - camY, 44, 26);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(pr.x + 22 - camX, pr.y - 12 - camY, 20, 0, Math.PI * 2); ctx.fill();
    } else if (pr.kind === 'fountain') {
      ctx.fillStyle = '#2a8ab0';
      ctx.beginPath(); ctx.ellipse(pr.x - camX, pr.y - camY, 70, 44, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e8e8';
      ctx.beginPath(); ctx.ellipse(pr.x - camX, pr.y - camY, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBuildings(ctx, state, camX, camY) {
  ctx.save();
  for (const b of state.city.buildings) {
    const sx = b.x - camX, sy = b.y - camY;
    if (sx > CFG.VIEW_W + 40 || sy > CFG.VIEW_H + 40 || sx + b.w < -40 || sy + b.h < -40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx + 8, sy + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(sx, sy, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx, sy, b.w, b.h);
    // Rooftop detail: inner slab, and windows on towers.
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(sx + 12, sy + 12, b.w - 24, b.h - 24);
    if (b.floors >= 4) {
      ctx.fillStyle = '#ffe9a0';
      for (let i = 0; i < Math.min(8, b.floors); i++) {
        ctx.fillRect(sx + 16 + i * 18, sy + b.h - 30, 10, 14);
      }
    }
    if (b.roof === 'tiled') {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 3;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(sx, sy + (b.h / 4) * i); ctx.lineTo(sx + b.w, sy + (b.h / 4) * i); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawPedestrians(ctx, state, camX, camY, t) {
  for (const p of state.peds) {
    if (p.state === 'down') continue;
    drawPedestrian(ctx, p, camX, camY, t);
  }
}

export function drawPedestrian(ctx, p, camX, camY, t) {
  const sx = p.x - camX, sy = p.y - camY;
  if (sx < -60 || sx > 1340 || sy < -60 || sy > 860) return;
  const bob = p.speed > 10 ? Math.sin(t * 10 + p.x) * 3 : 0;
  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.rotate(p.angle || 0);
  ctx.fillStyle = '#20202e';
  ctx.fillRect(-9, -8, 18, 26);
  ctx.fillStyle = p.color || '#e8b13d';
  ctx.beginPath(); ctx.arc(0, -14, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.color || '#e8b13d';
  ctx.fillRect(-11, 16, 8, 16);
  ctx.fillRect(3, 16, 8, 16);
  if (p.crew === 'aldana') {
    ctx.fillStyle = '#c23a3a';
    ctx.fillRect(-12, -24, 24, 6);
  }
  if (p.umbrella) {
    ctx.fillStyle = '#ff4fd8';
    ctx.beginPath(); ctx.arc(0, -18, 22, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
}

export function drawPlayer(ctx, state, camX, camY, t) {
  const p = state.player;
  if (!p.onFoot) return; // inside a vehicle, the vehicle is drawn instead
  const sx = p.x - camX, sy = p.y - camY;
  const bob = p.moving ? Math.sin(t * 12) * 3 : 0;
  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.rotate(p.angle);
  // Dana Ríos: teal jacket, dark jeans, big and readable.
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(-11, -6, 22, 30);
  ctx.fillStyle = '#37c8e8';
  ctx.fillRect(-13, -22, 26, 20);
  ctx.fillStyle = '#e8b13d';
  ctx.beginPath(); ctx.arc(0, -28, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20202e';
  ctx.beginPath(); ctx.arc(0, -30, 12, Math.PI, 0); ctx.fill();
  // Weapon in hand, long and visible.
  if (p.weapon) {
    ctx.fillStyle = '#181818';
    const len = p.weapon === 'rifle' ? 46 : 26;
    ctx.fillRect(6, -4, len, 7);
  }
  ctx.restore();
  // Aim line toward the mouse while on foot.
  if (p.weapon) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(p.x - camX + Math.cos(p.aimAngle || 0) * 120, p.y - camY + Math.sin(p.aimAngle || 0) * 120); ctx.stroke();
    ctx.restore();
  }
}

export function drawPickups(ctx, state, camX, camY, t) {
  ctx.save();
  for (const pk of state.pickups) {
    const sx = pk.x - camX, sy = pk.y - camY + Math.sin(t * 3 + pk.x) * 4;
    if (sx < -40 || sx > 1320 || sy < -40 || sy > 840) continue;
    if (pk.kind === 'shell') {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a5c';
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
    } else if (pk.kind === 'armor') {
      ctx.fillStyle = '#37e8ff';
      ctx.fillRect(sx - 16, sy - 16, 32, 32);
      ctx.fillStyle = '#20202e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A', sx, sy + 7);
    } else if (pk.kind === 'health') {
      ctx.fillStyle = '#37e87a';
      ctx.fillRect(sx - 16, sy - 16, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', sx, sy + 8);
    }
  }
  ctx.restore();
}

export function drawParticles(ctx, state, camX, camY) {
  ctx.save();
  for (const pt of state.particles) {
    const a = Math.max(0, pt.life / pt.max);
    ctx.globalAlpha = a;
    if (pt.kind === 'rain') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pt.x - camX, pt.y - camY); ctx.lineTo(pt.x - camX - 4, pt.y - camY + pt.size); ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x - camX, pt.y - camY, pt.size * a + 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---- Roadblocks, barriers and crash details ----

export function drawRoadblock(ctx, state, camX, camY, t) {
  for (const c of state.police) {
    if (!c.roadblock) continue;
    const sx = c.x - camX, sy = c.y - camY;
    ctx.save();
    ctx.fillStyle = '#ff5c5c';
    ctx.fillRect(sx - 60, sy - 14, 120, 28);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) ctx.fillRect(sx - 52 + i * 30, sy - 14, 14, 28);
    ctx.fillStyle = '#ffd21f';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROADBLOCK', sx, sy - 26);
    ctx.restore();
  }
}

export function drawCrashBarriers(ctx, state, camX, camY) {
  const race = state.league.current;
  if (!race || !race.active) return;
  ctx.save();
  ctx.fillStyle = '#ff9a3d';
  const px = state.player.x, py = state.player.y;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(px - 260 + i * 100 - camX, py - 180 - camY, 70, 18);
    ctx.fillRect(px - 260 + i * 100 - camX, py + 170 - camY, 70, 18);
  }
  ctx.restore();
}

export function drawExplosionFlash(ctx, state, camX, camY) {
  for (const pt of state.particles) {
    if (pt.kind !== 'fire') continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x - camX, pt.y - camY, pt.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---- Crosswalks, street furniture and district watermarks ----

export function drawCrosswalksAndFurniture(ctx, state, camX, camY) {
  const city = state.city;
  ctx.save();
  // Benches at the plaza and the beachfront.
  ctx.fillStyle = '#6a4a2a';
  const benches = [[760, 700], [1240, 700], [760, 900], [1240, 900], [500, 3450], [900, 3450], [1300, 3450]];
  for (const [x, y] of benches) {
    const sx = x - camX, sy = y - camY;
    if (sx < -80 || sx > 1360 || sy < -80 || sy > 880) continue;
    ctx.fillRect(sx - 34, sy - 10, 68, 20);
    ctx.fillRect(sx - 30, sy + 10, 8, 16);
    ctx.fillRect(sx + 22, sy + 10, 8, 16);
  }
  // Crates stacked at the marina and the warehouses.
  for (const c of city.crates) {
    const sx = c.x - camX, sy = c.y - camY;
    if (sx < -60 || sx > 1340 || sy < -60 || sy > 860) continue;
    ctx.fillStyle = c.c;
    ctx.fillRect(sx - c.s / 2, sy - c.s / 2, c.s, c.s);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - c.s / 2, sy - c.s / 2, c.s, c.s);
    ctx.beginPath();
    ctx.moveTo(sx - c.s / 2, sy - c.s / 2);
    ctx.lineTo(sx + c.s / 2, sy + c.s / 2);
    ctx.stroke();
  }
  // Lamps glow at night.
  ctx.restore();
}

export function drawDistrictWatermark(ctx, state, camX, camY) {
  const d = districtAt(state.player.x, state.player.y);
  if (!d) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(d.name.toUpperCase(), 24, 120);
  ctx.font = '22px sans-serif';
  ctx.fillText(d.mood, 24, 150);
  ctx.restore();
}

export function drawStreetNamePlates(ctx, state, camX, camY) {
  const names = [
    ['AV. DEL SOL', 2800, 500], ['CALLE FARO', 1000, 1100], ['PASEO LUMEN', 1000, 1700],
    ['MUELLE 7', 4600, 2500], ['COSTA PLAYA', 1000, 3500], ['PUENTE NORTE', 4900, 3300],
  ];
  ctx.save();
  ctx.textAlign = 'center';
  for (const [label, x, y] of names) {
    const sx = x - camX, sy = y - camY;
    if (sx < -160 || sx > 1440 || sy < -40 || sy > 840) continue;
    ctx.fillStyle = 'rgba(10,10,18,0.6)';
    ctx.fillRect(sx - 90, sy - 18, 180, 36);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(label, sx, sy + 7);
  }
  ctx.restore();
}

// ---- The camera shake and the cinematic bars ----

export function cinematicBars(ctx, state) {
  if (!state.cinematic) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 1280, 70);
  ctx.fillRect(0, 730, 1280, 70);
  ctx.restore();
}

export function cameraShakeDecay(state, dt) {
  state.shake = Math.max(0, state.shake - dt * 24);
}

export function cameraZoomForSpeed(state) {
  const v = state.player.vehicle;
  if (!v) return 1;
  const speed = Math.abs(v.speed || 0);
  return 1 - Math.min(0.12, speed / 6000);
}

export function drawSpeedLines(ctx, state, camX, camY) {
  const v = state.player.vehicle;
  if (!v || Math.abs(v.speed || 0) < 500) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  const p = state.player;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 300 + Math.random() * 200;
    const x = p.x - camX + Math.cos(a) * r;
    const y = p.y - camY + Math.sin(a) * r;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(p.angle) * 40, y - Math.sin(p.angle) * 40);
    ctx.stroke();
  }
  ctx.restore();
}
