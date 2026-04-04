// scenes/worlds/LabScene.js
class LabScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LabScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.worldId = 'lab';

    this.cameras.main.setBackgroundColor('#0c0a09');

    // Floor
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1c1917, 1);
    gfx.fillRect(0, 0, width, height);
    gfx.lineStyle(1, 0x292524, 0.3);
    for (let x = 0; x < width; x += 32) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 32) gfx.lineBetween(0, y, width, y);

    // Player
    this.player = new Player(this, width / 2, height / 2);

    // Coming soon overlay
    this.add.text(width / 2, height * 0.35, '🧪 Das Labor', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#f59e0b', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, 'Coming Soon...', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#78716c'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.55, 'Höheres Risiko. Höherer Reward.\nGleiche Mechanik, neue Produkte.', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#57534e', align: 'center'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(width / 2, height * 0.7, '[ Zurück zum Menü ]', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#f59e0b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#fbbf24'));
    backBtn.on('pointerout', () => backBtn.setColor('#f59e0b'));
    backBtn.on('pointerdown', () => {
      this.scene.stop('HUDScene');
      this.scene.start('MainMenuScene');
    });
  }

  update() {
    this.player.update();
  }
}
