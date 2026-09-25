import { URL_API } from './api';
const INTEGRATIONS_URL = `${URL_API}/integrations`;

export async function buscarCids(termo = "") {
  try {
    const resposta = await fetch(`${INTEGRATIONS_URL}/cid?query=${encodeURIComponent(termo)}`);
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch {
    return [];
  }
}
