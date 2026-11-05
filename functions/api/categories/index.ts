import { json, badRequest, unauthorized, getToken } from "../../_utils";

async function isAdmin(env: any, request: Request) {
  const token = getToken(request);
  if (!token) return false;
  const { results } = await env.DB.prepare("SELECT username, password_hash FROM admin_users").all();
  for (const r of results || []) {
    if (token.startsWith(r.password_hash + ".")) return true;
  }
  return false;
}

export async function onRequestGet(context: any) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare("SELECT id, label, icon, is_custom as isCustom FROM categories ORDER BY is_custom ASC, label ASC").all();
    return json({ categories: results || [] });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const label = String(body.label || "").trim();
    const icon = String(body.icon || "🏷️").trim().slice(0, 4) || "🏷️";
    if (!label) return badRequest("Nombre requerido");
    let id = String(body.id || label).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!id) return badRequest("ID inválido");
    const exists = await env.DB.prepare("SELECT id FROM categories WHERE id=?").bind(id).first();
    if (exists) return badRequest("Ya existe esa categoría");
    await env.DB.prepare("INSERT INTO categories (id, label, icon, is_custom) VALUES (?,?,?,1)").bind(id, label, icon).run();
    return json({ ok: true, id });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const { env, request } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) return badRequest("ID requerido");
    const cat = await env.DB.prepare("SELECT is_custom FROM categories WHERE id=?").bind(id).first();
    if (!cat) return badRequest("No existe");
    if (cat.is_custom !== 1) return badRequest("No se puede eliminar categoría base");
    const used = await env.DB.prepare("SELECT COUNT(*) as c FROM products WHERE category=?").bind(id).first();
    if ((used as any)?.c > 0) return badRequest("Hay productos usando esta categoría");
    await env.DB.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}
