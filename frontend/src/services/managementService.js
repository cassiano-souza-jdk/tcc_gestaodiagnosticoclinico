export async function obterMinhaUnidade(proprietarioId) {
  return null;
}

export async function obterIndicadoresUnidade(proprietarioId) {
  return null;
}

export async function listarMedicosUnidade(proprietarioId) {
  return [];
}

export async function buscarMedicoPorCrm(crm) {
  const crmLimpo = somenteDigitos(crm);
  if (!crmLimpo) throw new Error("Informe o CRM do médico.");
  const resposta = await requisitarApi(`/medicos/por-crm/${crmLimpo}`);
  const medico = resposta?.medico ?? resposta?.data ?? resposta;
  return {
    id: medico.id ?? medico.usuario_id,
    nome: medico.nome ?? medico.name ?? medico.nome_completo,
    crm: medico.crm ?? crmLimpo,
    cpf: somenteDigitos(medico.cpf || ""),
  };
}

export async function adicionarMedicoUnidade(proprietarioId, crm, medicoId) {
  return requisitarApi("/tenants/minha-unidade/medicos", {
    method: "POST",
    body: JSON.stringify({
      proprietario_id: proprietarioId,
      medico_id: medicoId,
      crm: somenteDigitos(crm),
    }),
  });
}

export async function enviarAutorizacaoMedico({ proprietarioId, medico, contrato }) {
  const formulario = new FormData();
  formulario.append("proprietario_id", proprietarioId);
  formulario.append("medico_id", medico.id);
  formulario.append("crm", somenteDigitos(medico.crm));
  if (contrato.file) formulario.append("contrato", contrato.file);
  else formulario.append("contrato", { uri: contrato.uri, name: contrato.name, type: contrato.mimeType });

  return requisitarApi("/unidades/minha-unidade/autorizacoes", {
    method: "POST",
    body: formulario,
  });
}

export async function removerMedicoUnidade(proprietarioId, medicoId) {
  throw new Error("Rota não implementada no Backend");
}

export async function obterPainelProprietario(proprietarioId) {
  return {
    totalConsultations: 0,
    doctors: [],
    unit: {
      name: "Minha Unidade (Simulada)",
      address: "Sem endereço cadastrado",
      phone: "0000000000",
    },
  };
}
import { requisitarApi } from "./api";
import { somenteDigitos } from "../utils/masks";
