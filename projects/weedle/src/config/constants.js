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
