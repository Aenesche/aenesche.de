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

// --- BAUTEILE KATALOG ---
const PART_CATALOG = {
    // ==========================================
    // 🔋 TIER 1: Die Bastel-Phase (Common)
    // ==========================================
    "bat_001": { type: "battery", rarity: "Common", name: "AA-Batterypack", timeMult: 1.00, special: null },
    "bat_002": { type: "battery", rarity: "Common", name: "Soldered NiMH Pack", timeMult: 0.99, special: null },
    "bat_003": { type: "battery", rarity: "Common", name: "Heavy Lead-Acid", timeMult: 0.98, special: null },
    "bat_004": { type: "battery", rarity: "Common", name: "Alkaline Matrix", timeMult: 0.97, special: null },
    "bat_005": { type: "battery", rarity: "Common", name: "Optimized NiMH Block", timeMult: 0.95, special: null },
    "bat_006": { type: "battery", rarity: "Common", name: "Overcharged NiMH", timeMult: 0.96, special: { type: "burnout_risk", value: 0.02 } }, // T1 Dead-End

    // ==========================================
    // 🔋 TIER 2: Die Lithium-Ära (Rare)
    // ==========================================
    "bat_007": { type: "battery", rarity: "Rare", name: "Basic Li-Ion 2S", timeMult: 0.92, special: null },
    "bat_008": { type: "battery", rarity: "Rare", name: "Li-Ion 3S", timeMult: 0.90, special: null },
    // Pfad A (Stabilität)
    "bat_009a": { type: "battery", rarity: "Rare", name: "High-Cap 18650 Pack", timeMult: 0.88, special: null },
    "bat_010a": { type: "battery", rarity: "Rare", name: "Graphene Li-Ion", timeMult: 0.85, special: null },
    "bat_011a": { type: "battery", rarity: "Rare", name: "Solid-State Proto-Cell", timeMult: 0.80, special: null },
    // Pfad B (Leistung)
    "bat_009b": { type: "battery", rarity: "Rare", name: "High-Discharge LiPo 3S", timeMult: 0.87, special: null },
    "bat_010b": { type: "battery", rarity: "Rare", name: "Racing LiPo 4S", timeMult: 0.84, special: null },
    "bat_011b": { type: "battery", rarity: "Rare", name: "High-Voltage LiHV", timeMult: 0.80, special: null },
    "bat_012b": { type: "battery", rarity: "Rare", name: "Experimental 5S Pack", timeMult: 0.82, special: { type: "burnout_risk", value: 0.05 } }, // T2 Dead-End B

    // ==========================================
    // 🔋 TIER 3: Fortschrittliche Polymere (Super Rare)
    // ==========================================
    // Strang A (Links)
    "bat_013a": { type: "battery", rarity: "Super Rare", name: "Solid-State Block", timeMult: 0.76, special: null },
    "bat_014a": { type: "battery", rarity: "Super Rare", name: "Stable Isotope Proto", timeMult: 0.68, special: null },
    "bat_015a": { type: "battery", rarity: "Super Rare", name: "Aerogel Capacitor", timeMult: 0.60, special: null },
    // Strang M (Mitte - Hybrid)
    "bat_013m": { type: "battery", rarity: "Super Rare", name: "Hybrid Graphene Core", timeMult: 0.74, special: null },
    "bat_014m": { type: "battery", rarity: "Super Rare", name: "Dual-Layer Core", timeMult: 0.66, special: null },
    "bat_015m": { type: "battery", rarity: "Super Rare", name: "Smart-Routing Battery", timeMult: 0.60, special: null },
    // Strang B (Rechts)
    "bat_013b": { type: "battery", rarity: "Super Rare", name: "Liquid Polymer Cell", timeMult: 0.73, special: null },
    "bat_014b": { type: "battery", rarity: "Super Rare", name: "Nano-Wire Battery", timeMult: 0.65, special: null },
    "bat_015b": { type: "battery", rarity: "Super Rare", name: "Supercapacitor Array", timeMult: 0.60, special: null },
    // Strang C (Dead-End Pfad ab 13A)
    "bat_013c": { type: "battery", rarity: "Super Rare", name: "Recycled Cell", timeMult: 0.75, special: null },
    "bat_014c": { type: "battery", rarity: "Super Rare", name: "Kinetic Harvester", timeMult: 0.72, special: null },
    "bat_201": { type: "battery", rarity: "Legendary", name: "Solar-Weave Proto", timeMult: 0.70, special: { type: "passive_income", value: 10 } }, // Minor Exot C

    // ==========================================
    // 🔋 TIER 4: Next-Gen (Legendary)
    // ==========================================
    // Strang A (Links)
    "bat_016a": { type: "battery", rarity: "Legendary", name: "Tritium Decay Cell", timeMult: 0.55, special: null },
    "bat_017a": { type: "battery", rarity: "Legendary", name: "Safe Micro-Fission", timeMult: 0.48, special: null },
    "bat_018a": { type: "battery", rarity: "Legendary", name: "True Fission Battery", timeMult: 0.45, special: null },
    // Strang M (Mitte)
    "bat_016m": { type: "battery", rarity: "Legendary", name: "Quantum-Weave Cell", timeMult: 0.52, special: null },
    "bat_017m": { type: "battery", rarity: "Legendary", name: "Resonant Crystal Matrix", timeMult: 0.45, special: null },
    "bat_018m": { type: "battery", rarity: "Legendary", name: "Zero-Point Proto", timeMult: 0.42, special: null },
    // Strang B (Rechts - Endet hier)
    "bat_016b": { type: "battery", rarity: "Legendary", name: "Magnetic Flow Battery", timeMult: 0.50, special: null },
    "bat_017b": { type: "battery", rarity: "Legendary", name: "Plasma-Injected Core", timeMult: 0.44, special: null },
    "bat_018b": { type: "battery", rarity: "Legendary", name: "Contained Plasma Cell", timeMult: 0.40, special: null },
    "bat_202": { type: "battery", rarity: "Ultra Rare", name: "Overclocked Plasma Drive", timeMult: 0.15, special: { type: "burnout_risk", value: 0.15 } }, // Exot 1 (ab 17b)

    // ==========================================
    // 🔋 TIER 5: Endgame Sci-Fi (Ultra Rare)
    // ==========================================
    // Spitze A (Festung)
    "bat_019a": { type: "battery", rarity: "Ultra Rare", name: "Shielded Fission Core", timeMult: 0.35, special: null },
    "bat_020a": { type: "battery", rarity: "Ultra Rare", name: "Eternal Core", timeMult: 0.30, special: null },
    "bat_203": { type: "battery", rarity: "Ultra Rare", name: "Emergency Capacitor", timeMult: 0.85, special: { type: "save_parts", value: 1 } }, // Exot 2 (ab 19a)
    // Spitze M (Das Unbekannte)
    "bat_019m": { type: "battery", rarity: "Ultra Rare", name: "Antimatter Proto-Core", timeMult: 0.32, special: null },
    "bat_020m": { type: "battery", rarity: "Ultra Rare", name: "Unified Energy Matrix", timeMult: 0.25, special: null },
    "bat_204": { type: "battery", rarity: "Ultra Rare", name: "Deep-Cycle Isotope Gen", timeMult: 1.50, special: { type: "double_loot", value: 1 } }, // Exot 3 (ab 19m)
    "bat_205": { type: "battery", rarity: "Ultra Rare", name: "Dark Matter Core", timeMult: 0.50, special: { type: "void_find", value: 0.05 } }, // Exot 4 (ab 20m)

    // ==========================================
    // 🌌 DROP-EXCLUSIVE (Unconnected)
    // ==========================================
    "bat_d01": { type: "battery", rarity: "Legendary", name: "Void-Forged Battery", timeMult: 0.10, special: null },
    "bat_d02": { type: "battery", rarity: "Ultra Rare", name: "Sentient Power Cell", timeMult: 0.45, special: { type: "ai_safety", value: 0.20 } },

    // Dummy Frame (damit Missionen startbar bleiben)
    "fra_001": { type: "frame", rarity: "Common", name: "Cardboard Frame", breakChance: 0.40, special: null }
};

