// Einstiegspunkt. Phaser-Config + Scenes registrieren.

import { GAME } from './config/constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    backgroundColor: GAME.BG,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, MenuScene, LevelSelectScene, GameScene],
};

const game = new Phaser.Game(config);

// Mobile Browserleisten tauchen beim Scrollen auf/ab und ändern die sichtbare
// Höhe. visualViewport meldet das zuverlässiger als 'resize'.
const refit = () => game.scale.refresh();
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 200));
window.visualViewport?.addEventListener('resize', refit);
