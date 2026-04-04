// scenes/HUDScene.js
class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data) {
    this.worldId = data.worldId || 'plantation';
  }

  create() {
    const economy = this.game.registry.get('economy');
    const police = this.game.registry.get('police');
    const world = WORLDS_DATA[this.worldId];

    // --- Top Bar Background ---
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.7);
    bar.fillRect(0, 0, this.scale.width, 36);
    bar.setScrollFactor(0).setDepth(100);

    // --- Cash Display ---
    this.cashText = this.add.text(16, 8, '', {
      fontSize: '14px', fontFamily: 'Courier New', color: world.currency.color, fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(101);

    // --- Dirty Money (plantation only) ---
    this.dirtyText = this.add.text(200, 8, '', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#f87171'
    }).setScrollFactor(0).setDepth(101);

    // --- Police Risk ---
    this.riskText = this.add.text(400, 8, '', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#fbbf24'
    }).setScrollFactor(0).setDepth(101);

    // --- World Name ---
    this.add.text(this.scale.width - 16, 8, world.name, {
      fontSize: '11px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // --- Back Button ---
    const backBtn = this.add.text(this.scale.width - 16, 22, '[ Menü ]', {
      fontSize: '10px', fontFamily: 'Courier New', color: '#555'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#4ade80'));
    backBtn.on('pointerout', () => backBtn.setColor('#555'));
    backBtn.on('pointerdown', () => {
      this.scene.stop(WORLDS_DATA[this.worldId].scene);
      this.scene.stop('HUDScene');
      this.scene.start('MainMenuScene');
    });

    // --- Bottom Info Bar ---
    this.infoText = this.add.text(this.scale.width / 2, this.scale.height - 12, '', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#4ade80',
      backgroundColor: '#000000aa', padding: { x: 8, y: 3 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(101);

    this.infoTimer = null;

    // --- Raid Overlay ---
    this.raidOverlay = this.add.graphics();
    this.raidOverlay.setScrollFactor(0).setDepth(200).setVisible(false);

    this.raidText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
      fontSize: '24px', fontFamily: 'Courier New', color: '#f87171',
      fontStyle: 'bold', align: 'center',
      backgroundColor: '#000000dd', padding: { x: 20, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  update() {
    const economy = this.game.registry.get('economy');
    const police = this.game.registry.get('police');
    const world = WORLDS_DATA[this.worldId];

    // Cash
    const cash = economy.getCash(this.worldId);
    this.cashText.setText(`${world.currency.symbol} ${Math.floor(cash).toLocaleString('de-DE')}`);

    // Dirty money
    const dirty = economy.getDirty(this.worldId);
    if (dirty > 0) {
      this.dirtyText.setText(`💰 Schwarz: $${Math.floor(dirty).toLocaleString('de-DE')}`);
    } else {
      this.dirtyText.setText('');
    }

    // Police risk
    if (this.worldId === 'plantation' || this.worldId === 'lab') {
      const risk = police.getRiskPercent(this.worldId);
      this.riskText.setText(`🚔 Risiko: ${risk}%`);
    } else {
      this.riskText.setText('');
    }
  }

  showInfo(text, duration = 3000) {
    this.infoText.setText(text);
    if (this.infoTimer) this.infoTimer.destroy();
    this.infoTimer = this.time.delayedCall(duration, () => {
      this.infoText.setText('');
    });
  }

  showRaid(lostAmount) {
    this.raidOverlay.clear();
    this.raidOverlay.fillStyle(0xff0000, 0.15);
    this.raidOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.raidOverlay.setVisible(true);

    this.raidText.setText(`🚨 RAZZIA! 🚨\n-$${Math.floor(lostAmount).toLocaleString('de-DE')}`);
    this.raidText.setVisible(true);

    this.time.delayedCall(4000, () => {
      this.raidOverlay.setVisible(false);
      this.raidText.setVisible(false);
    });
  }
}
