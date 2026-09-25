import { URL_API } from './api';
const INTEGRATIONS_URL = `${URL_API}/integrations`;

export async function buscarMedicamentos(termo = "") {
  try {
    const resposta = await fetch(`${INTEGRATIONS_URL}/sngpc?query=${encodeURIComponent(termo)}`);
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch {
    return [];
  }
}
