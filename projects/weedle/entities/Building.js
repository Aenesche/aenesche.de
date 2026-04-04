// entities/Building.js
class Building {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.config = config;
    this.id = config.id || 'building';
    this.name = config.name || 'Gebäude';

    const width = config.width || 48;
    const height = config.height || 48;
    const color = config.color || 0x3f3f46;

    if (scene.textures.exists(config.texture)) {
      this.sprite = scene.physics.add.staticSprite(x, y, config.texture);
    } else {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x000000, 0.2);
      gfx.fillRoundedRect(3, 3, width, height, 6);
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(0, 0, width, height, 6);
      gfx.lineStyle(1.5, 0xffffff, 0.08);
      gfx.strokeRoundedRect(0, 0, width, height, 6);
      gfx.generateTexture(`building_${this.id}_ph`, width + 4, height + 4);
      gfx.destroy();
      this.sprite = scene.physics.add.staticSprite(x, y, `building_${this.id}_ph`);
    }
    this.sprite.setDepth(5);

    this.label = scene.add.text(x, y - height / 2 - 10, this.name, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#d4d4d8',
      backgroundColor: '#18181bcc', padding: { x: 5, y: 2 }
    }).setOrigin(0.5, 1).setDepth(11);

    this.prompt = scene.add.text(x, y + height / 2 + 6, '[E]', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#4ade80',
      backgroundColor: '#18181bcc', padding: { x: 6, y: 3 }
    }).setOrigin(0.5, 0).setDepth(11).setVisible(false);
  }

  showPrompt() { this.prompt.setVisible(true); }
  hidePrompt() { this.prompt.setVisible(false); }

  isNear(player, distance = 56) {
    return Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, this.sprite.x, this.sprite.y) < distance;
  }

  interact(player, systems) {}

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.prompt.destroy();
  }
}
