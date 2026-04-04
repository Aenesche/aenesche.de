// systems/AudioSystem.js
class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.musicVolume = 0.4;
    this.sfxVolume = 0.8;
    this.musicEnabled = true;
    this.sfxEnabled = true;

    this.lofiTracks = ['lofi_01', 'lofi_02', 'lofi_03'];
    this.shuffledQueue = [];
    this.currentTrack = null;
    this.currentTrackKey = null;
  }

  // Shuffle array (Fisher-Yates)
  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  playLofi() {
    if (!this.musicEnabled) return;

    // Build queue if empty
    if (this.shuffledQueue.length === 0) {
      this.shuffledQueue = this._shuffle(this.lofiTracks);
    }

    const key = this.shuffledQueue.pop();

    // Check if audio key exists in cache
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[Audio] Track '${key}' nicht geladen – skip`);
      // Try next track or restart queue
      if (this.shuffledQueue.length > 0) {
        this.playLofi();
      }
      return;
    }

    // Stop current track
    if (this.currentTrack && this.currentTrack.isPlaying) {
      this.currentTrack.stop();
    }

    this.currentTrack = this.scene.sound.add(key, {
      volume: this.musicVolume,
      loop: false
    });

    this.currentTrackKey = key;
    this.currentTrack.play();

    // When track ends, play next
    this.currentTrack.once('complete', () => {
      this.playLofi();
    });
  }

  stopMusic() {
    if (this.currentTrack && this.currentTrack.isPlaying) {
      this.currentTrack.stop();
    }
  }

  playSFX(key) {
    if (!this.sfxEnabled) return;

    // Graceful fallback – no crash if file missing
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[Audio] SFX '${key}' nicht geladen – skip`);
      return;
    }

    this.scene.sound.play(key, { volume: this.sfxVolume });
  }

  setMusicVolume(v) {
    this.musicVolume = Phaser.Math.Clamp(v, 0, 1);
    if (this.currentTrack) {
      this.currentTrack.setVolume(this.musicVolume);
    }
  }

  setSFXVolume(v) {
    this.sfxVolume = Phaser.Math.Clamp(v, 0, 1);
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.playLofi();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  // Load settings from save
  applySettings(settings) {
    if (!settings) return;
    if (typeof settings.music === 'boolean') this.musicEnabled = settings.music;
    if (typeof settings.sfx === 'boolean') this.sfxEnabled = settings.sfx;
    if (typeof settings.musicVolume === 'number') this.setMusicVolume(settings.musicVolume);
    if (typeof settings.sfxVolume === 'number') this.setSFXVolume(settings.sfxVolume);
  }

  // Export for save
  getSettings() {
    return {
      music: this.musicEnabled,
      sfx: this.sfxEnabled,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume
    };
  }
}
