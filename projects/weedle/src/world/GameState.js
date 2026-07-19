import { ECONOMY, SATISFACTION } from '../config/constants.js';
import { Storage } from '../storage/storage.js';

const SAVE_KEY = 'gameState';

export default class GameState {
    // initial = { money, satisfaction }: Level-Modus — Werte kommen aus
    // Level-Config/Save, globale localStorage-Persistenz ist AUS
    // (der SaveManager speichert den kompletten Level-Zustand).
    constructor(initial = null) {
        if (initial) {
            this.money = initial.money;
            this.satisfaction = initial.satisfaction ?? SATISFACTION.START;
            this.persistEnabled = false;
        } else {
            const saved = Storage.load(SAVE_KEY);
            this.money = saved?.money ?? ECONOMY.STARTING_MONEY;
            this.satisfaction = saved?.satisfaction ?? SATISFACTION.START;
            this.persistEnabled = true;
        }
        this.listeners = [];
    }

    canAfford(amount) { return this.money >= amount; }

    spend(amount) {
        if (!this.canAfford(amount)) return false;
        this.money -= amount;
        this.persist(); this.notify();
        return true;
    }

    earn(amount) {
        this.money += amount;
        this.persist(); this.notify();
    }

    adjustSatisfaction(delta) {
        this.satisfaction = Math.max(SATISFACTION.MIN, Math.min(SATISFACTION.MAX, this.satisfaction + delta));
        this.persist(); this.notify();
    }

    // 0..1 normalisiert, für Berechnungen (Spawn-Rate etc.)
    get satisfactionRatio() {
        return (this.satisfaction - SATISFACTION.MIN) / (SATISFACTION.MAX - SATISFACTION.MIN);
    }

    onChange(fn) { this.listeners.push(fn); }
    notify()     { this.listeners.forEach(fn => fn(this)); }
    persist()    { if (this.persistEnabled) Storage.save(SAVE_KEY, { money: this.money, satisfaction: this.satisfaction }); }
}
