export function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(msg: string) {
  return json({ error: msg }, { status: 400 });
}

export function unauthorized(msg = "No autorizado") {
  return json({ error: msg }, { status: 401 });
}

export function notFound(msg = "No encontrado") {
  return json({ error: msg }, { status: 404 });
}

export function methodNotAllowed() {
  return json({ error: "Método no permitido" }, { status: 405 });
}

export async function hashPassword(user: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode("tvzla::" + user.toLowerCase() + "::" + pass);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  try {
    const url = new URL(request.url);
    const t = url.searchParams.get("token");
    if (t) return t.trim();
  } catch (_) {}
  return null;
}
