// Kreisförmiger Progress-Indikator. Wird als HUD-Overlay über Stationen
// (Wachstum) oder Kunden (Wut-Timer) gezeichnet. Reine View-Komponente —
// progress (0..1) wird von außen gesetzt.

export default class PieTimer {
    constructor(scene, color, radius = 10) {
        this.scene = scene;
        this.color = color;
        this.radius = radius;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(150000); // Über Stationen, unter Highlight-Hint
        this.visible = false;
    }

    setPosition(x, y) {
        this.graphics.setPosition(x, y);
    }

    show(progress) {
        this.visible = true;
        const g = this.graphics;
        g.clear();
        g.lineStyle(2, this.color, 0.4);
        g.strokeCircle(0, 0, this.radius);
        g.fillStyle(this.color, 0.8);
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, this.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
        g.closePath();
        g.fillPath();
    }

    setColor(color) {
        this.color = color;
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.graphics.clear();
    }

    destroy() {
        this.graphics.destroy();
    }
}
