class Station extends Phaser.GameObjects.Container {
    constructor(scene, gridX, gridY, type, color, label) {
        let pos = getIsoPos(gridX, gridY);
        super(scene, pos.x, pos.y + TILE_SIZE/2); 
        this.type = type;
        this.heldItem = null;
        this.tableHeight = 15;

        let g = scene.add.graphics();
        
        // Wenn es ein Beet ist, machen wir den Deckel farbig
        if (type === "bed") {
            drawIsoCube(g, gridX, gridY, TILE_SIZE, this.tableHeight, 0x00ffff, 0.05, 0.05); // Cyan base
            drawIsoTile(g, pos.x, pos.y - this.tableHeight, TILE_SIZE, 0x00ff00, 0.1, 1); // Green top
            // Zeichne sofort eine leere Pflanze (Kristall) unsichtbar
            this.plantGraphic = scene.add.graphics();
            drawPlant(this.plantGraphic, pos.x, pos.y - this.tableHeight, 1, 0x00ff00);
            this.plantGraphic.setAlpha(0); // Unsichtbar am Anfang
            scene.add.existing(this.plantGraphic);
        } else {
            drawIsoCube(g, gridX, gridY, TILE_SIZE, this.tableHeight, color, 0.1, 0.05);
        }
        
        g.setPosition(-pos.x, -pos.y);
        this.add(g);

        // Hologramm für SeedShop
        if (type === "seed_shop") {
            let holo = scene.add.graphics();
            holo.lineStyle(2, 0xffff00, 1); holo.strokeEllipse(0, -this.tableHeight - 15, 16, 8);
            holo.fillStyle(0xffff00, 1); holo.fillCircle(0, -this.tableHeight - 15, 3);
            this.add(holo);
        }

        scene.add.text(pos.x, pos.y + TILE_SIZE + 5, label, {fontSize: "10px", color: "#888"}).setOrigin(0.5);

        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.body.setImmovable(true);
        
        // HITBOX FIX: Enger an die isometrische Form angepasst
        this.body.setSize(TILE_SIZE * 1.2, TILE_SIZE * 0.8);
        this.body.setOffset(-TILE_SIZE * 0.6, -TILE_SIZE * 0.4);
    }
}
