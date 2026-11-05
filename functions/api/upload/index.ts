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

export async function onRequestPost(context: any) {
  const { env, request } = context;
  if (!(await isAdmin(env, request))) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    // Por ahora guardamos la dataURL tal como viene (funciona). 
    // Si después configuras R2, aquí subes el archivo.
    const dataUrl = String(body.dataUrl || body.image || "");
    if (!dataUrl.startsWith("data:image/")) return badRequest("Imagen inválida");
    return json({ ok: true, url: dataUrl });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, { status: 500 });
  }
}
