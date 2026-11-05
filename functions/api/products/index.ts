import { json, badRequest, unauthorized, getToken, hashPassword } from "../../_utils";

async function isAdmin(env: any, request: Request) {
  const token = getToken(request);
  if (!token) return false;
  // Verificar que hay al menos un admin y el token coincide con algún hash
  const { results } = await env.DB.prepare("SELECT username, password_hash FROM admin_users").all();
  for (const r of results || []) {
    if (token.startsWith(r.password_hash + ".")) return true;
  }
  return false;
}

export async function onRequestGet(context: any) {
  const { env } = context;
  try {
    const { results } = await env.DB
      .prepare("SELECT id, name, category, price, old_price as oldPrice, rating, reviews, icon, badge, stock, image, description as desc FROM products ORDER BY id ASC")
      .all();
    return json({ products: results || [] });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const price = Number(body.price);
    if (!name || !category || !(price > 0)) return badRequest("Datos incompletos");
    const oldPrice = body.oldPrice === null || body.oldPrice === "" ? null : Number(body.oldPrice);
    const rating = body.rating == null ? 4.5 : Number(body.rating);
    const reviews = body.reviews == null ? 0 : Number(body.reviews);
    const icon = String(body.icon || "📦").trim() || "📦";
    const badge = body.badge ? String(body.badge) : null;
    const stock = body.stock == null ? 0 : Number(body.stock);
    const image = body.image ? String(body.image) : null;
    const desc = String(body.desc || body.description || "Sin descripción.").trim();
    const res = await env.DB
      .prepare("INSERT INTO products (name, category, price, old_price, rating, reviews, icon, badge, stock, image, description, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now'))")
      .bind(name, category, price, oldPrice, rating, reviews, icon, badge, stock, image, desc)
      .run();
    const id = res?.meta?.last_row_id;
    return json({ ok: true, id });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}
