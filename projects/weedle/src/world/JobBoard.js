// JobBoard: Single Source of Truth für Angestellten-Aufgaben.
// Verhindert dass zwei Angestellte denselben Job machen.
//
// Ein "Job" ist ein Objekt: { type, target, priority }
// type: 'buy_seed', 'plant_seed', 'harvest', 'take_order', 'deliver_item'
// target: die Station/der Kunde
//
// Workflow:
//   1. AI fragt: jobBoard.findJob(role, employee) → bester verfügbarer Job
//   2. AI reserviert: jobBoard.claim(job, employee)
//   3. AI führt aus
//   4. AI meldet: jobBoard.complete(job) oder jobBoard.abandon(job)
//
// Jobs werden NICHT gespeichert — sie werden jedes Mal neu generiert
// aus dem aktuellen Spielzustand. Reservierungen werden getrackt.

export default class JobBoard {
    constructor() {
        // Map: jobKey → employee (wer hat den Job reserviert)
        this.claims = new Map();
    }

    // Eindeutiger Key für einen Job
    key(job) {
        return `${job.type}:${job.targetId}`;
    }

    claim(job, employee) {
        const k = this.key(job);
        if (this.claims.has(k)) return false;
        this.claims.set(k, employee);
        return true;
    }

    isClaimed(job) {
        return this.claims.has(this.key(job));
    }

    isClaimedBy(job, employee) {
        return this.claims.get(this.key(job)) === employee;
    }

    complete(job) {
        this.claims.delete(this.key(job));
    }

    abandon(job) {
        this.claims.delete(this.key(job));
    }

    // Alle Claims eines Angestellten freigeben (z.B. wenn er entfernt wird)
    releaseAll(employee) {
        for (const [k, e] of this.claims) {
            if (e === employee) this.claims.delete(k);
        }
    }

    // Verfügbare Jobs aus Spielzustand generieren
    getGardenerJobs(scene) {
        const jobs = [];
        const beds = scene.stations.filter(s => s.constructor.name === 'Bed');
        const storages = scene.stations.filter(s => s.constructor.name === 'StorageTable');
        const terminal = scene.stations.find(s => s.constructor.name === 'SeedTerminal');

        // Ernten: erntereife oder verfaulte Beete
        for (const bed of beds) {
            if (bed.state === 'ready') {
                jobs.push({ type: 'harvest', target: bed, targetId: `bed_${bed.gridX}_${bed.gridY}`, priority: 3 });
            }
            if (bed.state === 'rotten') {
                jobs.push({ type: 'clear_rotten', target: bed, targetId: `rot_${bed.gridX}_${bed.gridY}`, priority: 2 });
            }
        }

        // Pflanzen: leere Beete (nur wenn Angestellter Samen trägt)
        for (const bed of beds) {
            if (bed.state === 'empty') {
                jobs.push({ type: 'plant_seed', target: bed, targetId: `plant_${bed.gridX}_${bed.gridY}`, priority: 1 });
            }
        }

        // Samen kaufen: nur wenn es leere Beete gibt UND genug Geld
        const emptyBeds = beds.filter(b => b.state === 'empty').length;
        const seedJobsClaimed = [...this.claims.keys()].filter(k => k.startsWith('buy_seed')).length;
        const plantJobsClaimed = [...this.claims.keys()].filter(k => k.startsWith('plant_')).length;

        if (terminal && emptyBeds > seedJobsClaimed + plantJobsClaimed) {
            if (scene.state.canAfford(10)) { // SEED_COST
                jobs.push({ type: 'buy_seed', target: terminal, targetId: `buy_seed_${Date.now()}`, priority: 0 });
            }
        }

        // Ablegen: freie Storage-Tische (nur relevant wenn Angestellter Item trägt)
        for (const st of storages) {
            if (st.freeSlots > 0) {
                jobs.push({ type: 'store_item', target: st, targetId: `store_${st.gridX}_${st.gridY}`, priority: 1 });
            }
        }

        return jobs.filter(j => !this.isClaimed(j));
    }

    getCashierJobs(scene) {
        const jobs = [];
        if (!scene.customers) return jobs;

        const storages = scene.stations.filter(s => s.constructor.name === 'StorageTable');

        // Bestellungen aufnehmen: Kunden die noch nicht bestellt haben
        for (const c of scene.customers.customers) {
            if ((c.state === 'queueing' || c.state === 'waiting') && !c.orderRevealed && c.queueIndex === 0) {
                const reg = c.assignedRegister;
                if (reg) {
                    jobs.push({
                        type: 'take_order',
                        target: reg,
                        customer: c,
                        targetId: `order_${reg.gridX}_${reg.gridY}`,
                        priority: 3,
                    });
                }
            }
        }

        // Items liefern: Kunden deren Bestellung enthüllt ist + Items auf Tischen
        for (const c of scene.customers.customers) {
            if (c.state === 'waiting' && c.orderRevealed && c.order.length > 0) {
                // Gibt es ein passendes Item auf einem Tisch?
                for (const st of storages) {
                    for (let i = 0; i < st.slots.length; i++) {
                        const itemDef = st.slots[i];
                        if (itemDef && c.order.includes(itemDef.id)) {
                            jobs.push({
                                type: 'deliver_item',
                                target: st,
                                customer: c,
                                register: c.assignedRegister,
                                slotIndex: i,
                                targetId: `deliver_${st.gridX}_${st.gridY}_${i}_${c.assignedRegister?.gridX}`,
                                priority: 2,
                            });
                        }
                    }
                }
            }
        }

        return jobs.filter(j => !this.isClaimed(j));
    }
}
