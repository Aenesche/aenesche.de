// Level-Definitionen. Rein datengetrieben — die GameScene liest nur diese Config.
//
// Felder:
//   id, name, description  — Anzeige
//   startMoney             — Startkapital
//   prebuilt               — Stationen die fertig dastehen: {type, gridX, gridY, variety?}
//   allowedBuildTypes      — welche BuildSlot-Typen sichtbar sind ([] = kein Bauen)
//   varieties              — welche Sorten in diesem Level existieren (Terminals + Bestellungen)
//   features               — {upgrades, hiring, cashiers, trash} an/aus
//   rotMultiplier          — Verfaul-Geschwindigkeit (0.5 = doppelt so schnell)
//   goals                  — ALLE müssen erfüllt sein: 
//                            {kind:'sell', variety, count} | {kind:'sellTotal', count}
//                            {kind:'moneyEarned', amount} | {kind:'build', type, count}
//                            {kind:'hire', role} | {kind:'upgrade', target:'bed', level}
//   quests                 — Nebenquests für den 3. Stern:
//                            {id, label, kind:'noRotten'|'noRage'|'dispose'|'satisfactionEnd', n?}
//   timeLimitMs            — für Stern 2 (und 3)
//   unlocks                — Sandbox-Inventar bei Erst-Abschluss (station_type Strings)

