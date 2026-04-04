// game.js – Phaser Konfiguration & Start

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    LoginScene,
    MainMenuScene,
    HUDScene,
    SettingsScene,
    PlantationScene,
    LaundryScene,
    LabScene
  ]
};

const game = new Phaser.Game(config);

// Global registries accessible from all scenes
game.registry.set('economy', null);
game.registry.set('upgrades', null);
game.registry.set('audio', null);
game.registry.set('save', null);
game.registry.set('police', null);
