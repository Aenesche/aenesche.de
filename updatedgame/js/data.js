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
const PART_CATALOG = {
    // BATTERIEN (001 - 050: Standard Progression)
    "bat_001": { type: "battery", rarity: "Common", name: "NiMH Block", timeMult: 0.95, special: null },
    "bat_002": { type: "battery", rarity: "Common", name: "Li-Ion 2S", timeMult: 0.85, special: null },
    "bat_003": { type: "battery", rarity: "Rare", name: "LiPo 4S", timeMult: 0.70, special: { type: "po_boost", value: 1.5 } }, // 50% mehr PO
    
    // BATTERIEN (200+: Super Rare / Special)
    "bat_200": { type: "battery", rarity: "Legendary", name: "Dark Matter Core", timeMult: 0.30, special: { type: "void_find", value: 0.05 } }, // Findet extrem seltene Void Gems

    // FRAMES
    "fra_001": { type: "frame", rarity: "Common", name: "Cardboard Frame", breakChance: 0.40, special: null },
    "fra_002": { type: "frame", rarity: "Rare", name: "Carbon X", breakChance: 0.20, special: null }
};

// --- DER NEUE 2D TECH TREE ---
// x und y sind Prozentwerte (0 bis 100) auf dem Canvas!
const TECH_TREE = {
    // --- BATTERY TREE ---
    "node_bat_001": { 
        treeType: "battery", partId: "bat_001", req: [], 
        x: 50, y: 10, // Startet oben in der Mitte
        unlockCost: { rp: 1000, nrp: 0 }, buyCost: { cp: 5e12, po: 0 } 
    },
    "node_bat_002": { 
        treeType: "battery", partId: "bat_002", req: ["node_bat_001"], 
        x: 50, y: 30, // Geht gerade nach unten
        unlockCost: { rp: 5000, nrp: 5 }, buyCost: { cp: 20e12, po: 5 } 
    },
    "node_bat_003": { 
        treeType: "battery", partId: "bat_003", req: ["node_bat_002"], 
        x: 30, y: 55, // Geht diagonal nach links unten!
        unlockCost: { rp: 25000, nrp: 20 }, buyCost: { cp: 100e12, po: 25 } 
    },
    "node_bat_200": { 
        treeType: "battery", partId: "bat_200", req: ["node_bat_002"], 
        x: 70, y: 55, // Geht diagonal nach rechts unten! (Spaltung)
        unlockCost: { rp: 500000, nrp: 150 }, buyCost: { cp: 900e12, po: 500 } 
    },

    // --- FRAME TREE ---
    "node_fra_001": { 
        treeType: "frame", partId: "fra_001", req: [], 
        x: 50, y: 10, 
        unlockCost: { rp: 1000, nrp: 0 }, buyCost: { cp: 5e12, po: 0 } 
    },
    "node_fra_002": { 
        treeType: "frame", partId: "fra_002", req: ["node_fra_001"], 
        x: 50, y: 40, 
        unlockCost: { rp: 10000, nrp: 10 }, buyCost: { cp: 50e12, po: 10 } 
    }
};
