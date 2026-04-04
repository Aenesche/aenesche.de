// entities/buildings/GrowTent.js
class GrowTent extends Building {
  constructor(scene, x, y, slotIndex) {
    super(scene, x, y, {
      id: `growtent_${slotIndex}`,
      name: `Growbox ${slotIndex + 1}`,
      width: 48,
      height: 48,
      color: 0x2d5a27
    });

    this.slotIndex = slotIndex;
    this.state = 'empty'; // empty, planted, growing, watered, ready, dead
    this.seed = null;
    this.soil = null;
    this.growProgress = 0;
    this.growTime = 0;
    this.needsWater = false;
    this.waterTimer = 0;

    // Status indicator
    this.statusText = scene.add.text(x, y, '', {
      fontSize: '16px',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(12);
  }

  plant(seedData, soilData) {
    if (this.state !== 'empty') return false;

    this.seed = seedData;
    this.soil = soilData;
    this.state = 'growing';
    this.growProgress = 0;
    this.growTime = seedData.growTime;
    this.needsWater = false;
    this.waterTimer = 0;

    this._updateStatus();
    return true;
  }

  water() {
    if (!this.needsWater) return false;
    this.needsWater = false;
    this.waterTimer = 0;
    this._updateStatus();
    return true;
  }

  harvest() {
    if (this.state !== 'ready') return null;

    const quality = this.seed.qualityBase * (this.soil?.qualityMultiplier || 1);
    const quantity = this.seed.yieldBase;
    const value = quality * quantity * PRODUCTS_DATA.sellPricePerQuality;

    this.state = 'empty';
    this.seed = null;
    this.soil = null;
    this.growProgress = 0;
    this._updateStatus();

    return { quality, quantity, value };
  }

  update(delta, effects) {
    if (this.state === 'growing') {
      // Check water
      this.waterTimer += delta;
      if (this.waterTimer >= BALANCE.waterInterval && !this.needsWater) {
        this.needsWater = true;
        this._updateStatus();
      }

      // If needs water and not watered, plant dies after 2x interval
      if (this.needsWater && this.waterTimer >= BALANCE.waterInterval * 2) {
        this.state = 'dead';
        this._updateStatus();
        return;
      }

      // Grow progress
      const speedMult = effects.growSpeedMult || 1.0;
      const waterBonus = !this.needsWater ? BALANCE.waterBonus : 1.0;
      this.growProgress += delta * speedMult * waterBonus;

      if (this.growProgress >= this.growTime) {
        this.state = 'ready';
        this._updateStatus();
      }
    }
  }

  _updateStatus() {
    const icons = {
      empty: '',
      growing: '🌱',
      ready: '🌿',
      dead: '💀'
    };
    let icon = icons[this.state] || '';
    if (this.needsWater && this.state === 'growing') icon = '💧';
    this.statusText.setText(icon);
  }

  getProgressPercent() {
    if (this.growTime <= 0) return 0;
    return Math.min(100, (this.growProgress / this.growTime) * 100);
  }

  interact(player, systems) {
    switch (this.state) {
      case 'empty':
        // Open plant menu (handled by scene)
        return { action: 'plant', slot: this };
      case 'growing':
        if (this.needsWater) {
          this.water();
          systems.audio?.playSFX('water');
          return { action: 'watered', slot: this };
        }
        return { action: 'growing', progress: this.getProgressPercent() };
      case 'ready':
        const result = this.harvest();
        systems.audio?.playSFX('harvest');
        return { action: 'harvest', result, slot: this };
      case 'dead':
        this.state = 'empty';
        this.seed = null;
        this.soil = null;
        this.growProgress = 0;
        this._updateStatus();
        return { action: 'cleared', slot: this };
    }
  }

  destroy() {
    super.destroy();
    this.statusText.destroy();
  }
}
