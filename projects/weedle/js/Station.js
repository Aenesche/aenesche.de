class Station extends Phaser.GameObjects.Container {
    constructor(scene, gridX, gridY, type, label) {
        let pos = getIsoPos(gridX, gridY);
        super(scene, pos.x, pos.y + TILE_SIZE/2); 
        this.type = type;
        this.heldItem = null;
        this.tableHeight = 15;

        let g = scene.add.graphics();
        
        // Wir zeichnen das exakte Konzept-Design basierend auf dem Typ
        if (type === "seed_shop") {
            drawIsoCube(g, gridX, gridY, TILE_SIZE, 30, 0xffaa00, 0.2, 0.1);
            drawSeedHologram(g, gridX, gridY, 35);
            this.tableHeight = 30;
        } else if (type === "storage") {
            drawIsoCube(g, gridX, gridY, TILE_SIZE, 15, 0x00ffff, 0.1, 0.05);
        } else if (type === "bed") {
            drawBedTable(g, gridX, gridY, 0x00ff00, 0.05);
            // Pflanze ist am Anfang unsichtbar
            this.plantGraphic = scene.add.graphics();
            drawPlant(this.plantGraphic, gridX, gridY, 1.0, 0x00ff00, 15);
            this.plantGraphic.setAlpha(0);
        }
        
        // Verschieben, da der Container selbst schon am richtigen Ort sitzt
        g.setPosition(-pos.x, -(pos.y + TILE_SIZE/2));
        this.add(g);
        
        if (this.plantGraphic) {
            this.plantGraphic.setPosition(-pos.x, -(pos.y + TILE_SIZE/2));
            this.add(this.plantGraphic);
        }

        scene.add.text(0, TILE_SIZE - 10, label, {fontSize: "10px", color: "#888"}).setOrigin(0.5);

        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.body.setImmovable(true);
        // Exakte Hitbox für isometrische Kollision
        this.body.setSize(TILE_SIZE * 1.2, TILE_SIZE * 0.8).setOffset(-TILE_SIZE * 0.6, -TILE_SIZE * 0.4);
    }
}
