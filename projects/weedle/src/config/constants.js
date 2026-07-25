export const GAME = {
    WIDTH: 1280,
    HEIGHT: 720,
    BG: 0x050505,
};

export const ISO = {
    TILE_SIZE: 40,
    GRID_SIZE: 12,
};

export const COLORS = {
    GRID:        0x004444,
    WALL:        0x00ffff,
    PLAYER:      0x00ff00,
    EMPLOYEE:    0x0088ff,
    CUSTOMER:    0xff8800,
    SEED_SHOP:   0xffaa00,
    BED:         0x00ffff,
    BED_PLANT:   0x00ff00,
    BED_ROTTEN:  0xff4400,
    REGISTER:    0xff00ff,
    DOOR:        0x00ffff,
    TIMER_GROW:  0x00ffff,
    TIMER_RAGE:  0xff0000,
    TRASH:       0x888888,
};

export const PLAYER = {
    SPEED: 200,
};

export const OCCLUSION = {
    ALPHA: 0.5,
    LERP: 0.15,
    PLAYER_THRESHOLD: 30,
};

export const WALLS = {
    BACK_HEIGHT: 70,
    FRONT_HEIGHT: 25,
};

export const INTERACTION = {
    RANGE: 1.5,
    HIGHLIGHT_PULSE: 1500,
};

export const ECONOMY = {
    STARTING_MONEY: 9999,
};

export const SEED_VARIETIES = [
    { id: 'mint',    label: 'Mint',    color: 0x00ff88, seedColor: 0x00ff88, seedCost: 10,  sellPrice: 25,  growTime: 15000, requiredTier: 0, terminalPrice: 0 },
    { id: 'haze',    label: 'Haze',    color: 0xaa44ff, seedColor: 0xaa44ff, seedCost: 25,  sellPrice: 60,  growTime: 20000, requiredTier: 1, terminalPrice: 200 },
    { id: 'kush',    label: 'Kush',    color: 0xff8800, seedColor: 0xff8800, seedCost: 50,  sellPrice: 130, growTime: 25000, requiredTier: 2, terminalPrice: 800 },
    { id: 'crystal', label: 'Crystal', color: 0x00ccff, seedColor: 0x00ccff, seedCost: 100, sellPrice: 280, growTime: 30000, requiredTier: 3, terminalPrice: 3000 },
    { id: 'og',      label: 'OG',      color: 0xff0044, seedColor: 0xff0044, seedCost: 200, sellPrice: 600, growTime: 40000, requiredTier: 4, terminalPrice: 10000 },
];

export const ITEMS = {
    ROTTEN: {
        id: 'rotten',
        color: 0xff4400,
        label: 'Verfault',
    },
};

// Dynamisch: Seed- und Plant-Items für jede Sorte
for (const v of SEED_VARIETIES) {
    ITEMS[`seed_${v.id}`] = { id: `seed_${v.id}`, color: v.seedColor, label: `${v.label} Samen`, variety: v.id };
    ITEMS[`plant_${v.id}`] = { id: `plant_${v.id}`, color: v.color, label: v.label, variety: v.id, sellPrice: v.sellPrice };
}

export const GROWTH = {
    ROT_DURATION: 20000, // gleich für alle Sorten
};

export const CUSTOMER = {
    SPEED: 70,
    RAGE_DURATION: 30000,
    WAIT_AFTER_SERVED: 800,
    QUEUE_SPACING: 1.0,
    FAST_SERVE_THRESHOLD: 0.5,
    INDOOR_SLOTS_PER_REGISTER: 2,
    BASE_MAX: 4,           // Basis max Kunden (bei 1 Kasse)
    PER_REGISTER_BONUS: 2, // +2 pro weitere Kasse
};

export const SATISFACTION = {
    START: 0,
    MIN: 0,
    MAX: 10,
    FAST_SERVE: +1,
    RAGE_QUIT: -2,
    NORMAL_SERVE: 0,
};

export const SPAWN = {
    INTERVAL_BASE: 10000,
    INTERVAL_MIN: 4000,
    INTERVAL_MAX: 20000,
    MULTI_ITEM_CHANCE_PER_SAT: 0.04,
    MAX_ORDER_SIZE: 3,
};

export const DOOR = {
    GRID_X: 6,
};

export const STORAGE_TABLE = {
    HEIGHT: 15,
};

export const EMPLOYEE = {
    SPEED_BASE: 40,          // sehr langsam start
    SPEED_PER_LEVEL: 15,     // +15 pro Upgrade
    SPEED_MAX: 180,           // knapp unter Player (200)
    HOLD_DURATION: 1500,
    GARDENER_PRICE_BASE: 100,
    GARDENER_PRICE_MULT: 3,
    CASHIER_PRICE_BASE: 150,
    CASHIER_PRICE_MULT: 3,
};

