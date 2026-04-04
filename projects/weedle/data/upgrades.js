// data/upgrades.js
const UPGRADES_DATA = {
  plantation: {
    lamps: [
      { id: 'lamp_100w', name: '100W Lampe', cost: 50, effect: { growSpeedMult: 1.0, irHeat: 0.02 }, level: 0 },
      { id: 'lamp_250w', name: '250W HPS', cost: 200, effect: { growSpeedMult: 1.3, irHeat: 0.05 }, level: 1 },
      { id: 'lamp_400w', name: '400W HPS', cost: 500, effect: { growSpeedMult: 1.6, irHeat: 0.08 }, level: 2 },
      { id: 'lamp_led', name: 'LED Full Spectrum', cost: 1500, effect: { growSpeedMult: 2.0, irHeat: 0.03 }, level: 3 }
    ],
    greenhouse: [
      { id: 'gh_basic', name: 'Grundausbau', cost: 100, effect: { slots: 2 }, level: 0 },
      { id: 'gh_medium', name: 'Erweiterung', cost: 500, effect: { slots: 4 }, level: 1 },
      { id: 'gh_large', name: 'Großanlage', cost: 2000, effect: { slots: 8 }, level: 2 },
      { id: 'gh_industrial', name: 'Industriell', cost: 8000, effect: { slots: 16 }, level: 3 }
    ],
    buyers: [
      { id: 'buyer_1', name: 'Stammkunde', cost: 0, effect: { buyerSlots: 1 }, level: 0 },
      { id: 'buyer_2', name: 'Zweiter Abnehmer', cost: 300, effect: { buyerSlots: 2 }, level: 1 },
      { id: 'buyer_3', name: 'Dealer-Netzwerk', cost: 1000, effect: { buyerSlots: 5 }, level: 2 },
      { id: 'buyer_4', name: 'Großhandel', cost: 5000, effect: { buyerSlots: 10 }, level: 3 }
    ],
    security: [
      { id: 'sec_none', name: 'Keine Absicherung', cost: 0, effect: { riskReduction: 0 }, level: 0 },
      { id: 'sec_foil', name: 'IR-Abschirmfolie', cost: 400, effect: { riskReduction: 0.3 }, level: 1 },
      { id: 'sec_bribe', name: 'Bestechung', cost: 1500, effect: { riskReduction: 0.5 }, level: 2 },
      { id: 'sec_bunker', name: 'Untergrund-Bunker', cost: 5000, effect: { riskReduction: 0.8 }, level: 3 }
    ],
    workers: [
      { id: 'worker_0', name: 'Selber machen', cost: 0, effect: { autoHarvest: false, autoWater: false, autoPlant: false }, level: 0 },
      { id: 'worker_1', name: 'Gießer', cost: 800, effect: { autoWater: true }, level: 1 },
      { id: 'worker_2', name: 'Erntehelfer', cost: 2000, effect: { autoWater: true, autoHarvest: true }, level: 2 },
      { id: 'worker_3', name: 'Vollautomatik', cost: 6000, effect: { autoWater: true, autoHarvest: true, autoPlant: true }, level: 3 }
    ]
  },
  laundry: {
    businesses: [
      { id: 'biz_flower', name: 'Blumenladen', cost: 1000, effect: { washRate: 100, fee: 0.30 }, level: 0 },
      { id: 'biz_cafe', name: 'Café', cost: 5000, effect: { washRate: 300, fee: 0.25 }, level: 1 },
      { id: 'biz_salon', name: 'Friseur', cost: 15000, effect: { washRate: 800, fee: 0.20 }, level: 2 },
      { id: 'biz_car', name: 'Autowaschanlage', cost: 50000, effect: { washRate: 2000, fee: 0.15 }, level: 3 }
    ]
  },
  lab: {
    equipment: [
      { id: 'equip_basic', name: 'Grundausstattung', cost: 5000, effect: { productionRate: 1, riskMult: 1.0 }, level: 0 },
      { id: 'equip_pro', name: 'Profi-Setup', cost: 20000, effect: { productionRate: 3, riskMult: 1.5 }, level: 1 },
      { id: 'equip_industrial', name: 'Industrielabor', cost: 80000, effect: { productionRate: 10, riskMult: 2.0 }, level: 2 }
    ]
  }
};
