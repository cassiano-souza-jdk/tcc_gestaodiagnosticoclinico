import { URL_API } from './api';
const INTEGRATIONS_URL = `${URL_API}/integrations`;

export async function buscarCep(cep) {
  try {
    const resposta = await fetch(`${INTEGRATIONS_URL}/viacep/${cep}`);
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  }
}

export async function buscarEnderecos(termo) {
  // O proxy atual de ViaCEP ainda não disponibiliza busca textual.
  return [];
}

export async function buscarCeps(termo) {
  return [];
}

export async function validarEnderecoCep(cep, enderecoInformado = "") {
  const dados = await buscarCep(cep);
  if (!dados || dados.erro) return { valid: false, reason: "CEP não localizado." };
  const endereco = `${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`;
  return { valid: true, address: endereco, endereco };
}
