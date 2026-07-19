// GoalTracker: verfolgt Ziele, Nebenquests und Zeit eines Levels.
// Die Scene (und Stationen) melden Events; der Tracker entscheidet
// wann das Level geschafft ist und wie viele Sterne es gibt.
//
// Sterne: 1 = Ziele erfüllt · 2 = innerhalb Zeitlimit · 3 = Zeitlimit + alle Quests

export default class GoalTracker {
    constructor(levelConfig, initialState = null) {
        this.config = levelConfig;
        this.completed = false;

        // Fortschritts-Zähler (aus Save wiederherstellbar)
        const s = initialState || {};
        this.elapsedMs = s.elapsedMs || 0;
        this.soldByVariety = s.soldByVariety || {};   // {mint: 3, ...}
        this.soldTotal = s.soldTotal || 0;
        this.moneyEarned = s.moneyEarned || 0;
        this.builtByType = s.builtByType || {};       // {bed: 1, ...}
        this.hiredRoles = s.hiredRoles || [];         // ['gardener']
        this.maxBedUpgrade = s.maxBedUpgrade || 0;
        this.rottenCount = s.rottenCount || 0;
        this.rageQuits = s.rageQuits || 0;
        this.disposedCount = s.disposedCount || 0;
    }

    // --- Events (von Scene/Stationen aufgerufen) ---

    tick(delta) {
        if (!this.completed) this.elapsedMs += delta;
    }

    onSale(varietyId, price) {
        this.soldByVariety[varietyId] = (this.soldByVariety[varietyId] || 0) + 1;
        this.soldTotal += 1;
        this.moneyEarned += price;
    }

    onRotten()   { this.rottenCount += 1; }
    onRageQuit() { this.rageQuits += 1; }
    onDisposed() { this.disposedCount += 1; }

    onBuild(slotType) {
        // terminal_haze etc. zählen als eigener Typ
        this.builtByType[slotType] = (this.builtByType[slotType] || 0) + 1;
    }

    onHire(role) {
        if (!this.hiredRoles.includes(role)) this.hiredRoles.push(role);
    }

    onUpgrade(stationName, newLevel) {
        if (stationName === 'Bed') {
            this.maxBedUpgrade = Math.max(this.maxBedUpgrade, newLevel);
        }
    }

    // --- Auswertung ---

    goalProgress(goal) {
        switch (goal.kind) {
            case 'sell':        return { cur: this.soldByVariety[goal.variety] || 0, max: goal.count };
            case 'sellTotal':   return { cur: this.soldTotal, max: goal.count };
            case 'moneyEarned': return { cur: Math.min(this.moneyEarned, goal.amount), max: goal.amount };
            case 'build':       return { cur: this.builtByType[goal.type] || 0, max: goal.count };
            case 'hire':        return { cur: this.hiredRoles.includes(goal.role) ? 1 : 0, max: 1 };
            case 'upgrade':     return { cur: Math.min(this.maxBedUpgrade, goal.level), max: goal.level };
            default:            return { cur: 0, max: 1 };
        }
    }

    goalDone(goal) {
        const p = this.goalProgress(goal);
        return p.cur >= p.max;
    }

    allGoalsDone() {
        return this.config.goals.every(g => this.goalDone(g));
    }

    questDone(quest, scene) {
        switch (quest.kind) {
            case 'noRotten':        return this.rottenCount === 0;
            case 'noRage':          return this.rageQuits === 0;
            case 'dispose':         return this.disposedCount >= quest.n;
            case 'satisfactionEnd': return scene.state.satisfaction >= quest.n;
            default:                return false;
        }
    }

    // 1..3 Sterne bei Abschluss
    calcStars(scene) {
        const inTime = this.elapsedMs <= this.config.timeLimitMs;
        if (!inTime) return 1;
        const allQuests = this.config.quests.every(q => this.questDone(q, scene));
        return allQuests ? 3 : 2;
    }

    // Kurztext für Ziel-HUD, z.B. "Mint 3/5 · Beete 1/2"
    goalHudText() {
        return this.config.goals.map(g => {
            const p = this.goalProgress(g);
            const label = {
                sell: g.variety ? g.variety.toUpperCase() : 'Verkäufe',
                sellTotal: 'Verkäufe',
                moneyEarned: '€ verdient',
                build: g.type === 'bed' ? 'Beete' : g.type,
                hire: g.role === 'gardener' ? 'Gärtner' : 'Kassierer',
                upgrade: 'Beet-Upgrade',
            }[g.kind] || g.kind;
            return `${label} ${p.cur}/${p.max}`;
        }).join(' · ');
    }

    // Für den Save-Blob
    serialize() {
        return {
            elapsedMs: this.elapsedMs,
            soldByVariety: this.soldByVariety,
            soldTotal: this.soldTotal,
            moneyEarned: this.moneyEarned,
            builtByType: this.builtByType,
            hiredRoles: this.hiredRoles,
            maxBedUpgrade: this.maxBedUpgrade,
            rottenCount: this.rottenCount,
            rageQuits: this.rageQuits,
            disposedCount: this.disposedCount,
        };
    }
}
