// Globaler Spielzustand. Aktuell nur Geld, später auch Statistiken, Upgrades, etc.
// Persistiert über Storage. Singleton-artig: eine Instanz pro Scene.

import { ECONOMY } from '../config/constants.js';
import { Storage } from '../storage/storage.js';

const SAVE_KEY = 'gameState';

export default class GameState {
    constructor() {
        const saved = Storage.load(SAVE_KEY);
        this.money = saved?.money ?? ECONOMY.STARTING_MONEY;
        this.listeners = [];
    }

    canAfford(amount) {
        return this.money >= amount;
    }

    spend(amount) {
        if (!this.canAfford(amount)) return false;
        this.money -= amount;
        this.persist();
        this.notify();
        return true;
    }

    earn(amount) {
        this.money += amount;
        this.persist();
        this.notify();
    }

    onChange(fn) {
        this.listeners.push(fn);
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    persist() {
        Storage.save(SAVE_KEY, { money: this.money });
    }
}
