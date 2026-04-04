// scenes/SettingsScene.js
class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    const { width, height } = this.scale;
    const audio = this.game.registry.get('audio');

    // Dim background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, width, height);

    // Panel
    const panelW = 320;
    const panelH = 340;
    const px = width / 2;
    const py = height / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.lineStyle(2, 0x4ade80);
    panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 8);
    panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 8);

    // Title
    this.add.text(px, py - panelH / 2 + 24, '⚙️ Settings', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#4ade80', fontStyle: 'bold'
    }).setOrigin(0.5);

    let yOffset = py - panelH / 2 + 64;

    // --- Music Toggle ---
    const musicLabel = this.add.text(px - panelW / 2 + 24, yOffset, 'Musik', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#e0e0e0'
    });
    const musicToggle = this.add.text(px + panelW / 2 - 24, yOffset, audio.musicEnabled ? 'AN' : 'AUS', {
      fontSize: '14px', fontFamily: 'Courier New',
      color: audio.musicEnabled ? '#4ade80' : '#f87171', fontStyle: 'bold'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    musicToggle.on('pointerdown', () => {
      const enabled = audio.toggleMusic();
      musicToggle.setText(enabled ? 'AN' : 'AUS');
      musicToggle.setColor(enabled ? '#4ade80' : '#f87171');
    });

    yOffset += 32;

    // --- Music Volume ---
    this.add.text(px - panelW / 2 + 24, yOffset, 'Musik Lautstärke', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#999'
    });
    yOffset += 22;
    this._createSlider(px, yOffset, panelW - 60, audio.musicVolume, (val) => {
      audio.setMusicVolume(val);
    });

    yOffset += 40;

    // --- SFX Toggle ---
    this.add.text(px - panelW / 2 + 24, yOffset, 'Sound-Effekte', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#e0e0e0'
    });
    const sfxToggle = this.add.text(px + panelW / 2 - 24, yOffset, audio.sfxEnabled ? 'AN' : 'AUS', {
      fontSize: '14px', fontFamily: 'Courier New',
      color: audio.sfxEnabled ? '#4ade80' : '#f87171', fontStyle: 'bold'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    sfxToggle.on('pointerdown', () => {
      const enabled = audio.toggleSFX();
      sfxToggle.setText(enabled ? 'AN' : 'AUS');
      sfxToggle.setColor(enabled ? '#4ade80' : '#f87171');
    });

    yOffset += 32;

    // --- SFX Volume ---
    this.add.text(px - panelW / 2 + 24, yOffset, 'SFX Lautstärke', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#999'
    });
    yOffset += 22;
    this._createSlider(px, yOffset, panelW - 60, audio.sfxVolume, (val) => {
      audio.setSFXVolume(val);
    });

    yOffset += 50;

    // --- Close Button ---
    const closeBtn = this.add.text(px, yOffset, '[ Schließen ]', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#4ade80'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#22c55e'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#4ade80'));
    closeBtn.on('pointerdown', () => {
      this.scene.resume('MainMenuScene');
      this.scene.stop();
    });

    // ESC to close
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.resume('MainMenuScene');
      this.scene.stop();
    });
  }

  _createSlider(x, y, w, initialValue, onChange) {
    const leftX = x - w / 2;

    // Track
    const track = this.add.graphics();
    track.fillStyle(0x333333, 1);
    track.fillRoundedRect(leftX, y, w, 8, 4);

    // Fill
    const fill = this.add.graphics();
    this._drawFill(fill, leftX, y, w * initialValue, 8);

    // Handle
    const handleX = leftX + w * initialValue;
    const handle = this.add.circle(handleX, y + 4, 10, 0x4ade80).setInteractive({
      useHandCursor: true,
      draggable: true
    });

    this.input.setDraggable(handle);
    handle.on('drag', (pointer, dragX) => {
      const clampedX = Phaser.Math.Clamp(dragX, leftX, leftX + w);
      handle.x = clampedX;
      const val = (clampedX - leftX) / w;
      fill.clear();
      this._drawFill(fill, leftX, y, w * val, 8);
      onChange(val);
    });
  }

  _drawFill(gfx, x, y, w, h) {
    if (w <= 0) return;
    gfx.fillStyle(0x4ade80, 1);
    gfx.fillRoundedRect(x, y, Math.max(w, 4), h, 4);
  }
}
