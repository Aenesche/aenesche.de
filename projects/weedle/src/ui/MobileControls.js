// Touch-Steuerung als Overlay über dem Spiel.
//
// Joystick: erscheint dort, wo man die Joystick-Seite berührt (nicht an einer
//   festen Position) und folgt dem Finger. Liefert einen analogen Vektor.
// Buttons: auf der Gegenseite, mit sprechenden Namen statt Tastenkürzeln.
//
// Die Buttons feuern echte Tastatur-Events ans Fenster. Dadurch läuft die
// komplette bestehende Eingabe-Logik (Halte-Interaktion, Popups, Level-Gates)
// unverändert weiter — es gibt keinen zweiten Code-Pfad, der auseinanderlaufen
// könnte.

import { GAME } from '../config/constants.js';
import { UiSettings } from '../config/uiSettings.js';

const STICK_RADIUS = 62;   // Radius des Joystick-Rings
const KNOB_RADIUS = 26;
const DEAD_ZONE = 0.16;    // darunter gilt als "kein Input"

// Tastenzuordnung der Buttons
const KEYS = {
    action:  { key: 'e', code: 'KeyE',   keyCode: 69 },
    upgrade: { key: 'q', code: 'KeyQ',   keyCode: 81 },
    one:     { key: '1', code: 'Digit1', keyCode: 49 },
    two:     { key: '2', code: 'Digit2', keyCode: 50 },
    menu:    { key: 'Escape', code: 'Escape', keyCode: 27 },
};

function sendKey(type, spec) {
    const ev = new KeyboardEvent(type, {
        key: spec.key,
        code: spec.code,
        bubbles: true,
        cancelable: true,
    });
    // keyCode/which sind Teil der KeyboardEventInit NICHT — Phaser liest sie
    // aber aus. Deshalb nachträglich definieren, sonst kommt überall 0 an.
    Object.defineProperty(ev, 'keyCode', { get: () => spec.keyCode });
    Object.defineProperty(ev, 'which',   { get: () => spec.keyCode });
    window.dispatchEvent(ev);
}

export default class MobileControls {
    constructor(scene) {
        this.scene = scene;
        this.enabled = UiSettings.mobileControls;

        this.dir = { x: 0, y: 0 };
        this.stickPointerId = null;
        // Bereiche, in denen der Joystick NICHT starten darf
        // (z.B. der Hilfe-Button oben rechts)
        this.exclusions = [];

        this.container = scene.add.container(0, 0).setDepth(800000);
        this.container.setScrollFactor?.(0);

        this.stickGfx = scene.add.graphics();
        this.container.add(this.stickGfx);

        this.buttons = [];
        this.buildButtons();

        this.applySettings();

        // Eingaben auf Scene-Ebene: der Joystick reagiert auf JEDE Berührung
        // seiner Bildschirmhälfte, Buttons fangen ihre Treffer vorher ab.
        scene.input.addPointer(2); // Multitouch: Bewegen + Tippen gleichzeitig
        scene.input.on('pointerdown', this.onPointerDown, this);
        scene.input.on('pointermove', this.onPointerMove, this);
        scene.input.on('pointerup', this.onPointerUp, this);
        scene.input.on('pointerupoutside', this.onPointerUp, this);

        UiSettings.onChange(() => this.applySettings());
    }

    // --- Buttons ---

    buildButtons() {
        const mk = (label, sub, x, y, r, spec, color) => {
            const g = this.scene.add.graphics();
            const t = this.scene.add.text(x, y, label, {
                font: `bold ${r > 44 ? 15 : 12}px monospace`,
                color,
                align: 'center',
            }).setOrigin(0.5);

            let subText = null;
            if (sub) {
                subText = this.scene.add.text(x, y + r * 0.42, sub, {
                    font: '9px monospace', color: '#7fd8c8',
                }).setOrigin(0.5);
            }

            const btn = { g, t, subText, x, y, r, spec, color, pressed: false };
            this.drawButton(btn);
            this.container.add(g);
            this.container.add(t);
            if (subText) this.container.add(subText);
            this.buttons.push(btn);
            return btn;
        };

        // Positionen werden in applySettings() gespiegelt
        this.btnAction  = mk('AKTION', null, 0, 0, 52, KEYS.action,  '#00ff88');
        this.btnUpgrade = mk('AUSBAU', null, 0, 0, 40, KEYS.upgrade, '#00ffff');
        this.btnOne     = mk('1', 'WAHL', 0, 0, 27, KEYS.one, '#ffcc44');
        this.btnTwo     = mk('2', 'WAHL', 0, 0, 27, KEYS.two, '#ffcc44');
        // Pause/Menü — auf Touch gibt es kein ESC
        this.btnMenu    = mk('≡', null, 0, 0, 20, KEYS.menu, '#7fd8c8');
    }

    drawButton(btn) {
        const g = btn.g;
        const col = Phaser.Display.Color.HexStringToColor(btn.color).color;
        g.clear();
        g.fillStyle(0x000000, btn.pressed ? 0.75 : 0.45);
        g.fillCircle(btn.x, btn.y, btn.r);
        g.lineStyle(btn.pressed ? 3 : 2, col, btn.pressed ? 1 : 0.75);
        g.strokeCircle(btn.x, btn.y, btn.r);
    }

    moveButton(btn, x, y) {
        btn.x = x; btn.y = y;
        btn.t.setPosition(x, y);
        btn.subText?.setPosition(x, y + btn.r * 0.42);
        this.drawButton(btn);
    }

    // --- Layout / Sichtbarkeit ---

