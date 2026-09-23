const diagnosticoRepository = require('../repositories/diagnostico.repository');
const medicoRepository = require('../repositories/medico.repository');
const tenantRepository = require('../repositories/tenant.repository');
const usuarioRepository = require('../repositories/usuario.repository');

class DiagnosticoService {
    async emitirDiagnostico({ paciente_id, titulo, descricao, codigo_cid }, tenant_id, medico_id, contextoTenant = {}) {
        if (!titulo || titulo.trim().length === 0) {
            throw new Error('O título do diagnóstico é obrigatório.');
        }

        if (!descricao || descricao.trim().length === 0) {
            throw new Error('A descrição do diagnóstico é obrigatória.');
        }

        if (!paciente_id) {
            throw new Error('O paciente_id é obrigatório.');
        }

        if (String(paciente_id) === String(medico_id)) {
            throw new Error('Não é permitido emitir um diagnóstico para si mesmo.');
        }

        // Regra 2 e 3: Perfil profissional existe e está ativo
        const medico = await medicoRepository.findById(medico_id);
        if (!medico) {
            throw new Error('Perfil profissional do médico não encontrado no sistema.');
        }
        if (!medico.ativo) {
            throw new Error('Perfil profissional do médico está inativo.');
        }

        // Regra 4 e 5: Paciente pertence ao mesmo tenant e possui o papel PACIENTE
        let pacienteNoTenant = await tenantRepository.findUserInTenant(tenant_id, paciente_id);
        if (!pacienteNoTenant) {
            const paciente = await usuarioRepository.findById(paciente_id);
            if (!paciente) {
                throw new Error('Paciente não encontrado no sistema.');
            }
            if (paciente.ativo === false) {
                throw new Error('O cadastro do paciente está inativo no sistema.');
            }
            await tenantRepository.upsertUserInTenant({
                tenantId: tenant_id,
                usuarioId: paciente_id,
                tenantNome: contextoTenant.tenant_nome || (contextoTenant.tipo_tenant === 'AUTONOMO' ? 'Atendimento autônomo' : 'Clínica'),
                papeis: ['PACIENTE']
            });
            pacienteNoTenant = await tenantRepository.findUserInTenant(tenant_id, paciente_id);
        }
        if (!pacienteNoTenant) {
            throw new Error('Paciente não pôde ser vinculado a esta instituição.');
        }
        if (!pacienteNoTenant.ativo) {
            throw new Error('O cadastro do paciente está inativo nesta instituição.');
        }
        if (!pacienteNoTenant.papeis.includes('PACIENTE')) {
            throw new Error('O usuário informado não possui papel de PACIENTE nesta instituição.');
        }

        // Persistência em Lote
        const diagnosticoId = await diagnosticoRepository.create({
            tenant_id,
            medico_id,
            paciente_id,
            titulo,
            descricao,
            codigo_cid
        }, 'CRIAR_DIAGNOSTICO');

        return {
            id: diagnosticoId.toString(),
            tenant_id,
            medico_id,
            paciente_id,
            titulo,
            codigo_cid,
            tipo_tenant: contextoTenant.tipo_tenant || 'CLINICA',
            status: 'ATIVO'
        };
    }

    async hydrateNomes(result) {
        if (!result || !result.data) return result;
        const usuarioRepo = require('../repositories/usuario.repository');
        const usersIds = new Set();
        result.data.forEach(d => {
            if (d.paciente_id) usersIds.add(d.paciente_id.toString());
            if (d.medico_id) usersIds.add(d.medico_id.toString());
        });
        const nomesMap = {};
        for (let id of usersIds) {
            const user = await usuarioRepo.findById(id);
            if (user) nomesMap[id] = user.nome_completo;
        }
        result.data = result.data.map(d => ({
            ...d,
            pacienteNome: d.paciente_id ? nomesMap[d.paciente_id.toString()] || 'Desconhecido' : '',
            medicoNome: d.medico_id ? nomesMap[d.medico_id.toString()] || 'Desconhecido' : ''
        }));
        return result;
    }

    async listarPorTenant(tenant_id, pageState, limit) {
        let stateBuffer = null;
        if (pageState) {
            stateBuffer = Buffer.from(pageState, 'hex');
        }
        const result = await diagnosticoRepository.findByTenant(tenant_id, stateBuffer, limit);
        return await this.hydrateNomes(result);
    }

    async listarPorPaciente(tenant_id, paciente_id, pageState, limit) {
        let stateBuffer = null;
        if (pageState) {
            stateBuffer = Buffer.from(pageState, 'hex');
        }
        const result = await diagnosticoRepository.findByPaciente(tenant_id, paciente_id, stateBuffer, limit);
        return await this.hydrateNomes(result);
    }

    async cancelarDiagnostico(diagnostico_id, tenant_id, medico_id) {
        // Valida se o médico tem o perfil ativo
        const medico = await medicoRepository.findById(medico_id);
        if (!medico || !medico.ativo) {
            throw new Error('Perfil profissional do médico inválido ou inativo.');
        }

        const diagnostico = await diagnosticoRepository.findByIdAndTenant(tenant_id, diagnostico_id);
        if (!diagnostico) {
            throw new Error('Diagnóstico não encontrado neste tenant.');
        }

        if (diagnostico.status === 'CANCELADO') {
            throw new Error('Diagnóstico já está cancelado.');
        }

        await diagnosticoRepository.updateStatus(diagnostico, 'CANCELADO', 'CANCELAR_DIAGNOSTICO', medico_id);
        return true;
    }
}

module.exports = new DiagnosticoService();
