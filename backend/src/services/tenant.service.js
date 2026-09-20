const tenantRepository = require('../repositories/tenant.repository');
const medicoRepository = require('../repositories/medico.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const integrationsService = require('./integrations.service');

class TenantService {
    async criarTenant({ tipo_tenant, cpf, cnpj, razao_social, nome_fantasia, cep }, usuarioId) {
        
        if (tipo_tenant === 'CLINICA') {
            if (!cnpj || cnpj.length !== 14 || !/^\d+$/.test(cnpj)) {
                throw new Error('CNPJ inválido. Para CLINICA, deve conter exatamente 14 dígitos.');
            }
            
            // Valida CNPJ na Receita Federal (Futura integração)
            /*
            try {
                await integrationsService.fetchCnpj(cnpj);
            } catch (err) {
                throw new Error('CNPJ não encontrado ou inválido na Receita Federal.');
            }
            */
            
            // Validação de duplicidade
            const tenantByCnpj = await tenantRepository.findByCnpj(cnpj);
            if (tenantByCnpj) {
                throw new Error('CNPJ já cadastrado para outra instituição.');
            }
        } else if (tipo_tenant === 'AUTONOMO') {
            if (!cpf || cpf.length !== 11 || !/^\d+$/.test(cpf)) {
                throw new Error('CPF inválido. Para AUTONOMO, deve conter exatamente 11 dígitos.');
            }
            
            // Validação de duplicidade
            const tenantByCpf = await tenantRepository.findByCpf(cpf);
            if (tenantByCpf) {
                throw new Error('CPF já cadastrado para outro profissional.');
            }
        } else {
            throw new Error('O tipo_tenant deve ser CLINICA ou AUTONOMO.');
        }

        // Se houver CEP no cadastro, validamos via ViaCEP (Desativado a pedido do usuário)
        /*
        if (cep) {
            try {
                await integrationsService.fetchCep(cep);
            } catch (err) {
                throw new Error('O CEP fornecido é inválido ou não foi encontrado.');
            }
        }
        */

        if (!razao_social || !nome_fantasia) {
            throw new Error('Razão social e nome fantasia são obrigatórios.');
        }

        // O usuário que cria a instituição ganha papéis de administrador e paciente padrão.
        // No tenant profissional autônomo, o perfil médico ativo também recebe MEDICO.
        const papeis = ['DONO', 'PACIENTE'];
        if (tipo_tenant === 'AUTONOMO') {
            const medico = await medicoRepository.findById(usuarioId);
            if (medico?.ativo) papeis.push('MEDICO');
        }

        const tenantId = await tenantRepository.create({
            tipo_tenant,
            cpf,
            cnpj,
            razao_social,
            nome_fantasia,
            dono_id: usuarioId,
            papeis
        });

        return {
            id: tenantId.toString(),
            tipo_tenant,
            cpf,
            cnpj,
            razao_social,
            nome_fantasia,
            papeis
        };
    }

    async obterOuCriarTenantAutonomo(usuarioId) {
        const medico = await medicoRepository.findById(usuarioId);
        if (!medico || !medico.ativo) {
            const error = new Error('Perfil profissional do médico inválido ou inativo.');
            error.statusCode = 403;
            throw error;
        }

        const usuario = await usuarioRepository.findById(usuarioId);
        const cpf = String(usuario?.cpf || '').replace(/\D/g, '');
        if (cpf.length !== 11) {
            const error = new Error('CPF do médico inválido para atendimento autônomo.');
            error.statusCode = 400;
            throw error;
        }

        const nome = usuario.nome_completo || usuario.nome || 'Atendimento autônomo';
        const existente = await tenantRepository.findByCpf(cpf);
        if (existente && existente.ativo === false) {
            const error = new Error('O tenant autônomo deste médico está inativo.');
            error.statusCode = 403;
            throw error;
        }

        if (existente) {
            const tenantId = existente.tenant_id.toString();
            await tenantRepository.upsertUserInTenant({
                tenantId,
                usuarioId,
                tenantNome: existente.nome_fantasia || nome,
                papeis: ['DONO', 'PACIENTE', 'MEDICO']
            });
            return { id: tenantId, nome: existente.nome_fantasia || nome, tipo_tenant: 'AUTONOMO' };
        }

        const tenantId = await tenantRepository.create({
            tipo_tenant: 'AUTONOMO',
            cpf,
            razao_social: nome,
            nome_fantasia: nome,
            dono_id: usuarioId,
            papeis: ['DONO', 'PACIENTE', 'MEDICO']
        });

        return { id: tenantId.toString(), nome, tipo_tenant: 'AUTONOMO' };
    }

    async adicionarMedicoUnidade(donoId, medicoId) {
        const { models } = require('../config/database');
        const uuidDono = typeof donoId === 'string' ? models.uuidFromString(donoId) : donoId;
        
        const tenantUsuarios = await models.instance.tenant_usuarios_por_usuario.findAsync(
            { usuario_id: uuidDono, ativo: true },
            { allow_filtering: true }
        );
        
        const donoTenant = tenantUsuarios.find(t => t.papeis && t.papeis.includes('DONO'));
        if (!donoTenant) {
            throw new Error('Você não possui uma unidade (Tenant) ativa para gerenciar médicos.');
        }
        
        await tenantRepository.upsertUserInTenant({
            tenantId: donoTenant.tenant_id,
            usuarioId: medicoId,
            tenantNome: donoTenant.tenant_nome,
            papeis: ['MEDICO', 'PACIENTE']
        });
        
        return { success: true };
    }
}

module.exports = new TenantService();
