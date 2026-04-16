// Zentrale Spielkonstanten. Hier alles ändern, nirgends hardcoden.

export const GAME = {
    WIDTH: 1280,
    HEIGHT: 720,
    BG: 0x050505,
};

export const ISO = {
    TILE_SIZE: 40,
    GRID_SIZE: 12,
    // Offset wird in der Scene berechnet, damit das Grid zentriert ist
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
};

export const PLAYER = {
    SPEED: 200, // px/s
};

export const OCCLUSION = {
    ALPHA: 0.5,        // Transparenz wenn verdeckt
    LERP: 0.15,        // Geschwindigkeit der Alpha-Änderung pro Frame
    PLAYER_THRESHOLD: 30, // Wieviel Pixel muss Objekt vor Player sein, damit es transparent wird
};

export const WALLS = {
    BACK_HEIGHT: 70,
    FRONT_HEIGHT: 25,
};

export const INTERACTION = {
    RANGE: 1.5,          // Max Distanz in Tiles (Center zu Center)
    HIGHLIGHT_PULSE: 1500, // Pulse-Periode in ms
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
};

export const GROWTH = {
    GROW_DURATION: 15000, // ms bis erntereif
    ROT_DURATION: 20000,  // ms nach erntereif bis verfault
};
export const DOOR = {
    GRID_X: 6, // wo in der Vorderwand die Lücke ist (0..GRID_SIZE)
};

export const STORAGE_TABLE = {
    HEIGHT: 15,
};
export const CUSTOMER = {
    SPEED: 70,               // langsamer
    RAGE_DURATION: 30000,
    WAIT_AFTER_SERVED: 800,
    QUEUE_SPACING: 1.0,
    FAST_SERVE_THRESHOLD: 0.5, // unter 50% Rage = "schnell bedient"
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
    INTERVAL_BASE: 10000,    // Basis-Intervall (Zufriedenheit = Mitte)
    INTERVAL_MIN: 4000,      // bei Zufriedenheit = MAX
    INTERVAL_MAX: 35000,     // bei Zufriedenheit = MIN
    // Max gleichzeitige Kunden abhängig von Zufriedenheit
    MAX_CUSTOMERS_LOW: 1,    // bei niedriger Zufriedenheit
    MAX_CUSTOMERS_HIGH: 4,   // bei hoher Zufriedenheit
    // Wahrscheinlichkeit für Multi-Item-Bestellungen (0..1)
    MULTI_ITEM_CHANCE_PER_SAT: 0.04, // +4% pro Zufriedenheits-Punkt über Start
    MAX_ORDER_SIZE: 4,
};
export const BUILD = {
    // Preise pro Typ, Index = wieviele davon schon existieren
    // Also: erstes Beet = 10€, zweites = 50€, drittes = 250€ ...
    PRICES: {
        bed:      [10, 50, 250, 1000, 4000],
        register: [10, 100, 500, 2000],
        storage:  [5, 15, 40, 100],
    },
    // Vordefinierte Positionen auf dem Grid
    SLOTS: [
        // Beete (Reihe oben-mitte)
        { type: 'bed', gridX: 2, gridY: 3 },
        { type: 'bed', gridX: 4, gridY: 3 },
        { type: 'bed', gridX: 6, gridY: 3 },
        { type: 'bed', gridX: 8, gridY: 3 },
        { type: 'bed', gridX: 3, gridY: 5 },
        { type: 'bed', gridX: 5, gridY: 5 },
        { type: 'bed', gridX: 7, gridY: 5 },
        { type: 'bed', gridX: 9, gridY: 5 },
        // Kassen (unterer Bereich)
        { type: 'register', gridX: 5, gridY: 9 },
        { type: 'register', gridX: 3, gridY: 9 },
        { type: 'register', gridX: 7, gridY: 9 },
        // Storage (neben Kassen)
        { type: 'storage', gridX: 4, gridY: 9 },
        { type: 'storage', gridX: 6, gridY: 9 },
        { type: 'storage', gridX: 2, gridY: 7 },
        { type: 'storage', gridX: 4, gridY: 7 },
        { type: 'storage', gridX: 6, gridY: 7 },
        { type: 'storage', gridX: 8, gridY: 7 },
    ],
};
