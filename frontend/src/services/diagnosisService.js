import { requisitarApi } from "./api";
import { somenteDigitos } from "../utils/masks";

async function requisitarComAlternativas(alternativas) {
  let ultimoErro = null;

  for (const alternativa of alternativas) {
    try {
      return await requisitarApi(alternativa.rota, alternativa.opcoes);
    } catch (erro) {
      ultimoErro = erro;
    }
  }

  throw ultimoErro || new Error("Não foi possível comunicar com a API.");
}

function normalizarPaciente(paciente, cpfInformado = "") {
  if (!paciente) return null;

  const id = paciente.id ?? paciente.usuarioId ?? paciente.userId;
  const nome = paciente.nome ?? paciente.name ?? "";
  const cpf = somenteDigitos(paciente.cpf ?? cpfInformado);
  return { id, nome, name: nome, cpf };
}

function normalizarMedicamento(medicamento = {}) {
  const id = medicamento.id ?? medicamento.medicationId;
  const nome = medicamento.nome ?? medicamento.name ?? "";
  const dose = medicamento.dose ?? medicamento.dosage ?? "";
  const frequencia = medicamento.frequencia ?? medicamento.frequency ?? "";
  const duracao = medicamento.duracao ?? medicamento.duration ?? "";
  const observacao = medicamento.observacao ?? medicamento.observation ?? "";
  return {
    id, medicamentoId: id, medicationId: id, nome, name: nome, dose, dosage: dose,
    frequencia, frequency: frequencia, duracao, duration: duracao, observacao, observation: observacao,
  };
}

function normalizarDiagnostico(diagnostico = {}) {
  const cidRecebido = diagnostico.cid;
  const cid = String(typeof cidRecebido === "object" ? (cidRecebido?.code ?? cidRecebido?.codigo ?? "") : (cidRecebido ?? diagnostico.codigoCid ?? ""));
  const tituloCid = String(typeof cidRecebido === "object" ? (cidRecebido?.title ?? cidRecebido?.titulo ?? "") : (diagnostico.cidTitle ?? diagnostico.tituloCid ?? ""));
  const pacienteId = diagnostico.pacienteId ?? diagnostico.patientId ?? diagnostico.paciente_id;
  const pacienteNome = diagnostico.pacienteNome ?? diagnostico.patientName ?? diagnostico.paciente?.nome ?? diagnostico.patient?.name ?? "";
  const pacienteCpf = diagnostico.pacienteCpf ?? diagnostico.patientCpf ?? diagnostico.paciente?.cpf ?? diagnostico.patient?.cpf ?? "";
  const medicoId = diagnostico.medicoId ?? diagnostico.doctorId ?? diagnostico.medico_id;
  const medicoNome = diagnostico.medicoNome ?? diagnostico.doctorName ?? diagnostico.medico?.nome ?? diagnostico.doctor?.name ?? "";
  const medicoCrm = diagnostico.medicoCrm ?? diagnostico.doctorCrm ?? diagnostico.medico?.crm ?? diagnostico.doctor?.crm ?? "";
  const unidadeId = diagnostico.unidadeId ?? diagnostico.unitId ?? diagnostico.tenant_id;
  const unidadeNome = diagnostico.unidadeNome ?? diagnostico.unitName ?? diagnostico.unidade?.nome ?? diagnostico.unit?.name ?? "";
  const linhaTempoId = diagnostico.linhaTempoId ?? diagnostico.timelineId ?? diagnostico.linha_tempo_id ?? null;
  const linhaTempoNome = diagnostico.linhaTempoNome ?? diagnostico.timelineName ?? "";
  const titulo = diagnostico.titulo ?? diagnostico.title ?? "";
  const descricao = diagnostico.descricao ?? diagnostico.description ?? "";
  const medicamentos = (diagnostico.medicamentos ?? diagnostico.medications ?? []).map(normalizarMedicamento);
  const criadoEm = diagnostico.criadoEm ?? diagnostico.createdAt ?? diagnostico.dataCriacao ?? diagnostico.created_at ?? "";
  const tipoTenant = diagnostico.tipoTenant ?? diagnostico.tipo_tenant ?? "CLINICA";

  return {
    id: diagnostico.id ?? diagnostico.diagnostico_id, pacienteId, patientId: pacienteId, pacienteNome, patientName: pacienteNome,
    pacienteCpf, patientCpf: pacienteCpf, medicoId, doctorId: medicoId, medicoNome, doctorName: medicoNome,
    medicoCrm, doctorCrm: medicoCrm, unidadeId, unitId: unidadeId, unidadeNome, unitName: unidadeNome,
    linhaTempoId, timelineId: linhaTempoId, linhaTempoNome, timelineName: linhaTempoNome, titulo, title: titulo,
    cid: cid || String(diagnostico.codigo_cid ?? ""), tituloCid, cidTitle: tituloCid, descricao, description: descricao, medicamentos, medications: medicamentos,
    criadoEm, createdAt: criadoEm, tipoTenant, tipo_tenant: tipoTenant,
  };
}

