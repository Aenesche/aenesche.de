import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  "https://suhqzygjzedopqcwttpz.supabase.co",
  "sb_publishable_B3Kv9E-EqAsiG0PwWlJNMQ_yNC76Lqx",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage, // wichtig auf iOS/Safari
    }
  }
);

//import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

//const SUPABASE_URL = "https://suhqzygjzedopqcwttpz.supabase.co";
//const SUPABASE_ANON_KEY = "sb_publishable_B3Kv9E-EqAsiG0PwWlJNMQ_yNC76Lqx";

//export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
