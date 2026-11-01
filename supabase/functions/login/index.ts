// Edge Function «login»: entrar con @usuario + contraseña sin que el correo salga nunca del servidor.
// Despliegue: panel de Supabase → Edge Functions → Deploy a new function → nombre «login» → pega este archivo.
// IMPORTANTE: desactiva «Verify JWT» en esa función (la web usa la clave publishable, que no es un JWT).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya existen dentro de la función; no las pongas en la web.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const url = Deno.env.get("SUPABASE_URL")!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, opts);
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

// Límite de intentos por usuario: 5 por minuto. Se guarda en memoria de la instancia, así que es un freno
// razonable contra fuerza bruta, no una garantía estricta (Supabase Auth aplica además sus propios límites).
const tries = new Map<string, number[]>();
const MAX = 5, WINDOW = 60_000;
function limited(k: string) {
  const now = Date.now();
  const l = (tries.get(k) || []).filter((t) => now - t < WINDOW);
  l.push(now);
  tries.set(k, l);
  if (tries.size > 5000) for (const [key, v] of tries) if (!v.some((t) => now - t < WINDOW)) tries.delete(key);
  return l.length > MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: { id?: unknown; password?: unknown };
  try { b = await req.json(); } catch { return json({ error: "body" }, 400); }

  const id = String(b?.id ?? "").trim().toLowerCase().replace(/^@/, "");
  const password = String(b?.password ?? "");
  if (!/^[a-z0-9_]{3,15}$/.test(id) || !password || password.length > 200) return json({ error: "invalid" }, 401);
  if (limited(id)) return json({ error: "rate" }, 429);

  // Mismo error si el usuario no existe o la contraseña falla: no se revela qué usuarios existen.
  const { data: p } = await admin.from("profiles").select("id").eq("usuario", id).maybeSingle();
  if (!p) return json({ error: "invalid" }, 401);
  const { data: u } = await admin.auth.admin.getUserById(p.id);
  const email = u?.user?.email;
  if (!email) return json({ error: "invalid" }, 401);

  const { data, error } = await createClient(url, anon, opts).auth.signInWithPassword({ email, password });
  if (error || !data.session) return json({ error: /not confirmed/i.test(error?.message || "") ? "unconfirmed" : "invalid" }, 401);
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
