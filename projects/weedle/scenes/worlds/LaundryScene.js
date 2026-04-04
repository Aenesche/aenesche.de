// scenes/worlds/LaundryScene.js
class LaundryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LaundryScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.economy = this.game.registry.get('economy');
    this.upgrades = this.game.registry.get('upgrades');
    this.audio = this.game.registry.get('audio');
    this.worldId = 'laundry';

    this.cameras.main.setBackgroundColor('#0f172a');

    // Floor
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1e293b, 1);
    gfx.fillRect(0, 0, width, height);
    gfx.lineStyle(1, 0x334155, 0.3);
    for (let x = 0; x < width; x += 32) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 32) gfx.lineBetween(0, y, width, y);

    // Player
    this.player = new Player(this, width / 2, height / 2);

    // Laundry shops based on upgrade level
    this.shops = [];
    const laundryUpgrades = UPGRADES_DATA.laundry.businesses;
    const level = this.upgrades.getLevel(this.worldId, 'businesses');

    const shopPositions = [
      { x: 200, y: 200 }, { x: 400, y: 200 },
      { x: 200, y: 400 }, { x: 400, y: 400 }
    ];

    for (let i = 0; i <= Math.min(level, laundryUpgrades.length - 1); i++) {
      const pos = shopPositions[i];
      if (pos) {
        this.shops.push(new LaundryShop(this, pos.x, pos.y, laundryUpgrades[i]));
      }
    }

    // Upgrade button
    this.add.text(16, height - 16, '⬆️ Upgrades [U]', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#60a5fa',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(0, 1).setDepth(50).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showUpgrades());

    this.input.keyboard.on('keydown-U', () => this._showUpgrades());

    // Dirty money info
    this.dirtyInfo = this.add.text(width - 16, height - 16, '', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#f87171',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }, align: 'right'
    }).setOrigin(1, 1).setDepth(50);

    this.menuOpen = false;
    this.menuContainer = null;
  }

  update(time, delta) {
    if (this.menuOpen) return;

    this.player.update();

    // Update shops
    this.shops.forEach(shop => {
      const result = shop.update(delta);
      if (result && result.done) {
        const washResult = this.economy.washMoney('plantation', result.amount, result.fee);
        if (washResult) {
          this.audio.playSFX('cash_register');
          const hud = this.scene.get('HUDScene');
          if (hud) hud.showInfo(`💵 Gewaschen: €${Math.floor(washResult.washed)} (Gebühr: €${Math.floor(washResult.fee)})`);
        }
      }

      // Interaction
      if (shop.isNear(this.player)) {
        shop.showPrompt();
        if (this.player.canInteract()) {
          const interaction = shop.interact(this.player, { audio: this.audio });
          if (interaction.action === 'wash') {
            const dirty = this.economy.getDirty('plantation');
            if (dirty > 0) {
              shop.startWash(dirty, this.economy);
              this.audio.playSFX('door_open');
              const hud = this.scene.get('HUDScene');
              if (hud) hud.showInfo(`Waschvorgang gestartet...`);
            } else {
              const hud = this.scene.get('HUDScene');
              if (hud) hud.showInfo('Kein Schwarzgeld zum Waschen.');
            }
          } else if (interaction.action === 'washing') {
            const hud = this.scene.get('HUDScene');
            if (hud) hud.showInfo(`Wäscht... ${interaction.progress}%`);
          }
        }
      } else {
        shop.hidePrompt();
      }
    });

    // Dirty money display
    const dirty = this.economy.getDirty('plantation');
    this.dirtyInfo.setText(dirty > 0 ? `Schwarzgeld: $${Math.floor(dirty).toLocaleString('de-DE')}` : '');
  }

  _showUpgrades() {
    // Simplified upgrade view for laundry
    if (this.menuOpen) { this._closeMenu(); return; }
    this.menuOpen = true;

    const { width, height } = this.scale;
    this.menuContainer = this.add.container(0, 0).setDepth(80);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, width, height);
    this.menuContainer.add(bg);

    const pw = 400, ph = 260, px = width / 2, py = height / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 1);
    panel.lineStyle(2, 0x60a5fa);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    this.menuContainer.add(panel);

    this.menuContainer.add(this.add.text(px, py - ph / 2 + 20, '⬆️ Businesses', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#60a5fa', fontStyle: 'bold'
    }).setOrigin(0.5));

    let yOff = py - ph / 2 + 56;
    const next = this.upgrades.getNextUpgrade(this.worldId, 'businesses');
    const maxed = this.upgrades.isMaxed(this.worldId, 'businesses');
    const current = this.upgrades.getCurrentUpgrade(this.worldId, 'businesses');

    this.menuContainer.add(this.add.text(px - pw / 2 + 20, yOff,
      `Aktuell: ${current?.name || 'Keine'}`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#e0e0e0'
    }));
    yOff += 28;

    if (maxed) {
      this.menuContainer.add(this.add.text(px, yOff, '✓ Alle Businesses freigeschaltet', {
        fontSize: '13px', fontFamily: 'Courier New', color: '#4ade80'
      }).setOrigin(0.5));
    } else if (next) {
      const canBuy = this.upgrades.canBuy(this.worldId, 'businesses');
      const btn = this.add.text(px, yOff,
        `→ ${next.name} ($${next.cost}) – Gebühr: ${(next.effect.fee * 100).toFixed(0)}%`, {
        fontSize: '13px', fontFamily: 'Courier New',
        color: canBuy ? '#60a5fa' : '#555'
      }).setOrigin(0.5);

      if (canBuy) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.upgrades.buy(this.worldId, 'businesses');
          this.audio.playSFX('upgrade');
          this._closeMenu();
          this.scene.restart();
        });
      }
      this.menuContainer.add(btn);
    }

    const closeBtn = this.add.text(px, py + ph / 2 - 20, '[ Schließen – ESC ]', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closeMenu());
    this.menuContainer.add(closeBtn);
    this.input.keyboard.once('keydown-ESC', () => this._closeMenu());
  }

  _closeMenu() {
    if (this.menuContainer) { this.menuContainer.destroy(true); this.menuContainer = null; }
    this.menuOpen = false;
  }
}