// --- DER NEUE 2D TECH TREE (BATTERIEN) ---
// Beachte die neuen 'vg' (Void Gems) in den Kosten!
const TECH_TREE = {
    // TIER 1
    "n_bat_001": { treeType: "battery", partId: "bat_001", req: [], x: 50, y: 5, unlockCost: { rp: 500, nrp: 0, vg: 0 }, buyCost: { cp: 1e12, po: 0, vg: 0 } },
    "n_bat_002": { treeType: "battery", partId: "bat_002", req: ["n_bat_001"], x: 50, y: 9, unlockCost: { rp: 1000, nrp: 0, vg: 0 }, buyCost: { cp: 5e12, po: 0, vg: 0 } },
    "n_bat_003": { treeType: "battery", partId: "bat_003", req: ["n_bat_002"], x: 50, y: 13, unlockCost: { rp: 5000, nrp: 0, vg: 0 }, buyCost: { cp: 20e12, po: 0, vg: 0 } },
    "n_bat_004": { treeType: "battery", partId: "bat_004", req: ["n_bat_003"], x: 50, y: 17, unlockCost: { rp: 15000, nrp: 2, vg: 0 }, buyCost: { cp: 50e12, po: 5, vg: 0 } },
    "n_bat_005": { treeType: "battery", partId: "bat_005", req: ["n_bat_004"], x: 50, y: 21, unlockCost: { rp: 50000, nrp: 5, vg: 0 }, buyCost: { cp: 150e12, po: 15, vg: 0 } },
    "n_bat_006": { treeType: "battery", partId: "bat_006", req: ["n_bat_003"], x: 62, y: 13, unlockCost: { rp: 8000, nrp: 1, vg: 0 }, buyCost: { cp: 30e12, po: 2, vg: 0 } }, // Dead End

    // TIER 2
    "n_bat_007": { treeType: "battery", partId: "bat_007", req: ["n_bat_005"], x: 50, y: 26, unlockCost: { rp: 100000, nrp: 15, vg: 0 }, buyCost: { cp: 400e12, po: 30, vg: 0 } },
    "n_bat_008": { treeType: "battery", partId: "bat_008", req: ["n_bat_007"], x: 50, y: 30, unlockCost: { rp: 250000, nrp: 30, vg: 0 }, buyCost: { cp: 800e12, po: 60, vg: 0 } },
    // Split A (Links) & Split B (Rechts)
    "n_bat_009a": { treeType: "battery", partId: "bat_009a", req: ["n_bat_008"], x: 40, y: 34, unlockCost: { rp: 500000, nrp: 50, vg: 0 }, buyCost: { cp: 1500e12, po: 100, vg: 0 } },
    "n_bat_010a": { treeType: "battery", partId: "bat_010a", req: ["n_bat_009a"], x: 40, y: 38, unlockCost: { rp: 800000, nrp: 80, vg: 0 }, buyCost: { cp: 3000e12, po: 150, vg: 0 } },
    "n_bat_011a": { treeType: "battery", partId: "bat_011a", req: ["n_bat_010a"], x: 40, y: 42, unlockCost: { rp: 1500000, nrp: 120, vg: 0 }, buyCost: { cp: 6000e12, po: 250, vg: 0 } },
    
    "n_bat_009b": { treeType: "battery", partId: "bat_009b", req: ["n_bat_008"], x: 60, y: 34, unlockCost: { rp: 500000, nrp: 50, vg: 0 }, buyCost: { cp: 1500e12, po: 100, vg: 0 } },
    "n_bat_010b": { treeType: "battery", partId: "bat_010b", req: ["n_bat_009b"], x: 60, y: 38, unlockCost: { rp: 800000, nrp: 80, vg: 0 }, buyCost: { cp: 3000e12, po: 150, vg: 0 } },
    "n_bat_011b": { treeType: "battery", partId: "bat_011b", req: ["n_bat_010b"], x: 60, y: 42, unlockCost: { rp: 1500000, nrp: 120, vg: 0 }, buyCost: { cp: 6000e12, po: 250, vg: 0 } },
    "n_bat_012b": { treeType: "battery", partId: "bat_012b", req: ["n_bat_009b"], x: 72, y: 34, unlockCost: { rp: 600000, nrp: 60, vg: 0 }, buyCost: { cp: 2000e12, po: 120, vg: 0 } }, // Dead End B

    // TIER 3 (Hier starten die Void Gems Kosten!)
    "n_bat_013a": { treeType: "battery", partId: "bat_013a", req: ["n_bat_011a"], x: 35, y: 47, unlockCost: { rp: 3000000, nrp: 200, vg: 1 }, buyCost: { cp: 15000e12, po: 500, vg: 0 } },
    "n_bat_014a": { treeType: "battery", partId: "bat_014a", req: ["n_bat_013a"], x: 35, y: 51, unlockCost: { rp: 5000000, nrp: 350, vg: 2 }, buyCost: { cp: 25000e12, po: 800, vg: 1 } },
    "n_bat_015a": { treeType: "battery", partId: "bat_015a", req: ["n_bat_014a"], x: 35, y: 55, unlockCost: { rp: 8000000, nrp: 500, vg: 5 }, buyCost: { cp: 45000e12, po: 1200, vg: 2 } },

    "n_bat_013m": { treeType: "battery", partId: "bat_013m", req: ["n_bat_011a", "n_bat_011b"], x: 50, y: 47, unlockCost: { rp: 4000000, nrp: 250, vg: 1 }, buyCost: { cp: 20000e12, po: 600, vg: 0 } }, // Führt A und B zusammen
    "n_bat_014m": { treeType: "battery", partId: "bat_014m", req: ["n_bat_013m"], x: 50, y: 51, unlockCost: { rp: 6000000, nrp: 400, vg: 2 }, buyCost: { cp: 30000e12, po: 900, vg: 1 } },
    "n_bat_015m": { treeType: "battery", partId: "bat_015m", req: ["n_bat_014m"], x: 50, y: 55, unlockCost: { rp: 9000000, nrp: 600, vg: 5 }, buyCost: { cp: 50000e12, po: 1500, vg: 2 } },

    "n_bat_013b": { treeType: "battery", partId: "bat_013b", req: ["n_bat_011b"], x: 65, y: 47, unlockCost: { rp: 3000000, nrp: 200, vg: 1 }, buyCost: { cp: 15000e12, po: 500, vg: 0 } },
    "n_bat_014b": { treeType: "battery", partId: "bat_014b", req: ["n_bat_013b"], x: 65, y: 51, unlockCost: { rp: 5000000, nrp: 350, vg: 2 }, buyCost: { cp: 25000e12, po: 800, vg: 1 } },
    "n_bat_015b": { treeType: "battery", partId: "bat_015b", req: ["n_bat_014b"], x: 65, y: 55, unlockCost: { rp: 8000000, nrp: 500, vg: 5 }, buyCost: { cp: 45000e12, po: 1200, vg: 2 } },

    // Strang C (Dead End ab 13a)
    "n_bat_013c": { treeType: "battery", partId: "bat_013c", req: ["n_bat_013a"], x: 20, y: 47, unlockCost: { rp: 3500000, nrp: 220, vg: 1 }, buyCost: { cp: 18000e12, po: 550, vg: 0 } },
    "n_bat_014c": { treeType: "battery", partId: "bat_014c", req: ["n_bat_013c"], x: 20, y: 51, unlockCost: { rp: 5500000, nrp: 380, vg: 2 }, buyCost: { cp: 28000e12, po: 850, vg: 1 } },
    "n_bat_201":  { treeType: "battery", partId: "bat_201",  req: ["n_bat_014c"], x: 20, y: 55, unlockCost: { rp: 10000000, nrp: 700, vg: 8 }, buyCost: { cp: 60000e12, po: 1800, vg: 3 } }, // Exot C

    // TIER 4
    "n_bat_016a": { treeType: "battery", partId: "bat_016a", req: ["n_bat_015a"], x: 35, y: 60, unlockCost: { rp: 15000000, nrp: 1000, vg: 10 }, buyCost: { cp: 80000e12, po: 2500, vg: 5 } },
    "n_bat_017a": { treeType: "battery", partId: "bat_017a", req: ["n_bat_016a"], x: 35, y: 64, unlockCost: { rp: 25000000, nrp: 1800, vg: 15 }, buyCost: { cp: 150000e12, po: 4000, vg: 8 } },
    "n_bat_018a": { treeType: "battery", partId: "bat_018a", req: ["n_bat_017a"], x: 35, y: 68, unlockCost: { rp: 40000000, nrp: 3000, vg: 25 }, buyCost: { cp: 300000e12, po: 7000, vg: 15 } },

    "n_bat_016m": { treeType: "battery", partId: "bat_016m", req: ["n_bat_015m"], x: 50, y: 60, unlockCost: { rp: 18000000, nrp: 1200, vg: 12 }, buyCost: { cp: 100000e12, po: 3000, vg: 6 } },
    "n_bat_017m": { treeType: "battery", partId: "bat_017m", req: ["n_bat_016m"], x: 50, y: 64, unlockCost: { rp: 30000000, nrp: 2200, vg: 18 }, buyCost: { cp: 200000e12, po: 5000, vg: 10 } },
    "n_bat_018m": { treeType: "battery", partId: "bat_018m", req: ["n_bat_017m"], x: 50, y: 68, unlockCost: { rp: 50000000, nrp: 3500, vg: 30 }, buyCost: { cp: 400000e12, po: 9000, vg: 18 } },

    // Strang B endet hier!
    "n_bat_016b": { treeType: "battery", partId: "bat_016b", req: ["n_bat_015b"], x: 65, y: 60, unlockCost: { rp: 15000000, nrp: 1000, vg: 10 }, buyCost: { cp: 80000e12, po: 2500, vg: 5 } },
    "n_bat_017b": { treeType: "battery", partId: "bat_017b", req: ["n_bat_016b"], x: 65, y: 64, unlockCost: { rp: 25000000, nrp: 1800, vg: 15 }, buyCost: { cp: 150000e12, po: 4000, vg: 8 } },
    "n_bat_018b": { treeType: "battery", partId: "bat_018b", req: ["n_bat_017b"], x: 65, y: 68, unlockCost: { rp: 40000000, nrp: 3000, vg: 25 }, buyCost: { cp: 300000e12, po: 7000, vg: 15 } },
    "n_bat_202":  { treeType: "battery", partId: "bat_202",  req: ["n_bat_017b"], x: 78, y: 64, unlockCost: { rp: 60000000, nrp: 5000, vg: 40 }, buyCost: { cp: 500000e12, po: 10000, vg: 20 } }, // Exot 1 (Kamikaze)

    // TIER 5
    "n_bat_019a": { treeType: "battery", partId: "bat_019a", req: ["n_bat_018a"], x: 35, y: 74, unlockCost: { rp: 100000000, nrp: 8000, vg: 60 }, buyCost: { cp: 1000000e12, po: 20000, vg: 35 } },
    "n_bat_020a": { treeType: "battery", partId: "bat_020a", req: ["n_bat_019a"], x: 35, y: 79, unlockCost: { rp: 250000000, nrp: 15000, vg: 120 }, buyCost: { cp: 3000000e12, po: 50000, vg: 80 } },
    "n_bat_203":  { treeType: "battery", partId: "bat_203",  req: ["n_bat_019a"], x: 20, y: 74, unlockCost: { rp: 150000000, nrp: 12000, vg: 90 }, buyCost: { cp: 2000000e12, po: 35000, vg: 50 } }, // Exot 2 (Versicherung)

    "n_bat_019m": { treeType: "battery", partId: "bat_019m", req: ["n_bat_018m"], x: 50, y: 74, unlockCost: { rp: 120000000, nrp: 9000, vg: 70 }, buyCost: { cp: 1200000e12, po: 25000, vg: 40 } },
    "n_bat_020m": { treeType: "battery", partId: "bat_020m", req: ["n_bat_019m"], x: 50, y: 79, unlockCost: { rp: 300000000, nrp: 20000, vg: 150 }, buyCost: { cp: 4000000e12, po: 70000, vg: 100 } },
    "n_bat_204":  { treeType: "battery", partId: "bat_204",  req: ["n_bat_019m"], x: 65, y: 74, unlockCost: { rp: 180000000, nrp: 14000, vg: 100 }, buyCost: { cp: 2500000e12, po: 45000, vg: 60 } }, // Exot 3 (AFK Loot)
    "n_bat_205":  { treeType: "battery", partId: "bat_205",  req: ["n_bat_020m"], x: 50, y: 84, unlockCost: { rp: 500000000, nrp: 35000, vg: 300 }, buyCost: { cp: 8000000e12, po: 150000, vg: 200 } }, // Exot 4 (Void Hunter)

    // Dummy-Nodes, damit die anderen Tabs im Menü (die aktuell leer sind) nicht abstürzen
    "dummy_fra": { treeType: "frame", partId: "fra_001", req: [], x: 50, y: 10, unlockCost: { rp: 0, nrp: 0, vg: 0 }, buyCost: { cp: 0, po: 0, vg: 0 } }
};
