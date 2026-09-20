const { cid11MockData } = require('./data/cid11.data.js');
const { sngpcMockData } = require('./data/sngpc.data.js');

class IntegrationsService {
  async fetchCep(cep) {
    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('CEP inválido.');
    }
    
    // API de verificação desativada a pedido do usuário
    /*
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) {
      throw new Error('CEP não encontrado.');
    }
    return data;
    */

    return {
      cep: cleanCep,
      logradouro: "Rua Fictícia",
      complemento: "",
      bairro: "Bairro Fictício",
      localidade: "Cidade Mock",
      uf: "SP",
      ibge: "3550308",
      gia: "1004",
      ddd: "11",
      siafi: "7107"
    };
  }

  async fetchCnpj(cnpj) {
    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ inválido.');
    }
    
    /*
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) {
      throw new Error('CNPJ não encontrado na Receita Federal.');
    }
    const data = await response.json();
    return data;
    */

    return {
      cnpj: cleanCnpj,
      razao_social: "EMPRESA MOCK LTDA",
      nome_fantasia: "MOCK CLINICA",
      status: "ATIVA"
    };
  }

  async searchCid11(query = '') {
    const text = String(query).trim().toLowerCase();
    if (!text) return cid11MockData;
    return cid11MockData.filter((item) => 
      `${item.code} ${item.title} ${item.description}`.toLowerCase().includes(text)
    ).slice(0, 20);
  }

  async searchSngpc(query = '') {
    const text = String(query).trim().toLowerCase();
    if (!text) return sngpcMockData.slice(0, 20);
    return sngpcMockData.filter((item) => 
      `${item.name} ${item.activeIngredient}`.toLowerCase().includes(text)
    ).slice(0, 20);
  }
}

module.exports = new IntegrationsService();
