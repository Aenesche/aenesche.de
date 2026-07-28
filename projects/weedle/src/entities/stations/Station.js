// src/entities/stations/Station.js
//
// Basisklasse aller Stationen.
//
// ── Warum Stationen als Textur gerendert werden ──
// Phaser baut ein Graphics-Objekt jeden Frame aus seinem Befehlspuffer neu in
// die WebGL-Batch. Objekte, deren Puffer EINMAL geschrieben und nie wieder
// angefasst wird, verlieren dabei sporadisch Geometrie — je nachdem, wie voll
// die Batch gerade ist. Genau diese Elemente waren betroffen (Boden, Stations-
// würfel, Wände); alles, was pro Frame neu gezeichnet wird (BuildSlot,
// PieTimer, Figuren), war nie betroffen. Beim Boden hat die Umstellung auf
// eine Textur das Problem dauerhaft behoben.
//
// ── Warum das kaum Speicher kostet ──
// Alle Stationen desselben Typs sehen identisch aus. Die Textur wird deshalb
// EINMAL PRO TYP+VARIANTE erzeugt und von allen Instanzen geteilt: acht Beete
// teilen sich eine Textur. Für ein komplettes Freeplay-Imperium sind das rund
// ein Dutzend kleine Texturen statt einer pro Station.
//
// Animierte Stationen (BuildSlot) setzen `this.cacheToTexture = false`.

import { ISO, OCCLUSION } from '../../config/constants.js';
import { gridToIso, isoCenterToGrid } from '../../utils/iso.js';

// Bereich um die Station, den die Textur abdecken muss
const PAD_X = ISO.TILE_SIZE + 10;
const PAD_TOP = 100;
const PAD_BOTTOM = ISO.TILE_SIZE + 40;

export default class Station {
    constructor(scene, gridX, gridY) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;

        const pos = gridToIso(gridX, gridY, scene.originX, scene.originY);
        this.isoX = pos.x;
        this.isoY = pos.y;

        this.cacheToTexture = true;
        this._bakedKey = null;

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
        this.upgradeLevel = 0;
    }

    drawSelf(g) {}

    // Was sich derzeit sichtbar zeigt (Bild oder noch die Live-Graphics)
    get display() {
        return this.image || this.graphics;
    }

    // Alles, was das Aussehen verändert, gehört in diesen Schlüssel.
    // Gleiche Kennung = gleiche Textur = wird geteilt.
    textureKey() {
        const parts = [
            this.constructor.name,
            this.upgradeLevel ?? 0,
            this.tier ?? 0,
            this.variety?.id ?? '-',
        ];
        return `stationTex:${parts.join(':')}`;
    }

    // Nach sichtbaren Änderungen (z.B. Upgrade) aufrufen
    invalidateCache() {
        this._bakedKey = null;
    }

    // Zeichnet die Station in lokale Koordinaten und legt sie als Textur ab.
    // Existiert die Textur schon (andere Station gleichen Typs), wird sie
    // einfach wiederverwendet — es wird dann gar nichts neu gezeichnet.
    _bake() {
        const scene = this.scene;
        const key = this.textureKey();
        if (key === this._bakedKey) return;

        const W = PAD_X * 2;
        const H = PAD_TOP + PAD_BOTTOM;
        const realX = this.isoX;
        const realY = this.isoY;

        try {
            if (!scene.textures.exists(key)) {
                // In lokalen Koordinaten zeichnen → Textur
                this.isoX = PAD_X;
                this.isoY = PAD_TOP;
                const g = scene.make.graphics({ x: 0, y: 0, add: false });
                this.drawSelf(g);
                g.generateTexture(key, W, H);
                g.destroy();

                // Echte Koordinaten zurück; drawSelf setzt nebenbei bounds,
                // deshalb einmal mit den richtigen Werten nachziehen.
                this.isoX = realX;
                this.isoY = realY;
                const tmp = scene.make.graphics({ x: 0, y: 0, add: false });
                this.drawSelf(tmp);
                tmp.destroy();
            }

            this.graphics.clear();
            if (!this.image) {
                this.image = scene.add.image(realX - PAD_X, realY - PAD_TOP, key)
                    .setOrigin(0, 0)
                    .setDepth(realY + ISO.TILE_SIZE / 2);
            } else {
                this.image.setTexture(key);
            }
            this.image.setAlpha(this.currentAlpha);
            this._bakedKey = key;
        } catch (e) {
            // Notfall: bei Problemen bei Live-Graphics bleiben
            console.warn('Station-Textur fehlgeschlagen, nutze Graphics', e);
            this.isoX = realX;
            this.isoY = realY;
            this.cacheToTexture = false;
            this._bakedKey = key;
        }
    }

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
        if (this.cacheToTexture) this._bake();

        const hidden = this._playerOccludedBy(playerX, playerY);
        this.targetAlpha = hidden ? OCCLUSION.ALPHA : 1;
        this.currentAlpha += (this.targetAlpha - this.currentAlpha) * OCCLUSION.LERP;
        this.display.setAlpha(this.currentAlpha);
    }

    occludesPlayerAt(playerX, playerY) {
        return this._playerOccludedBy(playerX, playerY);
    }

    getInteraction() {
        return null;
    }
}
