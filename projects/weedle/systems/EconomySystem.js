// systems/EconomySystem.js
class EconomySystem {
  constructor() {
    // Per-world currencies
    this.wallets = {};
    this.stats = {};

    // Initialize wallets for each world
    for (const [worldId, world] of Object.entries(WORLDS_DATA)) {
      this.wallets[worldId] = {
        amount: BALANCE.startingCash[worldId] || 0,
        dirty: 0,   // ungewaschenes Geld (nur relevant für plantation)
        clean: 0     // gewaschenes Geld
      };
      this.stats[worldId] = {
        totalEarned: 0,
        totalSpent: 0,
        totalWashed: 0,
        totalLostToRaid: 0
      };
    }
  }

  // --- Basic Wallet Ops ---

  getCash(worldId) {
    return this.wallets[worldId]?.amount || 0;
  }

  getDirty(worldId) {
    return this.wallets[worldId]?.dirty || 0;
  }

  getClean(worldId) {
    return this.wallets[worldId]?.clean || 0;
  }

  canAfford(worldId, cost) {
    return this.getCash(worldId) >= cost;
  }

  spend(worldId, amount) {
    if (!this.canAfford(worldId, amount)) return false;
    this.wallets[worldId].amount -= amount;
    this.stats[worldId].totalSpent += amount;
    return true;
  }

  earn(worldId, amount, isDirty = false) {
    if (isDirty) {
      this.wallets[worldId].dirty += amount;
    } else {
      this.wallets[worldId].amount += amount;
    }
    this.stats[worldId].totalEarned += amount;
  }

  // --- Geldwäsche ---

  washMoney(fromWorld, amount, feePercent) {
    const wallet = this.wallets[fromWorld];
    if (!wallet || wallet.dirty < amount) return false;

    const fee = amount * feePercent;
    const cleanAmount = amount - fee;

    wallet.dirty -= amount;
    wallet.clean += cleanAmount;
    wallet.amount += cleanAmount; // Clean money is usable
    this.stats[fromWorld].totalWashed += cleanAmount;

    return { washed: cleanAmount, fee: fee };
  }

  // --- Razzia ---

  raidLoss(worldId) {
    const wallet = this.wallets[worldId];
    const lost = wallet.dirty + (wallet.amount - wallet.clean);
    wallet.dirty = 0;
    wallet.amount = wallet.clean; // Nur gewaschenes Geld bleibt
    this.stats[worldId].totalLostToRaid += lost;
    return lost;
  }

  // --- World Unlock Check ---

  checkWorldUnlock(worldId) {
    const world = WORLDS_DATA[worldId];
    if (!world || !world.unlockRequirement) return true;
    if (world.unlocked) return true;

    const req = world.unlockRequirement;
    const stats = this.stats[req.world];
    if (!stats) return false;

    switch (req.condition) {
      case 'total_earned': return stats.totalEarned >= req.value;
      case 'total_washed': return stats.totalWashed >= req.value;
      default: return false;
    }
  }

  // --- Save / Load ---

  toJSON() {
    return { wallets: this.wallets, stats: this.stats };
  }

  fromJSON(data) {
    if (!data) return;
    if (data.wallets) {
      for (const [k, v] of Object.entries(data.wallets)) {
        if (this.wallets[k]) Object.assign(this.wallets[k], v);
      }
    }
    if (data.stats) {
      for (const [k, v] of Object.entries(data.stats)) {
        if (this.stats[k]) Object.assign(this.stats[k], v);
      }
    }
  }

  // --- Display Helpers ---

  formatCash(worldId, amount) {
    const world = WORLDS_DATA[worldId];
    if (!world) return `$${amount}`;
    return `${world.currency.symbol}${Math.floor(amount).toLocaleString('de-DE')}`;
  }
}
