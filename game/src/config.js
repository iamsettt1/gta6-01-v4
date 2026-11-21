// Puerto Alba — High Water. Shared constants and the single mutable game state.
// Every other module imports the state object G from here, so one reset rebuilds
// the whole world for a fresh seed, a new game, or a screenshot scene.

export function createPuertoAlbaState(seed) {
  const s = {
    seed,
    rng: null,
    frame: 0,
    elapsed: 0,
    screen: 'title', // title | play | pause | map | board | phone | busted | wasted
    shot: null,
    shotReady: false,
    timeOfDay: 0.46, // 0..1 across the day cycle; 0.46 is golden hour
    weather: 'clear', // clear | rain | storm
    storm: { active: false, intensity: 0, lightning: 0, flash: 0, nextBolt: 6 },
    city: null,
    camera: { x: 1200, y: 800, zoom: 1 },
    player: null,
    vehicles: [],
    boats: [],
    helis: [],
    peds: [],
    police: [],
    particles: [],
    tracers: [],
    pickups: [],
    shells: [],
    missions: null,
    league: null,
    territory: null,
    safehouses: null,
    tuning: null,
    stats: null,
    objectives: [],
    banner: null,
    keys: {},
    mouse: { x: 640, y: 400, down: false },
    shake: 0,
    message: null,
    messageTimer: 0,
    radio: { station: 0, on: false },
  };
  return s;
}

export const G = createPuertoAlbaState(7);

export function resetGameState(seed) {
  const fresh = createPuertoAlbaState(seed);
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, fresh);
  return G;
}

export const CFG = {
  WORLD_W: 6400,
  WORLD_H: 4400,
  VIEW_W: 1280,
  VIEW_H: 800,
  // Oversized, thumbnail-proof HUD constants (at the 1280x800 render).
  HUD_BASE_FONT: 30,
  HUD_OBJECTIVE_FONT: 42,
  HUD_STAR_SIZE: 58,
  HUD_READOUT_FONT: 34,
  MINIMAP_SIZE: 340,
  MINIMAP_MIN: 280,
  MINIMAP_MARGIN: 24,
  PLAYER_WALK: 190,
  PLAYER_RUN: 330,
  PLAYER_HEALTH: 100,
  MAX_WANTED: 5,
  START_CASH: 250,
  MISSION_COUNT: 12,
  LEAGUE_RACES: 6,
  SHELL_COUNT: 18,
  EXPORT_COUNT: 6,
  SAFEHOUSE_COUNT: 3,
};

export const DISTRICTS = [
  { id: 'casco', name: 'Casco Viejo', x: 200, y: 200, w: 1600, h: 1200, ground: '#c9a86a', roof: '#b4552d', accent: '#e8c87a', mood: 'old town, tiled roofs and plazas' },
  { id: 'avenida', name: 'Avenida del Sol', x: 2000, y: 200, w: 1600, h: 1200, ground: '#8f9aa8', roof: '#5d7ea6', accent: '#ffd76a', mood: 'downtown towers and wide avenues' },
  { id: 'franca', name: 'Zona Franca', x: 3800, y: 200, w: 1800, h: 1200, ground: '#9a8f7a', roof: '#7a6a55', accent: '#ff9a3d', mood: 'warehouses, yards and the airstrip' },
  { id: 'lumen', name: 'Barrio Lumen', x: 200, y: 1600, w: 1600, h: 1100, ground: '#5c4a72', roof: '#3d2c52', accent: '#ff4fd8', mood: 'neon nightlife quarter' },
  { id: 'colinas', name: 'Las Colinas', x: 2000, y: 1600, w: 1600, h: 1100, ground: '#7fae62', roof: '#4d7a3a', accent: '#d8f0a0', mood: 'leafy hills suburb' },
  { id: 'marina', name: 'Puerto Alba Marina', x: 3800, y: 1600, w: 1800, h: 1100, ground: '#7d8a94', roof: '#4a6a7a', accent: '#37c8e8', mood: 'harbour, cranes, containers and docks' },
  { id: 'playa', name: 'Playa Alba', x: 200, y: 2900, w: 1600, h: 800, ground: '#e8d49a', roof: '#d8b06a', accent: '#ff8a5c', mood: 'beachfront promenade and palms' },
  { id: 'isla', name: 'Isla Faro', x: 4700, y: 3000, w: 1000, h: 700, ground: '#a8b878', roof: '#6a7a4a', accent: '#fff0a0', mood: 'lighthouse island and smugglers cove' },
];

