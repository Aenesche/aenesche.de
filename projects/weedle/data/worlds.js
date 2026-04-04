// data/worlds.js
const WORLDS_DATA = {
  plantation: {
    id: 'plantation',
    name: 'Die Plantage',
    description: 'Bau deine erste Grow-Op auf. Samen kaufen, growen, ernten, verkaufen.',
    scene: 'PlantationScene',
    currency: { id: 'cash', name: 'Cash', symbol: '$', color: '#4ade80' },
    unlocked: true,
    unlockRequirement: null,
    order: 1,
    tileMap: 'plantation_map',
    music: 'lofi'
  },
  laundry: {
    id: 'laundry',
    name: 'Geldwäsche',
    description: 'Wasch dein Schwarzgeld über Frontbusinesses.',
    scene: 'LaundryScene',
    currency: { id: 'clean_cash', name: 'Sauberes Geld', symbol: '€', color: '#60a5fa' },
    unlocked: false,
    unlockRequirement: { world: 'plantation', condition: 'total_earned', value: 50000 },
    order: 2,
    tileMap: 'laundry_map',
    music: 'lofi'
  },
  lab: {
    id: 'lab',
    name: 'Das Labor',
    description: 'Höheres Risiko, höherer Reward. Nicht für Anfänger.',
    scene: 'LabScene',
    currency: { id: 'crypto', name: 'Crypto', symbol: '₿', color: '#f59e0b' },
    unlocked: false,
    unlockRequirement: { world: 'laundry', condition: 'total_washed', value: 100000 },
    order: 3,
    tileMap: 'lab_map',
    music: 'lofi'
  }
};
