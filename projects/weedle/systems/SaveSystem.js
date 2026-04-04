// systems/SaveSystem.js
class SaveSystem {
  constructor() {
    // Supabase client – credentials set during login
    this.supabase = null;
    this.userId = null;
    this.autoSaveTimer = null;
    this.lastSave = null;
  }

  init(supabaseUrl, supabaseKey) {
    if (window.supabase) {
      this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('[Save] Supabase SDK nicht geladen – nur Local Save');
    }
  }

  setUser(userId) {
    this.userId = userId;
  }

  // --- Cloud Save ---

  async saveToCloud(economy, upgrades, police, audio) {
    if (!this.supabase || !this.userId) {
      this._saveLocal(economy, upgrades, police, audio);
      return;
    }

    const data = {
      user_id: this.userId,
      economy: economy.toJSON(),
      upgrades: upgrades.toJSON(),
      police: police.toJSON(),
      settings: audio.getSettings(),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await this.supabase
        .from('saves')
        .upsert(data, { onConflict: 'user_id' });

      if (error) throw error;
      this.lastSave = Date.now();
      console.log('[Save] Cloud save ✓');
    } catch (err) {
      console.warn('[Save] Cloud save failed, falling back to local:', err.message);
      this._saveLocal(economy, upgrades, police, audio);
    }
  }

  async loadFromCloud() {
    if (!this.supabase || !this.userId) {
      return this._loadLocal();
    }

    try {
      const { data, error } = await this.supabase
        .from('saves')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error) throw error;
      if (data) {
        console.log('[Save] Cloud load ✓');
        return data;
      }
    } catch (err) {
      console.warn('[Save] Cloud load failed, trying local:', err.message);
    }

    return this._loadLocal();
  }

  // --- Local Save (Fallback) ---

  _saveLocal(economy, upgrades, police, audio) {
    const data = {
      economy: economy.toJSON(),
      upgrades: upgrades.toJSON(),
      police: police.toJSON(),
      settings: audio.getSettings(),
      updated_at: new Date().toISOString()
    };
    try {
      localStorage.setItem('weedtycoon_save', JSON.stringify(data));
      this.lastSave = Date.now();
      console.log('[Save] Local save ✓');
    } catch (e) {
      console.warn('[Save] Local save failed:', e.message);
    }
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem('weedtycoon_save');
      if (raw) {
        console.log('[Save] Local load ✓');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Save] Local load failed:', e.message);
    }
    return null;
  }

  // --- Auto-Save ---

  startAutoSave(scene, economy, upgrades, police, audio) {
    this.stopAutoSave();
    this.autoSaveTimer = scene.time.addEvent({
      delay: BALANCE.autoSaveInterval,
      callback: () => this.saveToCloud(economy, upgrades, police, audio),
      loop: true
    });
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      this.autoSaveTimer.destroy();
      this.autoSaveTimer = null;
    }
  }

  // --- Auth Helpers ---

  async signUp(email, password) {
    if (!this.supabase) return { error: 'Kein Supabase' };
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email, password) {
    if (!this.supabase) return { error: 'Kein Supabase' };
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this.userId = null;
  }

  async getSession() {
    if (!this.supabase) return null;
    const { data } = await this.supabase.auth.getSession();
    return data?.session || null;
  }
}
