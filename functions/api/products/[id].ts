import { json, badRequest, unauthorized, notFound, getToken } from "../../_utils";

async function isAdmin(env: any, request: Request) {
  const token = getToken(request);
  if (!token) return false;
  const { results } = await env.DB.prepare("SELECT username, password_hash FROM admin_users").all();
  for (const r of results || []) {
    if (token.startsWith(r.password_hash + ".")) return true;
  }
  return false;
}

export async function onRequestPut(context: any) {
  const { env, request, params } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  const id = Number(params.id);
  if (!id) return badRequest("ID inválido");
  try {
    const body = await request.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) { fields.push("name=?"); values.push(String(body.name).trim()); }
    if (body.category !== undefined) { fields.push("category=?"); values.push(String(body.category).trim()); }
    if (body.price !== undefined) { fields.push("price=?"); values.push(Number(body.price)); }
    if (body.oldPrice !== undefined) { fields.push("old_price=?"); values.push(body.oldPrice === null || body.oldPrice === "" ? null : Number(body.oldPrice)); }
    if (body.rating !== undefined) { fields.push("rating=?"); values.push(Number(body.rating)); }
    if (body.reviews !== undefined) { fields.push("reviews=?"); values.push(Number(body.reviews)); }
    if (body.icon !== undefined) { fields.push("icon=?"); values.push(String(body.icon).trim() || "📦"); }
    if (body.badge !== undefined) { fields.push("badge=?"); values.push(body.badge ? String(body.badge) : null); }
    if (body.stock !== undefined) { fields.push("stock=?"); values.push(Number(body.stock)); }
    if (body.image !== undefined) { fields.push("image=?"); values.push(body.image ? String(body.image) : null); }
    if (body.desc !== undefined || body.description !== undefined) { fields.push("description=?"); values.push(String(body.desc || body.description || "").trim()); }
    if (fields.length === 0) return badRequest("Sin cambios");
    fields.push("updated_at=datetime('now')");
    values.push(id);
    const res = await env.DB.prepare(`UPDATE products SET ${fields.join(",")} WHERE id=?`).bind(...values).run();
    if (res?.meta?.changes === 0) return notFound();
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const { env, request, params } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  const id = Number(params.id);
  if (!id) return badRequest("ID inválido");
  try {
    const res = await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
    if (res?.meta?.changes === 0) return notFound();
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}
