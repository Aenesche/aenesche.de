// entities/Player.js
class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 180;

    const gfx = scene.add.graphics();
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(16, 40, 22, 8);
    gfx.fillStyle(0x4ade80, 1);
    gfx.fillRoundedRect(4, 10, 24, 26, 6);
    gfx.fillStyle(0xfcd34d, 1);
    gfx.fillCircle(16, 10, 9);
    gfx.fillStyle(0x1a1a2e, 1);
    gfx.fillCircle(13, 9, 2);
    gfx.fillCircle(19, 9, 2);
    gfx.generateTexture('player_modern', 32, 46);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, 'player_modern');
    this.sprite.setOrigin(0.5, 0.7);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.body.setSize(20, 16);
    this.sprite.body.setOffset(6, 24);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.touchEnabled = this._detectTouch();
    this.joystickActive = false;
    this.joystickVector = { x: 0, y: 0 };
    this.interactPressed = false;
    this.joystickBase = null;
    this.joystickThumb = null;
    this.interactButton = null;
    this.interactLabel = null;

    if (this.touchEnabled) this._createTouchControls();
  }

  _detectTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  _createTouchControls() {
    const scene = this.scene;
    const { width, height } = scene.scale;

    const baseX = 110, baseY = height - 130, baseRadius = 52;

    this.joystickBase = scene.add.graphics();
    this.joystickBase.lineStyle(2.5, 0xffffff, 0.12);
    this.joystickBase.fillStyle(0xffffff, 0.04);
    this.joystickBase.strokeCircle(baseX, baseY, baseRadius);
    this.joystickBase.fillCircle(baseX, baseY, baseRadius);
    this.joystickBase.lineStyle(1, 0xffffff, 0.06);
    this.joystickBase.lineBetween(baseX - baseRadius + 10, baseY, baseX + baseRadius - 10, baseY);
    this.joystickBase.lineBetween(baseX, baseY - baseRadius + 10, baseX, baseY + baseRadius - 10);
    this.joystickBase.setDepth(90).setScrollFactor(0);

    this.joystickThumb = scene.add.graphics();
    this.joystickThumb.fillStyle(0x4ade80, 0.45);
    this.joystickThumb.lineStyle(2, 0x4ade80, 0.6);
    this.joystickThumb.fillCircle(0, 0, 22);
    this.joystickThumb.strokeCircle(0, 0, 22);
    this.joystickThumb.setPosition(baseX, baseY);
    this.joystickThumb.setDepth(91).setScrollFactor(0);

    const joyZone = scene.add.zone(0, height * 0.4, width * 0.45, height * 0.6)
      .setOrigin(0, 0).setInteractive().setDepth(89).setScrollFactor(0);

    joyZone.on('pointerdown', (p) => {
      this.joystickActive = true;
      this._updateJoystick(p, baseX, baseY, baseRadius);
    });
    joyZone.on('pointermove', (p) => {
      if (this.joystickActive && p.isDown) this._updateJoystick(p, baseX, baseY, baseRadius);
    });
    joyZone.on('pointerup', () => {
      this.joystickActive = false;
      this.joystickVector = { x: 0, y: 0 };
      this.joystickThumb.setPosition(baseX, baseY);
    });

    const btnX = width - 90, btnY = height - 130, btnR = 34;
    this.interactButton = scene.add.graphics();
    this._drawInteractBtn(btnX, btnY, btnR, false);
    this.interactButton.setDepth(90).setScrollFactor(0);

    this.interactLabel = scene.add.text(btnX, btnY, 'E', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#4ade80', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);

    const btnZone = scene.add.zone(btnX, btnY, btnR * 2.2, btnR * 2.2)
      .setInteractive().setDepth(92).setScrollFactor(0);
    btnZone.on('pointerdown', () => {
      this.interactPressed = true;
      this.interactButton.clear();
      this._drawInteractBtn(btnX, btnY, btnR, true);
    });
    btnZone.on('pointerup', () => {
      this.interactButton.clear();
      this._drawInteractBtn(btnX, btnY, btnR, false);
    });
  }

  _drawInteractBtn(x, y, r, pressed) {
    this.interactButton.fillStyle(0x4ade80, pressed ? 0.5 : 0.15);
    this.interactButton.lineStyle(2.5, 0x4ade80, pressed ? 0.9 : 0.4);
    this.interactButton.fillCircle(x, y, r);
    this.interactButton.strokeCircle(x, y, r);
  }

  _updateJoystick(pointer, baseX, baseY, maxRadius) {
    const dx = pointer.x - baseX, dy = pointer.y - baseY;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius);
    const angle = Math.atan2(dy, dx);
    this.joystickThumb.setPosition(baseX + Math.cos(angle) * dist, baseY + Math.sin(angle) * dist);
    const strength = dist / maxRadius;
    this.joystickVector = { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
  }

  update() {
    const body = this.sprite.body;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    if (this.joystickActive) { vx = this.joystickVector.x; vy = this.joystickVector.y; }
    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      body.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);
    } else {
      body.setVelocity(0);
    }
  }

  canInteract() {
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) return true;
    if (this.interactPressed) { this.interactPressed = false; return true; }
    return false;
  }

  getPosition() { return { x: this.sprite.x, y: this.sprite.y }; }

  destroy() {
    this.sprite.destroy();
    if (this.joystickBase) this.joystickBase.destroy();
    if (this.joystickThumb) this.joystickThumb.destroy();
    if (this.interactButton) this.interactButton.destroy();
    if (this.interactLabel) this.interactLabel.destroy();
  }
}
