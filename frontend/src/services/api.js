export const URL_API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

let tokenGlobal = null;

export function definirTokenApi(token) {
  tokenGlobal = token;
}

export async function requisitarApi(rota, opcoes = {}) {
  const ehFormulario = typeof FormData !== "undefined" && opcoes.body instanceof FormData;
  const cabecalhos = {
    ...(ehFormulario ? {} : { "Content-Type": "application/json" }),
    ...(opcoes.headers || {}),
  };

  if (tokenGlobal) {
    cabecalhos.Authorization = `Bearer ${tokenGlobal}`;
  }

  const resposta = await fetch(`${URL_API}${rota}`, {
    ...opcoes,
    headers: cabecalhos,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(dados.error || dados.message || "Erro na comunicação com o servidor.");
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }

  return dados;
}