function normalizarLinhaTempo(linhaTempo = {}) {
  const pacienteId = linhaTempo.pacienteId ?? linhaTempo.patientId;
  const nome = linhaTempo.nome ?? linhaTempo.name ?? "";
  const diagnosticos = (linhaTempo.diagnosticos ?? linhaTempo.diagnoses ?? []).map(normalizarDiagnostico);
  return { id: linhaTempo.id, pacienteId, patientId: pacienteId, nome, name: nome, diagnosticos, diagnoses: diagnosticos };
}

function normalizarUnidade(unidade = {}) {
  const nome = unidade.nome ?? unidade.name ?? "";
  const endereco = unidade.endereco ?? unidade.address ?? "";
  const numero = unidade.numero ?? unidade.number ?? "";
  const telefone = unidade.telefone ?? unidade.phone ?? "";
  const tipoTenant = unidade.tipoTenant ?? unidade.tipo_tenant ?? "CLINICA";
  return {
    id: unidade.id, nome, name: nome, cep: unidade.cep ?? "",
    endereco, address: endereco, numero, number: numero, telefone, phone: telefone,
    logoUri: unidade.logoUri ?? unidade.logo ?? null, tipoTenant, tipo_tenant: tipoTenant,
  };
}

function extrairDiagnosticosResposta(resposta) {
  return Array.isArray(resposta)
    ? resposta
    : resposta?.data ?? resposta?.items ?? resposta?.diagnosticos ?? resposta?.diagnoses ?? [];
}

async function listarTodasPaginasDiagnosticos(unidadeId) {
  const diagnosticos = [];
  const cursoresConsumidos = new Set();
  let pageState = null;

  while (true) {
    if (pageState) {
      if (cursoresConsumidos.has(pageState)) break;
      cursoresConsumidos.add(pageState);
    }

    const parametroPageState = pageState ? `&pageState=${encodeURIComponent(pageState)}` : "";
    const resposta = await requisitarApi(`/diagnosticos?limit=100${parametroPageState}`, {
      headers: { "X-Tenant-ID": unidadeId },
    });

    diagnosticos.push(...extrairDiagnosticosResposta(resposta));
    pageState = resposta?.pageState || null;

    if (!pageState) break;
  }

  return diagnosticos;
}

export async function buscarPacientePorCpf(cpf) {
  const cpfLimpo = somenteDigitos(cpf);
  if (cpfLimpo.length !== 11) return null;

  try {
    const resposta = await requisitarApi(`/usuarios/cpf/${cpfLimpo}`);
    return normalizarPaciente(resposta, cpfLimpo);
  } catch {
    return null;
  }
}

export async function buscarPacientes(termo = "") {
  const termoLimpo = termo.trim();
  if (!termoLimpo) return [];

  const cpf = somenteDigitos(termoLimpo);
  if (cpf.length === 11) {
    const paciente = await buscarPacientePorCpf(cpf);
    return paciente ? [paciente] : [];
  }

  try {
    const resposta = await requisitarApi(`/pacientes?busca=${encodeURIComponent(termoLimpo)}`);
    const pacientes = Array.isArray(resposta) ? resposta : resposta?.items ?? resposta?.pacientes ?? [];
    return pacientes.map((paciente) => normalizarPaciente(paciente)).filter((paciente) => paciente?.id);
  } catch {
    return [];
  }
}

export async function listarDiagnosticos(usuario) {
  if (!usuario?.id) return [];

  try {
    const papelUsuario = usuario.papel ?? usuario.role;
    const unidadeId = usuario.unidadeId ?? usuario.unitId ?? usuario.tenant_id;
    if (!unidadeId) return [];

    let diagnosticos;
    if (papelUsuario === "paciente") {
      const resposta = await requisitarApi(`/pacientes/${usuario.id}/diagnosticos`, {
        headers: { "X-Tenant-ID": unidadeId },
      });
      diagnosticos = extrairDiagnosticosResposta(resposta);
    } else {
      diagnosticos = await listarTodasPaginasDiagnosticos(unidadeId);
    }

    return diagnosticos.map(normalizarDiagnostico);
  } catch {
    return [];
  }
}

export async function listarDiagnosticosPaciente(pacienteId, unidadeId) {
  if (!pacienteId || !unidadeId) return [];

  try {
    const resposta = await requisitarApi(`/pacientes/${pacienteId}/diagnosticos`, {
      headers: { "X-Tenant-ID": unidadeId },
    });
    const diagnosticos = extrairDiagnosticosResposta(resposta);
    return diagnosticos.map(normalizarDiagnostico);
  } catch {
    return [];
  }
}

