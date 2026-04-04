// scenes/MainMenuScene.js
class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const economy = this.game.registry.get('economy');
    const audio = this.game.registry.get('audio');

    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Start lofi music
    audio.playLofi();

    // Title
    this.add.text(width / 2, 40, '🌿 WEED TYCOON', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#4ade80'
    }).setOrigin(0.5);

    this.add.text(width / 2, 68, 'Wähle eine Welt', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(0.5);

    // World cards
    const worlds = Object.values(WORLDS_DATA).sort((a, b) => a.order - b.order);
    const cardWidth = 240;
    const cardHeight = 140;
    const gap = 24;
    const totalWidth = worlds.length * cardWidth + (worlds.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    worlds.forEach((world, i) => {
      const x = startX + i * (cardWidth + gap);
      const y = height * 0.45;
      const unlocked = world.unlocked || economy.checkWorldUnlock(world.id);

      this._createWorldCard(x, y, cardWidth, cardHeight, world, unlocked);
    });

    // Settings button
    const settingsBtn = this.add.text(width - 20, 20, '⚙️ Settings', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerover', () => settingsBtn.setColor('#4ade80'));
    settingsBtn.on('pointerout', () => settingsBtn.setColor('#666'));
    settingsBtn.on('pointerdown', () => {
      this.scene.launch('SettingsScene');
      this.scene.pause();
    });

    // Controls hint
    this.add.text(width / 2, height - 30, 'WASD / Pfeiltasten = Bewegen  |  E = Interagieren', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#444'
    }).setOrigin(0.5);
  }

  _createWorldCard(x, y, w, h, world, unlocked) {
    const gfx = this.add.graphics();

    if (unlocked) {
      gfx.fillStyle(0x1a1a2e, 1);
      gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(world.currency.color).color);
    } else {
      gfx.fillStyle(0x111111, 1);
      gfx.lineStyle(2, 0x333333);
    }

    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    // World name
    const nameColor = unlocked ? world.currency.color : '#555';
    this.add.text(x, y - h / 2 + 20, world.name, {
      fontSize: '16px', fontFamily: 'Courier New', color: nameColor, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    const descColor = unlocked ? '#aaa' : '#444';
    this.add.text(x, y, unlocked ? world.description : '🔒 Gesperrt', {
      fontSize: '11px', fontFamily: 'Courier New', color: descColor,
      wordWrap: { width: w - 24 }, align: 'center'
    }).setOrigin(0.5);

    // Unlock requirement
    if (!unlocked && world.unlockRequirement) {
      const req = world.unlockRequirement;
      const reqText = req.condition === 'total_earned'
        ? `Verdiene ${req.value.toLocaleString('de-DE')}$ in ${WORLDS_DATA[req.world]?.name || req.world}`
        : `Wasche ${req.value.toLocaleString('de-DE')}€ in ${WORLDS_DATA[req.world]?.name || req.world}`;

      this.add.text(x, y + h / 2 - 16, reqText, {
        fontSize: '9px', fontFamily: 'Courier New', color: '#555'
      }).setOrigin(0.5);
    }

    if (unlocked) {
      // Clickable zone
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        gfx.clear();
        gfx.fillStyle(0x222244, 1);
        gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(world.currency.color).color);
        gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      });

      zone.on('pointerout', () => {
        gfx.clear();
        gfx.fillStyle(0x1a1a2e, 1);
        gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(world.currency.color).color);
        gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      });

      zone.on('pointerdown', () => {
        this.scene.start(world.scene);
        this.scene.launch('HUDScene', { worldId: world.id });
      });
    }
  }
}
