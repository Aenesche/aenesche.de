class MainScene extends Phaser.Scene {
    constructor() { super("MainScene"); }

    create() {
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E,UP,DOWN,LEFT,RIGHT');
        this.interactables = this.physics.add.staticGroup();
        this.walls = this.physics.add.staticGroup(); // Echte Physik-Wände!

        let g = this.add.graphics();
        let ROOM_SIZE = 10;

        // 1. Grid zeichnen
        g.lineStyle(1, 0x004444, 0.4);
        for(let i=0; i<=ROOM_SIZE; i++) {
            for(let j=0; j<=ROOM_SIZE; j++) {
                let p = getIsoPos(i, j);
                drawIsoTile(g, p.x, p.y, TILE_SIZE, 0, 0, 0);
            }
        }

        // 2. WÄNDE & TÜR bauen (aus isometrischen Blöcken)
        for (let i = 0; i <= ROOM_SIZE; i++) {
            // Linke Wand (gridX = 0, gridY läuft von 0 bis 10)
            if (i === 4 || i === 5) {
                // Hier kommt die Laser-Tür hin (keine Wand bauen)
                if (i === 4) this.createLaserDoor(0, 4); 
            } else {
                this.createWallBlock(0, i);
            }
            
            // Rechte Wand (gridX läuft von 0 bis 10, gridY = 0)
            if (i > 0) this.createWallBlock(i, 0); 
        }

        // 3. Stationen aufbauen
        let seedShop = new Station(this, 3, 2, "seed_shop", "SAMEN SHOP (E)");
        this.interactables.add(seedShop);

        let storage = new Station(this, 6, 5, "storage", "LAGER (E)");
        this.interactables.add(storage);

        let bed = new Station(this, 3, 6, "bed", "BEET (E)");
        this.interactables.add(bed);

        // 4. Player & Physik
        this.player = new Player(this, 5, 8);
        
        // Kollision mit Stationen UND Wänden aktivieren!
        this.physics.add.collider(this.player, this.interactables); 
        this.physics.add.collider(this.player, this.walls); 

        this.progressGfx = this.add.graphics();
        this.buyProgress = 0;
    }

    // Erstellt einen soliden Wand-Block mit Physik
    createWallBlock(gridX, gridY) {
        let pos = getIsoPos(gridX, gridY);
        let block = this.add.container(pos.x, pos.y + TILE_SIZE/2);
        let g = this.add.graphics();
        drawIsoCube(g, gridX, gridY, TILE_SIZE, 40, 0x004444, 0.1, 0.2); // Dunkel-Cyan Wand
        g.setPosition(-pos.x, -(pos.y + TILE_SIZE/2));
        block.add(g);
        
        this.walls.add(block);
        block.body.setSize(TILE_SIZE * 1.4, TILE_SIZE * 0.8).setOffset(-TILE_SIZE * 0.7, -TILE_SIZE * 0.4);
    }

    // Erstellt die Laser-Tür OHNE Physik (damit man durchlaufen kann)
    createLaserDoor(gridX, gridY) {
        let pos = getIsoPos(gridX, gridY);
        let door = this.add.container(pos.x, pos.y + TILE_SIZE/2);
        let g = this.add.graphics();
        
        // Zwei Säulen (Vorne und Hinten auf dem Grid)
        drawIsoCube(g, gridX, gridY, 8, 40, 0x00ffff, 0.5, 0.3);
        drawIsoCube(g, gridX, gridY + 1, 8, 40, 0x00ffff, 0.5, 0.3);
        
        // Rotes Laser-Gitter dazwischen
        g.lineStyle(2, 0xff0000, 0.8);
        let p1 = getIsoPos(gridX, gridY);
        let p2 = getIsoPos(gridX, gridY + 1);
        for(let i=0; i<4; i++) {
            g.moveTo(p1.x, p1.y - 10 - (i*8));
            g.lineTo(p2.x, p2.y - 10 - (i*8));
        }

        g.setPosition(-pos.x, -(pos.y + TILE_SIZE/2));
        door.add(g);
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
                item.setPosition(0, -station.tableHeight - 8); // Perfekt in der Mitte abgelegt
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
                station.plantGraphic.setAlpha(1); 
            }
        }
    }

    drawProgressBar(x, y, pct) {
        this.progressGfx.lineStyle(2, 0x00ffff, 1); this.progressGfx.strokeCircle(x, y, 10);
        this.progressGfx.fillStyle(0x00ffff, 0.8); this.progressGfx.beginPath(); this.progressGfx.moveTo(x, y);
        this.progressGfx.arc(x, y, 10, -Math.PI/2, -Math.PI/2 + (Math.PI*2*pct), false); this.progressGfx.fillPath();
    }
}
