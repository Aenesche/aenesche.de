class Item extends Phaser.GameObjects.Container {
    constructor(scene, type) {
        super(scene, 0, 0);
        this.type = type; 
        
        let g = scene.add.graphics();
        if (type === "seed") {
            g.lineStyle(2, 0xffff00, 1);
            g.strokeEllipse(0, 0, 12, 6);
            g.fillStyle(0xffff00, 1);
            g.fillCircle(0, 0, 2);
        }
        this.add(g);
        scene.add.existing(this);
    }
}
