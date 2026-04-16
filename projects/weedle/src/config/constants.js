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
