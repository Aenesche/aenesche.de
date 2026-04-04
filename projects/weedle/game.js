// game.js – Phaser Konfiguration & Start

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  backgroundColor: '#0f0f1a',
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
  dom: {
    createContainer: true
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

game.registry.set('economy', null);
game.registry.set('upgrades', null);
game.registry.set('audio', null);
game.registry.set('save', null);
game.registry.set('police', null);
