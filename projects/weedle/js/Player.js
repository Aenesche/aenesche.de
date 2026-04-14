class Player extends Phaser.GameObjects.Container {
    constructor(scene, gridX, gridY) {
        let pos = getIsoPos(gridX, gridY);
        super(scene, pos.x, pos.y);
        this.heldItem = null;

        this.bodyGfx = scene.add.graphics();
        this.bodyGfx.fillStyle(0x00ff00, 0.2);
        this.bodyGfx.fillEllipse(0, 0, 24, 12); // Schatten
        this.bodyGfx.lineStyle(2, 0x00ff00, 1);
        this.bodyGfx.strokeRect(-12, -24, 24, 24); // Körper
        this.bodyGfx.fillStyle(0x003300, 0.8);
        this.bodyGfx.fillRect(-12, -24, 24, 24);
        this.add(this.bodyGfx);

        // Augen (Start-Y-Position ist innerhalb des Würfels)
        this.eyes = scene.add.graphics();
        this.eyes.fillStyle(0x00ff00, 1);
        this.eyes.fillRect(-6, -2, 4, 4);
        this.eyes.fillRect(2, -2, 4, 4);
        this.eyes.y = -12; 
        this.add(this.eyes);

        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.body.setSize(24, 24).setOffset(-12, -12);
    }

    update(keys) {
        let speed = 200;
        let vx = 0, vy = 0;

        if (keys.A.isDown) vx = -1;
        if (keys.D.isDown) vx = 1;
        if (keys.W.isDown) vy = -1;
        if (keys.S.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

        this.body.setVelocity(vx * speed, vy * speed);

        // Augen gleiten sanft (nicht rotieren!)
        let targetX = vx * 4;
        let targetY = -12 + (vy * 4);
        this.eyes.x += (targetX - this.eyes.x) * 0.2;
        this.eyes.y += (targetY - this.eyes.y) * 0.2;

        return (vx !== 0 || vy !== 0);
    }

    pickup(item) {
        if (this.heldItem) return;
        this.heldItem = item;
        item.setPosition(0, -40); // Oben auf dem Kopf
        this.add(item);
    }

    drop() {
        if (!this.heldItem) return null;
        let item = this.heldItem;
        this.heldItem = null;
        this.remove(item);
        return item;
    }
}
