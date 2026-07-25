import Station from './Station.js';
import { COLORS, ISO, ITEMS } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';
import { Audio } from '../../audio/AudioManager.js';

const TABLE_HEIGHT = 15;

export default class Register extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, TABLE_HEIGHT, COLORS.BED, 0.1, 0.05);

        const rx = this.isoX;
        const ry = this.isoY - TABLE_HEIGHT + ISO.TILE_SIZE / 2;

        g.fillStyle(COLORS.REGISTER, 0.4);
        g.lineStyle(1, COLORS.REGISTER, 1);
        g.beginPath();
        g.moveTo(rx, ry); g.lineTo(rx + 10, ry - 5);
        g.lineTo(rx + 10, ry - 15); g.lineTo(rx, ry - 10);
        g.closePath(); g.fillPath(); g.strokePath();
        g.beginPath();
        g.moveTo(rx, ry); g.lineTo(rx - 10, ry - 5);
        g.lineTo(rx - 10, ry - 15); g.lineTo(rx, ry - 10);
        g.closePath(); g.fillPath(); g.strokePath();

        g.fillStyle(COLORS.WALL, 1);
        g.beginPath();
        g.moveTo(rx - 8, ry - 7); g.lineTo(rx - 2, ry - 4);
        g.lineTo(rx - 2, ry - 10); g.lineTo(rx - 8, ry - 13);
        g.closePath(); g.fillPath();

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - TABLE_HEIGHT - 15,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    getInteraction() {
        const customer = this.scene.customers?.getActiveCustomerAt(this);
        if (!customer) return null;

        const player = this.scene.player;
        const state = this.scene.state;
        const customerManager = this.scene.customers;

        // Bestellung aufnehmen
        if (!customer.orderRevealed) {
            return {
                type: 'hold',
                duration: 1500,
                onComplete: () => {
                    customer.revealOrder();
                    customer.state = 'waiting';
                },
            };
        }

        // Item übergeben
        if (player.hasItem() && customer.order.includes(player.carriedItem.itemDef.id)) {
            const itemDef = player.carriedItem.itemDef;
            // Basis-Preis aus der Sorten-Definition
            const basePrice = itemDef.sellPrice || 0;
            // Ertrag-Bonus vom Terminal dieser Sorte
            const terminal = this.scene.stations.find(s =>
                s.constructor.name === 'SeedTerminal' && s.variety?.id === itemDef.variety
            );
            const yieldMult = terminal ? (1 + (terminal.upgradeLevel || 0) * 0.25) : 1;
            const price = Math.round(basePrice * yieldMult);
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const dropped = player.dropItem();
                    if (dropped && customer.receiveItem(itemDef)) {
                        state.earn(price);
                        Audio.play('sell');
                        this.scene.reportSale?.(itemDef.variety, price);
                        if (customer.order.length === 0) {
                            customerManager.onCustomerServed(customer);
                        }
                    }
                },
            };
        }
        return null;
    }
    onUpgrade(level) {
        // Effekt wird von Customer.update() gelesen via assignedRegister.upgradeLevel
    }
}
