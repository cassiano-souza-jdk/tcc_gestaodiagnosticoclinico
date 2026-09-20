const schemas = require('../models');
const medicoRepository = require('../repositories/medico.repository');
const { models } = require('../config/database');

class MedicoService {
    async buscarPorCrm(crm) {
        const medico = await medicoRepository.findByCrm(crm);
        if (!medico) {
            throw new Error('Nenhum médico encontrado com este CRM.');
        }
        
        const usuarioRepo = require('../repositories/usuario.repository');
        const usuario = await usuarioRepo.findById(medico.usuario_id);
        
        if (!usuario) {
            throw new Error('Médico sem usuário associado.');
        }

        return {
            id: medico.usuario_id.toString(),
            crm: medico.crm,
            uf_crm: medico.uf_crm,
            especialidade: medico.especialidade,
            nome_completo: usuario.nome_completo,
            email: usuario.email
        };
    }
    async create({ usuario_id, crm, uf_crm, especialidade }) {
        if (!crm) {
            throw new Error('CRM é obrigatório para registrar um médico.');
        }

        const idUuid = typeof usuario_id === 'string' ? models.uuidFromString(usuario_id) : usuario_id;

        const exists = await medicoRepository.findById(idUuid);
        if (exists) {
            throw new Error('Usuário já está registrado como médico.');
        }

        const timestamp = new Date();
        const medico = new schemas.Medico({
            usuario_id: idUuid,
            crm,
            uf_crm: uf_crm || null,
            especialidade: especialidade || null,
            ativo: true,
            created_at: timestamp,
            updated_at: timestamp
        });

        await medico.saveAsync();
        return true;
    }
}

module.exports = new MedicoService();
