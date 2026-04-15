// Basis für alle Stationen. Liefert:
//  - eigenes Graphics-Objekt (für individuelle Alpha-Steuerung)
//  - bounds-Rect für Occlusion-Checks
//  - Alpha-Lerp pro Frame
//
// Subklassen überschreiben drawSelf(g) und setzen this.bounds.
// drawSelf wird mit Iso-Pixelkoordinaten aufgerufen, x/y = top-corner des Boden-Tiles.

import { ISO, OCCLUSION } from '../../config/constants.js';
import { gridToIso, isoCenterToGrid } from '../../utils/iso.js';

export default class Station {
    constructor(scene, gridX, gridY) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;

        const pos = gridToIso(gridX, gridY, scene.originX, scene.originY);
        this.isoX = pos.x;
        this.isoY = pos.y;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(this.isoY + ISO.TILE_SIZE / 2);

        this.targetAlpha = 1;
        this.currentAlpha = 1;

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - 40,
            bottom: this.isoY + ISO.TILE_SIZE,
        };

        this.drawSelf(this.graphics);
    }

    drawSelf(g) {}

    getTiles() {
        return [{ x: this.gridX, y: this.gridY }];
    }

    // Occlusion in Grid-Space. Player ist "hinter" dem Objekt wenn
    // sein gridX UND gridY beide kleiner sind (näher zur Iso-Rückseite).
    // Das Window ist sehr eng: 0..0.6 Tiles in beide Richtungen.
    _playerOccludedBy(playerX, playerY) {
        const p = isoCenterToGrid(playerX, playerY, this.scene.originX, this.scene.originY);
        const dx = this.gridX - p.x; // >0 wenn Player links/oben vom Objekt
        const dy = this.gridY - p.y;
        const RANGE = 0.6;
        return dx > 0.05 && dx < RANGE && dy > 0.05 && dy < RANGE;
    }

    updateOcclusion(playerX, playerY) {
        const hidden = this._playerOccludedBy(playerX, playerY);
        this.targetAlpha = hidden ? OCCLUSION.ALPHA : 1;
        this.currentAlpha += (this.targetAlpha - this.currentAlpha) * OCCLUSION.LERP;
        this.graphics.setAlpha(this.currentAlpha);
    }

    occludesPlayerAt(playerX, playerY) {
        return this._playerOccludedBy(playerX, playerY);
    }
}
