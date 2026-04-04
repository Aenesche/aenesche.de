// scenes/LoginScene.js
class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    const { width, height } = this.scale;
    const save = this.game.registry.get('save');

    // Background
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.add.text(width / 2, height * 0.2, '🌿 WEED TYCOON', {
      fontSize: '32px', fontFamily: 'Courier New', color: '#4ade80'
    }).setOrigin(0.5);

    // Info text
    this.add.text(width / 2, height * 0.35, 'Login für Cloud-Saves\n(optional)', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#888', align: 'center'
    }).setOrigin(0.5);

    // --- HTML Form Overlay ---
    this.loginForm = this.add.dom(width / 2, height * 0.55).createFromHTML(`
      <div style="text-align:center; font-family: 'Courier New', monospace;">
        <input id="login-email" type="email" placeholder="Email"
          style="display:block; margin:6px auto; padding:8px 12px; width:220px;
                 background:#1a1a2e; color:#e0e0e0; border:1px solid #4ade80;
                 font-family:'Courier New'; font-size:13px; border-radius:3px;">
        <input id="login-pass" type="password" placeholder="Passwort"
          style="display:block; margin:6px auto; padding:8px 12px; width:220px;
                 background:#1a1a2e; color:#e0e0e0; border:1px solid #4ade80;
                 font-family:'Courier New'; font-size:13px; border-radius:3px;">
        <button id="btn-login"
          style="margin:8px 4px; padding:8px 20px; background:#4ade80; color:#0a0a0a;
                 border:none; font-family:'Courier New'; font-weight:bold; cursor:pointer;
                 border-radius:3px; font-size:13px;">Login</button>
        <button id="btn-signup"
          style="margin:8px 4px; padding:8px 20px; background:#1a1a2e; color:#4ade80;
                 border:1px solid #4ade80; font-family:'Courier New'; cursor:pointer;
                 border-radius:3px; font-size:13px;">Registrieren</button>
        <p id="login-msg" style="color:#f87171; font-size:11px; margin-top:8px;"></p>
      </div>
    `);

    // Button handlers
    this.loginForm.addListener('click');
    this.loginForm.on('click', async (event) => {
      const email = document.getElementById('login-email')?.value;
      const pass = document.getElementById('login-pass')?.value;
      const msg = document.getElementById('login-msg');

      if (event.target.id === 'btn-login') {
        if (!email || !pass) { msg.textContent = 'Email und Passwort eingeben'; return; }
        const { data, error } = await save.signIn(email, pass);
        if (error) { msg.textContent = error.message || 'Login fehlgeschlagen'; return; }
        save.setUser(data.user.id);
        this._goToMenu();
      }

      if (event.target.id === 'btn-signup') {
        if (!email || !pass) { msg.textContent = 'Email und Passwort eingeben'; return; }
        const { data, error } = await save.signUp(email, pass);
        if (error) { msg.textContent = error.message || 'Registrierung fehlgeschlagen'; return; }
        msg.style.color = '#4ade80';
        msg.textContent = 'Check deine Email!';
      }
    });

    // Skip button
    const skipBtn = this.add.text(width / 2, height * 0.85, '[ Ohne Login spielen ]', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipBtn.on('pointerover', () => skipBtn.setColor('#4ade80'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#666'));
    skipBtn.on('pointerdown', () => this._goToMenu());
  }

  _goToMenu() {
    if (this.loginForm) this.loginForm.destroy();
    this.scene.start('MainMenuScene');
  }
}
