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
    STARTING_MONEY: 100,
    SEED_COST: 10,
};

export const ITEMS = {
    SEED: {
        id: 'seed',
        color: 0xffff00,
        label: 'Samen',
    },
    PLANT: {
        id: 'plant',
        color: 0x00ff00,
        label: 'Pflanze',
        sellPrice: 25,
    },
    ROTTEN: {
        id: 'rotten',
        color: 0xff4400,
        label: 'Verfault',
    },
};

export const GROWTH = {
    GROW_DURATION: 15000,
    ROT_DURATION: 20000,
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
    GRID_X: 5,           // links neben der Tür
    GRID_Y: 11,
};

export const BUILD = {
    PRICES: {
        bed:      [10, 100, 500, 2000, 8000],
        register: [10, 200, 1000, 5000],
        storage:  [25, 75, 200, 600],
        hiring:   [0],
        trash:    [0],
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
        { type: 'storage', gridX: 2, gridY: 7 },
        { type: 'storage', gridX: 4, gridY: 7 },
        { type: 'storage', gridX: 6, gridY: 7 },
        { type: 'storage', gridX: 8, gridY: 7 },
        { type: 'storage', gridX: 3, gridY: 8 },
        { type: 'storage', gridX: 7, gridY: 8 },
        // Hiring (hinten rechts)
        { type: 'hiring', gridX: 9, gridY: 0 },
        // Mülleimer (neben Tür)
        { type: 'trash', gridX: 5, gridY: 11 },
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
};
