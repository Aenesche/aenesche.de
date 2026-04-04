// entities/Building.js – Basisklasse für alle Gebäude
class Building {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.config = config;
    this.id = config.id || 'building';
    this.name = config.name || 'Gebäude';
    this.interactable = config.interactable !== false;

    // Visual
    const width = config.width || 48;
    const height = config.height || 48;
    const color = config.color || 0x666666;

    if (scene.textures.exists(config.texture)) {
      this.sprite = scene.physics.add.staticSprite(x, y, config.texture);
    } else {
      const gfx = scene.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, width, height);
      gfx.lineStyle(2, 0x888888);
      gfx.strokeRect(0, 0, width, height);
      gfx.generateTexture(`building_${this.id}_ph`, width, height);
      gfx.destroy();
      this.sprite = scene.physics.add.staticSprite(x, y, `building_${this.id}_ph`);
    }

    this.sprite.setDepth(5);

    // Label
    this.label = scene.add.text(x, y - height / 2 - 8, this.name, {
      fontSize: '9px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5, 1).setDepth(11);

    // Interaction prompt (hidden by default)
    this.prompt = scene.add.text(x, y + height / 2 + 4, '[E]', {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#4ade80',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0).setDepth(11).setVisible(false);
  }

  showPrompt() { this.prompt.setVisible(true); }
  hidePrompt() { this.prompt.setVisible(false); }

  isNear(player, distance = 56) {
    return Phaser.Math.Distance.Between(
      player.sprite.x, player.sprite.y,
      this.sprite.x, this.sprite.y
    ) < distance;
  }

  // Override in subclass
  interact(player, systems) {
    console.log(`Interact: ${this.name}`);
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.prompt.destroy();
  }
}