export const LEVELS = [
    {
        id: 1,
        name: 'Erste Ernte',
        description: 'Lerne den Kreislauf: Samen kaufen, pflanzen, ernten, verkaufen.',
        startMoney: 50,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
        ],
        allowedBuildTypes: [],
        varieties: ['mint'],
        features: { upgrades: false, hiring: false, cashiers: false, trash: false },
        rotMultiplier: 1,
        goals: [{ kind: 'sell', variety: 'mint', count: 5 }],
        quests: [
            { id: 'no_rot', label: 'Keine Pflanze verfaulen lassen', kind: 'noRotten' },
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
        ],
        timeLimitMs: 4 * 60 * 1000,
        unlocks: ['terminal_mint', 'bed', 'register', 'storage'],
    },
    {
        id: 2,
        name: 'Aufbau',
        description: 'Erweitere deinen Laden mit neuen Beeten und Tischen.',
        startMoney: 60,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
        ],
        allowedBuildTypes: ['bed', 'storage'],
        varieties: ['mint'],
        features: { upgrades: false, hiring: false, cashiers: false, trash: false },
        rotMultiplier: 1,
        goals: [
            { kind: 'build', type: 'bed', count: 1 },
            { kind: 'sell', variety: 'mint', count: 20 },
        ],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'no_rot', label: 'Keine Pflanze verfaulen lassen', kind: 'noRotten' },
        ],
        timeLimitMs: 6 * 60 * 1000,
        unlocks: [],
    },
    {
        id: 3,
        name: 'Sauber bleiben',
        description: 'Pflanzen verfaulen hier schneller. Entsorge sie im Mülleimer.',
        startMoney: 80,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
        ],
        allowedBuildTypes: ['bed', 'storage'],
        varieties: ['mint'],
        features: { upgrades: false, hiring: false, cashiers: false, trash: true },
        rotMultiplier: 0.5, // verfault doppelt so schnell
        goals: [{ kind: 'sell', variety: 'mint', count: 15 }],
        quests: [
            { id: 'dispose3', label: '3 verfaulte Pflanzen entsorgen', kind: 'dispose', n: 3 },
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
        ],
        timeLimitMs: 8 * 60 * 1000,
        unlocks: ['trash'],
    },
    {
        id: 4,
        name: 'Aufrüsten',
        description: 'Upgrade deine Stationen mit [Q].',
        startMoney: 100,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
        ],
        allowedBuildTypes: ['bed', 'storage'],
        varieties: ['mint'],
        features: { upgrades: true, hiring: false, cashiers: false, trash: true },
        rotMultiplier: 1,
        goals: [
            { kind: 'upgrade', target: 'bed', level: 2 },
            { kind: 'sell', variety: 'mint', count: 20 },
        ],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'sat5', label: 'Zufriedenheit ≥ 5 am Ende', kind: 'satisfactionEnd', n: 5 },
        ],
        timeLimitMs: 9 * 60 * 1000,
        unlocks: [],
    },
    {
        id: 5,
        name: 'Verstärkung',
        description: 'Stelle deinen ersten Gärtner ein — er arbeitet für dich.',
        startMoney: 150,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'storage', gridX: 6, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage'],
        varieties: ['mint'],
        features: { upgrades: true, hiring: true, cashiers: false, trash: true },
        rotMultiplier: 1,
        goals: [
            { kind: 'hire', role: 'gardener' },
            { kind: 'sell', variety: 'mint', count: 25 },
        ],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'no_rot', label: 'Keine Pflanze verfaulen lassen', kind: 'noRotten' },
        ],
        timeLimitMs: 10 * 60 * 1000,
        unlocks: ['hiring'],
    },
    {
        id: 6,
        name: 'Doppelkasse',
        description: 'Mehr Kunden! Baue eine zweite Kasse und stelle einen Kassierer ein.',
        startMoney: 200,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'bed', gridX: 8, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'storage', gridX: 6, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage', 'register'],
        varieties: ['mint'],
        features: { upgrades: true, hiring: true, cashiers: true, trash: true },
        rotMultiplier: 1,
        goals: [
            { kind: 'build', type: 'register', count: 1 },
            { kind: 'hire', role: 'cashier' },
            { kind: 'sellTotal', count: 30 },
        ],
        quests: [
            { id: 'sat5', label: 'Zufriedenheit ≥ 5 am Ende', kind: 'satisfactionEnd', n: 5 },
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
        ],
        timeLimitMs: 12 * 60 * 1000,
        unlocks: [],
    },
    {
        id: 7,
        name: 'Neue Sorte',
        description: 'Haze ist da. Rüste ein Beet auf Tier 1 und baue das neue Terminal.',
        startMoney: 300,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'storage', gridX: 6, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage', 'register', 'terminal_haze'],
        varieties: ['mint', 'haze'],
        features: { upgrades: true, hiring: true, cashiers: true, trash: true },
        rotMultiplier: 1,
        goals: [{ kind: 'sell', variety: 'haze', count: 10 }],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'no_rot', label: 'Keine Pflanze verfaulen lassen', kind: 'noRotten' },
        ],
        timeLimitMs: 12 * 60 * 1000,
        unlocks: ['terminal_haze'],
    },
    {
        id: 8,
        name: 'Vollbetrieb',
        description: 'Kush kommt dazu. Halte die Kunden glücklich und verdiene 2000€.',
        startMoney: 400,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'terminal', variety: 'haze', gridX: 4, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'bed', gridX: 8, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'register', gridX: 3, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'storage', gridX: 6, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage', 'register', 'terminal_kush'],
        varieties: ['mint', 'haze', 'kush'],
        features: { upgrades: true, hiring: true, cashiers: true, trash: true },
        rotMultiplier: 1,
        goals: [{ kind: 'moneyEarned', amount: 2000 }],
        quests: [
            { id: 'sat7', label: 'Zufriedenheit ≥ 7 am Ende', kind: 'satisfactionEnd', n: 7 },
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
        ],
        timeLimitMs: 15 * 60 * 1000,
        unlocks: ['terminal_kush'],
    },
    {
        id: 9,
        name: 'Premium',
        description: 'Crystal — teuer im Einkauf, wertvoll im Verkauf.',
        startMoney: 600,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'terminal', variety: 'haze', gridX: 4, gridY: 0 },
            { type: 'terminal', variety: 'kush', gridX: 3, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'bed', gridX: 8, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'register', gridX: 3, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'storage', gridX: 6, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage', 'register', 'terminal_crystal'],
        varieties: ['mint', 'haze', 'kush', 'crystal'],
        features: { upgrades: true, hiring: true, cashiers: true, trash: true },
        rotMultiplier: 1,
        goals: [
            { kind: 'sell', variety: 'crystal', count: 15 },
            { kind: 'moneyEarned', amount: 5000 },
        ],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'sat7', label: 'Zufriedenheit ≥ 7 am Ende', kind: 'satisfactionEnd', n: 7 },
        ],
        timeLimitMs: 18 * 60 * 1000,
        unlocks: ['terminal_crystal'],
    },
    {
        id: 10,
        name: 'OG Imperium',
        description: 'Die Königsdisziplin. OG anbauen, das Imperium vollenden.',
        startMoney: 1000,
        prebuilt: [
            { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
            { type: 'terminal', variety: 'haze', gridX: 4, gridY: 0 },
            { type: 'terminal', variety: 'kush', gridX: 3, gridY: 0 },
            { type: 'terminal', variety: 'crystal', gridX: 2, gridY: 0 },
            { type: 'bed', gridX: 4, gridY: 4 },
            { type: 'bed', gridX: 6, gridY: 4 },
            { type: 'register', gridX: 5, gridY: 9 },
            { type: 'storage', gridX: 4, gridY: 9 },
            { type: 'trash', gridX: 11, gridY: 13 },
            { type: 'hiring', gridX: 9, gridY: 0 },
        ],
        allowedBuildTypes: ['bed', 'storage', 'register', 'terminal_og'],
        varieties: ['mint', 'haze', 'kush', 'crystal', 'og'],
        features: { upgrades: true, hiring: true, cashiers: true, trash: true },
        rotMultiplier: 1,
        goals: [
            { kind: 'sell', variety: 'og', count: 5 },
            { kind: 'moneyEarned', amount: 10000 },
        ],
        quests: [
            { id: 'no_rage', label: 'Kein Kunde geht wütend', kind: 'noRage' },
            { id: 'sat8', label: 'Zufriedenheit ≥ 8 am Ende', kind: 'satisfactionEnd', n: 8 },
        ],
        timeLimitMs: 25 * 60 * 1000,
        unlocks: ['terminal_og'],
    },
];

export function getLevel(id) {
    return LEVELS.find(l => l.id === id) || null;
}

// Freeplay: entspannter Endlos-Modus. Kein Ziel, keine Zeit, kein Verfaul-Stress.
// Start bei 99€ mit einem Mint-Terminal — alles andere baut man selbst auf.
// Wird freigeschaltet, sobald alle 10 Level abgeschlossen sind.
export const FREEPLAY = {
    id: 'freeplay',
    freeplay: true,
    name: 'Freeplay',
    description: 'Kein Ziel, keine Zeit. Bau dein Imperium in Ruhe auf.',
    startMoney: 99,
    prebuilt: [
        { type: 'terminal', variety: 'mint', gridX: 5, gridY: 0 },
    ],
    // Alles baubar
    allowedBuildTypes: [
        'bed', 'register', 'storage', 'hiring', 'trash',
        'terminal_haze', 'terminal_kush', 'terminal_crystal', 'terminal_og',
    ],
    varieties: ['mint', 'haze', 'kush', 'crystal', 'og'],
    features: { upgrades: true, hiring: true, cashiers: true, trash: true },
    rotMultiplier: 1.5, // etwas entspannter — Pflanzen halten länger
    goals: [],
    quests: [],
    timeLimitMs: null,
    unlocks: [],
};
