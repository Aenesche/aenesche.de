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

        // --- Samen-Einkauf: Bedarf zuerst, dann ausgeglichener Vorrat ---
        //
        // 1. BEDARF: Sorten die Kunden gerade bestellt haben (enthüllte Orders)
        //    und für die es weniger Vorrat als Bedarf gibt → hohe Priorität.
        // 2. AUSGLEICH: Kein Defizit → kaufe die Sorte mit dem WENIGSTEN Vorrat
        //    (niedriger Vorrat = höhere Priorität), damit alles gleichmäßig da ist.
        //
        // "Vorrat" = fertige/wachsende Pflanzen in Beeten + Pflanzen auf Tischen.
        // "Unterwegs" = geclaimte Kauf-Jobs + Samen die Angestellte gerade tragen.
        const terminals = scene.stations.filter(s => s.constructor.name === 'SeedTerminal');
        const emptyBeds = beds.filter(b => b.state === 'empty');

        // Bedarf pro Sorte aus enthüllten Kundenbestellungen
        const demand = {};
        if (scene.customers) {
            for (const c of scene.customers.customers) {
                if (!c.orderRevealed) continue;
                for (const itemId of c.order) {
                    if (itemId.startsWith('plant_')) {
                        const v = itemId.replace('plant_', '');
                        demand[v] = (demand[v] || 0) + 1;
                    }
                }
            }
        }

        // Vorrat pro Sorte: Beete (growing/ready) + Tische
        const supply = {};
        for (const bed of beds) {
            if ((bed.state === 'growing' || bed.state === 'ready') && bed.plantedVariety) {
                supply[bed.plantedVariety.id] = (supply[bed.plantedVariety.id] || 0) + 1;
            }
        }
        for (const st of storages) {
            for (const item of st.slots) {
                if (item && item.id && item.id.startsWith('plant_')) {
                    supply[item.variety] = (supply[item.variety] || 0) + 1;
                }
            }
        }

        // Unterwegs pro Sorte: geclaimte buy_seed-Jobs + getragene Samen
        const pending = {};
        for (const k of this.claims.keys()) {
            const m = k.match(/^buy_seed:buy_seed_([a-z]+)_/);
            if (m) pending[m[1]] = (pending[m[1]] || 0) + 1;
        }
        for (const e of (scene.employees || [])) {
            const it = e.carriedItem?.itemDef;
            if (it && it.id && it.id.startsWith('seed_')) {
                pending[it.variety] = (pending[it.variety] || 0) + 1;
            }
        }

        for (const terminal of terminals) {
            const v = terminal.variety;
            const pend = pending[v.id] || 0;
            const compatibleBeds = emptyBeds.filter(b => b.canPlant(v)).length;

            // Nicht mehr Samen kaufen als Beete sie aufnehmen können
            if (compatibleBeds <= pend) continue;

            const deficit = (demand[v.id] || 0) - (supply[v.id] || 0) - pend;

            let priority;
            if (deficit > 0) {
                // Bedarf decken: knapp unter harvest (3), über allem anderen.
                // Größeres Defizit = minimal höher.
                if (!scene.state.canAfford(v.seedCost)) continue;
                priority = 2 + Math.min(deficit, 5) * 0.1;
            } else {
                // Ausgleich: nur mit Geld-Puffer (3x Samenpreis), damit teure
                // Sorten nicht das Konto leeren. Weniger Vorrat = höhere Prio.
                if (!scene.state.canAfford(v.seedCost * 3)) continue;
                priority = -((supply[v.id] || 0) + pend) * 0.01;
            }

            jobs.push({
                type: 'buy_seed',
                target: terminal,
                targetId: `buy_seed_${v.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                priority,
            });
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
