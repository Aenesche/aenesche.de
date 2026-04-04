// entities/Player.js
class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 160;

    // Create sprite – uses placeholder rectangle if sprite not loaded
    if (scene.textures.exists('player')) {
      this.sprite = scene.physics.add.sprite(x, y, 'player');
    } else {
      // Placeholder: green rectangle
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x4ade80, 1);
      gfx.fillRect(0, 0, 24, 32);
      gfx.generateTexture('player_placeholder', 24, 32);
      gfx.destroy();
      this.sprite = scene.physics.add.sprite(x, y, 'player_placeholder');
    }

    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Body size
    this.sprite.body.setSize(20, 24);
    this.sprite.body.setOffset(2, 8);

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Interaction key
    this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactCooldown = false;
  }

  update() {
    const body = this.sprite.body;
    body.setVelocity(0);

    // Horizontal
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      body.setVelocityX(-this.speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      body.setVelocityX(this.speed);
    }

    // Vertical
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      body.setVelocityY(-this.speed);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      body.setVelocityY(this.speed);
    }

    // Normalize diagonal movement
    body.velocity.normalize().scale(this.speed);
  }

  canInteract() {
    return Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.interactCooldown;
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  destroy() {
    this.sprite.destroy();
  }
}
