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

const PART_CATALOG = {
    "fr_com_1": { type: "frame", rarity: "Common", name: "Cardboard Frame", breakChance: 0.40 },
    "fr_com_2": { type: "frame", rarity: "Common", name: "Plastic Frame", breakChance: 0.35 },
    "fc_com_1": { type: "fc", rarity: "Common", name: "Basic Gyro", safety: 0.05 },
    "pr_com_1": { type: "props", rarity: "Common", name: "Plastic Props", poMult: 1.0 },
    "ba_com_1": { type: "battery", rarity: "Common", name: "NiMH Pack", timeMult: 1.0 },
    "ca_com_1": { type: "camera", rarity: "Common", name: "VGA Cam", luckBonus: 1.0 },
    "fr_rar_1": { type: "frame", rarity: "Rare", name: "Carbon Fiber Frame", breakChance: 0.25 },
    "fc_rar_safe": { type: "fc", rarity: "Rare", name: "Guardian FC", safety: 0.15 },
    "ba_rar_fast": { type: "battery", rarity: "Rare", name: "LiPo 3S", timeMult: 0.70 },
    "fr_drop_rar_1": { type: "frame", rarity: "Rare", name: "Scavenged Titanium", breakChance: 0.15 },
    "pr_drop_leg_1": { type: "props", rarity: "Legendary", name: "Aero-Magnetic Blades", poMult: 4.5 },
    "ca_drop_ult_1": { type: "camera", rarity: "Ultra Rare", name: "Void-Eye Lens", luckBonus: 10.0 }
};

const TECH_TREE = {
    "node_fr_1": { partId: "fr_com_1", req: null, unlockCost: { rp: 10000, nrp: 0 }, buyCost: { cp: 50e12, po: 0 } },
    "node_fr_2": { partId: "fr_com_2", req: "node_fr_1", unlockCost: { rp: 50000, nrp: 5 }, buyCost: { cp: 100e12, po: 10 } },
    "node_fc_safe": { partId: "fc_rar_safe", req: "node_fr_2", unlockCost: { rp: 100000, nrp: 20 }, buyCost: { cp: 250e12, po: 50 } },
    "node_ba_fast": { partId: "ba_rar_fast", req: "node_fr_2", unlockCost: { rp: 100000, nrp: 20 }, buyCost: { cp: 250e12, po: 50 } }
};
