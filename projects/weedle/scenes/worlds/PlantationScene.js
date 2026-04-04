// scenes/worlds/PlantationScene.js
class PlantationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlantationScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Systems
    this.economy = this.game.registry.get('economy');
    this.upgrades = this.game.registry.get('upgrades');
    this.audio = this.game.registry.get('audio');
    this.police = this.game.registry.get('police');
    this.save = this.game.registry.get('save');

    this.worldId = 'plantation';

    // --- Background ---
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this._drawFloor();

    // --- Player ---
    this.player = new Player(this, width / 2, height / 2);

    // --- Grow Tents ---
    this.growTents = [];
    this._createGrowSlots();

    // --- Lamp (upgrade point) ---
    this.lamp = new Lamp(this, 120, 80);

    // --- Buyer NPC ---
    this.buyer = new NPC(this, width - 80, height / 2, NPCS_DATA.buyer);

    // --- Sell Zone ---
    this.sellZone = this.add.zone(width - 80, height / 2, 56, 56);
    this.physics.add.existing(this.sellZone, true);

    // --- Shop Button (bottom left) ---
    this.shopBtn = this.add.text(16, height - 16, '🛒 Shop [Q]', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#4ade80',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(0, 1).setDepth(50).setInteractive({ useHandCursor: true });

    this.shopBtn.on('pointerdown', () => this._openShop());
    this.input.keyboard.on('keydown-Q', () => this._openShop());

    // --- Upgrade Button ---
    this.upgradeBtn = this.add.text(16, height - 44, '⬆️ Upgrades [U]', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#fbbf24',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(0, 1).setDepth(50).setInteractive({ useHandCursor: true });

    this.upgradeBtn.on('pointerdown', () => this._openUpgradeMenu());
    this.input.keyboard.on('keydown-U', () => this._openUpgradeMenu());

    // --- Inventory ---
    this.inventory = {
      seeds: { type: null, count: 0 },
      soil: { type: null, count: 0 },
      harvest: { count: 0, totalValue: 0 }
    };

    // Inventory display
    this.invText = this.add.text(width - 16, height - 16, '', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#ccc',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }, align: 'right'
    }).setOrigin(1, 1).setDepth(50);

    // --- Police callback ---
    this.police.onRaid((worldId, lost) => {
      if (worldId === this.worldId) {
        this.audio.playSFX('police_alert');
        const hud = this.scene.get('HUDScene');
        if (hud) hud.showRaid(lost);
      }
    });

    // --- Menu overlay state ---
    this.menuOpen = false;
    this.menuContainer = null;

    // --- Game Tick ---
    this.tickAccumulator = 0;
  }

  update(time, delta) {
    if (this.menuOpen) return;

    this.player.update();
    this.buyer.update();

    // Update grow tents
    const effects = this.upgrades.getEffects(this.worldId);
    this.growTents.forEach(tent => tent.update(delta, effects));

    // Police tick
    this.police.update(this.worldId, delta);

    // --- Interaction proximity ---
    this.growTents.forEach(tent => {
      if (tent.isNear(this.player)) {
        tent.showPrompt();
        if (this.player.canInteract()) {
          this._handleTentInteraction(tent);
        }
      } else {
        tent.hidePrompt();
      }
    });

    // Lamp interaction
    if (this.lamp.isNear(this.player)) {
      this.lamp.showPrompt();
      if (this.player.canInteract()) this._openUpgradeMenu();
    } else {
      this.lamp.hidePrompt();
    }

    // Buyer / sell interaction
    if (this.buyer.isNear(this.player)) {
      if (this.player.canInteract()) this._sellHarvest();
    }

    // Update inventory display
    this._updateInvDisplay();
  }

  // --- Floor Grid ---
  _drawFloor() {
    const gfx = this.add.graphics();
    const { width, height } = this.scale;

    // Base floor
    gfx.fillStyle(0x16213e, 1);
    gfx.fillRect(0, 0, width, height);

    // Grid lines
    gfx.lineStyle(1, 0x1a2744, 0.5);
    for (let x = 0; x < width; x += 32) {
      gfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 32) {
      gfx.lineBetween(0, y, width, y);
    }

    // Grow zone highlight
    gfx.fillStyle(0x1a3a1a, 0.5);
    gfx.fillRect(200, 100, 500, 400);
    gfx.lineStyle(1, 0x2d5a27, 0.6);
    gfx.strokeRect(200, 100, 500, 400);

    gfx.setDepth(0);
  }

  // --- Create Grow Slots based on upgrade level ---
  _createGrowSlots() {
    // Clean up old
    this.growTents.forEach(t => t.destroy());
    this.growTents = [];

    const effects = this.upgrades.getEffects(this.worldId);
    const slots = effects.slots || 2;
    const cols = Math.min(slots, 4);
    const rows = Math.ceil(slots / cols);

    const startX = 280;
    const startY = 160;
    const gapX = 72;
    const gapY = 72;

    for (let i = 0; i < slots; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      this.growTents.push(new GrowTent(this, x, y, i));
    }
  }

  // --- Tent Interaction ---
  _handleTentInteraction(tent) {
    const result = tent.interact(this.player, {
      audio: this.audio,
      economy: this.economy
    });

    if (!result) return;
    const hud = this.scene.get('HUDScene');

    switch (result.action) {
      case 'plant':
        if (this.inventory.seeds.count > 0 && this.inventory.soil.count > 0) {
          const seedData = PRODUCTS_DATA.seeds[this.inventory.seeds.type];
          const soilData = PRODUCTS_DATA.soil[this.inventory.soil.type];
          if (tent.plant(seedData, soilData)) {
            this.inventory.seeds.count--;
            this.inventory.soil.count--;
            this.audio.playSFX('plant');
            if (hud) hud.showInfo('🌱 Gepflanzt!');
          }
        } else {
          if (hud) hud.showInfo('Kauf erst Samen und Erde im Shop [Q]');
        }
        break;

      case 'watered':
        if (hud) hud.showInfo('💧 Gegossen!');
        break;

      case 'harvest':
        this.inventory.harvest.count += result.result.quantity;
        this.inventory.harvest.totalValue += result.result.value;
        if (hud) hud.showInfo(`🌿 Geerntet! Wert: $${Math.floor(result.result.value)}`);
        break;

      case 'growing':
        if (hud) hud.showInfo(`Wächst... ${result.progress.toFixed(0)}%`);
        break;

      case 'cleared':
        if (hud) hud.showInfo('Growbox geleert.');
        break;
    }
  }

  // --- Sell ---
  _sellHarvest() {
    if (this.inventory.harvest.count <= 0) {
      const hud = this.scene.get('HUDScene');
      if (hud) hud.showInfo('Nichts zum Verkaufen.');
      return;
    }

    const value = this.inventory.harvest.totalValue;
    // Money from selling goes to dirty pile (needs washing)
    this.economy.earn(this.worldId, value, true);
    this.audio.playSFX('cash_register');

    const hud = this.scene.get('HUDScene');
    if (hud) hud.showInfo(`💰 Verkauft für $${Math.floor(value)} (Schwarzgeld)`);

    this.buyer.showDialogue();

    this.inventory.harvest.count = 0;
    this.inventory.harvest.totalValue = 0;
  }

  // --- Shop Menu ---
  _openShop() {
    if (this.menuOpen) { this._closeMenu(); return; }
    this.menuOpen = true;

    const { width, height } = this.scale;
    this.menuContainer = this.add.container(0, 0).setDepth(80);

    // Backdrop
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, width, height);
    this.menuContainer.add(bg);

    // Panel
    const pw = 400;
    const ph = 350;
    const px = width / 2;
    const py = height / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.lineStyle(2, 0x4ade80);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    this.menuContainer.add(panel);

    this.menuContainer.add(this.add.text(px, py - ph / 2 + 20, '🛒 Shop', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#4ade80', fontStyle: 'bold'
    }).setOrigin(0.5));

    let yOff = py - ph / 2 + 56;

    // Seeds
    this.menuContainer.add(this.add.text(px - pw / 2 + 20, yOff, '── Samen ──', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#888'
    }));
    yOff += 22;

    for (const [key, seed] of Object.entries(PRODUCTS_DATA.seeds)) {
      const canBuy = this.economy.canAfford(this.worldId, seed.cost);
      const btn = this.add.text(px - pw / 2 + 20, yOff,
        `${seed.name} – $${seed.cost}  [Qualität: ${seed.qualityBase}x]`, {
        fontSize: '12px', fontFamily: 'Courier New',
        color: canBuy ? '#e0e0e0' : '#555'
      });
      if (canBuy) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#4ade80'));
        btn.on('pointerout', () => btn.setColor('#e0e0e0'));
        btn.on('pointerdown', () => {
          if (this.economy.spend(this.worldId, seed.cost)) {
            this.inventory.seeds = { type: key, count: this.inventory.seeds.count + 1 };
            this.audio.playSFX('cash_register');
            this._closeMenu();
            const hud = this.scene.get('HUDScene');
            if (hud) hud.showInfo(`Gekauft: ${seed.name}`);
          }
        });
      }
      this.menuContainer.add(btn);
      yOff += 22;
    }

    yOff += 10;

    // Soil
    this.menuContainer.add(this.add.text(px - pw / 2 + 20, yOff, '── Erde ──', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#888'
    }));
    yOff += 22;

    for (const [key, soil] of Object.entries(PRODUCTS_DATA.soil)) {
      const canBuy = this.economy.canAfford(this.worldId, soil.cost);
      const btn = this.add.text(px - pw / 2 + 20, yOff,
        `${soil.name} – $${soil.cost}  [Qualität: ${soil.qualityMultiplier}x]`, {
        fontSize: '12px', fontFamily: 'Courier New',
        color: canBuy ? '#e0e0e0' : '#555'
      });
      if (canBuy) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#4ade80'));
        btn.on('pointerout', () => btn.setColor('#e0e0e0'));
        btn.on('pointerdown', () => {
          if (this.economy.spend(this.worldId, soil.cost)) {
            this.inventory.soil = { type: key, count: this.inventory.soil.count + 1 };
            this.audio.playSFX('cash_register');
            this._closeMenu();
            const hud = this.scene.get('HUDScene');
            if (hud) hud.showInfo(`Gekauft: ${soil.name}`);
          }
        });
      }
      this.menuContainer.add(btn);
      yOff += 22;
    }

    // Close
    const closeBtn = this.add.text(px, py + ph / 2 - 20, '[ Schließen – ESC ]', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closeMenu());
    this.menuContainer.add(closeBtn);

    this.input.keyboard.once('keydown-ESC', () => this._closeMenu());
  }

  // --- Upgrade Menu ---
  _openUpgradeMenu() {
    if (this.menuOpen) { this._closeMenu(); return; }
    this.menuOpen = true;

    const { width, height } = this.scale;
    this.menuContainer = this.add.container(0, 0).setDepth(80);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, width, height);
    this.menuContainer.add(bg);

    const pw = 440;
    const ph = 380;
    const px = width / 2;
    const py = height / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.lineStyle(2, 0xfbbf24);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 8);
    this.menuContainer.add(panel);

    this.menuContainer.add(this.add.text(px, py - ph / 2 + 20, '⬆️ Upgrades', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#fbbf24', fontStyle: 'bold'
    }).setOrigin(0.5));

    let yOff = py - ph / 2 + 56;
    const categories = Object.keys(UPGRADES_DATA[this.worldId] || {});

    categories.forEach(cat => {
      const current = this.upgrades.getCurrentUpgrade(this.worldId, cat);
      const next = this.upgrades.getNextUpgrade(this.worldId, cat);
      const maxed = this.upgrades.isMaxed(this.worldId, cat);

      // Category label
      const label = `${cat.toUpperCase()}: ${current?.name || '?'}`;
      this.menuContainer.add(this.add.text(px - pw / 2 + 20, yOff, label, {
        fontSize: '12px', fontFamily: 'Courier New', color: '#e0e0e0'
      }));

      if (maxed) {
        this.menuContainer.add(this.add.text(px + pw / 2 - 20, yOff, '✓ MAX', {
          fontSize: '12px', fontFamily: 'Courier New', color: '#4ade80'
        }).setOrigin(1, 0));
      } else if (next) {
        const canBuy = this.upgrades.canBuy(this.worldId, cat);
        const btn = this.add.text(px + pw / 2 - 20, yOff,
          `→ ${next.name} ($${next.cost})`, {
          fontSize: '12px', fontFamily: 'Courier New',
          color: canBuy ? '#fbbf24' : '#555'
        }).setOrigin(1, 0);

        if (canBuy) {
          btn.setInteractive({ useHandCursor: true });
          btn.on('pointerover', () => btn.setColor('#f59e0b'));
          btn.on('pointerout', () => btn.setColor('#fbbf24'));
          btn.on('pointerdown', () => {
            const bought = this.upgrades.buy(this.worldId, cat);
            if (bought) {
              this.audio.playSFX('upgrade');
              this._closeMenu();
              this._createGrowSlots(); // Refresh slots
              const hud = this.scene.get('HUDScene');
              if (hud) hud.showInfo(`⬆️ Upgrade: ${bought.name}`);
            }
          });
        }
        this.menuContainer.add(btn);
      }

      yOff += 28;
    });

    // Police risk info
    yOff += 10;
    const risk = this.police.getRiskPercent(this.worldId);
    this.menuContainer.add(this.add.text(px, yOff, `🚔 Aktuelles Risiko: ${risk}% pro Stunde`, {
      fontSize: '11px', fontFamily: 'Courier New', color: '#f87171'
    }).setOrigin(0.5));

    // Close
    const closeBtn = this.add.text(px, py + ph / 2 - 20, '[ Schließen – ESC ]', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closeMenu());
    this.menuContainer.add(closeBtn);

    this.input.keyboard.once('keydown-ESC', () => this._closeMenu());
  }

  _closeMenu() {
    if (this.menuContainer) {
      this.menuContainer.destroy(true);
      this.menuContainer = null;
    }
    this.menuOpen = false;
  }

  _updateInvDisplay() {
    const lines = [];
    if (this.inventory.seeds.count > 0) {
      lines.push(`🌱 ${this.inventory.seeds.count}x ${PRODUCTS_DATA.seeds[this.inventory.seeds.type]?.name || '?'}`);
    }
    if (this.inventory.soil.count > 0) {
      lines.push(`🪴 ${this.inventory.soil.count}x ${PRODUCTS_DATA.soil[this.inventory.soil.type]?.name || '?'}`);
    }
    if (this.inventory.harvest.count > 0) {
      lines.push(`🌿 ${this.inventory.harvest.count}x Ernte ($${Math.floor(this.inventory.harvest.totalValue)})`);
    }
    this.invText.setText(lines.join('\n'));
  }
}