export const WATER = [
  { x: 0, y: 3800, w: 6400, h: 600, name: 'South Sea' },
  { x: 4400, y: 2800, w: 1600, h: 1000, name: 'Faro Lagoon' },
  { x: 6000, y: 2800, w: 400, h: 1600, name: 'East Sea' },
];

export const ISLAND = { x: 4700, y: 3000, w: 1000, h: 700 };

export const BRIDGES = [
  { x: 4840, y: 2800, w: 130, h: 1000, name: 'Puente Norte' },
  { x: 5340, y: 2800, w: 130, h: 1000, name: 'Puente Sur' },
];

export const AIRSTRIP = { x: 4900, y: 300, w: 620, h: 520, name: 'Zona Franca Airstrip' };
export const DOCKS = { x: 4000, y: 2520, w: 1400, h: 180, name: 'Marina Docks' };
export const BEACH = { x: 200, y: 3600, w: 1600, h: 200, name: 'Playa Alba Sand' };

export const MISSIONS = [
  { n: 1, name: 'First Wheels', giver: 'Celia Marín', cash: 400, respect: 1, brief: 'Steal the marked sedan in Casco Viejo and deliver it to the marina.' },
  { n: 2, name: 'Tail the Courier', giver: 'Celia Marín', cash: 550, respect: 1, brief: 'Follow the courier across Casco Viejo. Stay close, but never let the meter fill.' },
  { n: 3, name: 'Lumen Run', giver: 'Celia Marín', cash: 700, respect: 1, brief: 'Timed package run through Barrio Lumen at night. Beat the clock.' },
  { n: 4, name: 'Dockside Static', giver: 'Rook', cash: 900, respect: 2, brief: 'Harbour shootout. Clear the Aldana crew off the docks.' },
  { n: 5, name: 'Street Crown', giver: 'Celia Marín', cash: 1200, respect: 2, brief: 'Three laps through Avenida del Sol. Win the crown.' },
  { n: 6, name: 'Wet Cargo', giver: 'Rook', cash: 1100, respect: 1, brief: 'Boat smuggling run to Isla Faro. Police boats will pursue.' },
  { n: 7, name: 'The Export List', giver: 'Celia Marín', cash: 1500, respect: 2, brief: 'Steal three named cars and deliver them to the Zona Franca garage.' },
  { n: 8, name: 'Storm Warning', giver: 'Rook', cash: 1300, respect: 2, brief: 'Survive the ambush in Barrio Lumen while the storm rolls in.' },
  { n: 9, name: 'Two Bridges', giver: 'Celia Marín', cash: 1600, respect: 2, brief: 'Chase the armoured van across both island bridges.' },
  { n: 10, name: 'Turf War', giver: 'Rook', cash: 1800, respect: 2, brief: 'Take three Aldana blocks in Casco Viejo. Hold the plaza.' },
  { n: 11, name: 'Wings Over Alba', giver: 'Celia Marín', cash: 2200, respect: 2, brief: 'Steal the police helicopter from the airstrip and lose a five-star pursuit in the air.' },
  { n: 12, name: 'The High-Water Heist', giver: 'Celia Marín', cash: 5000, respect: 3, brief: 'Crack the marina vault convoy in the storm. Escape at five stars by car, boat or helicopter.' },
];

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 22, rate: 0.28, range: 420, spread: 0.05, speed: 900, color: '#ffd76a' },
  scattergun: { name: 'Scattergun', damage: 14, rate: 0.85, range: 300, spread: 0.22, speed: 700, pellets: 6, color: '#ff9a3d' },
  smg: { name: 'SMG', damage: 13, rate: 0.09, range: 380, spread: 0.11, speed: 1000, color: '#9fe8ff' },
  rifle: { name: 'Rifle', damage: 70, rate: 1.05, range: 900, spread: 0.008, speed: 1600, color: '#ff5c5c' },
};

