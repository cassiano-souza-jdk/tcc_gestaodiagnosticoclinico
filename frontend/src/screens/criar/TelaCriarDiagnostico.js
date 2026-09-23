import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Tela from "../../components/Tela";
import CampoApp from "../../components/CampoApp";
import BotaoPrimario from "../../components/BotaoPrimario";
import ModalSeletorMedicamento from "../../components/ModalSeletorMedicamento";
import BuscaCidEmLinha from "../../components/BuscaCidEmLinha";
import { usarAutenticacao } from "../../contexts/AuthenticationContext";
import {
  criarDiagnostico,
  atualizarDiagnostico,
  criarLinhaTempo,
  listarUnidadesMedico,
  listarDiagnosticosPaciente,
  listarLinhasTempo,
  buscarPacientes,
  obterRecomendacoesIA,
} from "../../services/diagnosisService";
import { mascararCpf, formatarDataBr } from "../../utils/masks";

function BotaoAcaoResponsivo({ icone, rotulo, desabilitado, aoPressionar, compacto }) {
  return (
    <Pressable
      disabled={desabilitado}
      onPress={aoPressionar}
      accessibilityLabel={rotulo}
      className={`flex-row items-center justify-center rounded-xl px-3 py-2 ${desabilitado ? "bg-slate-200" : "bg-mint-600"}`}
    >
      <Ionicons name={icone} size={20} color="#FFFFFF" />
      {!compacto ? <Text className="ml-2 font-bold text-white">{rotulo}</Text> : null}
    </Pressable>
  );
}

