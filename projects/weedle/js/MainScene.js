class MainScene extends Phaser.Scene {
    constructor() { super("MainScene"); }

    create() {
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E,UP,DOWN,LEFT,RIGHT');
        this.interactables = this.physics.add.staticGroup();

        let g = this.add.graphics();
        let ROOM_SIZE = 10;

        // 1. Grid
        g.lineStyle(1, 0x004444, 0.4);
        for(let i=0; i<=ROOM_SIZE; i++) {
            for(let j=0; j<=ROOM_SIZE; j++) {
                let p = getIsoPos(i, j);
                drawIsoTile(g, p.x, p.y, TILE_SIZE, 0, 0, 0);
            }
        }

        // 2. Wände & Tür (Tür in der linken Wand bei Grid 0,4)
        drawRoomWalls(g, ROOM_SIZE, 60);
        drawLaserDoor(g, 0, 4);

        // 3. Stationen aufbauen
        let seedShop = new Station(this, 3, 2, "seed_shop", "SAMEN SHOP (E)");
        this.interactables.add(seedShop);

        let storage = new Station(this, 6, 5, "storage", "LAGER (E)");
        this.interactables.add(storage);

        let bed = new Station(this, 3, 6, "bed", "BEET (E)");
        this.interactables.add(bed);

        // 4. Player
        this.player = new Player(this, 5, 8);
        this.physics.add.collider(this.player, this.interactables); // Kollision aktiviert!

        this.progressGfx = this.add.graphics();
        this.buyProgress = 0;
    }

    update() {
        let isMoving = this.player.update(this.keys);
        this.progressGfx.clear();

        let closest = null;
        let minDist = 60;

        this.interactables.children.iterate(station => {
            let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.x, station.y);
            if (dist < minDist) { closest = station; minDist = dist; }
        });

        if (closest && this.keys.E.isDown) {
            if (closest.type === "seed_shop") this.handleSeedShop(closest, isMoving);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.handleGeneric(closest);
        } else {
            this.buyProgress = 0;
        }
    }

    handleSeedShop(station, isMoving) {
        if (isMoving || this.player.heldItem) { this.buyProgress = 0; return; }
        
        this.buyProgress += 0.02;
        this.drawProgressBar(this.player.x, this.player.y - 45, this.buyProgress);

        if (this.buyProgress >= 1) {
            this.buyProgress = 0;
            let seed = new Item(this, "seed");
            this.player.pickup(seed);
        }
    }

    handleGeneric(station) {
        if (station.type === "storage") {
            if (this.player.heldItem && !station.heldItem) {
                let item = this.player.drop();
                station.heldItem = item;
                station.add(item);
                // ITEM ZENTRIERUNG: Exakt in der Mitte auf der Tischplatte!
                item.setPosition(0, -station.tableHeight - 8); 
            } else if (!this.player.heldItem && station.heldItem) {
                let item = station.heldItem;
                station.heldItem = null;
                station.remove(item);
                this.player.pickup(item);
            }
        } 
        else if (station.type === "bed") {
            if (this.player.heldItem && this.player.heldItem.type === "seed") {
                let item = this.player.drop();
                item.destroy(); 
                station.plantGraphic.setAlpha(1); // Pflanze wächst
            }
        }
    }

    drawProgressBar(x, y, pct) {
        this.progressGfx.lineStyle(2, 0x00ffff, 1); this.progressGfx.strokeCircle(x, y, 10);
        this.progressGfx.fillStyle(0x00ffff, 0.8); this.progressGfx.beginPath(); this.progressGfx.moveTo(x, y);
        this.progressGfx.arc(x, y, 10, -Math.PI/2, -Math.PI/2 + (Math.PI*2*pct), false); this.progressGfx.fillPath();
    }
}
