import { supabase } from "./supabaseClient.js";

export async function initAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userTag = document.getElementById("userTag");
  export async function initAuthUI() {
  await supabase.auth.getSession();   // 👈 WICHTIG hinzufügen

  if (!loginBtn || !logoutBtn || !userTag) {
    console.warn("[auth] missing UI elements");
    return;
  }

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (user) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "";
      userTag.style.display = "";
      userTag.textContent = user.email ?? "logged in";
    } else {
      loginBtn.style.display = "";
      logoutBtn.style.display = "none";
      userTag.style.display = "none";
      userTag.textContent = "";
    }
  }

  loginBtn.addEventListener("click", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    alert("Du bist schon eingeloggt ✅");
    return;
  }

  const email = prompt("Email für Login:");
  if (!email) return;

  const redirectTo = window.location.origin + window.location.pathname;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) {
    alert("Login-Fehler: " + error.message);
  } else {
    alert("Link an deine Email gesendet ✅");
  }
});

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    await refresh();
  });

  supabase.auth.onAuthStateChange(() => refresh());
  await refresh();
}
