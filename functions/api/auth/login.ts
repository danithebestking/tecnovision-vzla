import { json, badRequest, unauthorized, hashPassword } from "../../_utils";

export async function onRequestPost(context: any) {
  const { env, request } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return badRequest("Usuario y contraseña requeridos");

    const db = env.DB;
    const row = await db
      .prepare("SELECT id, username, password_hash, hint FROM admin_users WHERE lower(username) = lower(?) LIMIT 1")
      .bind(username)
      .first();

    if (!row) return unauthorized("Usuario o contraseña incorrectos");
    const hash = await hashPassword(username, password);
    if (hash !== row.password_hash) return unauthorized("Usuario o contraseña incorrectos");

    // Token simple - para este caso es suficiente
    const token = hash + "." + Date.now().toString(36);
    return json({ ok: true, token, user: row.username, hint: row.hint || "" });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}
