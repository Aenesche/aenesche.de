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

  
    //############################################################################################################################################################################################
    //############################################################################################################################################################################################
  
    // 🚁 PROPELLER TIER 1 (Common)
    "pro_001": { type: "props", rarity: "Common", name: "Cheap 2-Blade Props", poMult: 1.0, nrpMult: 1.0, special: null },
    "pro_002": { type: "props", rarity: "Common", name: "Stiffened Plastic Props", poMult: 1.5, nrpMult: 1.0, special: null },
    "pro_003": { type: "props", rarity: "Common", name: "Basic 3-Blade Props", poMult: 2.0, nrpMult: 1.0, special: null },
    "pro_004": { type: "props", rarity: "Common", name: "Nylon-Mixed Blades", poMult: 3.0, nrpMult: 1.2, special: null },
    "pro_005": { type: "props", rarity: "Common", name: "Optimized Bullnose", poMult: 5.0, nrpMult: 1.5, special: null },
    "pro_006": { type: "props", rarity: "Common", name: "Heavy 4-Blade", poMult: 6.0, nrpMult: 0.5, special: { type: "burnout_risk", value: 0.05 } }, // Dead-End

    // 🚁 PROPELLER TIER 2 (Rare)
    "pro_007": { type: "props", rarity: "Rare", name: "Carbon-Nylon Blend", poMult: 8.0, nrpMult: 2.0, special: null },
    "pro_008": { type: "props", rarity: "Rare", name: "Balanced Tri-Blades", poMult: 10.0, nrpMult: 4.0, special: null },
    // Pfad A (Heavy Lift / PO)
    "pro_009a": { type: "props", rarity: "Rare", name: "Wide-Chord Blades", poMult: 15.0, nrpMult: 2.0, special: null },
    "pro_010a": { type: "props", rarity: "Rare", name: "Industrial Lift Props", poMult: 22.0, nrpMult: 2.0, special: null },
    "pro_011a": { type: "props", rarity: "Rare", name: "Titanium-Reinforced", poMult: 35.0, nrpMult: 1.0, special: null },
    // Pfad B (Silent / N-RP)
    "pro_009b": { type: "props", rarity: "Rare", name: "Scimitar Blades", poMult: 5.0, nrpMult: 10.0, special: null },
    "pro_010b": { type: "props", rarity: "Rare", name: "Acoustic Stealth Props", poMult: 5.0, nrpMult: 18.0, special: null },
    "pro_011b": { type: "props", rarity: "Rare", name: "Bio-Mimetic Owl Wings", poMult: 3.0, nrpMult: 30.0, special: null },
    // Dead End
    "pro_012b": { type: "props", rarity: "Rare", name: "Serrated Combat Blades", poMult: 25.0, nrpMult: 0.0, special: { type: "break_risk", value: 0.1 } },

    // 🚁 PROPELLER TIER 3 (Super Rare)
    // Strang A (PO Fokus)
    "pro_013a": { type: "props", rarity: "Super Rare", name: "Magnetic Repulsors", poMult: 45.0, nrpMult: 0.0, special: null },
    "pro_014a": { type: "props", rarity: "Super Rare", name: "Flux-Drive Rotors", poMult: 60.0, nrpMult: 0.0, special: null },
    "pro_015a": { type: "props", rarity: "Super Rare", name: "Electromagnetic Array", poMult: 80.0, nrpMult: 0.0, special: null },
    // Strang M (Hybrid)
    "pro_013m": { type: "props", rarity: "Super Rare", name: "Variable Geometry", poMult: 20.0, nrpMult: 20.0, special: null },
    "pro_014m": { type: "props", rarity: "Super Rare", name: "Adaptive Aero-Foil", poMult: 30.0, nrpMult: 30.0, special: null },
    "pro_015m": { type: "props", rarity: "Super Rare", name: "Smart-Pitch Rotors", poMult: 40.0, nrpMult: 40.0, special: null },
    "pro_201":  { type: "props", rarity: "Legendary", name: "Data-Siphon Blades", poMult: 0.0, nrpMult: 50.0, special: { type: "free_blueprint", value: 0.05 } }, // Exot
    // Strang B (N-RP Fokus)
    "pro_013b": { type: "props", rarity: "Super Rare", name: "Micro-Turbines", poMult: 0.0, nrpMult: 45.0, special: null },
    "pro_014b": { type: "props", rarity: "Super Rare", name: "Cold-Gas Thrusters", poMult: 0.0, nrpMult: 60.0, special: null },
    "pro_015b": { type: "props", rarity: "Super Rare", name: "Ion-Wind Thrusters", poMult: 0.0, nrpMult: 80.0, special: null },

    // 🚁 PROPELLER TIER 4 (Legendary)
    "pro_016a": { type: "props", rarity: "Legendary", name: "Graviton Rings", poMult: 120.0, nrpMult: 0.0, special: null },
    "pro_017a": { type: "props", rarity: "Legendary", name: "Levitation Array", poMult: 200.0, nrpMult: 0.0, special: null },
    "pro_016m": { type: "props", rarity: "Legendary", name: "Plasma Discs", poMult: 80.0, nrpMult: 80.0, special: null },
    "pro_017m": { type: "props", rarity: "Legendary", name: "Adaptive Plasma Array", poMult: 100.0, nrpMult: 100.0, special: null },
    "pro_016b": { type: "props", rarity: "Legendary", name: "Silent Void-Gliders", poMult: 0.0, nrpMult: 200.0, special: null }, // Ende Strang B
    "pro_202":  { type: "props", rarity: "Ultra Rare", name: "Neural-Overload Array", poMult: 0.0, nrpMult: 150.0, special: { type: "po_to_nrp", value: 1.0 } }, // Exot (PO zu NRP)

    // 🚁 PROPELLER TIER 5 (Ultra Rare)
    "pro_018a": { type: "props", rarity: "Ultra Rare", name: "Singularity Tethers", poMult: 500.0, nrpMult: 0.0, special: null },
    "pro_203":  { type: "props", rarity: "Ultra Rare", name: "Matter-Condenser", poMult: 300.0, nrpMult: 0.0, special: { type: "double_po", value: 1.0 } }, // Exot
    "pro_018m": { type: "props", rarity: "Ultra Rare", name: "Spatial-Warp Drives", poMult: 250.0, nrpMult: 250.0, special: null },
    "pro_204":  { type: "props", rarity: "Ultra Rare", name: "Void-Resonance Emitters", poMult: 50.0, nrpMult: 50.0, special: { type: "double_vg", value: 1.0 } }, // Exot
    "pro_205":  { type: "props", rarity: "Ultra Rare", name: "Chrono-Stutter Blades", poMult: 150.0, nrpMult: 150.0, special: { type: "instant_mission", value: 0.1 } }, // Exot

    // ==========================================
    // 🌌 DROP-EXCLUSIVE (Unconnected)
    // ==========================================
    "pro_d01": { type: "props", rarity: "Legendary", name: "Greed-Forged Rotors", poMult: 1000.0, nrpMult: 0.0, special: { type: "break_risk", value: 0.3 } },

    //############################################################################################################################################################################################
    //############################################################################################################################################################################################

    // ==========================================
    // 📷 KAMERA TIER 1 (Common) - Fokus: Linear
    // ==========================================
    "cam_001": { type: "camera", rarity: "Common", name: "VGA Web-Cam", luckBonus: 1.2, vgChance: 0.0, special: null },
    "cam_002": { type: "camera", rarity: "Common", name: "720p Action Lens", luckBonus: 1.5, vgChance: 0.0, special: null },
    "cam_003": { type: "camera", rarity: "Common", name: "1080p CMOS Sensor", luckBonus: 2.0, vgChance: 0.0, special: null },
    "cam_004": { type: "camera", rarity: "Common", name: "Dual-Lens Setup", luckBonus: 2.5, vgChance: 0.0, special: null },

    // ==========================================
    // 📷 KAMERA TIER 2 (Rare) - Das Auge öffnet sich
    // ==========================================
    // Pfad A (Reines Drop-Glück)
    "cam_005a": { type: "camera", rarity: "Rare", name: "Basic IR-Scanner", luckBonus: 3.5, vgChance: 0.0, special: null },
    "cam_006a": { type: "camera", rarity: "Rare", name: "Wide-Angle Array", luckBonus: 5.0, vgChance: 0.0, special: null },
    // Pfad B (Ressourcen-Fokus)
    "cam_005b": { type: "camera", rarity: "Rare", name: "Scrap-Scanner", luckBonus: 2.5, vgChance: 0.0, special: { type: "flat_po", chance: 0.30, value: 50e12 } }, // 30% Chance auf 50T PO
    "cam_006b": { type: "camera", rarity: "Rare", name: "Data-Lens", luckBonus: 2.8, vgChance: 0.0, special: { type: "flat_nrp", chance: 0.20, value: 15 } }, // 20% Chance auf 15 N-RP
    
    // ==========================================
    // 📷 KAMERA TIER 3 (Super Rare) - VOID GEMS ERSCHEINEN!
    // ==========================================
    // Strang A (Glück + Bisschen VG)
    "cam_007a": { type: "camera", rarity: "Super Rare", name: "Lidar Point-Cloud", luckBonus: 10.0, vgChance: 0.01, special: null }, // 1% VG
    "cam_008a": { type: "camera", rarity: "Super Rare", name: "Multi-Spectral", luckBonus: 15.0, vgChance: 0.01, special: null },
    // Strang M (Purer Void-Fokus in der Mitte)
    "cam_007m": { type: "camera", rarity: "Super Rare", name: "Anomaly Detector", luckBonus: 5.0, vgChance: 0.03, special: null }, // 3% VG
    "cam_008m": { type: "camera", rarity: "Super Rare", name: "Rift-Scanner", luckBonus: 8.0, vgChance: 0.04, special: null },
    // Strang B (Ressourcen + Bisschen VG)
    "cam_007b": { type: "camera", rarity: "Super Rare", name: "Deep-Sonar", luckBonus: 6.0, vgChance: 0.01, special: { type: "flat_po", chance: 0.40, value: 500e12 } }, 
    "cam_008b": { type: "camera", rarity: "Super Rare", name: "Logic-Analyzer", luckBonus: 7.0, vgChance: 0.01, special: { type: "flat_nrp", chance: 0.30, value: 40 } },
    "cam_201":  { type: "camera", rarity: "Legendary", name: "The Pity-Lens", luckBonus: 1.0, vgChance: 0.0, special: { type: "guarantee_rare", value: 1 } }, // Exot T3

    // ==========================================
    // 📷 KAMERA TIER 4 (Legendary) - Das Auge schließt sich langsam
    // ==========================================
    "cam_009a": { type: "camera", rarity: "Legendary", name: "AI-Swarm Optics", luckBonus: 30.0, vgChance: 0.04, special: null },
    "cam_010a": { type: "camera", rarity: "Legendary", name: "Quantum Lens", luckBonus: 50.0, vgChance: 0.05, special: null },
    
    "cam_009m": { type: "camera", rarity: "Legendary", name: "Dark-Energy Sensor", luckBonus: 20.0, vgChance: 0.08, special: null }, // 8% VG
    "cam_010m": { type: "camera", rarity: "Legendary", name: "Void-Tracer", luckBonus: 25.0, vgChance: 0.10, special: null }, // 10% VG
    
    "cam_009b": { type: "camera", rarity: "Legendary", name: "Seismic Optics", luckBonus: 25.0, vgChance: 0.04, special: { type: "flat_po", chance: 0.50, value: 5000e12 } }, 
    "cam_010b": { type: "camera", rarity: "Legendary", name: "Neural-Link Cam", luckBonus: 30.0, vgChance: 0.04, special: { type: "flat_nrp", chance: 0.40, value: 100 } },
    "cam_202":  { type: "camera", rarity: "Ultra Rare", name: "Void-Magnet", luckBonus: 0.5, vgChance: 0.20, special: { type: "no_parts", value: 1 } }, // Exot: Findet NUR Void Gems!

    // ==========================================
    // 📷 KAMERA TIER 5 (Ultra Rare) - Die Pupille (Linear)
    // ==========================================
    "cam_011": { type: "camera", rarity: "Ultra Rare", name: "Dimensional Eye", luckBonus: 100.0, vgChance: 0.12, special: null },
    "cam_012": { type: "camera", rarity: "Ultra Rare", name: "The Observer", luckBonus: 150.0, vgChance: 0.15, special: null },
    "cam_203": { type: "camera", rarity: "Ultra Rare", name: "Blueprint Decoder", luckBonus: 60.0, vgChance: 0.08, special: { type: "blueprint_drop", chance: 0.10 } }, // 10% Chance auf Blueprint Drop
    "cam_204": { type: "camera", rarity: "Ultra Rare", name: "Jackpot-Lens", luckBonus: 200.0, vgChance: 0.05, special: null }, // Erreicht die 2% Obergrenze!

    // ==========================================
    // 🌌 DROP-EXCLUSIVE (Unconnected)
    // ==========================================
    "cam_d01": { type: "camera", rarity: "Ultra Rare", name: "Eye of the Creator", luckBonus: 350.0, vgChance: 0.25, special: null }, // Absolutes RNG Monster

    //############################################################################################################################################################################################
    //############################################################################################################################################################################################
  
  // Dummy Frame (damit Missionen startbar bleiben)
    "fra_001": { type: "frame", rarity: "Common", name: "Cardboard Frame", breakChance: 0.40, special: null }
};

