// Boot-Scene. Aktuell leer — später kommen hier Asset-Preloads rein
// (Sounds, Sprites falls wir mal welche brauchen).

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // noch nichts zu laden
    }

    create() {
        this.scene.start('Menu');
    }
}