export const CAR_CLASSES = [
  { id: 'compact', name: 'Alba Compact', top: 430, grip: 0.92, color: '#e8b13d' },
  { id: 'sedan', name: 'Sol Sedan', top: 480, grip: 0.9, color: '#4a7ec2' },
  { id: 'muscle', name: 'Toro Muscle', top: 540, grip: 0.82, color: '#c23a3a' },
  { id: 'sports', name: 'Vela Sports', top: 620, grip: 0.88, color: '#37c8e8' },
  { id: 'supercar', name: 'Faro Supercar', top: 720, grip: 0.95, color: '#ff4fd8' },
  { id: 'suv', name: 'Colina SUV', top: 460, grip: 0.86, color: '#7a8a6a' },
  { id: 'pickup', name: 'Carga Pickup', top: 470, grip: 0.84, color: '#c28a4a' },
  { id: 'van', name: 'Mercado Van', top: 400, grip: 0.8, color: '#e8e8e8' },
  { id: 'taxi', name: 'Alba Taxi', top: 500, grip: 0.9, color: '#ffd21f' },
  { id: 'interceptor', name: 'Police Interceptor', top: 660, grip: 0.93, color: '#2a2a3a' },
];

export const BOAT_CLASSES = [
  { id: 'skiff', name: 'Harbour Skiff', top: 300, color: '#d8e8e8' },
  { id: 'speedboat', name: 'Marina Speedboat', top: 520, color: '#ff5c5c' },
  { id: 'cigarette', name: 'Syndicate Cigarette', top: 640, color: '#1a1a2a' },
];

export const LEAGUE_RACES = [
  { n: 1, name: 'Sol Sprint', district: 'Avenida del Sol', laps: 2, best: 0 },
  { n: 2, name: 'Casco Corners', district: 'Casco Viejo', laps: 2, best: 0 },
  { n: 3, name: 'Lumen Sprint', district: 'Barrio Lumen', laps: 3, best: 0 },
  { n: 4, name: 'Marina Dash', district: 'Puerto Alba Marina', laps: 2, best: 0 },
  { n: 5, name: 'Colinas Climb', district: 'Las Colinas', laps: 3, best: 0 },
  { n: 6, name: 'Faro Finale', district: 'Isla Faro', laps: 3, best: 0 },
];

export const SAFEHOUSES = [
  { id: 'casco', name: 'Casco Viejo Flat', price: 1500, x: 700, y: 600, owned: false },
  { id: 'playa', name: 'Playa Alba Bungalow', price: 3000, x: 900, y: 3300, owned: false },
  { id: 'isla', name: 'Isla Faro Lighthouse', price: 5000, x: 5100, y: 3300, owned: false },
];

export const EXPORT_CARS = [
  { id: 'vela', name: 'Vela Sports', color: '#37c8e8', done: false },
  { id: 'faro', name: 'Faro Supercar', color: '#ff4fd8', done: false },
  { id: 'toro', name: 'Toro Muscle', color: '#c23a3a', done: false },
  { id: 'sol', name: 'Sol Sedan', color: '#4a7ec2', done: false },
  { id: 'carga', name: 'Carga Pickup', color: '#c28a4a', done: false },
  { id: 'colina', name: 'Colina SUV', color: '#7a8a6a', done: false },
];

export const NEON_COLORS = ['#37e8ff', '#ff4fd8', '#7dff5c', '#ffd21f', '#ff5c5c', '#9a6bff'];

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInWater(x, y) {
  for (const w of WATER) {
    if (x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h) {
      if (x >= ISLAND.x && x < ISLAND.x + ISLAND.w && y >= ISLAND.y && y < ISLAND.y + ISLAND.h) continue;
      return true;
    }
  }
  return false;
}

export function pointOnBridge(x, y) {
  for (const b of BRIDGES) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  }
  return false;
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

// ---- Radio stations, help text and the opening crawl ----

