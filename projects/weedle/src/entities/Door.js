// Visuell: zwei cyane Posten links und rechts vom Tür-Tile, dazwischen eine Lücke.
// Sitzt auf der vorderen rechten Wand (right→bottom). Kollisions-relevant: gar nicht,
// weil die Wand im CollisionGrid eh nicht existiert (nur die Außengrenze blockiert,
// und dort lassen wir die Tür-X-Koordinate offen via Spawn-Logik im CustomerManager).

import { COLORS, ISO, DOOR, WALLS } from '../config/constants.js';
import { gridToIso } from '../utils/iso.js';

export default class Door {
    constructor(scene) {
        this.scene = scene;
        this.gridX = DOOR.GRID_X;
        this.gridY = ISO.GRID_SIZE; // an der vorderen Kante

        // Zwei Posten als Türrahmen
        const left  = gridToIso(this.gridX, this.gridY, scene.originX, scene.originY);
        const right = gridToIso(this.gridX + 1, this.gridY, scene.originX, scene.originY);

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(99999); // wie Vorderwand-Bereich
        this.left = left;
        this.right = right;

        this.draw();
    }

    // Wird pro Frame neu aufgebaut. Ein einmalig geschriebener Befehlspuffer
    // verliert in Phaser sporadisch Geometrie (siehe Station.js) — bei den
    // paar Linien hier ist der Neuaufbau billiger als jede Textur.
    draw() {
        const g = this.graphics;
        const { left, right } = this;
        const h = WALLS.FRONT_HEIGHT + 10; // bisschen höher als die Wand

        g.clear();

        // Türrahmen: zwei Posten + oberer Bogen
        g.lineStyle(2, COLORS.DOOR, 1);
        g.beginPath(); g.moveTo(left.x, left.y); g.lineTo(left.x, left.y - h); g.strokePath();
        g.beginPath(); g.moveTo(right.x, right.y); g.lineTo(right.x, right.y - h); g.strokePath();
        g.beginPath(); g.moveTo(left.x, left.y - h); g.lineTo(right.x, right.y - h); g.strokePath();

        // Roter "Laser"-Vorhang in der Mitte
        g.lineStyle(1, 0xff0000, 0.7);
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const px = left.x + (right.x - left.x) * t;
            const py = left.y + (right.y - left.y) * t;
            g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - h * 0.7); g.strokePath();
        }
    }

    getSpawnTile() {
        // Direkt drinnen vor der Tür
        return { x: this.gridX, y: this.gridY - 1 };
    }
}
