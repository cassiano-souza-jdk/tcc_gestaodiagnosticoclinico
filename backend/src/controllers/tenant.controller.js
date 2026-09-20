const tenantService = require('../services/tenant.service');
const tenantRepository = require('../repositories/tenant.repository');

const criarTenant = async (req, res) => {
    try {
        // O usuário logado, recuperado do JWT pelo Middleware, será o "Dono" do Tenant
        const usuarioId = req.user.id;
        
        const result = await tenantService.criarTenant(req.body, usuarioId);
        
        return res.status(201).json({ message: 'Instituição criada com sucesso', data: result });
    } catch (error) {
        if (
            error.message.includes('inválido') || 
            error.message.includes('obrigatório') || 
            error.message.includes('já cadastrado') ||
            error.message.includes('exatamente') ||
            error.message.includes('Receita Federal')
        ) {
            return res.status(400).json({ error: error.message });
        }
        
        console.error('Erro no Controller de Tenants:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const listarMeusTenants = async (req, res) => {
    try {
        const { models } = require('../config/database');
        const ExpressCassandra = require('express-cassandra');
        const tenantUsuarios = await models.instance.tenant_usuarios_por_usuario.findAsync(
            {
                usuario_id: models.uuidFromString(req.user.id.toString()),
                ativo: true
            },
            { allow_filtering: true }
        );
        
        const units = await Promise.all(tenantUsuarios.map(async (t) => {
            const tenant = await tenantRepository.findById(t.tenant_id);
            return {
                id: t.tenant_id.toString(),
                name: t.tenant_nome,
                tipo_tenant: tenant?.tipo_tenant || 'CLINICA',
                address: "",
                phone: "",
                cep: ""
            };
        }));
        
        return res.status(200).json(units);
    } catch (error) {
        console.error('Erro ao listar tenants:', error);
        return res.status(500).json({ error: 'Erro interno' });
    }
};

const adicionarMedico = async (req, res) => {
    try {
        const { medicoId } = req.body;
        const donoId = req.user.id;
        
        if (!medicoId) {
            return res.status(400).json({ error: 'ID do médico é obrigatório.' });
        }
        
        const result = await tenantService.adicionarMedicoUnidade(donoId, medicoId);
        return res.status(200).json({ message: 'Médico vinculado à unidade com sucesso.', data: result });
    } catch (error) {
        console.error('Erro ao adicionar médico:', error);
        return res.status(400).json({ error: error.message });
    }
};

module.exports = {
    criarTenant,
    listarMeusTenants,
    adicionarMedico
};
