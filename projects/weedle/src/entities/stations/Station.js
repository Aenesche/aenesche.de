// Basis für alle Stationen. Liefert:
//  - eigenes Graphics-Objekt (für individuelle Alpha-Steuerung)
//  - bounds-Rect für Occlusion-Checks
//  - Alpha-Lerp pro Frame
//
// Subklassen überschreiben drawSelf(g) und setzen this.bounds.
// drawSelf wird mit Iso-Pixelkoordinaten aufgerufen, x/y = top-corner des Boden-Tiles.

import { ISO, OCCLUSION } from '../../config/constants.js';
import { gridToIso } from '../../utils/iso.js';

export default class Station {
    constructor(scene, gridX, gridY) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;

        const pos = gridToIso(gridX, gridY, scene.originX, scene.originY);
        this.isoX = pos.x;
        this.isoY = pos.y;

        this.graphics = scene.add.graphics();
        // Iso-Depth wie zuvor: höhere Screen-Y = vorne
        this.graphics.setDepth(this.isoY + ISO.TILE_SIZE / 2);

        this.targetAlpha = 1;
        this.currentAlpha = 1;

        // Default-Bounds: 1 Tile, hoch geschätzt — Subklassen sollten das setzen
        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - 40,
            bottom: this.isoY + ISO.TILE_SIZE,
        };

        this.drawSelf(this.graphics);
    }

    // Override in Subklassen.
    drawSelf(g) {}

    getTiles() {
        return [{ x: this.gridX, y: this.gridY }];
    }

    // Player-Position in Screen-Pixeln. Wird von der Scene jedes Frame aufgerufen.
    updateOcclusion(playerX, playerY) {
        // Verdeckt = Player ist HINTER dem Objekt (kleinere screen-y)
        // UND seine X-Position liegt im Bounds-X-Bereich.
        const playerBehind = playerY < this.bounds.bottom - OCCLUSION.PLAYER_THRESHOLD;
        const playerInXRange = playerX > this.bounds.left && playerX < this.bounds.right;

        this.targetAlpha = (playerBehind && playerInXRange) ? OCCLUSION.ALPHA : 1;

        this.currentAlpha += (this.targetAlpha - this.currentAlpha) * OCCLUSION.LERP;
        this.graphics.setAlpha(this.currentAlpha);
    }

    // Wird von Player.updateOcclusion aufgerufen, um zu fragen:
    // "Bin ich hinter diesem Objekt?"
    occludesPlayerAt(playerX, playerY) {
        const playerInFront = playerY > this.bounds.bottom;
        const playerInXRange = playerX > this.bounds.left && playerX < this.bounds.right;
        // Player ist hinter Objekt wenn er IM X-Bereich UND vor dem Boden des Objekts ist
        return playerInXRange && !playerInFront && playerY < this.bounds.bottom - OCCLUSION.PLAYER_THRESHOLD;
    }
}