export async function criarDiagnostico({
  pacienteId,
  medicoId,
  unidadeId,
  tipoTenant,
  linhaTempoId = null,
  titulo,
  cid,
  tituloCid = "",
  descricao,
  medicamentos = [],
}) {
  if (!pacienteId) throw new Error("Paciente não informado para o diagnóstico.");

  const corpoApi = {
    paciente_id: pacienteId,
    medico_id: medicoId,
    tenant_id: unidadeId,
    tipo_tenant: tipoTenant,
    linha_tempo_id: linhaTempoId,
    titulo,
    codigo_cid: String(cid || "").toUpperCase(),
    titulo_cid: tituloCid,
    descricao,
    medicamentos: medicamentos.map((medicamento) => ({
      medicamento_id: medicamento.id ?? medicamento.medicamentoId,
      nome: medicamento.nome ?? medicamento.name ?? "",
      dose: medicamento.dose ?? medicamento.dosage ?? "",
      frequencia: medicamento.frequencia ?? medicamento.frequency ?? "",
      duracao: medicamento.duracao ?? medicamento.duration ?? "",
      observacao: medicamento.observacao ?? medicamento.observation ?? "",
    })),
  };

  const resposta = await requisitarApi("/diagnosticos", {
    method: "POST",
    body: JSON.stringify(corpoApi),
    headers: tipoTenant === "CLINICA" && unidadeId ? { "X-Tenant-ID": unidadeId } : {},
  });
  return normalizarDiagnostico(resposta?.data ?? resposta?.diagnostico ?? resposta);
}

export async function atualizarDiagnostico(diagnosticoId, dados) {
  if (!diagnosticoId) throw new Error("Diagnóstico não informado para edição.");

  const corpoApi = {
    paciente_id: dados.pacienteId,
    medico_id: dados.medicoId,
    tenant_id: dados.unidadeId,
    tipo_tenant: dados.tipoTenant,
    linha_tempo_id: dados.linhaTempoId || null,
    titulo: dados.titulo,
    codigo_cid: String(dados.cid || "").toUpperCase(),
    titulo_cid: dados.tituloCid || "",
    descricao: dados.descricao,
    medicamentos: (dados.medicamentos || []).map((medicamento) => ({
      medicamento_id: medicamento.id ?? medicamento.medicamentoId,
      nome: medicamento.nome ?? medicamento.name ?? "",
      dose: medicamento.dose ?? medicamento.dosage ?? "",
      frequencia: medicamento.frequencia ?? medicamento.frequency ?? "",
      duracao: medicamento.duracao ?? medicamento.duration ?? "",
      observacao: medicamento.observacao ?? medicamento.observation ?? "",
    })),
  };

  const resposta = await requisitarApi(`/diagnosticos/${diagnosticoId}`, {
    method: "PUT",
    body: JSON.stringify(corpoApi),
    headers: dados.tipoTenant === "CLINICA" && dados.unidadeId ? { "X-Tenant-ID": dados.unidadeId } : {},
  });
  return normalizarDiagnostico(resposta?.data ?? resposta?.diagnostico ?? resposta);
}

export async function listarLinhasTempo(pacienteId) {
  if (!pacienteId) return [];

  try {
    const resposta = await requisitarComAlternativas([
      { rota: `/linhas-tempo?pacienteId=${encodeURIComponent(pacienteId)}` },
    ]);
    const linhas = Array.isArray(resposta) ? resposta : resposta?.items ?? resposta?.linhasTempo ?? resposta?.timelines ?? [];
    return linhas.map(normalizarLinhaTempo);
  } catch {
    return [];
  }
}

export async function criarLinhaTempo({ pacienteId, medicoId, nome, diagnosticoIds = [] }) {
  const corpoApi = {
    patientId: pacienteId,
    doctorId: medicoId,
    name: nome,
    diagnosisIds: diagnosticoIds,
  };

  const resposta = await requisitarComAlternativas([
    { rota: "/linhas-tempo", opcoes: { method: "POST", body: JSON.stringify(corpoApi) } },
  ]);
  return normalizarLinhaTempo(resposta?.linhaTempo ?? resposta?.timeline ?? resposta);
}

export async function vincularDiagnosticosLinhaTempo({ linhaTempoId, pacienteId, diagnosticoIds = [] }) {
  return requisitarComAlternativas([
    {
      rota: `/linhas-tempo/${linhaTempoId}/diagnosticos`,
      opcoes: {
        method: "PUT",
        body: JSON.stringify({ patientId: pacienteId, diagnosisIds: diagnosticoIds }),
      },
    },
  ]);
}

export async function listarUnidadesMedico(medicoId) {
  if (!medicoId) return [];

  const resposta = await requisitarComAlternativas([
    { rota: "/tenants/me" },
  ]);
  const unidades = Array.isArray(resposta) ? resposta : resposta?.units ?? resposta?.unidades ?? [resposta];
  return unidades.filter(Boolean).map(normalizarUnidade);
}

export async function obterRecomendacoesIA(cidCode, unidadeId) {
  if (!cidCode) return [];
  try {
    const headers = unidadeId ? { "X-Tenant-ID": unidadeId } : {};
    const resposta = await requisitarApi(`/diagnosticos/ia/recomendacoes?cid=${encodeURIComponent(cidCode)}`, { headers });
    return resposta?.data ?? [];
  } catch {
    return [];
  }
}

export async function enviarFeedbackIA(cid, medicamentoNome, notaEficacia) {
  try {
    await requisitarApi(`/diagnosticos/ia/feedback`, {
      method: 'POST',
      body: JSON.stringify({ cid, medicamento_nome: medicamentoNome, nota_eficacia: notaEficacia })
    });
  } catch (error) {
    console.error("Erro ao enviar feedback da IA:", error);
  }
}


