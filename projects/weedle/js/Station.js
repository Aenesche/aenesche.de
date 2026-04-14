class Station extends Phaser.GameObjects.Container {
    constructor(scene, gridX, gridY, type, color, label) {
        let pos = getIsoPos(gridX, gridY);
        // Wir platzieren den Container genau in der Mitte der Fliese (für Physik)
        super(scene, pos.x, pos.y + TILE_SIZE/2); 
        this.type = type;
        this.heldItem = null;
        this.tableHeight = 15;

        // Wir rufen die drawIsoCube Funktion aus utils.js auf!
        let g = scene.add.graphics();
        // Da der Container auf x,y sitzt, verschieben wir den Startpunkt für die Zeichnung zurück
        drawIsoCube(g, gridX, gridY, TILE_SIZE, this.tableHeight, color, 0.1, 0.05);
        // Das Graphicsobjekt muss negativ verschoben werden, da drawIsoCube absolute Koordinaten nutzt
        g.setPosition(-pos.x, -pos.y);
        this.add(g);

        // Hologramm für SeedShop
        if (type === "seed_shop") {
            let holo = scene.add.graphics();
            holo.lineStyle(2, 0xffff00, 1); holo.strokeEllipse(0, -this.tableHeight - 20, 16, 8);
            holo.fillStyle(0xffff00, 1); holo.fillCircle(0, -this.tableHeight - 20, 3);
            this.add(holo);
        }

        // Label
        scene.add.text(pos.x, pos.y + TILE_SIZE + 10, label, {fontSize: "10px", color: "#888"}).setOrigin(0.5);

        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.body.setImmovable(true);
        this.body.setSize(TILE_SIZE*1.5, TILE_SIZE);
    }
}
