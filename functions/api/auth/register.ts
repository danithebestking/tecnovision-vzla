import { json } from "../../_utils";

export async function onRequestPost() {
  return json({ error: "Registro deshabilitado" }, { status: 403 });
}
