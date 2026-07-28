// Hilfe-Button: spielt einen kurzen Trailer und schenkt danach Guthaben.
// Gedacht als Notausgang, wenn man sich im Freeplay festgefahren hat —
// deshalb ein langer Cooldown und die Belohnung nur nach vollständigem Video.
//
// Technik: Das Video läuft in einem DOM-Overlay über dem Canvas (Phaser kann
// keine iframes rendern). Das Ende wird über die YouTube-IFrame-API erkannt;
// ohne bestätigtes Ende gibt es keine Belohnung.

import { Storage } from '../storage/storage.js';

const COOLDOWN_MS = 30 * 60 * 1000;   // 30 Minuten
const REWARD = 100;
const KEY = 'adReward';

// Eigene Trailer
const VIDEOS = ['uyxRNJERa14', 'y-I-yYs_-Tk'];

let apiLoading = null;

// YouTube-IFrame-API einmalig laden
function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiLoading) return apiLoading;

    apiLoading = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            resolve();
        };
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('YouTube-API nicht erreichbar'));
        document.head.appendChild(tag);
        setTimeout(() => reject(new Error('Zeitüberschreitung')), 12000);
    });
    return apiLoading;
}

export const AdReward = {
    lastClaim() {
        return Storage.load(KEY)?.lastClaim ?? 0;
    },

    remainingMs() {
        return Math.max(0, this.lastClaim() + COOLDOWN_MS - Date.now());
    },

    isReady() {
        return this.remainingMs() === 0;
    },

    formatRemaining() {
        const ms = this.remainingMs();
        const min = Math.ceil(ms / 60000);
        return min >= 60 ? `${Math.ceil(min / 60)} h` : `${min} min`;
    },

    _markClaimed() {
        Storage.save(KEY, { lastClaim: Date.now() });
    },

    // onReward(amount) wird nur bei vollständig geschautem Video aufgerufen.
    // onClose() immer beim Schließen.
    open({ onReward, onClose }) {
        if (!this.isReady()) { onClose?.(); return; }

        const videoId = VIDEOS[Math.floor(Math.random() * VIDEOS.length)];
        let rewarded = false;

        // --- Overlay aufbauen ---
        const root = document.createElement('div');
        root.style.cssText = `
            position:fixed; inset:0; z-index:99999;
            background:rgba(0,0,0,.88);
            display:flex; align-items:center; justify-content:center;
            font-family:monospace;`;

        const box = document.createElement('div');
        box.style.cssText = `
            width:min(720px,92vw); background:#06100e;
            border:2px solid #00ffcc; border-radius:8px;
            padding:16px; box-sizing:border-box;`;
        root.appendChild(box);

        const title = document.createElement('div');
        title.textContent = 'UNTERSTÜTZUNG';
        title.style.cssText = 'color:#00ffcc;font-weight:bold;font-size:15px;margin-bottom:4px;';
        box.appendChild(title);

        const sub = document.createElement('div');
        sub.textContent = `Schau den Trailer zu Ende und erhalte ${REWARD} €.`;
        sub.style.cssText = 'color:#7fd8c8;font-size:12px;margin-bottom:12px;';
        box.appendChild(sub);

        const frameWrap = document.createElement('div');
        frameWrap.style.cssText = 'position:relative;padding-top:56.25%;background:#000;';
        const mount = document.createElement('div');
        mount.id = 'weedle-ad-player';
        mount.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        frameWrap.appendChild(mount);
        box.appendChild(frameWrap);

        const status = document.createElement('div');
        status.textContent = 'Video wird geladen…';
        status.style.cssText = 'color:#7fd8c8;font-size:12px;margin-top:12px;min-height:18px;';
        box.appendChild(status);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;margin-top:12px;';
        box.appendChild(row);

        const mkBtn = (label, color) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = `
                flex:1; padding:10px; cursor:pointer; font-family:monospace;
                font-weight:bold; font-size:13px; border-radius:5px;
                background:transparent; border:2px solid ${color}; color:${color};`;
            row.appendChild(b);
            return b;
        };

        const claimBtn = mkBtn(`+${REWARD} € ABHOLEN`, '#00ff88');
        claimBtn.disabled = true;
        claimBtn.style.opacity = '.35';
        claimBtn.style.cursor = 'not-allowed';

        const closeBtn = mkBtn('SCHLIESSEN', '#ff8866');

        document.body.appendChild(root);

        const cleanup = () => {
            try { player?.destroy?.(); } catch { /* egal */ }
            root.remove();
            onClose?.();
        };

        closeBtn.onclick = cleanup;

        claimBtn.onclick = () => {
            if (!rewarded) return;
            this._markClaimed();
            onReward?.(REWARD);
            cleanup();
        };

        const unlockReward = () => {
            rewarded = true;
            status.textContent = 'Danke fürs Zuschauen! Belohnung freigeschaltet.';
            status.style.color = '#00ff88';
            claimBtn.disabled = false;
            claimBtn.style.opacity = '1';
            claimBtn.style.cursor = 'pointer';
        };

        // --- Player starten ---
        let player = null;
        loadYouTubeAPI().then(() => {
            player = new window.YT.Player(mount.id, {
                videoId,
                playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
                events: {
                    onReady: (e) => {
                        status.textContent = 'Läuft…';
                        e.target.playVideo();
                    },
                    onStateChange: (e) => {
                        if (e.data === window.YT.PlayerState.ENDED) unlockReward();
                    },
                    onError: () => {
                        status.textContent = 'Video konnte nicht geladen werden.';
                        status.style.color = '#ff8866';
                    },
                },
            });
        }).catch(() => {
            status.textContent = 'Video konnte nicht geladen werden — bitte später nochmal.';
            status.style.color = '#ff8866';
        });
    },
};
