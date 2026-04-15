// src/entities/stations/Station.js

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

    _playerOccludedBy(playerX, playerY) {
        const p = isoCenterToGrid(playerX, playerY, this.scene.originX, this.scene.originY);
        const dx = this.gridX - p.x;
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

    getInteraction() {
        return null;
    }
}
