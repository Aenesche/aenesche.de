// data/balance.js – Alle Zahlenwerte zentral
const BALANCE = {
  // Startgeld pro Welt
  startingCash: {
    plantation: 100,
    laundry: 0,
    lab: 0
  },

  // Grow-Zeiten Multiplikatoren
  growTimeBase: 30000,       // ms für Basic Seed
  waterInterval: 10000,      // ms bis Pflanze austrocknet ohne Wasser
  waterBonus: 1.2,           // Geschwindigkeitsbonus bei rechtzeitigem Gießen

  // Verkauf
  sellPricePerQuality: 15,
  buyerCooldown: 5000,       // ms bis ein Buyer-Slot wieder frei ist
  maxBuyersBase: 1,

  // Polizei
  policeCheckInterval: 60000, // ms – wie oft Police-Check
  baseRiskPerHour: 0.01,      // 1% Basis pro Stunde
  raidPenalty: 'all_dirty',   // Verliert alles ungewaschene Geld
  minRiskThreshold: 0.005,    // Unter diesem Wert kein Check

  // Geldwäsche
  washCycleTime: 10000,       // ms pro Waschzyklus
  baseFeePercent: 0.30,       // 30% Gebühr Standard

  // Idle / Offline
  maxOfflineMinutes: 480,     // max 8h offline Produktion
  offlineEfficiency: 0.5,     // 50% Effizienz offline

  // Allgemein
  autoSaveInterval: 30000,    // ms
  tickRate: 1000              // ms – Game-Loop Tick
};