export const TRASH = {
    HOLD_DURATION: 5000,
    GRID_X: 11,           // links neben der Tür
    GRID_Y: 13,
};

export const BUILD = {
    PRICES: {
        bed:      [10, 100, 500, 2000, 8000, 30000, 120000, 500000],
        register: [10, 200, 1000, 5000],
        storage:  [25, 75, 200, 600, 2500, 12000, 60000],
        hiring:   [0],
        trash:    [0],
        terminal_haze:    [200],
        terminal_kush:    [800],
        terminal_crystal: [3000],
        terminal_og:      [10000],
    },
    SLOTS: [
        // Beete
        { type: 'bed', gridX: 2, gridY: 3 },
        { type: 'bed', gridX: 4, gridY: 3 },
        { type: 'bed', gridX: 6, gridY: 3 },
        { type: 'bed', gridX: 8, gridY: 3 },
        { type: 'bed', gridX: 3, gridY: 5 },
        { type: 'bed', gridX: 5, gridY: 5 },
        { type: 'bed', gridX: 7, gridY: 5 },
        { type: 'bed', gridX: 9, gridY: 5 },
        // Kassen
        { type: 'register', gridX: 3, gridY: 9 },
        { type: 'register', gridX: 5, gridY: 9 },
        { type: 'register', gridX: 7, gridY: 9 },
        // Storage
        { type: 'storage', gridX: 2, gridY: 9 },
        { type: 'storage', gridX: 4, gridY: 9 },
        { type: 'storage', gridX: 6, gridY: 9 },
        { type: 'storage', gridX: 8, gridY: 9 },
        { type: 'storage', gridX: 1, gridY: 9 },
        { type: 'storage', gridX: 0, gridY: 9 },
        // Terminals (hinten an der Wand) — Mint ist Start-Station, nicht kaufbar
        { type: 'terminal_haze', gridX: 4, gridY: 0 },
        { type: 'terminal_kush', gridX: 3, gridY: 0 },
        { type: 'terminal_crystal', gridX: 2, gridY: 0 },
        { type: 'terminal_og', gridX: 1, gridY: 0 },
        // Hiring (hinten rechts)
        { type: 'hiring', gridX: 9, gridY: 0 },
        // Mülleimer (neben Tür)
        { type: 'trash', gridX: 11, gridY: 13 },
    ],
};

export const UPGRADES = {
    bed: {
        label: 'BEET',
        description: (lvl) => `Wachstum ${Math.round((1 - Math.pow(0.85, lvl)) * 100)}% schneller`,
        basePrice: 40,
        priceMultiplier: 2.5,
        effect: (lvl) => Math.pow(0.85, lvl),
        maxLevel: Infinity,
    },
    register: {
        label: 'KASSE',
        description: (lvl) => `Rage ${Math.round((1 - Math.pow(0.85, lvl)) * 100)}% langsamer`,
        basePrice: 50,
        priceMultiplier: 2.5,
        effect: (lvl) => Math.pow(0.85, lvl),
        maxLevel: Infinity,
    },
    seedTerminal: {
        label: 'SAMEN',
        description: (lvl) => `Ertrag +${Math.round(lvl * 25)}%`,
        basePrice: 50,
        priceMultiplier: 2.5,
        effect: (lvl) => 1 + lvl * 0.25,
        maxLevel: Infinity,
    },
    storage: {
        label: 'LAGER',
        description: (lvl) => `${Math.min(1 + lvl, 4)} Slots`,
        basePrice: 40,
        priceMultiplier: 2,
        effect: (lvl) => Math.min(1 + lvl, 4),
        maxLevel: 3,
    },
    trash: {
        label: 'MÜLLEIMER',
        description: (lvl) => `${Math.max(1, 5 - lvl)}s Haltezeit`,
        basePrice: 30,
        priceMultiplier: 2,
        effect: (lvl) => Math.max(1000, 5000 - lvl * 1000), // ms
        maxLevel: 4,
    },
    bedTier: {
        label: 'BEET TIER',
        description: (lvl) => `Tier ${lvl} — bis ${SEED_VARIETIES.find(v => v.requiredTier === lvl)?.label || 'Max'}`,
        basePrice: 50,
        priceMultiplier: 4,
        effect: (lvl) => lvl, // Tier-Level
        maxLevel: SEED_VARIETIES.length - 1, // 4 (Tier 0 ist gratis)
    },
};
