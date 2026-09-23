const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const usuarioRepository = require('../repositories/usuario.repository');

const login = async (req, res) => {
    try {
        const result = await authService.login(req.body);
        return res.status(200).json(result);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Erro no Controller de Auth:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const checkCpf = async (req, res) => {
    try {
        const { cpf } = req.params;
        const exists = await usuarioRepository.findByCpf(cpf);
        if (!exists) {
            return res.status(200).json({ exists: false });
        }
        
        // Buscar papéis do tenant_usuario
        const { models } = require('../config/database');
        const ExpressCassandra = require('express-cassandra');
        const roles = await models.instance.tenant_usuarios_por_usuario.findAsync(
            {
                usuario_id: models.uuidFromString(exists.usuario_id.toString()),
                ativo: true
            },
            { allow_filtering: true }
        );
        
        let papeis = [];
        roles.forEach(r => {
            papeis = [...papeis, ...(r.papeis || [])];
        });
        
        const medicoRepo = require('../repositories/medico.repository');
        const isMedico = await medicoRepo.findById(exists.usuario_id.toString());
        if (isMedico && isMedico.ativo) {
            papeis.push('medico');
        }

        if (!papeis.includes('paciente')) {
            papeis.push('paciente');
        }
        
        papeis = [...new Set(papeis)];

        return res.status(200).json({ 
            exists: true, 
            usuarioId: exists.usuario_id.toString(),
            papeis: papeis,
            nome_completo: exists.nome_completo,
            email: exists.email
        });
    } catch (error) {
        console.error('=================== Erro ao verificar CPF ===================');
        console.error(error);
        console.error('===========================================================');
        return res.status(500).json({ error: 'Erro interno do servidor', message: error.message, stack: error.stack });
    }
};

const selecionarPapel = async (req, res) => {
    try {
        const { papel } = req.body;
        const usuarioId = req.user.id;
        
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Você pode opcionalmente buscar os dados específicos do papel, como CRM se for médico
        let extraData = {};
        if (papel === 'medico') {
            const medicoRepo = require('../repositories/medico.repository');
            const medico = await medicoRepo.findById(usuarioId);
            if (medico) {
                extraData.crm = medico.crm;
            }
        }

        const { models } = require('../config/database');
        const roles = await models.instance.tenant_usuarios_por_usuario.findAsync(
            {
                usuario_id: typeof usuarioId === 'string' ? models.uuidFromString(usuarioId) : usuarioId,
                ativo: true
            },
            { allow_filtering: true }
        );
        
        let tenant_id = null;
        if (roles.length > 0) {
            const roleMatch = roles.find(r => (r.papeis || []).includes(papel.toUpperCase()));
            if (roleMatch) {
                tenant_id = roleMatch.tenant_id.toString();
            } else {
                tenant_id = roles[0].tenant_id.toString();
            }
        }
        if (tenant_id) {
            extraData.tenant_id = tenant_id;
        }

        const usuarioRepository = require('../repositories/usuario.repository');
        const userFull = await usuarioRepository.findById(usuarioId);

        return res.status(200).json({
            token,
            usuario: {
                id: userFull.id.toString(),
                cpf: userFull.cpf,
                email: userFull.email,
                nome_completo: userFull.nome_completo,
                telefone: userFull.telefone,
                sexo: userFull.sexo,
                data_nascimento: userFull.data_nascimento,
                role: papel,
                papel: papel,
                ...extraData
            }
        });
    } catch (error) {
        console.error('Erro em selecionarPapel:', error);
        return res.status(500).json({ error: 'Erro interno ao selecionar papel' });
    }
};

module.exports = {
    login,
    checkCpf,
    selecionarPapel
};
