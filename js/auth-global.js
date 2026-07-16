/* ============================================================
   aenesche.de — Globales Login (Supabase)

   Einbinden auf jeder Seite, die Login braucht (Reihenfolge!):
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="/js/auth-global.js"></script>

   Geschützte Seite? Ganz oben im eigenen Script:
   const session = await aeAuth.requireAuth();
   → leitet automatisch zum Login um, wenn keine Session da ist.
   ============================================================ */
(function () {
  const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';

  // Nur EINEN Client pro Seite erzeugen (wichtig, falls eine Seite
  // schon selbst einen Client baut — dann diesen wiederverwenden)
  window.sbClient = window.sbClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const client = window.sbClient;

  // Wohin umgeleitet wird, wenn Login fehlt:
  const LOGIN_PAGE = '/projects/index.html';

  async function getSession() {
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    await client.auth.signOut();
  }

  /* Guard für geschützte Seiten. Gibt die Session zurück oder
     leitet zur Projektseite um (mit Rücksprung nach dem Login). */
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      const target = encodeURIComponent(location.pathname + location.search);
      location.replace(LOGIN_PAGE + '?login=1&redirect=' + target);
      return null;
    }
    return session;
  }

  /* Callback bei Login/Logout (auch aus anderen Tabs) */
  function onChange(callback) {
    client.auth.onAuthStateChange((_event, session) => callback(session));
  }

  window.aeAuth = { client, getSession, getUser, signIn, signUp, signOut, requireAuth, onChange };
})();
