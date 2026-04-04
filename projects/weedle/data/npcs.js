// data/npcs.js
const NPCS_DATA = {
  buyer: {
    id: 'buyer',
    name: 'Abnehmer',
    sprite: 'npc_buyer',
    dialogues: [
      'Yo, haste was dabei?',
      'Qualität stimmt, Bro.',
      'Nächste Woche brauch ich mehr.',
      'Die Ware geht weg wie nix.'
    ],
    world: 'plantation',
    role: 'buyer'
  },
  worker_water: {
    id: 'worker_water',
    name: 'Gießer',
    sprite: 'npc_worker',
    dialogues: [
      'Pflanzen sind versorgt, Chef.',
      'Läuft alles nach Plan.',
      'Die Kleinen wachsen gut.'
    ],
    world: 'plantation',
    role: 'worker'
  },
  laundry_clerk: {
    id: 'laundry_clerk',
    name: 'Kassierer',
    sprite: 'npc_clerk',
    dialogues: [
      'Willkommen im Blumenladen.',
      'Heute guter Umsatz.',
      'Alles sauber hier.'
    ],
    world: 'laundry',
    role: 'clerk'
  }
};
