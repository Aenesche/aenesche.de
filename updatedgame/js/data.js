// --- SUPABASE SETUP ---
const supabaseUrl = 'https://usihbregbanpfspblrnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- GLOBALE VARIABLEN ---
let user = null;
let state = null; 

// --- BALANCE ---
const PRICE_GROWTH = 1.15;
const TICK_MS = 200;
const EXPERIMENT_CD_MS = 12000;
const MAX_LOG_LINES = 1000;

// --- BASE GAME DATA ---
const DRONES = [
  { id:"temu",      name:"Temu Drone",      icon:"t", baseCps:0.10, basePrice:15,    unlock:{type:"always"} },
  { id:"amazon",    name:"Amazon Drone",    icon:"a", baseCps:1.00, basePrice:120,   unlock:{type:"owned", id:"temu", n:10} },
  { id:"fpv",       name:"FPV Drone",       icon:"f", baseCps:8.00, basePrice:1100,  unlock:{type:"owned", id:"amazon", n:8} },
  { id:"air3s",     name:"DJI Air 3S",      icon:"D", baseCps:47.0, basePrice:12000, unlock:{type:"owned", id:"fpv", n:8} },
  { id:"cine",      name:"Cinelifter",      icon:"C", baseCps:260,  basePrice:130000,unlock:{type:"owned", id:"air3s", n:6} },
  { id:"matrice",   name:"DJI Matrice",     icon:"M", baseCps:1400, basePrice:1500000, unlock:{type:"owned", id:"cine", n:10} },
  { id:"titan", name:"Titan Strike Drone", icon:"T", baseCps:11000, basePrice:100_000_000, unlock:{type:"owned", id:"matrice", n:20} },
  { id:"leviathan", name:"Leviathan War Drone", icon:"L", baseCps:180000, basePrice:20_000_000_000, unlock:{type:"owned", id:"titan", n:15} }
];

const TECH = [
  { id:"globalCps", name:"Optimization Pass", desc:"+5% global CPS (repeatable)", type:"repeat", baseCost:6, growth:1.35 },
  { id:"droneBoost", name:"Drone Firmware", desc:"+6% drone CPS (repeatable)", type:"repeat", baseCost:10, growth:1.38 },
  { id:"clickBoost", name:"Quantization Trick", desc:"x2 click power (repeatable)", type:"repeat", baseCost:10, growth:1.42 },
  { id:"rpLab", name:"Research Lab", desc:"Unlock: buy RP-Lab producer (1-time)", type:"one", baseCost:25, growth:1.0, apply:(s)=>{ s.flags.rpLabUnlocked = true; } },
  { id:"rpLabBoost", name:"Lab Instrumentation", desc:"+25% RP-Lab output (repeatable)", type:"repeat", baseCost:18, growth:1.45 },
];

const RP_LAB = { id:"rplab", name:"RP-Lab", icon:"R", baseRps:0.04, basePrice:5000, priceGrowth:1.20 };

const THEMES = [
  { id:"default",  name:"Theme: Default",  cost:0, unlockByDefault:true, accent:"#bdbdbd" },
  { id:"green",    name:"Theme: Neon Green",cost:1000, unlockByDefault:false, accent:"#00ff88" },
  { id:"amber",    name:"Theme: Amber Terminal",cost:25_000_000, unlockByDefault:false, accent:"#ffb000" },
  { id:"ice",      name:"Theme: Ice Blue",  cost:60_000_000, unlockByDefault:false, accent:"#66d9ff" },
  { id:"violet",   name:"Theme: Neon Violet", cost:8_000_000_000, unlockByDefault:false, accent:"#b300ff" },
  { id:"pink",     name:"Theme: Cyber Pink", cost:25_000_000_000, unlockByDefault:false, accent:"#ff2da6" },
  { id:"gold",     name:"Theme: Gold Terminal", cost:150_000_000_000, unlockByDefault:false, accent:"#ffd700" },
];

const EFFECTS = [
  { id:"scanlines", name:"Effect: CRT Scanlines", cost:120_000_000, unlockByDefault:false },
  { id:"cheeta", name:"Effect: C.H.E.E.T.A.", cost:100_000_000_000_000, unlockByDefault:false }
];

// --- NEW WORLD DATA ---
const RARITIES = {
    "Common": { weight: 1, color: "#bdbdbd", dropChance: 70 },
    "Rare": { weight: 2, color: "#00ff88", dropChance: 20 },
    "Super Rare": { weight: 3, color: "#66d9ff", dropChance: 8 },
    "Legendary": { weight: 4, color: "#ffd700", dropChance: 1.99 },
    "Ultra Rare": { weight: 5, color: "#ff2da6", dropChance: 0.01 }
};