export const RADIO_STATIONS = [
  { id: 0, name: 'Lumen FM', tag: 'neon synth, all night', color: '#ff4fd8' },
  { id: 1, name: 'Radio Faro', tag: 'island groove', color: '#37c8e8' },
  { id: 2, name: 'Storm FM', tag: 'low and slow', color: '#7dff5c' },
];

export const OPENING_CRAWL = [
  'Puerto Alba. Storm season.',
  'Dana Ríos, getaway driver, newly arrived.',
  'Fixer Celia Marín has work. The Aldana family has the city.',
  'Twelve missions. One helicopter. No way back but through.',
];

export const HELP_TEXT = [
  'WASD move / drive / fly',
  'E enter or exit a vehicle',
  'Mouse aim, Click shoot',
  'Shift sprint, Esc pause + map',
  'J missions, P phone, T tune',
  '1–4 weapons, B safehouse',
];

export function radioStationName(i) {
  return RADIO_STATIONS[i % RADIO_STATIONS.length].name;
}

export function respectLevelTitle(respect) {
  if (respect >= 9) return 'Legend of Alba';
  if (respect >= 7) return 'Harbour Heavyweight';
  if (respect >= 5) return 'Street Name';
  if (respect >= 3) return 'Known Driver';
  return 'New Arrival';
}

// ---- District flavour and car descriptions ----

export const DISTRICT_BLURBS = {
  casco: 'Tiled roofs, plazas and arcades. The old town remembers everything.',
  avenida: 'Glass towers and wide avenues. The city shows off here.',
  franca: 'Warehouses, yards and the airstrip. Everything here is for sale.',
  lumen: 'Neon, clubs and wet streets. The night never ends in Lumen.',
  colinas: 'Leafy hills and winding roads. Quiet, until it is not.',
  marina: 'Cranes, containers and docks. The harbour never sleeps.',
  playa: 'Palms, sand and the sea. The postcard side of Puerto Alba.',
  isla: 'A lighthouse and a smugglers cove. The Aldana family’s back door.',
};

export const CAR_BLURBS = {
  compact: 'Small, cheap, everywhere. Nobody looks twice.',
  sedan: 'The city’s workhorse. Steal one and blend in.',
  muscle: 'Loud, heavy, honest. Built for the straightaways.',
  sports: 'Quick through the corners, quicker through Lumen.',
  supercar: 'The fastest thing on the island bridges.',
  suv: 'Room for the crew and the cargo.',
  pickup: 'Hauls anything, including the evidence.',
  van: 'Slow, square, invisible. Perfect for the job.',
  taxi: 'Yellow, metered, and always in the wrong lane.',
  interceptor: 'Police issue. Do not steal one unless you mean it.',
};

export const BOAT_BLURBS = {
  skiff: 'A harbour workboat. Slow, steady, forgettable.',
  speedboat: 'Fast enough to outrun the police boats. Barely.',
  cigarette: 'The syndicate’s boat. Black, loud, and worth the risk.',
};

export function districtBlurb(id) {
  return DISTRICT_BLURBS[id] || 'A corner of Puerto Alba.';
}

export function carBlurb(cls) {
  return CAR_BLURBS[cls] || 'A car.';
}

// ---- Achievements: the honours board ----

export const ACHIEVEMENTS = [
  { id: 'first-wheels', name: 'First Wheels', desc: 'Complete mission 1', check: (s) => s.missions.done.includes(1) },
  { id: 'street-crown', name: 'Street Crown', desc: 'Win the 3-lap race', check: (s) => s.missions.done.includes(5) },
  { id: 'turf-king', name: 'Turf King', desc: 'Hold all three blocks', check: (s) => s.territory.held >= 3 },
  { id: 'heli-thief', name: 'Wings Over Alba', desc: 'Steal the police helicopter', check: (s) => s.missions.done.includes(11) },
  { id: 'high-water', name: 'High Water', desc: 'Finish the finale', check: (s) => s.missions.done.includes(12) },
  { id: 'shell-hunter', name: 'Shell Hunter', desc: 'Find all 18 sun shells', check: (s) => s.side.shells >= 18 },
  { id: 'export-king', name: 'Export King', desc: 'Deliver all 6 export cars', check: (s) => s.side.exportsDone >= 6 },
  { id: 'league-champ', name: 'League Champion', desc: 'Win all 6 league races', check: (s) => s.league.won >= 6 },
  { id: 'homeowner', name: 'Homeowner', desc: 'Own all 3 safehouses', check: (s) => s.safehouses.filter(h => h.owned).length >= 3 },
  { id: 'legend', name: 'Legend of Alba', desc: 'Reach respect 10', check: (s) => s.player.respect >= 10 },
];

