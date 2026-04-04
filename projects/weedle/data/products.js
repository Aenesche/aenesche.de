// data/products.js
const PRODUCTS_DATA = {
  seeds: {
    basic: {
      id: 'basic',
      name: 'Basic Samen',
      cost: 10,
      growTime: 30000,      // ms
      qualityBase: 1.0,
      yieldBase: 1,
      unlockLevel: 0
    },
    hybrid: {
      id: 'hybrid',
      name: 'Hybrid Samen',
      cost: 50,
      growTime: 45000,
      qualityBase: 2.0,
      yieldBase: 2,
      unlockLevel: 3
    },
    premium: {
      id: 'premium',
      name: 'Premium Samen',
      cost: 200,
      growTime: 60000,
      qualityBase: 4.0,
      yieldBase: 3,
      unlockLevel: 7
    }
  },
  soil: {
    cheap: {
      id: 'cheap',
      name: 'Billigerde',
      cost: 5,
      qualityMultiplier: 1.0,
      unlockLevel: 0
    },
    compost: {
      id: 'compost',
      name: 'Kompost',
      cost: 25,
      qualityMultiplier: 1.5,
      unlockLevel: 2
    },
    premium: {
      id: 'premium',
      name: 'Spezialsubstrat',
      cost: 100,
      qualityMultiplier: 2.5,
      unlockLevel: 5
    }
  },
  sellPricePerQuality: 15  // base sell price multiplied by quality
};
