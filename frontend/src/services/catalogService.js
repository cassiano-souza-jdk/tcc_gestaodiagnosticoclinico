import { URL_API } from "./api";

export async function buscarMedicamentos(termo = "") {
  try {
    const resposta = await fetch(`${URL_API}/integrations/sngpc?query=${encodeURIComponent(termo)}`);
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch {
    return [];
  }
}