// --- BAUTEILE KATALOG (NEUES SLOT-SYSTEM 1-50, 200+) ---
// --- BAUTEILE KATALOG (DAS MASTER TEMPLATE) ---
const PART_CATALOG = {
    // 🪫 BATTERIEN (001-099 = Standard | 200+ = Exoten)
    // Primärer Stat: 'timeMult' (reduziert die Basis-Zeit von 30s)
    "bat_001": { type: "battery", rarity: "Common", name: "NiMH Block", timeMult: 0.95, special: null },
    "bat_002": { type: "battery", rarity: "Rare", name: "Li-Ion 2S", timeMult: 0.85, special: null },
    "bat_200": { type: "battery", rarity: "Legendary", name: "Dark Matter Core", timeMult: 0.30, special: { type: "void_find", value: 0.05 } }, // Findet 5% Void Gems
    "bat_201": { type: "battery", rarity: "Ultra Rare", name: "Overclocked Cell", timeMult: 0.15, special: { type: "burnout_risk", value: 0.10 } }, // Sehr schnell, erhöht aber Absturzrisiko

    // ⬛ FRAMES (001-099 = Standard | 200+ = Exoten)
    // Primärer Stat: 'breakChance' (Basis-Absturzrisiko, z.B. 0.40 = 40%)
    "fra_001": { type: "frame", rarity: "Common", name: "Cardboard Frame", breakChance: 0.40, special: null },
    "fra_002": { type: "frame", rarity: "Rare", name: "Carbon Fiber X", breakChance: 0.20, special: null },
    "fra_200": { type: "frame", rarity: "Legendary", name: "Titanium Monocoque", breakChance: 0.02, special: { type: "save_parts", value: 1 } }, // Rettet beim Absturz 1 anderes Teil

    // 🎛️ FLIGHT CONTROLLER (001-099 = Standard | 200+ = Exoten)
    // Primärer Stat: 'safety' (wird vom breakChance des Frames abgezogen)
    "fc_001": { type: "fc", rarity: "Common", name: "Basic Gyro", safety: 0.05, special: null },
    "fc_002": { type: "fc", rarity: "Super Rare", name: "A.I. Guardian", safety: 0.18, special: null },
    "fc_200": { type: "fc", rarity: "Ultra Rare", name: "Quantum Brain", safety: 0.25, special: { type: "double_loot", value: 0.20 } }, // 20% Chance auf doppelte Drops

    // 🚁 PROPELLER (001-099 = Standard | 200+ = Exoten)
    // Primärer Stat: 'poMult' (Multiplikator für Plutonium-Ausbeute)
    "pro_001": { type: "props", rarity: "Common", name: "Plastic 2-Blade", poMult: 1.0, special: null },
    "pro_002": { type: "props", rarity: "Rare", name: "Nylon 3-Blade", poMult: 1.5, special: null },
    "pro_200": { type: "props", rarity: "Super Rare", name: "Aero-Magnetic Props", poMult: 4.5, special: { type: "speed_boost", value: 0.10 } }, // Nebenbei 10% schneller

    // 📷 KAMERAS (001-099 = Standard | 200+ = Exoten)
    // Primärer Stat: 'luckBonus' (Multiplikator für Drop-Chancen)
    "cam_001": { type: "camera", rarity: "Common", name: "VGA Cam", luckBonus: 1.0, special: null },
    "cam_002": { type: "camera", rarity: "Rare", name: "4K Sensor", luckBonus: 1.5, special: null },
    "cam_200": { type: "camera", rarity: "Ultra Rare", name: "Void-Eye Lens", luckBonus: 5.0, special: { type: "guarantee_rare", value: 1 } } // Garantiert 1 Rare Drop
};

// --- DER TECH TREE ---
// Koordinaten: x und y sind Prozentwerte (0% - 100%) auf dem riesigen 3000x3000px Raster.
// Das gibt dir extrem viel Platz in alle Richtungen.
const TECH_TREE = {
    // --- BATTERIEN ---
    "node_bat_001": { treeType: "battery", partId: "bat_001", req: [], x: 50, y: 5, unlockCost: { rp: 1000, nrp: 0 }, buyCost: { cp: 5e12, po: 0 } },
    "node_bat_002": { treeType: "battery", partId: "bat_002", req: ["node_bat_001"], x: 50, y: 15, unlockCost: { rp: 5000, nrp: 5 }, buyCost: { cp: 20e12, po: 5 } },
    "node_bat_200": { treeType: "battery", partId: "bat_200", req: ["node_bat_002"], x: 70, y: 25, unlockCost: { rp: 500000, nrp: 150 }, buyCost: { cp: 900e12, po: 500 } },
    "node_bat_201": { treeType: "battery", partId: "bat_201", req: ["node_bat_002"], x: 30, y: 25, unlockCost: { rp: 600000, nrp: 200 }, buyCost: { cp: 1200e12, po: 600 } },

    // --- FRAMES ---
    "node_fra_001": { treeType: "frame", partId: "fra_001", req: [], x: 50, y: 5, unlockCost: { rp: 1000, nrp: 0 }, buyCost: { cp: 5e12, po: 0 } },
    "node_fra_002": { treeType: "frame", partId: "fra_002", req: ["node_fra_001"], x: 50, y: 15, unlockCost: { rp: 10000, nrp: 10 }, buyCost: { cp: 50e12, po: 10 } },
    "node_fra_200": { treeType: "frame", partId: "fra_200", req: ["node_fra_002"], x: 50, y: 30, unlockCost: { rp: 750000, nrp: 300 }, buyCost: { cp: 2000e12, po: 1000 } },
    
    // (Weitere Bäume kannst du jetzt exakt nach diesem Muster fortsetzen...)
};