export function unlockedAchievements(state) {
  return ACHIEVEMENTS.filter(a => {
    try { return a.check(state); } catch (e) { return false; }
  });
}

export function achievementCount(state) {
  return `${unlockedAchievements(state).length}/${ACHIEVEMENTS.length}`;
}

// ---- Palette constants for the art direction ----

export const PALETTES = {
  goldenHour: { sky: '#ffb35c', sun: '#ffd76a', shadow: 'rgba(60,30,10,0.35)', neon: '#ff4fd8' },
  neonNight: { sky: '#1a1a3a', sun: '#f0ead0', shadow: 'rgba(0,0,0,0.5)', neon: '#37e8ff' },
  storm: { sky: '#3a3a4a', sun: '#e8f2ff', shadow: 'rgba(10,10,20,0.45)', neon: '#ffd21f' },
  dawn: { sky: '#f0b070', sun: '#ffe9a0', shadow: 'rgba(80,40,10,0.3)', neon: '#ff8a5c' },
};

export const CAR_PAINTS = [
  '#e8b13d', '#4a7ec2', '#c23a3a', '#37c8e8', '#ff4fd8',
  '#7fae62', '#ffd21f', '#e8e8e8', '#1a1a2a', '#ff8a5c',
  '#9a6bff', '#2a6a4a', '#c28a4a', '#5d7ea6', '#8a7a5a',
];

export const PED_SHIRTS = [
  '#e8b13d', '#4a7ec2', '#c23a3a', '#37c8e8', '#7fae62',
  '#ff4fd8', '#e8e8e8', '#c28a4a', '#9a6bff', '#2a6a4a',
];

export function paletteForPhase(phase) {
  return PALETTES[phase] || PALETTES.goldenHour;
}

export function randomCarPaint(rng) {
  return CAR_PAINTS[Math.floor(rng() * CAR_PAINTS.length)];
}

export function randomPedShirt(rng) {
  return PED_SHIRTS[Math.floor(rng() * PED_SHIRTS.length)];
}

// ---- World lore: the people of Puerto Alba ----

export const CREW_MEMBERS = [
  { name: 'Dana Ríos', role: 'Getaway driver', note: 'Newly arrived, already the best wheel in the city.' },
  { name: 'Celia Marín', role: 'Fixer', note: 'Runs the harbour crew from an office above the docks.' },
  { name: 'Rook', role: 'Muscle', note: 'Ex-dockworker. Never misses, never talks.' },
  { name: 'Luz', role: 'Mechanic', note: 'Tunes the league cars at Neón y Ruedas.' },
  { name: 'Faro', role: 'Racer', note: 'League champion three years running.' },
];

export const ALDANA_FAMILY = [
  { name: 'Don Aldana', role: 'Patriarch', note: 'Owns the warehouses, the docks and half the police.' },
  { name: 'Marco Aldana', role: 'Enforcer', note: 'Drives the armoured van across the bridges.' },
  { name: 'Sofia Aldana', role: 'Bookkeeper', note: 'Moves the money through the export list.' },
];

export const CITY_LORE = [
  'Puerto Alba was built on a river delta, and the river still takes what it wants every storm season.',
  'The lighthouse on Isla Faro has guided smugglers longer than it has guided ships.',
  'Barrio Lumen never sleeps. The neon was paid for by people who never sleep either.',
  'The airstrip in Zona Franca was built for cargo planes. It mostly moves other things now.',
  'Every sun shell on the beach is worth fifty dollars to the right collector.',
];

export function randomLore(rng) {
  return CITY_LORE[Math.floor(rng() * CITY_LORE.length)];
}