// --- DER NEUE 2D TECH TREE (BATTERIEN) ---
// Beachte die neuen 'vg' (Void Gems) in den Kosten!
// --- DER NEUE 2D TECH TREE (BATTERIEN) ---
const TECH_TREE = {
    // TIER 1 (CP und RP regieren noch)
    "n_bat_001": { treeType: "battery", partId: "bat_001", req: [], x: 50, y: 5, unlockCost: { rp: 500, nrp: 0, vg: 0 }, buyCost: { cp: 1e12, po: 0, vg: 0 } },
    "n_bat_002": { treeType: "battery", partId: "bat_002", req: ["n_bat_001"], x: 50, y: 9, unlockCost: { rp: 1000, nrp: 0, vg: 0 }, buyCost: { cp: 5e12, po: 0, vg: 0 } },
    "n_bat_003": { treeType: "battery", partId: "bat_003", req: ["n_bat_002"], x: 50, y: 13, unlockCost: { rp: 5000, nrp: 0, vg: 0 }, buyCost: { cp: 20e12, po: 0, vg: 0 } },
    "n_bat_004": { treeType: "battery", partId: "bat_004", req: ["n_bat_003"], x: 50, y: 17, unlockCost: { rp: 15000, nrp: 2, vg: 0 }, buyCost: { cp: 50e12, po: 5, vg: 0 } },
    "n_bat_005": { treeType: "battery", partId: "bat_005", req: ["n_bat_004"], x: 50, y: 21, unlockCost: { rp: 50000, nrp: 5, vg: 0 }, buyCost: { cp: 150e12, po: 15, vg: 0 } },
    "n_bat_006": { treeType: "battery", partId: "bat_006", req: ["n_bat_003"], x: 62, y: 13, unlockCost: { rp: 8000, nrp: 1, vg: 0 }, buyCost: { cp: 30e12, po: 2, vg: 0 } }, 

    // TIER 2 (CP und RP faden radikal aus, PO & N-RP übernehmen)
    "n_bat_007": { treeType: "battery", partId: "bat_007", req: ["n_bat_005"], x: 50, y: 26, unlockCost: { rp: 20000, nrp: 15, vg: 0 }, buyCost: { cp: 100e12, po: 30, vg: 0 } },
    "n_bat_008": { treeType: "battery", partId: "bat_008", req: ["n_bat_007"], x: 50, y: 30, unlockCost: { rp: 0, nrp: 30, vg: 0 }, buyCost: { cp: 0, po: 60, vg: 0 } }, // AB HIER 0 RP/CP!
    
    // Split A (Links) & Split B (Rechts) -> Ausschließlich PO und N-RP
    "n_bat_009a": { treeType: "battery", partId: "bat_009a", req: ["n_bat_008"], x: 40, y: 34, unlockCost: { rp: 0, nrp: 50, vg: 0 }, buyCost: { cp: 0, po: 100, vg: 0 } },
    "n_bat_010a": { treeType: "battery", partId: "bat_010a", req: ["n_bat_009a"], x: 40, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 150, vg: 0 } },
    "n_bat_011a": { treeType: "battery", partId: "bat_011a", req: ["n_bat_010a"], x: 40, y: 42, unlockCost: { rp: 0, nrp: 120, vg: 0 }, buyCost: { cp: 0, po: 250, vg: 0 } },
    
    "n_bat_009b": { treeType: "battery", partId: "bat_009b", req: ["n_bat_008"], x: 60, y: 34, unlockCost: { rp: 0, nrp: 50, vg: 0 }, buyCost: { cp: 0, po: 100, vg: 0 } },
    "n_bat_010b": { treeType: "battery", partId: "bat_010b", req: ["n_bat_009b"], x: 60, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 150, vg: 0 } },
    "n_bat_011b": { treeType: "battery", partId: "bat_011b", req: ["n_bat_010b"], x: 60, y: 42, unlockCost: { rp: 0, nrp: 120, vg: 0 }, buyCost: { cp: 0, po: 250, vg: 0 } },
    "n_bat_012b": { treeType: "battery", partId: "bat_012b", req: ["n_bat_009b"], x: 72, y: 34, unlockCost: { rp: 0, nrp: 60, vg: 0 }, buyCost: { cp: 0, po: 120, vg: 0 } }, 

    // TIER 3 (Void Gems kommen dazu)
    "n_bat_013a": { treeType: "battery", partId: "bat_013a", req: ["n_bat_011a"], x: 35, y: 47, unlockCost: { rp: 0, nrp: 200, vg: 1 }, buyCost: { cp: 0, po: 500, vg: 0 } },
    "n_bat_014a": { treeType: "battery", partId: "bat_014a", req: ["n_bat_013a"], x: 35, y: 51, unlockCost: { rp: 0, nrp: 350, vg: 2 }, buyCost: { cp: 0, po: 800, vg: 1 } },
    "n_bat_015a": { treeType: "battery", partId: "bat_015a", req: ["n_bat_014a"], x: 35, y: 55, unlockCost: { rp: 0, nrp: 500, vg: 5 }, buyCost: { cp: 0, po: 1200, vg: 2 } },

    "n_bat_013m": { treeType: "battery", partId: "bat_013m", req: ["n_bat_011a", "n_bat_011b"], x: 50, y: 47, unlockCost: { rp: 0, nrp: 250, vg: 1 }, buyCost: { cp: 0, po: 600, vg: 0 } }, 
    "n_bat_014m": { treeType: "battery", partId: "bat_014m", req: ["n_bat_013m"], x: 50, y: 51, unlockCost: { rp: 0, nrp: 400, vg: 2 }, buyCost: { cp: 0, po: 900, vg: 1 } },
    "n_bat_015m": { treeType: "battery", partId: "bat_015m", req: ["n_bat_014m"], x: 50, y: 55, unlockCost: { rp: 0, nrp: 600, vg: 5 }, buyCost: { cp: 0, po: 1500, vg: 2 } },

    "n_bat_013b": { treeType: "battery", partId: "bat_013b", req: ["n_bat_011b"], x: 65, y: 47, unlockCost: { rp: 0, nrp: 200, vg: 1 }, buyCost: { cp: 0, po: 500, vg: 0 } },
    "n_bat_014b": { treeType: "battery", partId: "bat_014b", req: ["n_bat_013b"], x: 65, y: 51, unlockCost: { rp: 0, nrp: 350, vg: 2 }, buyCost: { cp: 0, po: 800, vg: 1 } },
    "n_bat_015b": { treeType: "battery", partId: "bat_015b", req: ["n_bat_014b"], x: 65, y: 55, unlockCost: { rp: 0, nrp: 500, vg: 5 }, buyCost: { cp: 0, po: 1200, vg: 2 } },

    "n_bat_013c": { treeType: "battery", partId: "bat_013c", req: ["n_bat_013a"], x: 20, y: 47, unlockCost: { rp: 0, nrp: 220, vg: 1 }, buyCost: { cp: 0, po: 550, vg: 0 } },
    "n_bat_014c": { treeType: "battery", partId: "bat_014c", req: ["n_bat_013c"], x: 20, y: 51, unlockCost: { rp: 0, nrp: 380, vg: 2 }, buyCost: { cp: 0, po: 850, vg: 1 } },
    "n_bat_201":  { treeType: "battery", partId: "bat_201",  req: ["n_bat_014c"], x: 20, y: 55, unlockCost: { rp: 0, nrp: 700, vg: 8 }, buyCost: { cp: 0, po: 1800, vg: 3 } }, 

    // TIER 4
    "n_bat_016a": { treeType: "battery", partId: "bat_016a", req: ["n_bat_015a"], x: 35, y: 60, unlockCost: { rp: 0, nrp: 1000, vg: 10 }, buyCost: { cp: 0, po: 2500, vg: 5 } },
    "n_bat_017a": { treeType: "battery", partId: "bat_017a", req: ["n_bat_016a"], x: 35, y: 64, unlockCost: { rp: 0, nrp: 1800, vg: 15 }, buyCost: { cp: 0, po: 4000, vg: 8 } },
    "n_bat_018a": { treeType: "battery", partId: "bat_018a", req: ["n_bat_017a"], x: 35, y: 68, unlockCost: { rp: 0, nrp: 3000, vg: 25 }, buyCost: { cp: 0, po: 7000, vg: 15 } },

    "n_bat_016m": { treeType: "battery", partId: "bat_016m", req: ["n_bat_015m"], x: 50, y: 60, unlockCost: { rp: 0, nrp: 1200, vg: 12 }, buyCost: { cp: 0, po: 3000, vg: 6 } },
    "n_bat_017m": { treeType: "battery", partId: "bat_017m", req: ["n_bat_016m"], x: 50, y: 64, unlockCost: { rp: 0, nrp: 2200, vg: 18 }, buyCost: { cp: 0, po: 5000, vg: 10 } },
    "n_bat_018m": { treeType: "battery", partId: "bat_018m", req: ["n_bat_017m"], x: 50, y: 68, unlockCost: { rp: 0, nrp: 3500, vg: 30 }, buyCost: { cp: 0, po: 9000, vg: 18 } },

    "n_bat_016b": { treeType: "battery", partId: "bat_016b", req: ["n_bat_015b"], x: 65, y: 60, unlockCost: { rp: 0, nrp: 1000, vg: 10 }, buyCost: { cp: 0, po: 2500, vg: 5 } },
    "n_bat_017b": { treeType: "battery", partId: "bat_017b", req: ["n_bat_016b"], x: 65, y: 64, unlockCost: { rp: 0, nrp: 1800, vg: 15 }, buyCost: { cp: 0, po: 4000, vg: 8 } },
    "n_bat_018b": { treeType: "battery", partId: "bat_018b", req: ["n_bat_017b"], x: 65, y: 68, unlockCost: { rp: 0, nrp: 3000, vg: 25 }, buyCost: { cp: 0, po: 7000, vg: 15 } },
    "n_bat_202":  { treeType: "battery", partId: "bat_202",  req: ["n_bat_017b"], x: 78, y: 64, unlockCost: { rp: 0, nrp: 5000, vg: 40 }, buyCost: { cp: 0, po: 10000, vg: 20 } }, 

    // TIER 5
    "n_bat_019a": { treeType: "battery", partId: "bat_019a", req: ["n_bat_018a"], x: 35, y: 74, unlockCost: { rp: 0, nrp: 8000, vg: 60 }, buyCost: { cp: 0, po: 20000, vg: 35 } },
    "n_bat_020a": { treeType: "battery", partId: "bat_020a", req: ["n_bat_019a"], x: 35, y: 79, unlockCost: { rp: 0, nrp: 15000, vg: 120 }, buyCost: { cp: 0, po: 50000, vg: 80 } },
    "n_bat_203":  { treeType: "battery", partId: "bat_203",  req: ["n_bat_019a"], x: 20, y: 74, unlockCost: { rp: 0, nrp: 12000, vg: 90 }, buyCost: { cp: 0, po: 35000, vg: 50 } }, 

    "n_bat_019m": { treeType: "battery", partId: "bat_019m", req: ["n_bat_018m"], x: 50, y: 74, unlockCost: { rp: 0, nrp: 9000, vg: 70 }, buyCost: { cp: 0, po: 25000, vg: 40 } },
    "n_bat_020m": { treeType: "battery", partId: "bat_020m", req: ["n_bat_019m"], x: 50, y: 79, unlockCost: { rp: 0, nrp: 20000, vg: 150 }, buyCost: { cp: 0, po: 70000, vg: 100 } },
    "n_bat_204":  { treeType: "battery", partId: "bat_204",  req: ["n_bat_019m"], x: 65, y: 74, unlockCost: { rp: 0, nrp: 14000, vg: 100 }, buyCost: { cp: 0, po: 45000, vg: 60 } }, 
    "n_bat_205":  { treeType: "battery", partId: "bat_205",  req: ["n_bat_020m"], x: 50, y: 84, unlockCost: { rp: 0, nrp: 35000, vg: 300 }, buyCost: { cp: 0, po: 150000, vg: 200 } }, 
  
  //############################################################################################################################################################################################
  //############################################################################################################################################################################################

    // --- DER NEUE 2D TECH TREE (PROPELLER) ---
    // TIER 1 (Zick-Zack Layout)
    "n_pro_001": { treeType: "props", partId: "pro_001", req: [], x: 50, y: 5, unlockCost: { rp: 500, nrp: 0, vg: 0 }, buyCost: { cp: 1e12, po: 0, vg: 0 } },
    "n_pro_002": { treeType: "props", partId: "pro_002", req: ["n_pro_001"], x: 40, y: 9, unlockCost: { rp: 1000, nrp: 0, vg: 0 }, buyCost: { cp: 5e12, po: 0, vg: 0 } },
    "n_pro_003": { treeType: "props", partId: "pro_003", req: ["n_pro_002"], x: 50, y: 13, unlockCost: { rp: 5000, nrp: 0, vg: 0 }, buyCost: { cp: 20e12, po: 0, vg: 0 } },
    "n_pro_004": { treeType: "props", partId: "pro_004", req: ["n_pro_003"], x: 40, y: 17, unlockCost: { rp: 15000, nrp: 2, vg: 0 }, buyCost: { cp: 50e12, po: 5, vg: 0 } },
    "n_pro_005": { treeType: "props", partId: "pro_005", req: ["n_pro_004"], x: 50, y: 21, unlockCost: { rp: 50000, nrp: 5, vg: 0 }, buyCost: { cp: 150e12, po: 15, vg: 0 } },
    "n_pro_006": { treeType: "props", partId: "pro_006", req: ["n_pro_003"], x: 65, y: 13, unlockCost: { rp: 8000, nrp: 1, vg: 0 }, buyCost: { cp: 30e12, po: 2, vg: 0 } }, // Dead End

    // TIER 2 (Extremer Split)
    "n_pro_007": { treeType: "props", partId: "pro_007", req: ["n_pro_005"], x: 50, y: 25, unlockCost: { rp: 20000, nrp: 15, vg: 0 }, buyCost: { cp: 100e12, po: 30, vg: 0 } },
    "n_pro_008": { treeType: "props", partId: "pro_008", req: ["n_pro_007"], x: 58, y: 29, unlockCost: { rp: 0, nrp: 30, vg: 0 }, buyCost: { cp: 0, po: 60, vg: 0 } },
    
    // Weit nach Links (PO)
    "n_pro_009a": { treeType: "props", partId: "pro_009a", req: ["n_pro_008"], x: 45, y: 34, unlockCost: { rp: 0, nrp: 50, vg: 0 }, buyCost: { cp: 0, po: 100, vg: 0 } },
    "n_pro_010a": { treeType: "props", partId: "pro_010a", req: ["n_pro_009a"], x: 40, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 150, vg: 0 } },
    "n_pro_011a": { treeType: "props", partId: "pro_011a", req: ["n_pro_010a"], x: 35, y: 42, unlockCost: { rp: 0, nrp: 120, vg: 0 }, buyCost: { cp: 0, po: 250, vg: 0 } },
    
    // Weit nach Rechts (N-RP)
    "n_pro_009b": { treeType: "props", partId: "pro_009b", req: ["n_pro_008"], x: 70, y: 34, unlockCost: { rp: 0, nrp: 50, vg: 0 }, buyCost: { cp: 0, po: 100, vg: 0 } },
    "n_pro_010b": { treeType: "props", partId: "pro_010b", req: ["n_pro_009b"], x: 65, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 150, vg: 0 } },
    "n_pro_011b": { treeType: "props", partId: "pro_011b", req: ["n_pro_010b"], x: 65, y: 42, unlockCost: { rp: 0, nrp: 120, vg: 0 }, buyCost: { cp: 0, po: 250, vg: 0 } },
    "n_pro_012b": { treeType: "props", partId: "pro_012b", req: ["n_pro_009b"], x: 85, y: 34, unlockCost: { rp: 0, nrp: 60, vg: 0 }, buyCost: { cp: 0, po: 120, vg: 0 } }, // Dead End

    // TIER 3 (Mitte bildet sich als Brücke)
    "n_pro_013a": { treeType: "props", partId: "pro_013a", req: ["n_pro_011a"], x: 35, y: 47, unlockCost: { rp: 0, nrp: 200, vg: 1 }, buyCost: { cp: 0, po: 500, vg: 0 } },
    "n_pro_014a": { treeType: "props", partId: "pro_014a", req: ["n_pro_013a"], x: 35, y: 52, unlockCost: { rp: 0, nrp: 350, vg: 2 }, buyCost: { cp: 0, po: 800, vg: 1 } },
    "n_pro_015a": { treeType: "props", partId: "pro_015a", req: ["n_pro_014a"], x: 35, y: 57, unlockCost: { rp: 0, nrp: 500, vg: 5 }, buyCost: { cp: 0, po: 1200, vg: 2 } },

    // Hybride Brücke (Von 11a und 11b nach innen!)
    "n_pro_013m": { treeType: "props", partId: "pro_013m", req: ["n_pro_011a", "n_pro_011b"], x: 50, y: 47, unlockCost: { rp: 0, nrp: 250, vg: 1 }, buyCost: { cp: 0, po: 600, vg: 0 } },
    "n_pro_014m": { treeType: "props", partId: "pro_014m", req: ["n_pro_013m"], x: 50, y: 52, unlockCost: { rp: 0, nrp: 400, vg: 2 }, buyCost: { cp: 0, po: 900, vg: 1 } },
    "n_pro_015m": { treeType: "props", partId: "pro_015m", req: ["n_pro_014m"], x: 50, y: 57, unlockCost: { rp: 0, nrp: 600, vg: 5 }, buyCost: { cp: 0, po: 1500, vg: 2 } },

    "n_pro_013b": { treeType: "props", partId: "pro_013b", req: ["n_pro_011b"], x: 65, y: 47, unlockCost: { rp: 0, nrp: 200, vg: 1 }, buyCost: { cp: 0, po: 500, vg: 0 } },
    "n_pro_014b": { treeType: "props", partId: "pro_014b", req: ["n_pro_013b"], x: 65, y: 52, unlockCost: { rp: 0, nrp: 350, vg: 2 }, buyCost: { cp: 0, po: 800, vg: 1 } },
    "n_pro_015b": { treeType: "props", partId: "pro_015b", req: ["n_pro_014b"], x: 65, y: 57, unlockCost: { rp: 0, nrp: 500, vg: 5 }, buyCost: { cp: 0, po: 1200, vg: 2 } },
    "n_pro_201":  { treeType: "props", partId: "pro_201",  req: ["n_pro_014b"], x: 75, y: 52, unlockCost: { rp: 0, nrp: 700, vg: 8 }, buyCost: { cp: 0, po: 1800, vg: 3 } }, // Exot

    // TIER 4 (Strang B endet hier!)
    "n_pro_016a": { treeType: "props", partId: "pro_016a", req: ["n_pro_015a"], x: 25, y: 64, unlockCost: { rp: 0, nrp: 1000, vg: 10 }, buyCost: { cp: 0, po: 2500, vg: 5 } },
    "n_pro_017a": { treeType: "props", partId: "pro_017a", req: ["n_pro_016a"], x: 25, y: 69, unlockCost: { rp: 0, nrp: 1800, vg: 15 }, buyCost: { cp: 0, po: 4000, vg: 8 } },
    
    "n_pro_016m": { treeType: "props", partId: "pro_016m", req: ["n_pro_015m"], x: 50, y: 64, unlockCost: { rp: 0, nrp: 1200, vg: 12 }, buyCost: { cp: 0, po: 3000, vg: 6 } },
    "n_pro_017m": { treeType: "props", partId: "pro_017m", req: ["n_pro_016m"], x: 50, y: 69, unlockCost: { rp: 0, nrp: 2200, vg: 18 }, buyCost: { cp: 0, po: 5000, vg: 10 } },

    "n_pro_016b": { treeType: "props", partId: "pro_016b", req: ["n_pro_015b"], x: 65, y: 64, unlockCost: { rp: 0, nrp: 1000, vg: 10 }, buyCost: { cp: 0, po: 2500, vg: 5 } },
    "n_pro_202":  { treeType: "props", partId: "pro_202",  req: ["n_pro_016b"], x: 80, y: 69, unlockCost: { rp: 0, nrp: 5000, vg: 40 }, buyCost: { cp: 0, po: 10000, vg: 20 } }, // Exot (Ende B)

    // TIER 5 (Asymmetrisch, verschiebt sich nach rechts)
    "n_pro_018a": { treeType: "props", partId: "pro_018a", req: ["n_pro_017a"], x: 35, y: 77, unlockCost: { rp: 0, nrp: 8000, vg: 60 }, buyCost: { cp: 0, po: 20000, vg: 35 } },
    "n_pro_203":  { treeType: "props", partId: "pro_203",  req: ["n_pro_018a"], x: 30, y: 80, unlockCost: { rp: 0, nrp: 12000, vg: 90 }, buyCost: { cp: 0, po: 35000, vg: 50 } }, // Exot
    
    "n_pro_018m": { treeType: "props", partId: "pro_018m", req: ["n_pro_017m"], x: 60, y: 77, unlockCost: { rp: 0, nrp: 9000, vg: 70 }, buyCost: { cp: 0, po: 25000, vg: 40 } },
    "n_pro_204":  { treeType: "props", partId: "pro_204",  req: ["n_pro_018m"], x: 75, y: 80, unlockCost: { rp: 0, nrp: 14000, vg: 100 }, buyCost: { cp: 0, po: 45000, vg: 60 } }, // Exot
    "n_pro_205":  { treeType: "props", partId: "pro_205",  req: ["n_pro_018m"], x: 60, y: 83, unlockCost: { rp: 0, nrp: 35000, vg: 300 }, buyCost: { cp: 0, po: 150000, vg: 200 } },  // Exot
      