export default function TelaCriarDiagnostico({ navigation: navegacao }) {
  const { usuario, edicaoDiagnostico, concluirEdicaoDiagnostico } = usarAutenticacao();
  const modoEdicao = !!edicaoDiagnostico;
  const { width: largura } = useWindowDimensions();
  const telaLarga = largura >= 900;
  const acoesCompactas = largura < 640;

  const [unidades, definirUnidades] = useState([]);
  const [unidadesCarregadas, definirUnidadesCarregadas] = useState(false);
  const [erroUnidades, definirErroUnidades] = useState("");
  const [tentativaUnidades, definirTentativaUnidades] = useState(0);
  const [tipoTenant, definirTipoTenant] = useState("");
  
  useEffect(() => {
    let ativo = true;
    definirUnidadesCarregadas(false);
    definirErroUnidades("");
    listarUnidadesMedico(usuario.id)
      .then(resposta => {
        if (!ativo) return;
        const unidadesClinicas = Array.isArray(resposta)
          ? resposta.filter((item) => item.tipoTenant !== "AUTONOMO")
          : [];
        definirUnidades(unidadesClinicas);
      })
      .catch((error) => {
        if (ativo) definirErroUnidades(error?.message || "Não foi possível consultar as unidades vinculadas.");
      })
      .finally(() => ativo && definirUnidadesCarregadas(true));
    return () => { ativo = false; };
  }, [tentativaUnidades, usuario.id]);

  const [modalPaciente, definirModalPaciente] = useState(!modoEdicao);
  const [modalConfirmacao, definirModalConfirmacao] = useState(false);
  const [modalLinhaTempo, definirModalLinhaTempo] = useState(false);
  const [modalMedicamento, definirModalMedicamento] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!modoEdicao) {
        definirModalPaciente(true);
      }
    }, [modoEdicao])
  );
  const [termoBusca, definirTermoBusca] = useState("");
  const [opcoesPacientes, definirOpcoesPacientes] = useState([]);
  const [paciente, definirPaciente] = useState(null);
  const [unidadeId, definirUnidadeId] = useState("");
  const [titulo, definirTitulo] = useState("");
  const [cid, definirCid] = useState("");
  const [tituloCid, definirTituloCid] = useState("");
  const [descricao, definirDescricao] = useState("");
  const [medicamentos, definirMedicamentos] = useState([]);
  const [linhasTempo, definirLinhasTempo] = useState([]);
  const [linhaTempoId, definirLinhaTempoId] = useState("");
  const [novoNomeLinhaTempo, definirNovoNomeLinhaTempo] = useState("");
  const [diagnosticosPaciente, definirDiagnosticosPaciente] = useState([]);
  const [existentesSelecionados, definirExistentesSelecionados] = useState([]);
  const [erroLinhaTempo, definirErroLinhaTempo] = useState("");
  const [recomendacoesIA, definirRecomendacoesIA] = useState([]);

  useEffect(() => {
    if (cid && cid.length > 2) {
      obterRecomendacoesIA(cid, unidadeId).then(sugestoes => {
        definirRecomendacoesIA(sugestoes);
      }).catch(err => {
        console.error("Erro ao obter recomendações IA:", err);
      });
    } else {
      definirRecomendacoesIA([]);
    }
  }, [cid, unidadeId]);

  useEffect(() => {
    if (!edicaoDiagnostico) return;
    definirPaciente({
      id: edicaoDiagnostico.pacienteId,
      nome: edicaoDiagnostico.pacienteNome,
      cpf: edicaoDiagnostico.pacienteCpf,
    });
    definirUnidadeId(edicaoDiagnostico.unidadeId || "");
    definirTipoTenant(edicaoDiagnostico.tipoTenant || (edicaoDiagnostico.unidadeId ? "CLINICA" : "AUTONOMO"));
    definirTitulo(edicaoDiagnostico.titulo || "");
    definirCid(edicaoDiagnostico.cid || "");
    definirTituloCid(edicaoDiagnostico.tituloCid || "");
    definirDescricao(edicaoDiagnostico.descricao || "");
    definirMedicamentos(edicaoDiagnostico.medicamentos || []);
    definirLinhaTempoId(edicaoDiagnostico.linhaTempoId || "");
    definirModalPaciente(false);
  }, [edicaoDiagnostico]);

  const unidade = tipoTenant === "CLINICA" ? unidades.find((u) => u.id === unidadeId) || null : null;

  useEffect(() => {
    if (!unidadesCarregadas || erroUnidades || modoEdicao) return;
    definirUnidadeId("");
    definirTipoTenant(unidades.length === 0 ? "AUTONOMO" : "");
  }, [erroUnidades, modoEdicao, unidades, unidadesCarregadas]);

  useEffect(() => {
    let ativo = true;
    if (!modalPaciente) return undefined;
    const termoLimpo = termoBusca.trim();
    if (!termoLimpo) {
      definirOpcoesPacientes([]);
      return undefined;
    }
    buscarPacientes(termoLimpo).then((itens) => ativo && definirOpcoesPacientes(itens.filter((item) => item.id !== usuario.id)));
    return () => { ativo = false; };
  }, [termoBusca, modalPaciente, usuario.id]);

  useEffect(() => {
    if (!paciente) return;
    const tenantClinicaId = tipoTenant === "CLINICA" ? unidadeId : "";
    Promise.all([listarLinhasTempo(paciente.id), listarDiagnosticosPaciente(paciente.id, tenantClinicaId)]).then(([linhasRecebidas, diagnosticosRecebidos]) => {
      definirLinhasTempo(linhasRecebidas);
      definirDiagnosticosPaciente(diagnosticosRecebidos);
    });
  }, [paciente, tipoTenant, unidadeId]);

  function escolherPaciente(pacienteEscolhido) {
    definirPaciente(pacienteEscolhido);
    definirTermoBusca("");
    definirModalPaciente(false);
    definirLinhaTempoId("");
  }

  function adicionarMedicamento(medicamentoEscolhido) {
    definirMedicamentos((atual) => atual.some((medicamento) => medicamento.medicamentoId === medicamentoEscolhido.id)
      ? atual
      : [...atual, { medicamentoId: medicamentoEscolhido.id, nome: (medicamentoEscolhido.nome ?? medicamentoEscolhido.name ?? ""), dose: "", frequencia: "", duracao: "", observacao: "" }]);
  }

  function atualizarMedicamento(indice, campo, valor) {
    definirMedicamentos((atual) => atual.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m)));
  }

  async function salvarLinhaTempo() {
    if (!paciente) {
      definirErroLinhaTempo("Selecione um paciente antes de criar a linha do tempo.");
      return;
    }
    if (!novoNomeLinhaTempo.trim()) {
      definirErroLinhaTempo("Informe o nome da linha do tempo antes de criar.");
      return;
    }
    definirErroLinhaTempo("");
    const criada = await criarLinhaTempo({
      pacienteId: paciente.id,
      medicoId: usuario.id,
      nome: novoNomeLinhaTempo.trim(),
      diagnosticoIds: existentesSelecionados,
    });
    definirLinhasTempo(await listarLinhasTempo(paciente.id));
    definirLinhaTempoId(criada.id);
    definirNovoNomeLinhaTempo("");
    definirExistentesSelecionados([]);
    definirErroLinhaTempo("");
    definirModalLinhaTempo(false);
  }

  function solicitarSalvamento() {
    if (!paciente) return definirModalPaciente(true);
    if (!tipoTenant || (tipoTenant === "CLINICA" && !unidadeId) || !titulo.trim() || !cid.trim() || !descricao.trim()) {
      Alert.alert("Diagnóstico", "Selecione o contexto do atendimento e preencha título, CID-11 e descrição.");
      return;
    }
    definirModalConfirmacao(true);
  }

  async function salvar() {
    try {
      const dadosDiagnostico = {
        pacienteId: paciente.id,
        medicoId: usuario.id,
        unidadeId,
        tipoTenant,
        linhaTempoId: linhaTempoId || null,
        titulo: titulo.trim(),
        cid: cid.trim().toUpperCase(),
        tituloCid,
        descricao: descricao.trim(),
        medicamentos,
      };

      if (modoEdicao) {
        await atualizarDiagnostico(edicaoDiagnostico.id, dadosDiagnostico);
      } else {
        await criarDiagnostico(dadosDiagnostico);
      }

      definirModalConfirmacao(false);
      Alert.alert(
        modoEdicao ? "Diagnóstico atualizado" : "Diagnóstico criado",
        modoEdicao ? "As alterações foram salvas com sucesso." : "O registro foi salvo e associado ao paciente selecionado.",
      );
      if (modoEdicao) {
        concluirEdicaoDiagnostico();
        navegacao.navigate("Diagnósticos");
      }
      definirTitulo("");
      definirCid("");
      definirTituloCid("");
      definirDescricao("");
      definirMedicamentos([]);
      definirLinhaTempoId("");
      definirPaciente(null);
      definirTermoBusca("");
      definirOpcoesPacientes([]);
      definirUnidadeId("");
      definirTipoTenant(unidades.length === 0 ? "AUTONOMO" : "");
      definirModalPaciente(!modoEdicao);
    } catch (erro) {
      Alert.alert("Erro ao salvar diagnóstico", erro?.message || "A API não aceitou o diagnóstico.");
    }
  }

  return (
    <Tela>
      <View className="mx-auto w-full max-w-[1180px]">
        <Text className="mt-2 text-3xl font-black text-ink">{modoEdicao ? "Editar diagnóstico" : "Criar diagnóstico"}</Text>
        <Text className="mt-2 leading-6 text-slate-500">{modoEdicao ? "Conclua e salve esta edição antes de iniciar outro atendimento." : "Selecione o paciente por nome ou CPF e registre o atendimento."}</Text>

        {modoEdicao ? (
          <View className="mt-5 flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Ionicons name="lock-closed" size={21} color="#B45309" />
            <Text className="ml-3 flex-1 font-semibold text-amber-800">Modo de edição bloqueado até a alteração ser salva com sucesso.</Text>
          </View>
        ) : null}

        {paciente ? (
          <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-mint-50 p-4">
            <View>
              <Text className="font-bold text-mint-800">Paciente: {paciente.nome}</Text>
              <Text className="text-sm text-mint-700">CPF {mascararCpf(paciente.cpf)}</Text>
            </View>
            {!modoEdicao ? (
              <Pressable onPress={() => { definirTermoBusca(""); definirOpcoesPacientes([]); definirModalPaciente(true); }}>
                <Text className="font-bold text-mint-700">Trocar</Text>
              </Pressable>
            ) : <Ionicons name="lock-closed-outline" size={20} color="#357257" />}
          </View>
        ) : null}

        <View className={`mt-5 ${telaLarga ? "flex-row gap-5" : "gap-5"}`}>
          <View className={`${telaLarga ? "flex-[1.15]" : ""} rounded-3xl border border-mint-100 bg-white p-5 hover:shadow-xl transition-all duration-200`}>
            <Text className="mb-4 text-xl font-black text-ink">Documento clínico</Text>

            {erroUnidades ? (
              <View className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <Text className="font-black text-red-700">Não foi possível consultar seus vínculos</Text>
                <Text className="mb-3 mt-1 text-sm text-red-600">{erroUnidades}</Text>
                <BotaoPrimario titulo="Tentar novamente" variante="secondary" aoPressionar={() => definirTentativaUnidades((valor) => valor + 1)} />
              </View>
            ) : null}

            {unidadesCarregadas && !erroUnidades && unidades.length > 0 && !tipoTenant ? (
              <View className="mb-5 rounded-2xl border border-mint-100 bg-mint-50 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-black text-mint-900">Qual unidade deseja utilizar?</Text>
                    <Text className="mb-3 mt-1 text-sm text-mint-700">Escolha uma unidade ou feche esta opção para atender como autônomo.</Text>
                  </View>
                  <Pressable
                    onPress={() => { definirUnidadeId(""); definirTipoTenant("AUTONOMO"); }}
                    accessibilityLabel="Atender como autônomo"
                    className="h-9 w-9 items-center justify-center rounded-full bg-white"
                  >
                    <Ionicons name="close" size={22} color="#357257" />
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {unidades.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => { definirUnidadeId(u.id); definirTipoTenant("CLINICA"); }}
                      className="min-w-[180px] flex-1 rounded-2xl border border-mint-300 bg-white px-4 py-4 active:bg-mint-100"
                    >
                      <View className="flex-row items-center gap-3">
                        <Ionicons name="business-outline" size={22} color="#357257" />
                        <Text className="flex-1 font-black text-mint-800">{u.nome}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {tipoTenant ? (
              <>
                <View className="mb-5 rounded-2xl bg-mint-50 p-4">
                  <View className="flex-row items-center">
                    {unidade?.logoUri ? <Image source={{ uri: unidade.logoUri }} className="mr-3 h-14 w-14 rounded-xl" /> : (
                      <View className="mr-3 h-14 w-14 items-center justify-center rounded-xl bg-mint-200">
                        <Ionicons name={tipoTenant === "CLINICA" ? "business" : "person"} size={26} color="#357257" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-black text-mint-900">{tipoTenant === "CLINICA" ? unidade?.nome : "Atendimento autônomo"}</Text>
                      {tipoTenant === "CLINICA" ? (
                        <>
                          <Text className="mt-1 text-sm text-mint-800">{unidade?.cep ? `CEP ${String(unidade.cep).replace(/(\d{5})(\d{3})/, "$1-$2")}` : ""}</Text>
                          <Text className="text-sm text-mint-800">{unidade?.endereco || ""}{unidade?.numero ? `, ${unidade.numero}` : ""}</Text>
                          <Text className="text-sm text-mint-800">{unidade?.telefone || ""}</Text>
                        </>
                      ) : <Text className="mt-1 text-sm text-mint-800">O diagnóstico será emitido em seu contexto profissional próprio.</Text>}
                    </View>
                    {unidades.length > 0 ? (
                      <Pressable onPress={() => { definirUnidadeId(""); definirTipoTenant(""); }} className="ml-2 rounded-xl border border-mint-300 px-3 py-2">
                        <Text className="text-xs font-bold text-mint-700">Trocar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View className="mt-4 border-t border-mint-200 pt-3">
                    <Text className="font-semibold text-mint-900">Médico: {usuario.nome}</Text>
                    <Text className="text-sm text-mint-800">CRM {usuario.crm}</Text>
                  </View>
                </View>

                <CampoApp rotulo="Título do diagnóstico" valor={titulo} aoAlterarTexto={definirTitulo} placeholder="Ex.: Acompanhamento respiratório" />

                <BuscaCidEmLinha
                  valor={cid}
                  titulo={tituloCid}
                  aoSelecionar={(cidEscolhido) => { definirCid(cidEscolhido.codigo ?? cidEscolhido.code ?? ""); definirTituloCid(cidEscolhido.titulo ?? cidEscolhido.title ?? ""); }}
                />

                <CampoApp rotulo="Descrição" valor={descricao} aoAlterarTexto={definirDescricao} multilinha placeholder="Descreva o diagnóstico e as observações clínicas." />

                <View className="mb-5 rounded-2xl border border-mint-100 bg-white p-4">
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <Text className="flex-1 font-black text-ink">Medicamentos prescritos</Text>
                <BotaoAcaoResponsivo icone="medkit-outline" rotulo="Adicionar medicamento" aoPressionar={() => definirModalMedicamento(true)} compacto={acoesCompactas} />
              </View>

              {recomendacoesIA.length > 0 && (
                <View className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons name="sparkles" size={18} color="#2563EB" />
                    <Text className="ml-2 font-black text-blue-900">Sugestões da IA para {cid}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {recomendacoesIA.map((rec, idx) => (
                      <Pressable 
                        key={idx} 
                        onPress={() => adicionarMedicamento({ id: `ai-${idx}`, nome: rec.medicamento_nome })}
                        className="rounded-full bg-blue-100 px-3 py-1 border border-blue-300 active:bg-blue-200"
                      >
                        <Text className="text-sm font-semibold text-blue-800">{rec.medicamento_nome} ({Math.round(rec.confianca_percentual)}%)</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {medicamentos.length === 0 ? <Text className="text-sm text-slate-500">Nenhum medicamento adicionado.</Text> : medicamentos.map((m, indice) => (
                <View key={`${m.medicamentoId}-${indice}`} className="mb-3 rounded-2xl bg-mint-50 p-4">
                  <View className="mb-3 flex-row justify-between gap-3">
                    <Text className="flex-1 font-black text-ink">{m.nome}</Text>
                    <Pressable onPress={() => definirMedicamentos((cur) => cur.filter((_, i) => i !== indice))}><Ionicons name="trash-outline" size={20} color="#DC2626" /></Pressable>
                  </View>
                  <CampoApp rotulo="Dose" valor={m.dose} aoAlterarTexto={(valor) => atualizarMedicamento(indice, "dose", valor)} placeholder="Ex.: 10 mg" />
                  <CampoApp rotulo="Frequência" valor={m.frequencia} aoAlterarTexto={(valor) => atualizarMedicamento(indice, "frequencia", valor)} placeholder="Ex.: 1x ao dia" />
                  <CampoApp rotulo="Duração" valor={m.duracao} aoAlterarTexto={(valor) => atualizarMedicamento(indice, "duracao", valor)} placeholder="Ex.: 7 dias" />
                  <CampoApp rotulo="Observação" valor={m.observacao} aoAlterarTexto={(valor) => atualizarMedicamento(indice, "observacao", valor)} placeholder="Ex.: após as refeições" />
                </View>
              ))}
            </View>

                <BotaoPrimario titulo={modoEdicao ? "Salvar alterações" : "Finalizar diagnóstico"} aoPressionar={solicitarSalvamento} />
              </>
            ) : null}
          </View>

          <View className={`${telaLarga ? "flex-1" : ""} rounded-3xl border border-mint-100 bg-white p-5 hover:shadow-xl transition-all duration-200`}>
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xl font-black text-ink">Linha do tempo</Text>
                <Text className="mt-1 text-slate-500">Associe o novo diagnóstico a uma linha existente.</Text>
              </View>
              <BotaoAcaoResponsivo icone="git-branch-outline" rotulo="Criar linha do tempo" desabilitado={!paciente} aoPressionar={() => { definirErroLinhaTempo(""); definirModalLinhaTempo(true); }} compacto={acoesCompactas} />
            </View>
            <Pressable onPress={() => definirLinhaTempoId("")} className={`mb-3 rounded-2xl border p-4 ${linhaTempoId === "" ? "border-mint-500 bg-mint-50" : "border-slate-200"}`}>
              <Text className="font-bold text-ink">Sem linha do tempo</Text>
            </Pressable>
            {linhasTempo.map((t) => (
              <Pressable key={t.id} onPress={() => definirLinhaTempoId(t.id)} className={`mb-3 rounded-2xl border p-4 ${linhaTempoId === t.id ? "border-mint-500 bg-mint-50" : "border-slate-200"}`}>
                <Text className="font-bold text-ink">{t.nome}</Text>
                <Text className="mt-1 text-sm text-slate-500">{t.diagnosticos.length} diagnóstico(s)</Text>
                {t.diagnosticos.slice(0, 3).map((d) => <Text key={d.id} className="mt-1 text-xs text-slate-500">• {formatarDataBr(d.criadoEm)} · {d.titulo} · {d.medicoNome}</Text>)}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Modal transparent animationType="fade" visible={modalPaciente} onRequestClose={() => definirModalPaciente(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 p-5" onPress={() => definirModalPaciente(false)}>
          <Pressable className="w-full max-w-[520px] rounded-3xl bg-white p-6 shadow-xl transition-all duration-200" onPress={(e) => e.stopPropagation()}>
            <Text className="text-2xl font-black text-ink">Qual paciente irá consultar?</Text>
            <Text className="mb-5 mt-2 text-slate-500">Digite nome ou CPF. Os pacientes só aparecem depois que você começar a digitar.</Text>
            <CampoApp rotulo="Paciente" valor={termoBusca} aoAlterarTexto={definirTermoBusca} placeholder="Nome ou CPF" autoCapitalize="words" />
            {termoBusca.trim() ? (
              <ScrollView className="max-h-[260px]">
                {opcoesPacientes.length === 0 ? <Text className="py-6 text-center font-semibold text-slate-500">Nenhum usuário cadastrado</Text> : opcoesPacientes.map((item) => (
                  <Pressable key={item.id} onPress={() => escolherPaciente(item)} className="mb-2 rounded-2xl border border-mint-100 bg-white p-4 hover:shadow-xl transition-all duration-200">
                    <Text className="font-black text-ink">{item.nome}</Text>
                    <Text className="mt-1 text-sm text-slate-500">CPF {mascararCpf(item.cpf)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {paciente ? <Pressable onPress={() => definirModalPaciente(false)} className="mt-3 items-center"><Text className="font-bold text-slate-500">Cancelar</Text></Pressable> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={modalLinhaTempo} onRequestClose={() => definirModalLinhaTempo(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 p-5" onPress={() => definirModalLinhaTempo(false)}>
          <Pressable className="max-h-[88%] w-full max-w-[680px] rounded-3xl bg-white p-6 shadow-xl transition-all duration-200" onPress={(e) => e.stopPropagation()}>
            <Text className="text-2xl font-black text-ink">Criar linha do tempo</Text>
            <Text className="mb-5 mt-2 text-slate-500">Você pode incluir registros existentes deste paciente, inclusive diagnósticos feitos por outros médicos.</Text>
            <CampoApp rotulo="Nome da linha do tempo" valor={novoNomeLinhaTempo} aoAlterarTexto={(valor) => { definirNovoNomeLinhaTempo(valor); definirErroLinhaTempo(""); }} placeholder="Ex.: Acompanhamento respiratório" erro={erroLinhaTempo} />
            <Text className="mb-3 font-black text-ink">Diagnósticos existentes</Text>
            <ScrollView className="max-h-[300px]">
              {diagnosticosPaciente.length === 0 ? <Text className="py-4 text-slate-500">Nenhum diagnóstico disponível.</Text> : diagnosticosPaciente.map((d) => {
                const selected = existentesSelecionados.includes(d.id);
                return (
                  <Pressable key={d.id} onPress={() => definirExistentesSelecionados((atual) => selected ? atual.filter((id) => id !== d.id) : [...atual, d.id])} className={`mb-2 rounded-2xl border p-4 ${selected ? "border-mint-500 bg-mint-50" : "border-slate-200"}`}>
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-black text-ink">{d.titulo}</Text>
                        <Text className="mt-1 text-sm text-slate-500">{formatarDataBr(d.criadoEm)} • {d.cid} • {d.medicoNome}</Text>
                      </View>
                      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? "#3F8F68" : "#94A3B8"} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View className="mt-5 gap-3"><BotaoPrimario titulo="Criar e selecionar" aoPressionar={salvarLinhaTempo} /><BotaoPrimario titulo="Cancelar" variante="secondary" aoPressionar={() => { definirErroLinhaTempo(""); definirModalLinhaTempo(false); }} /></View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={modalConfirmacao} onRequestClose={() => definirModalConfirmacao(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 p-5" onPress={() => definirModalConfirmacao(false)}>
          <Pressable className="w-full max-w-[520px] rounded-3xl bg-white p-6 shadow-xl transition-all duration-200" onPress={(e) => e.stopPropagation()}>
            <Text className="text-2xl font-black text-ink">{modoEdicao ? "Salvar alterações?" : "Finalizar diagnóstico?"}</Text>
            <Text className="mt-2 text-slate-500">{modoEdicao ? "Confira os dados. O bloqueio será removido somente quando o backend confirmar a atualização." : "Confirme os dados antes de salvar."}</Text>
            <View className="my-5 rounded-2xl bg-mint-50 p-4 hover:shadow-xl transition-all duration-200">
              <Text className="font-black text-ink">{titulo} • {cid}</Text>
              <Text className="mt-2 text-sm text-slate-600">Paciente: {paciente?.nome}</Text>
              <Text className="text-sm text-slate-600">
                {tipoTenant === "CLINICA" ? `Unidade: ${unidade?.nome || "-"}` : "Contexto: Atendimento autônomo"}
              </Text>
            </View>
            <View className="gap-3"><BotaoPrimario titulo={modoEdicao ? "Confirmar alteração" : "Confirmar e salvar"} aoPressionar={salvar} /><BotaoPrimario titulo="Revisar" variante="secondary" aoPressionar={() => definirModalConfirmacao(false)} /></View>
          </Pressable>
        </Pressable>
      </Modal>

      <ModalSeletorMedicamento visivel={modalMedicamento} aoFechar={() => definirModalMedicamento(false)} aoSelecionar={adicionarMedicamento} />
    </Tela>
  );
}
