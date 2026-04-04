// scenes/BootScene.js
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // --- Mobile Check ---
    const isMobile = window.innerWidth < 768 ||
      ('ontouchstart' in window) ||
      navigator.maxTouchPoints > 0;

    if (isMobile) {
      const overlay = document.getElementById('mobile-overlay');
      overlay.style.display = 'flex';
      document.getElementById('mobile-dismiss').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }

    // --- Loading Bar ---
    const loadingBar = document.getElementById('loading-bar-inner');
    this.load.on('progress', (value) => {
      loadingBar.style.width = `${value * 100}%`;
    });

    // --- Load Audio (graceful – files may not exist yet) ---
    // Lofi tracks
    const lofiTracks = ['lofi_01', 'lofi_02', 'lofi_03'];
    lofiTracks.forEach(key => {
      this.load.audio(key, [`assets/audio/lofi/${key}.mp3`]);
    });

    // SFX
    const sfxKeys = [
      'plant', 'water', 'harvest', 'upgrade',
      'cash_register', 'police_alert', 'police_close',
      'door_open', 'npc_idle', 'world_unlock'
    ];
    sfxKeys.forEach(key => {
      this.load.audio(key, [`assets/audio/sfx/${key}.mp3`]);
    });

    // --- Load Tilemaps (wenn vorhanden) ---
    // this.load.tilemapTiledJSON('plantation_map', 'assets/tilemaps/plantation.tmj');

    // --- Load Sprites (wenn vorhanden) ---
    // this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 24, frameHeight: 32 });

    // Don't fail on missing files
    this.load.on('loaderror', (file) => {
      console.warn(`[Boot] Datei nicht gefunden: ${file.key} (${file.src}) – wird übersprungen`);
    });
  }

  create() {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.transition = 'opacity 0.5s';
    loadingScreen.style.opacity = '0';
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);

    // --- Init Systems ---
    const economy = new EconomySystem();
    const upgrades = new UpgradeSystem(economy);
    const audio = new AudioSystem(this);
    const save = new SaveSystem();
    const police = new PoliceSystem(economy, upgrades);

    // Store in registry for cross-scene access
    this.game.registry.set('economy', economy);
    this.game.registry.set('upgrades', upgrades);
    this.game.registry.set('audio', audio);
    this.game.registry.set('save', save);
    this.game.registry.set('police', police);

    // Skip login for now, go to menu
    // To enable login: this.scene.start('LoginScene');
    this.scene.start('MainMenuScene');
  }
}
