// entities/buildings/GrowTent.js
class GrowTent extends Building {
  constructor(scene, x, y, slotIndex) {
    super(scene, x, y, {
      id: `growtent_${slotIndex}`,
      name: `Growbox ${slotIndex + 1}`,
      width: 64, height: 64, color: 0x1a3a25
    });
    this.slotIndex = slotIndex;
    this.state = 'empty';
    this.seed = null;
    this.soil = null;
    this.growProgress = 0;
    this.growTime = 0;
    this.needsWater = false;
    this.waterTimer = 0;

    this.statusText = scene.add.text(x, y - 4, '', { fontSize: '24px' }).setOrigin(0.5).setDepth(12);
    this.progressBar = scene.add.graphics().setDepth(12);
  }

  plant(seedData, soilData) {
    if (this.state !== 'empty') return false;
    this.seed = seedData; this.soil = soilData;
    this.state = 'growing'; this.growProgress = 0;
    this.growTime = seedData.growTime;
    this.needsWater = false; this.waterTimer = 0;
    this._updateStatus(); return true;
  }

  water() {
    if (!this.needsWater) return false;
    this.needsWater = false; this.waterTimer = 0;
    this._updateStatus(); return true;
  }

  harvest() {
    if (this.state !== 'ready') return null;
    const quality = this.seed.qualityBase * (this.soil?.qualityMultiplier || 1);
    const quantity = this.seed.yieldBase;
    const value = quality * quantity * PRODUCTS_DATA.sellPricePerQuality;
    this.state = 'empty'; this.seed = null; this.soil = null;
    this.growProgress = 0; this._updateStatus();
    return { quality, quantity, value };
  }

  update(delta, effects) {
    if (this.state === 'growing') {
      this.waterTimer += delta;
      if (this.waterTimer >= BALANCE.waterInterval && !this.needsWater) {
        this.needsWater = true; this._updateStatus();
      }
      if (this.needsWater && this.waterTimer >= BALANCE.waterInterval * 2) {
        this.state = 'dead'; this._updateStatus(); return;
      }
      const speedMult = effects.growSpeedMult || 1.0;
      const waterBonus = !this.needsWater ? BALANCE.waterBonus : 1.0;
      this.growProgress += delta * speedMult * waterBonus;
      if (this.growProgress >= this.growTime) {
        this.state = 'ready'; this._updateStatus();
      }
    }
    this._drawProgress();
  }

  _updateStatus() {
    const icons = { empty: '', growing: '🌱', ready: '🌿', dead: '💀' };
    let icon = icons[this.state] || '';
    if (this.needsWater && this.state === 'growing') icon = '💧';
    this.statusText.setText(icon);
  }

  _drawProgress() {
    this.progressBar.clear();
    if (this.state !== 'growing') return;
    const pct = Math.min(1, this.growProgress / this.growTime);
    const barW = 52, x = this.sprite.x - barW / 2, y = this.sprite.y + 38;
    this.progressBar.fillStyle(0x27272a, 0.8);
    this.progressBar.fillRoundedRect(x, y, barW, 6, 3);
    this.progressBar.fillStyle(this.needsWater ? 0xf87171 : 0x4ade80, 0.9);
    this.progressBar.fillRoundedRect(x, y, barW * pct, 6, 3);
  }

  getProgressPercent() {
    return this.growTime <= 0 ? 0 : Math.min(100, (this.growProgress / this.growTime) * 100);
  }

  interact(player, systems) {
    switch (this.state) {
      case 'empty': return { action: 'plant', slot: this };
      case 'growing':
        if (this.needsWater) { this.water(); systems.audio?.playSFX('water'); return { action: 'watered', slot: this }; }
        return { action: 'growing', progress: this.getProgressPercent() };
      case 'ready':
        const result = this.harvest(); systems.audio?.playSFX('harvest');
        return { action: 'harvest', result, slot: this };
      case 'dead':
        this.state = 'empty'; this.seed = null; this.soil = null;
        this.growProgress = 0; this._updateStatus();
        return { action: 'cleared', slot: this };
    }
  }

  destroy() { super.destroy(); this.statusText.destroy(); this.progressBar.destroy(); }
}