    applySettings() {
        this.enabled = UiSettings.mobileControls;
        this.container.setVisible(this.enabled);
        this.container.setAlpha(UiSettings.opacity);

        if (!this.enabled) {
            this.dir = { x: 0, y: 0 };
            this.stickPointerId = null;
            this.stickGfx.clear();
            return;
        }

        // Buttons liegen auf der Gegenseite des Joysticks
        const onRight = UiSettings.joystickSide === 'left';
        const W = GAME.WIDTH, H = GAME.HEIGHT;
        const bx = onRight ? W - 100 : 100;   // Zentrum des Button-Clusters
        const by = H - 100;
        const flip = onRight ? 1 : -1;

        this.moveButton(this.btnAction,  bx, by);
        this.moveButton(this.btnUpgrade, bx - 96 * flip, by - 18);
        this.moveButton(this.btnOne,     bx - 66 * flip, by - 104);
        this.moveButton(this.btnTwo,     bx + 2 * flip,  by - 122);
        this.moveButton(this.btnMenu,    GAME.WIDTH / 2, 30);
    }

    // Rechteck sperren (Screen-Koordinaten)
    addExclusion(x, y, w, h) {
        this.exclusions.push({ x, y, w, h });
    }

    inExclusion(x, y) {
        return this.exclusions.some(r =>
            x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    }

    // Steuerung stumm schalten, solange ein Overlay offen ist
    get blocked() {
        const sc = this.scene;
        return !!(sc.paused || sc.dialogue?.active || sc.settings?.visible);
    }

    // Liegt der Punkt in einem Button? (Buttons haben Vorrang vor dem Joystick)
    hitButton(x, y) {
        for (const b of this.buttons) {
            if (Math.hypot(x - b.x, y - b.y) <= b.r + 6) return b;
        }
        return null;
    }

    onJoystickSide(x) {
        return UiSettings.joystickSide === 'left'
            ? x < GAME.WIDTH / 2
            : x >= GAME.WIDTH / 2;
    }

    // --- Pointer-Handling ---

    onPointerDown(pointer) {
        if (!this.enabled) return;

        // Der Menü-Button funktioniert immer — sonst käme man auf Touch
        // nicht mehr aus der Pause heraus.
        if (this.btnMenu && Math.hypot(pointer.x - this.btnMenu.x, pointer.y - this.btnMenu.y) <= this.btnMenu.r + 6) {
            this.btnMenu.pressed = true;
            this.btnMenu.pointerId = pointer.id;
            this.drawButton(this.btnMenu);
            sendKey('keydown', this.btnMenu.spec);
            return;
        }

        if (this.blocked) return;
        if (this.inExclusion(pointer.x, pointer.y)) return;

        const btn = this.hitButton(pointer.x, pointer.y);
        if (btn) {
            btn.pressed = true;
            btn.pointerId = pointer.id;
            this.drawButton(btn);
            sendKey('keydown', btn.spec);
            return;
        }

        if (this.stickPointerId === null && this.onJoystickSide(pointer.x)) {
            this.stickPointerId = pointer.id;
            this.stickOrigin = { x: pointer.x, y: pointer.y };
            this.updateStick(pointer.x, pointer.y);
        }
    }

    onPointerMove(pointer) {
        if (!this.enabled) return;
        if (pointer.id === this.stickPointerId) {
            this.updateStick(pointer.x, pointer.y);
        }
    }

    onPointerUp(pointer) {
        if (!this.enabled) return;

        for (const b of this.buttons) {
            if (b.pressed && b.pointerId === pointer.id) {
                b.pressed = false;
                b.pointerId = null;
                this.drawButton(b);
                sendKey('keyup', b.spec);
            }
        }

        if (pointer.id === this.stickPointerId) {
            this.stickPointerId = null;
            this.dir = { x: 0, y: 0 };
            this.stickGfx.clear();
        }
    }

    updateStick(px, py) {
        let dx = px - this.stickOrigin.x;
        let dy = py - this.stickOrigin.y;
        const dist = Math.hypot(dx, dy);

        // Zieht man weiter als der Ring, wandert der Ring mit —
        // so verliert man den Joystick beim Nachfassen nicht.
        if (dist > STICK_RADIUS) {
            const over = dist - STICK_RADIUS;
            this.stickOrigin.x += (dx / dist) * over;
            this.stickOrigin.y += (dy / dist) * over;
            dx = px - this.stickOrigin.x;
            dy = py - this.stickOrigin.y;
        }

        const nx = dx / STICK_RADIUS;
        const ny = dy / STICK_RADIUS;
        const mag = Math.hypot(nx, ny);
        this.dir = mag < DEAD_ZONE ? { x: 0, y: 0 } : { x: nx, y: ny };

        this.drawStick(px, py);
    }

    drawStick(knobX, knobY) {
        const g = this.stickGfx;
        const o = this.stickOrigin;
        g.clear();
        g.fillStyle(0x000000, 0.35);
        g.fillCircle(o.x, o.y, STICK_RADIUS);
        g.lineStyle(2, 0x00ffcc, 0.7);
        g.strokeCircle(o.x, o.y, STICK_RADIUS);
        g.fillStyle(0x00ffcc, 0.35);
        g.fillCircle(knobX, knobY, KNOB_RADIUS);
        g.lineStyle(2, 0x00ffcc, 0.95);
        g.strokeCircle(knobX, knobY, KNOB_RADIUS);
    }

    // Von der GameScene abgefragt
    getDirection() {
        return this.enabled ? this.dir : { x: 0, y: 0 };
    }

    destroy() {
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        this.scene.input.off('pointerupoutside', this.onPointerUp, this);
        this.container.destroy();
    }
}
