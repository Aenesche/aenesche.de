// systems/UpgradeSystem.js
class UpgradeSystem {
  constructor(economy) {
    this.economy = economy;

    // Track current upgrade levels per world per category
    // e.g. { plantation: { lamps: 0, greenhouse: 0, buyers: 0, security: 0, workers: 0 } }
    this.levels = {};

    for (const worldId of Object.keys(UPGRADES_DATA)) {
      this.levels[worldId] = {};
      for (const category of Object.keys(UPGRADES_DATA[worldId])) {
        this.levels[worldId][category] = 0;
      }
    }
  }

  getLevel(worldId, category) {
    return this.levels[worldId]?.[category] || 0;
  }

  getCurrentUpgrade(worldId, category) {
    const level = this.getLevel(worldId, category);
    const upgrades = UPGRADES_DATA[worldId]?.[category];
    if (!upgrades) return null;
    return upgrades[level] || upgrades[upgrades.length - 1];
  }

  getNextUpgrade(worldId, category) {
    const level = this.getLevel(worldId, category);
    const upgrades = UPGRADES_DATA[worldId]?.[category];
    if (!upgrades) return null;
    if (level >= upgrades.length - 1) return null; // maxed out
    return upgrades[level + 1];
  }

  isMaxed(worldId, category) {
    const upgrades = UPGRADES_DATA[worldId]?.[category];
    if (!upgrades) return true;
    return this.getLevel(worldId, category) >= upgrades.length - 1;
  }

  canBuy(worldId, category) {
    const next = this.getNextUpgrade(worldId, category);
    if (!next) return false;
    return this.economy.canAfford(worldId, next.cost);
  }

  buy(worldId, category) {
    const next = this.getNextUpgrade(worldId, category);
    if (!next) return false;
    if (!this.economy.spend(worldId, next.cost)) return false;

    this.levels[worldId][category]++;
    return next;
  }

  // Get aggregated effects for a world
  getEffects(worldId) {
    const effects = {};
    const worldUpgrades = UPGRADES_DATA[worldId];
    if (!worldUpgrades) return effects;

    for (const [category, upgrades] of Object.entries(worldUpgrades)) {
      const level = this.getLevel(worldId, category);
      const current = upgrades[level];
      if (current && current.effect) {
        Object.assign(effects, current.effect);
      }
    }
    return effects;
  }

  // Save / Load
  toJSON() {
    return this.levels;
  }

  fromJSON(data) {
    if (!data) return;
    for (const [worldId, categories] of Object.entries(data)) {
      if (this.levels[worldId]) {
        Object.assign(this.levels[worldId], categories);
      }
    }
  }
}