//############################################################################################################################################################################################
//############################################################################################################################################################################################

  // --- DER NEUE 2D TECH TREE (KAMERAS - DAS AUGE) ---
    // TIER 1 (Der optische Nerv - Linear)
    "n_cam_001": { treeType: "camera", partId: "cam_001", req: [], x: 50, y: 5, unlockCost: { rp: 500, nrp: 0, vg: 0 }, buyCost: { cp: 1e12, po: 0, vg: 0 } },
    "n_cam_002": { treeType: "camera", partId: "cam_002", req: ["n_cam_001"], x: 50, y: 11, unlockCost: { rp: 1500, nrp: 0, vg: 0 }, buyCost: { cp: 5e12, po: 0, vg: 0 } },
    "n_cam_003": { treeType: "camera", partId: "cam_003", req: ["n_cam_002"], x: 50, y: 17, unlockCost: { rp: 8000, nrp: 2, vg: 0 }, buyCost: { cp: 25e12, po: 5, vg: 0 } },
    "n_cam_004": { treeType: "camera", partId: "cam_004", req: ["n_cam_003"], x: 50, y: 22, unlockCost: { rp: 25000, nrp: 8, vg: 0 }, buyCost: { cp: 100e12, po: 20, vg: 0 } },

    // TIER 2 (Die Linse öffnet sich nach außen)
    "n_cam_005a": { treeType: "camera", partId: "cam_005a", req: ["n_cam_004"], x: 30, y: 30, unlockCost: { rp: 0, nrp: 30, vg: 0 }, buyCost: { cp: 0, po: 80, vg: 0 } },
    "n_cam_006a": { treeType: "camera", partId: "cam_006a", req: ["n_cam_005a"], x: 20, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 200, vg: 0 } },

    "n_cam_005b": { treeType: "camera", partId: "cam_005b", req: ["n_cam_004"], x: 70, y: 30, unlockCost: { rp: 0, nrp: 30, vg: 0 }, buyCost: { cp: 0, po: 80, vg: 0 } },
    "n_cam_006b": { treeType: "camera", partId: "cam_006b", req: ["n_cam_005b"], x: 80, y: 38, unlockCost: { rp: 0, nrp: 80, vg: 0 }, buyCost: { cp: 0, po: 200, vg: 0 } },

    // TIER 3 (Die breiteste Stelle des Auges - VOID GEMS KOSTEN STARTEN HIER)
    "n_cam_007a": { treeType: "camera", partId: "cam_007a", req: ["n_cam_006a"], x: 15, y: 48, unlockCost: { rp: 0, nrp: 250, vg: 0 }, buyCost: { cp: 0, po: 600, vg: 0 } },
    "n_cam_008a": { treeType: "camera", partId: "cam_008a", req: ["n_cam_007a"], x: 15, y: 56, unlockCost: { rp: 0, nrp: 500, vg: 0 }, buyCost: { cp: 0, po: 1500, vg: 0 } },

    // Der Void-Kern (Entsteht in der Mitte aus den äußeren Ringen!)
    "n_cam_007m": { treeType: "camera", partId: "cam_007m", req: ["n_cam_006a", "n_cam_006b"], x: 50, y: 48, unlockCost: { rp: 0, nrp: 300, vg: 1 }, buyCost: { cp: 0, po: 800, vg: 0 } },
    "n_cam_008m": { treeType: "camera", partId: "cam_008m", req: ["n_cam_007m"], x: 42, y: 56, unlockCost: { rp: 0, nrp: 600, vg: 0 }, buyCost: { cp: 0, po: 2000, vg: 1 } },

    "n_cam_007b": { treeType: "camera", partId: "cam_007b", req: ["n_cam_006b"], x: 85, y: 48, unlockCost: { rp: 0, nrp: 250, vg: 0 }, buyCost: { cp: 0, po: 600, vg: 0 } },
    "n_cam_008b": { treeType: "camera", partId: "cam_008b", req: ["n_cam_007b"], x: 85, y: 56, unlockCost: { rp: 0, nrp: 500, vg: 1 }, buyCost: { cp: 0, po: 1500, vg: 1 } },
    "n_cam_201":  { treeType: "camera", partId: "cam_201",  req: ["n_cam_007b"], x: 98, y: 52, unlockCost: { rp: 0, nrp: 1000, vg: 10 }, buyCost: { cp: 0, po: 3000, vg: 5 } }, // Exot

    // TIER 4 (Die Linse schließt sich wieder)
    "n_cam_009a": { treeType: "camera", partId: "cam_009a", req: ["n_cam_008a"], x: 25, y: 68, unlockCost: { rp: 0, nrp: 1500, vg: 15 }, buyCost: { cp: 0, po: 4000, vg: 8 } },
    "n_cam_010a": { treeType: "camera", partId: "cam_010a", req: ["n_cam_009a"], x: 35, y: 76, unlockCost: { rp: 0, nrp: 3500, vg: 30 }, buyCost: { cp: 0, po: 8000, vg: 15 } },

    "n_cam_009m": { treeType: "camera", partId: "cam_009m", req: ["n_cam_008m"], x: 50, y: 68, unlockCost: { rp: 0, nrp: 2000, vg: 20 }, buyCost: { cp: 0, po: 5000, vg: 12 } },
    "n_cam_010m": { treeType: "camera", partId: "cam_010m", req: ["n_cam_009m"], x: 50, y: 76, unlockCost: { rp: 0, nrp: 4500, vg: 40 }, buyCost: { cp: 0, po: 10000, vg: 25 } },
    "n_cam_202":  { treeType: "camera", partId: "cam_202",  req: ["n_cam_009m"], x: 65, y: 68, unlockCost: { rp: 0, nrp: 6000, vg: 80 }, buyCost: { cp: 0, po: 15000, vg: 40 } }, // Exot Void-Magnet

    "n_cam_009b": { treeType: "camera", partId: "cam_009b", req: ["n_cam_008b"], x: 75, y: 68, unlockCost: { rp: 0, nrp: 1500, vg: 15 }, buyCost: { cp: 0, po: 4000, vg: 8 } },
    "n_cam_010b": { treeType: "camera", partId: "cam_010b", req: ["n_cam_009b"], x: 65, y: 76, unlockCost: { rp: 0, nrp: 3500, vg: 30 }, buyCost: { cp: 0, po: 8000, vg: 15 } },

    // TIER 5 (Die Pupille - Alles läuft exakt auf X=50 zusammen)
    // Alle drei Stränge der Ebene 4 bündeln sich in 011!
    "n_cam_011": { treeType: "camera", partId: "cam_011", req: ["n_cam_010a", "n_cam_010m", "n_cam_010b"], x: 50, y: 83, unlockCost: { rp: 0, nrp: 15000, vg: 120 }, buyCost: { cp: 0, po: 40000, vg: 60 } },
    "n_cam_012": { treeType: "camera", partId: "cam_012", req: ["n_cam_011"], x: 50, y: 91, unlockCost: { rp: 0, nrp: 35000, vg: 250 }, buyCost: { cp: 0, po: 100000, vg: 150 } },
    
    "n_cam_203": { treeType: "camera", partId: "cam_203", req: ["n_cam_011"], x: 30, y: 91, unlockCost: { rp: 0, nrp: 20000, vg: 150 }, buyCost: { cp: 0, po: 60000, vg: 80 } }, // Exot Decoder
    "n_cam_204": { treeType: "camera", partId: "cam_204", req: ["n_cam_012"], x: 65, y: 95, unlockCost: { rp: 0, nrp: 50000, vg: 400 }, buyCost: { cp: 0, po: 200000, vg: 250 } },  // Exot Jackpot
      
  //############################################################################################################################################################################################
  //############################################################################################################################################################################################
      

    "dummy_fra": { treeType: "frame", partId: "fra_001", req: [], x: 50, y: 10, unlockCost: { rp: 0, nrp: 0, vg: 0 }, buyCost: { cp: 0, po: 0, vg: 0 } }
};
