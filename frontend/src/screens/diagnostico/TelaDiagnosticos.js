import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Tela from "../../components/Tela";
import BotaoPrimario from "../../components/BotaoPrimario";
import CampoSelecaoData from "../../components/CampoSelecaoData";
import { usarAutenticacao } from "../../contexts/AuthenticationContext";
import { listarDiagnosticos, listarLinhasTempo, enviarFeedbackIA } from "../../services/diagnosisService";
import { listarEdicoesUtilizadas, marcarEdicaoComoUtilizada } from "../../services/diagnosisEditCache";
import { gerarPdf, htmlDiagnostico, htmlLinhaTempo, imprimirHtml } from "../../services/printingService";
import { formatarDataBr } from "../../utils/masks";

const FILTROS_REGISTROS_VAZIOS = { data: "", nome: "", cid: "", linhaTempo: "", medico: "" };
const FILTROS_LINHAS_VAZIOS = { data: "", nome: "", diagnostico: "", cid: "", medico: "" };

function BotaoFiltro({ aberto, aoPressionar, quantidadeAtiva = 0 }) {
  const { width: largura } = useWindowDimensions();
  const compacto = largura < 640;

  return (
    <Pressable
      onPress={aoPressionar}
      className={`flex-row items-center gap-2 rounded-xl border px-3 py-2 ${aberto || quantidadeAtiva ? "border-mint-400 bg-mint-100" : "border-mint-200 bg-white"}`}
      accessibilityLabel={aberto ? "Fechar filtros" : "Abrir filtros"}
    >
      <Ionicons name="filter-outline" size={18} color="#357257" />
      {!compacto ? <Text className="font-bold text-mint-800">Filtrar{quantidadeAtiva ? ` (${quantidadeAtiva})` : ""}</Text> : null}
    </Pressable>
  );
}

function CampoFiltro(propriedades) {
  return (
    <TextInput
      placeholderTextColor="#7D8D86"
      className="min-w-[160px] flex-1 rounded-2xl border border-mint-200 bg-white px-4 py-3 text-ink hover:shadow-xl transition-all duration-200"
      {...propriedades}
    />
  );
}

