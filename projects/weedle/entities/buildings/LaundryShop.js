// entities/buildings/LaundryShop.js
class LaundryShop extends Building {
  constructor(scene, x, y, shopData) {
    super(scene, x, y, {
      id: `laundry_${shopData.id}`,
      name: shopData.name,
      width: 56,
      height: 48,
      color: 0x3b82f6
    });

    this.shopData = shopData;
    this.washing = false;
    this.washProgress = 0;
  }

  startWash(dirtyAmount, economy) {
    if (this.washing) return false;
    if (economy.getDirty('plantation') < dirtyAmount) return false;

    this.washing = true;
    this.washProgress = 0;
    this._washAmount = Math.min(dirtyAmount, this.shopData.effect.washRate);
    return true;
  }

  update(delta) {
    if (!this.washing) return;

    this.washProgress += delta;
    if (this.washProgress >= BALANCE.washCycleTime) {
      this.washing = false;
      this.washProgress = 0;
      // Wash complete – handled by scene
      return { done: true, amount: this._washAmount, fee: this.shopData.effect.fee };
    }
    return null;
  }

  interact(player, systems) {
    if (this.washing) {
      const pct = ((this.washProgress / BALANCE.washCycleTime) * 100).toFixed(0);
      return { action: 'washing', progress: pct };
    }
    return { action: 'wash', shop: this };
  }
}
