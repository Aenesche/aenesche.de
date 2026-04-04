// systems/PoliceSystem.js
class PoliceSystem {
  constructor(economy, upgrades) {
    this.economy = economy;
    this.upgrades = upgrades;
    this.lastCheckTime = Date.now();
    this.raidActive = false;
    this.raidCallback = null;  // set by scene
  }

  // Calculate current risk for a world
  getRisk(worldId) {
    const effects = this.upgrades.getEffects(worldId);
    const irHeat = effects.irHeat || 0;
    const riskReduction = effects.riskReduction || 0;

    // Base risk from IR heat
    let risk = BALANCE.baseRiskPerHour + irHeat;

    // Reduce by security upgrades
    risk *= (1 - riskReduction);

    return Math.max(risk, BALANCE.minRiskThreshold);
  }

  // Called on tick – checks if raid happens
  update(worldId, deltaMs) {
    if (this.raidActive) return;

    this.lastCheckTime += deltaMs;

    if (this.lastCheckTime >= BALANCE.policeCheckInterval) {
      this.lastCheckTime = 0;
      this._doCheck(worldId);
    }
  }

  _doCheck(worldId) {
    const risk = this.getRisk(worldId);

    // Scale risk to check interval
    const checkMinutes = BALANCE.policeCheckInterval / 60000;
    const scaledRisk = risk * (checkMinutes / 60);

    const roll = Math.random();
    if (roll < scaledRisk) {
      this._triggerRaid(worldId);
    }
  }

  _triggerRaid(worldId) {
    this.raidActive = true;
    const lost = this.economy.raidLoss(worldId);

    console.log(`[Polizei] RAZZIA in ${worldId}! Verlust: ${lost}`);

    if (this.raidCallback) {
      this.raidCallback(worldId, lost);
    }

    // Raid lasts 5 seconds then clears
    setTimeout(() => {
      this.raidActive = false;
    }, 5000);
  }

  getRiskPercent(worldId) {
    return (this.getRisk(worldId) * 100).toFixed(1);
  }

  onRaid(callback) {
    this.raidCallback = callback;
  }

  toJSON() {
    return { lastCheckTime: this.lastCheckTime };
  }

  fromJSON(data) {
    if (data && data.lastCheckTime) {
      this.lastCheckTime = data.lastCheckTime;
    }
  }
}
