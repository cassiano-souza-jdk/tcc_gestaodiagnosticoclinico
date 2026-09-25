import { URL_API } from "./api";

export async function buscarCids(termo = "") {
  try {
    const resposta = await fetch(`${URL_API}/integrations/cid?query=${encodeURIComponent(termo)}`);
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch {
    return [];
  }
}
