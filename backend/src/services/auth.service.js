const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuario.repository');

class AuthService {
    async login({ cpf, senha }) {
        if (!cpf || !senha) {
            const error = new Error('CPF e senha são obrigatórios.');
            error.statusCode = 400;
            throw error;
        }

        // Busca rápida na tabela de lookup
        const userLookup = await usuarioRepository.findByCpf(cpf);
        if (!userLookup) {
            const error = new Error('Credenciais inválidas.');
            error.statusCode = 401;
            throw error;
        }

        // Busca completa na tabela central para validar senha e status
        const userFull = await usuarioRepository.findById(userLookup.usuario_id);
        if (!userFull) {
            const error = new Error('Credenciais inválidas.');
            error.statusCode = 401;
            throw error;
        }

        if (!userFull.ativo) {
            const error = new Error('Usuário desativado.');
            error.statusCode = 403;
            throw error;
        }

        const validPassword = await bcrypt.compare(senha, userFull.senha_hash);
        if (!validPassword) {
            const error = new Error('Credenciais inválidas.');
            error.statusCode = 401;
            throw error;
        }

        // Geração do JWT isolado por responsabilidade central (apenas Identidade)
        const token = jwt.sign(
            { sub: userFull.id.toString() },
            process.env.JWT_SECRET || 'super_secret_key_tcc',
            { expiresIn: '1d' }
        );

        // Fetch roles
        const { models } = require('../config/database');
        const roles = await models.instance.tenant_usuarios_por_usuario.findAsync(
            {
                usuario_id: typeof userFull.id === 'string' ? models.uuidFromString(userFull.id) : userFull.id,
                ativo: true
            },
            { allow_filtering: true }
        );

        let papeis = [];
        let tenant_id = null;
        roles.forEach(r => {
            papeis = [...papeis, ...(r.papeis || [])];
            if (!tenant_id && r.tenant_id) {
                tenant_id = r.tenant_id.toString();
            }
        });

        const medicoRepo = require('../repositories/medico.repository');
        const isMedico = await medicoRepo.findById(userFull.id);
        if (isMedico && isMedico.ativo) {
            papeis.push('medico');
        }

        if (!papeis.includes('paciente')) {
            papeis.push('paciente');
        }
        
        papeis = [...new Set(papeis)];

        return { 
            token,
            papeis: papeis,
            usuario: {
                id: userFull.id.toString(),
                cpf: userFull.cpf,
                email: userFull.email,
                nome_completo: userFull.nome_completo,
                telefone: userFull.telefone,
                sexo: userFull.sexo,
                data_nascimento: userFull.data_nascimento,
                tenant_id: tenant_id
            }
        };
    }
}

module.exports = new AuthService();