export default function TelaDiagnosticos({ navigation: navegacao }) {
  const { usuario, iniciarEdicaoDiagnostico, edicaoDiagnostico } = usarAutenticacao();
  const [registros, definirRegistros] = useState([]);
  const [linhasTempo, definirLinhasTempo] = useState([]);
  const [filtrosRegistros, definirFiltrosRegistros] = useState(FILTROS_REGISTROS_VAZIOS);
  const [filtrosLinhas, definirFiltrosLinhas] = useState(FILTROS_LINHAS_VAZIOS);
  const [mostrarFiltrosRegistros, definirMostrarFiltrosRegistros] = useState(false);
  const [mostrarFiltrosLinhas, definirMostrarFiltrosLinhas] = useState(false);
  const [diagnosticoSelecionado, definirDiagnosticoSelecionado] = useState(null);
  const [linhaTempoSelecionada, definirLinhaTempoSelecionada] = useState(null);
  const [diagnosticoParaEditar, definirDiagnosticoParaEditar] = useState(null);
  const [edicoesUtilizadas, definirEdicoesUtilizadas] = useState([]);
  const [agora, definirAgora] = useState(Date.now());
  const [modalFeedback, definirModalFeedback] = useState(false);
  const [medicamentoFeedback, definirMedicamentoFeedback] = useState(null);

  useEffect(() => {
    const temporizador = setInterval(() => definirAgora(Date.now()), 15000);
    return () => clearInterval(temporizador);
  }, []);

  async function handleEnviarFeedback(nota) {
    if (!diagnosticoSelecionado || !medicamentoFeedback) return;
    await enviarFeedbackIA(diagnosticoSelecionado.cid, medicamentoFeedback.nome, nota);
    Alert.alert("Feedback enviado", "Obrigado! Sua avaliação ajudará nossa IA a recomendar tratamentos melhores.");
    definirModalFeedback(false);
    definirMedicamentoFeedback(null);
  }

  const carregar = useCallback(async () => {
    const diagnosticos = await listarDiagnosticos(usuario);
    definirRegistros(diagnosticos);

    const pacienteIds = [...new Set(diagnosticos.map((diagnostico) => diagnostico.pacienteId).filter(Boolean))];
    const grupos = await Promise.all(pacienteIds.map((pacienteId) => listarLinhasTempo(pacienteId)));
    definirLinhasTempo(grupos.flat());
  }, [usuario]);

  useFocusEffect(useCallback(() => {
    carregar();
    listarEdicoesUtilizadas().then(definirEdicoesUtilizadas);
  }, [carregar]));

  const podeEditar = useCallback((diagnostico) => {
    if (!diagnostico?.id || edicaoDiagnostico || usuario?.role !== "medico") return false;
    if (String(diagnostico.medicoId || "") !== String(usuario.id || "")) return false;
    if (edicoesUtilizadas.includes(diagnostico.id)) return false;
    const criadoEm = new Date(diagnostico.criadoEm).getTime();
    return Number.isFinite(criadoEm) && agora - criadoEm >= 0 && agora - criadoEm <= 10 * 60 * 1000;
  }, [agora, edicaoDiagnostico, edicoesUtilizadas, usuario]);

  async function confirmarEntradaEdicao() {
    if (!diagnosticoParaEditar) return;
    const atualizados = await marcarEdicaoComoUtilizada(diagnosticoParaEditar.id);
    definirEdicoesUtilizadas(atualizados);
    iniciarEdicaoDiagnostico(diagnosticoParaEditar);
    definirDiagnosticoSelecionado(null);
    definirDiagnosticoParaEditar(null);
    navegacao.navigate("Criar");
  }

  const registrosFiltrados = useMemo(() => registros.filter((registro) => {
    const data = formatarDataBr(registro.criadoEm);
    return (!filtrosRegistros.data || data === filtrosRegistros.data)
      && (!filtrosRegistros.nome || (registro.pacienteNome || "").toLowerCase().includes(filtrosRegistros.nome.toLowerCase()))
      && (!filtrosRegistros.cid || (registro.cid || "").toLowerCase().includes(filtrosRegistros.cid.toLowerCase()))
      && (!filtrosRegistros.linhaTempo || (registro.linhaTempoNome || "").toLowerCase().includes(filtrosRegistros.linhaTempo.toLowerCase()))
      && (!filtrosRegistros.medico || (registro.medicoNome || "").toLowerCase().includes(filtrosRegistros.medico.toLowerCase()));
  }), [registros, filtrosRegistros]);

  const linhasFiltradas = useMemo(() => linhasTempo.filter((linhaTempo) => {
    const diagnosticos = linhaTempo.diagnosticos || [];
    return (!filtrosLinhas.nome || (linhaTempo.nome || "").toLowerCase().includes(filtrosLinhas.nome.toLowerCase()))
      && (!filtrosLinhas.data || diagnosticos.some((diagnostico) => formatarDataBr(diagnostico.criadoEm) === filtrosLinhas.data))
      && (!filtrosLinhas.diagnostico || diagnosticos.some((diagnostico) => (diagnostico.titulo || "").toLowerCase().includes(filtrosLinhas.diagnostico.toLowerCase())))
      && (!filtrosLinhas.cid || diagnosticos.some((diagnostico) => (diagnostico.cid || "").toLowerCase().includes(filtrosLinhas.cid.toLowerCase())))
      && (!filtrosLinhas.medico || diagnosticos.some((diagnostico) => (diagnostico.medicoNome || "").toLowerCase().includes(filtrosLinhas.medico.toLowerCase())));
  }), [linhasTempo, filtrosLinhas]);

  const quantidadeFiltrosRegistros = Object.values(filtrosRegistros).filter(Boolean).length;
  const quantidadeFiltrosLinhas = Object.values(filtrosLinhas).filter(Boolean).length;

  async function imprimir(conteudoHtml) {
    try {
      await imprimirHtml(conteudoHtml);
    } catch (erro) {
      Alert.alert("Impressão", erro.message);
    }
  }

  return (
    <Tela>
      <View className="mx-auto w-full max-w-[1180px]">
        <Text className="mt-2 text-3xl font-black text-ink">Diagnósticos</Text>
        <Text className="mt-2 text-slate-500">Selecione um diagnóstico ou uma linha do tempo para visualizar, imprimir ou gerar PDF.</Text>

        <View className="mt-5 rounded-3xl border border-mint-100 bg-white p-5 hover:shadow-xl transition-all duration-200">
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Text className="text-xl font-black text-ink">Registros</Text>
            <BotaoFiltro aberto={mostrarFiltrosRegistros} quantidadeAtiva={quantidadeFiltrosRegistros} aoPressionar={() => definirMostrarFiltrosRegistros((valorAtual) => !valorAtual)} />
          </View>

          {mostrarFiltrosRegistros ? (
            <View className="mb-5 rounded-2xl bg-mint-50 p-4 hover:shadow-xl transition-all duration-200">
              <Text className="mb-3 font-black text-mint-800">Filtrar registros</Text>
              <CampoSelecaoData
                rotulo="Data do diagnóstico"
                valor={filtrosRegistros.data}
                aoAlterar={(data) => definirFiltrosRegistros((filtrosAtuais) => ({ ...filtrosAtuais, data }))}
                anoMinimo={2000}
                anoMaximo={new Date().getFullYear()}
                dataMaxima={new Date()}
              />
              <View className="flex-row flex-wrap gap-3">
                <CampoFiltro value={filtrosRegistros.nome} onChangeText={(nome) => definirFiltrosRegistros((filtrosAtuais) => ({ ...filtrosAtuais, nome }))} placeholder="Paciente" autoCapitalize="words" />
                <CampoFiltro value={filtrosRegistros.cid} onChangeText={(cid) => definirFiltrosRegistros((filtrosAtuais) => ({ ...filtrosAtuais, cid: cid.toUpperCase() }))} placeholder="CID-11" autoCapitalize="characters" />
                <CampoFiltro value={filtrosRegistros.linhaTempo} onChangeText={(linhaTempo) => definirFiltrosRegistros((filtrosAtuais) => ({ ...filtrosAtuais, linhaTempo }))} placeholder="Linha do tempo" />
                <CampoFiltro value={filtrosRegistros.medico} onChangeText={(medico) => definirFiltrosRegistros((filtrosAtuais) => ({ ...filtrosAtuais, medico }))} placeholder="Médico" autoCapitalize="words" />
              </View>
              {quantidadeFiltrosRegistros ? (
                <Pressable onPress={() => definirFiltrosRegistros(FILTROS_REGISTROS_VAZIOS)} className="mt-3 self-start">
                  <Text className="font-bold text-mint-700">Limpar filtros</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView horizontal>
            <View className="min-w-[950px]">
              <View className="flex-row rounded-xl bg-mint-50 px-3 py-3">
                {["Data", "Paciente", "CID", "Diagnóstico", "Linha do tempo", "Médico"].map((cabecalho) => <Text key={cabecalho} className="w-[148px] font-black text-mint-800">{cabecalho}</Text>)}
                <Text className="w-[62px] text-center font-black text-mint-800">Ação</Text>
              </View>
              {registrosFiltrados.length === 0 ? (
                <Text className="py-8 text-center text-slate-500">Nenhum diagnóstico encontrado.</Text>
              ) : registrosFiltrados.map((registro) => (
                <View key={registro.id} className="flex-row items-center border-b border-slate-100 px-3 py-2">
                  <Pressable onPress={() => definirDiagnosticoSelecionado(registro)} className="flex-row py-2">
                    {[formatarDataBr(registro.criadoEm), registro.pacienteNome, registro.cid, registro.titulo, registro.linhaTempoNome || "—", registro.medicoNome].map((valor, indice) => <Text key={indice} numberOfLines={2} className="w-[148px] pr-3 text-sm text-ink">{valor}</Text>)}
                  </Pressable>
                  <View className="w-[62px] items-center">
                    {podeEditar(registro) ? (
                      <Pressable onPress={() => definirDiagnosticoParaEditar(registro)} accessibilityLabel={`Editar diagnóstico ${registro.titulo}`} className="h-10 w-10 items-center justify-center rounded-full bg-mint-50">
                        <Ionicons name="pencil" size={18} color="#357257" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="mt-5 rounded-3xl border border-mint-100 bg-white p-5 hover:shadow-xl transition-all duration-200">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xl font-black text-ink">Linhas do tempo</Text>
              <Text className="mt-1 text-slate-500">Visualização somente nesta aba. A criação fica exclusivamente na aba Criar do médico.</Text>
            </View>
            <BotaoFiltro aberto={mostrarFiltrosLinhas} quantidadeAtiva={quantidadeFiltrosLinhas} aoPressionar={() => definirMostrarFiltrosLinhas((valorAtual) => !valorAtual)} />
          </View>

          {mostrarFiltrosLinhas ? (
            <View className="my-5 rounded-2xl bg-mint-50 p-4 hover:shadow-xl transition-all duration-200">
              <Text className="mb-3 font-black text-mint-800">Filtrar linhas do tempo</Text>
              <CampoSelecaoData
                rotulo="Data de algum diagnóstico"
                valor={filtrosLinhas.data}
                aoAlterar={(data) => definirFiltrosLinhas((filtrosAtuais) => ({ ...filtrosAtuais, data }))}
                anoMinimo={2000}
                anoMaximo={new Date().getFullYear()}
                dataMaxima={new Date()}
              />
              <View className="flex-row flex-wrap gap-3">
                <CampoFiltro value={filtrosLinhas.nome} onChangeText={(nome) => definirFiltrosLinhas((filtrosAtuais) => ({ ...filtrosAtuais, nome }))} placeholder="Nome da linha do tempo" />
                <CampoFiltro value={filtrosLinhas.diagnostico} onChangeText={(diagnostico) => definirFiltrosLinhas((filtrosAtuais) => ({ ...filtrosAtuais, diagnostico }))} placeholder="Diagnóstico" />
                <CampoFiltro value={filtrosLinhas.cid} onChangeText={(cid) => definirFiltrosLinhas((filtrosAtuais) => ({ ...filtrosAtuais, cid: cid.toUpperCase() }))} placeholder="CID-11" autoCapitalize="characters" />
                <CampoFiltro value={filtrosLinhas.medico} onChangeText={(medico) => definirFiltrosLinhas((filtrosAtuais) => ({ ...filtrosAtuais, medico }))} placeholder="Médico" autoCapitalize="words" />
              </View>
              {quantidadeFiltrosLinhas ? (
                <Pressable onPress={() => definirFiltrosLinhas(FILTROS_LINHAS_VAZIOS)} className="mt-3 self-start">
                  <Text className="font-bold text-mint-700">Limpar filtros</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View className="mt-4">
            {linhasFiltradas.length === 0 ? (
              <Text className="py-6 text-slate-500">Nenhuma linha do tempo encontrada.</Text>
            ) : linhasFiltradas.map((linhaTempo) => (
              <Pressable key={linhaTempo.id} onPress={() => definirLinhaTempoSelecionada(linhaTempo)} className="mb-3 rounded-2xl border border-mint-100 bg-white p-4 hover:shadow-xl transition-all duration-200">
                <View className="flex-row justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-black text-ink">{linhaTempo.nome}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{linhaTempo.diagnosticos.length} diagnóstico(s)</Text>
                  </View>
                  <Text className="font-bold text-mint-700">Abrir ›</Text>
                </View>
                {linhaTempo.diagnosticos.slice(0, 3).map((diagnostico) => <Text key={diagnostico.id} className="mt-2 text-sm text-slate-500">• {formatarDataBr(diagnostico.criadoEm)} · {diagnostico.titulo} · {diagnostico.medicoNome}</Text>)}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Modal visible={!!diagnosticoSelecionado} transparent animationType="fade" onRequestClose={() => definirDiagnosticoSelecionado(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-5">
          <ScrollView className="max-h-[90%] w-full max-w-[760px] rounded-3xl bg-white hover:shadow-xl transition-all duration-200">
            <View className="p-6">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-2xl font-black text-ink">{diagnosticoSelecionado?.titulo}</Text>
                {podeEditar(diagnosticoSelecionado) ? (
                  <Pressable onPress={() => definirDiagnosticoParaEditar(diagnosticoSelecionado)} accessibilityLabel="Editar diagnóstico" className="h-11 w-11 items-center justify-center rounded-full bg-mint-50">
                    <Ionicons name="pencil" size={20} color="#357257" />
                  </Pressable>
                ) : null}
              </View>
              <Text className="mt-1 font-bold text-mint-700">CID {diagnosticoSelecionado?.cid}</Text>
              <Text className="mt-4 text-slate-600">Paciente: {diagnosticoSelecionado?.pacienteNome}</Text>
              <Text className="text-slate-600">Médico: {diagnosticoSelecionado?.medicoNome} · CRM {diagnosticoSelecionado?.medicoCrm}</Text>
              <Text className="text-slate-600">Unidade: {diagnosticoSelecionado?.unidadeNome}</Text>
              <Text className="text-slate-600">Data: {diagnosticoSelecionado ? formatarDataBr(diagnosticoSelecionado.criadoEm) : ""}</Text>
              <Text className="mt-5 font-black text-ink">Descrição</Text>
              <Text className="mt-2 leading-6 text-slate-600">{diagnosticoSelecionado?.descricao}</Text>
              <Text className="mt-5 font-black text-ink">Medicamentos</Text>
              {(diagnosticoSelecionado?.medicamentos || []).length === 0 ? <Text className="mt-2 text-slate-500">Nenhum medicamento prescrito.</Text> : (diagnosticoSelecionado?.medicamentos || []).map((medicamento, indice) => (
                <View key={medicamento.id ?? indice} className="mt-2 rounded-2xl bg-mint-50 p-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="font-bold text-ink">{medicamento.nome}</Text>
                    {usuario?.role === "paciente" && (
                      <Pressable 
                        onPress={() => { definirMedicamentoFeedback(medicamento); definirModalFeedback(true); }}
                        className="rounded-lg bg-mint-200 px-3 py-1 active:bg-mint-300"
                      >
                        <Text className="text-xs font-bold text-mint-800">Avaliar Eficácia</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text className="mt-1 text-xs text-slate-500">Dose: {medicamento.dose || "-"} · Frequência: {medicamento.frequencia || "-"} · Duração: {medicamento.duracao || "-"}{medicamento.observacao ? ` · ${medicamento.observacao}` : ""}</Text>
                </View>
              ))}
              <View className="mt-6 gap-3">
                <BotaoPrimario titulo="Imprimir" icone="print-outline" variante="print" aoPressionar={() => imprimir(htmlDiagnostico(diagnosticoSelecionado))} />
                <BotaoPrimario titulo="Gerar PDF" icone="document-text-outline" variante="pdf" aoPressionar={() => gerarPdf(htmlDiagnostico(diagnosticoSelecionado), `diagnostico-${diagnosticoSelecionado?.id || "registro"}.pdf`).catch((erro) => Alert.alert("PDF", erro.message))} />
                <BotaoPrimario titulo="Fechar" variante="secondary" aoPressionar={() => definirDiagnosticoSelecionado(null)} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalFeedback} transparent animationType="fade" onRequestClose={() => definirModalFeedback(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-5">
          <View className="w-full max-w-[400px] rounded-3xl bg-white p-6">
            <Text className="text-xl font-black text-ink mb-2">Como foi o tratamento?</Text>
            <Text className="text-sm text-slate-600 mb-5">Avalie a eficácia do medicamento <Text className="font-bold">{medicamentoFeedback?.nome}</Text> para ajudar nossa IA.</Text>
            
            <View className="flex-row justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((nota) => (
                <Pressable
                  key={nota}
                  onPress={() => handleEnviarFeedback(nota)}
                  className="w-12 h-12 rounded-full items-center justify-center bg-mint-50 border border-mint-200 active:bg-mint-200"
                >
                  <Text className="font-bold text-lg text-mint-800">{nota}</Text>
                </Pressable>
              ))}
            </View>
            
            <BotaoPrimario titulo="Cancelar" variante="secondary" aoPressionar={() => definirModalFeedback(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!diagnosticoParaEditar} transparent animationType="fade" onRequestClose={() => definirDiagnosticoParaEditar(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-5">
          <View className="w-full max-w-[520px] rounded-3xl bg-white p-6">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Ionicons name="warning-outline" size={26} color="#B45309" />
            </View>
            <Text className="text-2xl font-black text-ink">Entrar no modo de edição?</Text>
            <Text className="mt-3 leading-6 text-slate-600">
              Ao continuar, esta oportunidade de edição será utilizada. Não feche nem recarregue a página ou o aplicativo: o botão não ficará disponível novamente.
            </Text>
            <Text className="mt-3 leading-6 text-slate-600">
              Até salvar a alteração com sucesso, você não poderá criar outro diagnóstico nem sair do sistema.
            </Text>
            <View className="mt-6 gap-3">
              <BotaoPrimario titulo="Continuar e editar" icone="pencil" aoPressionar={confirmarEntradaEdicao} />
              <BotaoPrimario titulo="Voltar" variante="secondary" aoPressionar={() => definirDiagnosticoParaEditar(null)} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!linhaTempoSelecionada} transparent animationType="fade" onRequestClose={() => definirLinhaTempoSelecionada(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-5">
          <ScrollView className="max-h-[90%] w-full max-w-[760px] rounded-3xl bg-white hover:shadow-xl transition-all duration-200">
            <View className="p-6">
              <Text className="text-2xl font-black text-ink">{linhaTempoSelecionada?.nome}</Text>
              <Text className="mb-5 mt-1 text-slate-500">Linha do tempo clínica</Text>
              {(linhaTempoSelecionada?.diagnosticos || []).map((diagnostico) => (
                <Pressable
                  key={diagnostico.id}
                  onPress={() => { definirLinhaTempoSelecionada(null); definirDiagnosticoSelecionado(diagnostico); }}
                  accessibilityLabel={`Abrir diagnóstico ${diagnostico.titulo}`}
                  className="mb-4 rounded-2xl border border-mint-100 border-l-4 border-l-mint-400 bg-white p-4 hover:shadow-xl transition-all duration-200"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-black text-ink">{formatarDataBr(diagnostico.criadoEm)} · {diagnostico.titulo}</Text>
                      <Text className="mt-1 text-sm text-mint-700">CID {diagnostico.cid}</Text>
                      <Text className="mt-1 text-sm text-slate-500">{diagnostico.medicoNome} · {diagnostico.unidadeNome}</Text>
                      <Text className="mt-2 text-slate-600">{diagnostico.descricao}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-sm font-bold text-mint-700">Abrir</Text>
                      <Ionicons name="chevron-forward" size={18} color="#357257" />
                    </View>
                  </View>
                </Pressable>
              ))}
              <View className="mt-4 gap-3">
                <BotaoPrimario titulo="Imprimir linha do tempo" icone="print-outline" variante="print" aoPressionar={() => imprimir(htmlLinhaTempo(linhaTempoSelecionada))} />
                <BotaoPrimario titulo="Gerar PDF" icone="document-text-outline" variante="pdf" aoPressionar={() => gerarPdf(htmlLinhaTempo(linhaTempoSelecionada), `linha-do-tempo-${linhaTempoSelecionada?.id || "historico"}.pdf`).catch((erro) => Alert.alert("PDF", erro.message))} />
                <BotaoPrimario titulo="Fechar" variante="secondary" aoPressionar={() => definirLinhaTempoSelecionada(null)} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Tela>
  );
}
