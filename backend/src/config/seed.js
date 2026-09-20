const usuarioService = require('../services/usuario.service');
const tenantService = require('../services/tenant.service');
const usuarioRepository = require('../repositories/usuario.repository');

async function runSeed() {
    console.log('Verificando a criação de usuários padrão...');

    try {
        const ExpressCassandra = require('express-cassandra');
        const schemas = require('../models');
        const timestamp = new Date();
        const fixedTenantId = ExpressCassandra.uuid('11111111-2222-3333-4444-555555555555');

        // 1. Criar Paciente Padrão
        const cpfPaciente = '12345678901';
        let paciente = await usuarioRepository.findByCpf(cpfPaciente);
        if (!paciente) {
            paciente = await usuarioService.criarUsuario({
                cpf: cpfPaciente,
                nome_completo: 'Ana Martins (Paciente)',
                email: 'paciente@tcc.com',
                senha: '123456'
            });
            console.log('-> Paciente padrão criado: 12345678901 / 123456');
        }

        // 2. Criar Dono Padrão (e seu Tenant)
        const cpfDono = '11122233344';
        let dono = await usuarioRepository.findByCpf(cpfDono);
        if (!dono) {
            dono = await usuarioService.criarUsuario({
                cpf: cpfDono,
                nome_completo: 'Marcos Silva (Dono)',
                email: 'dono@tcc.com',
                senha: '123456'
            });
            console.log('-> Dono padrão criado: 11122233344 / 123456');
        }

        const donoId = dono.id || dono.usuario_id;
        
        const queriesDono = [
            new schemas.Tenant({
                id: fixedTenantId,
                tipo_tenant: 'CLINICA',
                cnpj: '12345678901234',
                razao_social: 'Clínica TCC Médica',
                nome_fantasia: 'Clínica Saúde APP',
                dono_id: typeof donoId === 'string' ? ExpressCassandra.uuid(donoId) : donoId,
                ativo: true,
                created_at: timestamp,
                updated_at: timestamp
            }).save({ return_query: true }),
            new schemas.TenantPorCnpj({
                cnpj: '12345678901234',
                tenant_id: fixedTenantId,
                razao_social: 'Clínica TCC Médica',
                nome_fantasia: 'Clínica Saúde APP',
                ativo: true
            }).save({ return_query: true }),
            new schemas.TenantUsuarioPorTenant({
                tenant_id: fixedTenantId,
                usuario_id: typeof donoId === 'string' ? ExpressCassandra.uuid(donoId) : donoId,
                papeis: ['DONO', 'MEDICO', 'PACIENTE'],
                ativo: true,
                created_at: timestamp,
                updated_at: timestamp
            }).save({ return_query: true }),
            new schemas.TenantUsuarioPorUsuario({
                usuario_id: typeof donoId === 'string' ? ExpressCassandra.uuid(donoId) : donoId,
                tenant_id: fixedTenantId,
                tenant_nome: 'Clínica Saúde APP',
                papeis: ['DONO', 'MEDICO', 'PACIENTE'],
                ativo: true
            }).save({ return_query: true }),
            new schemas.Medico({
                usuario_id: typeof donoId === 'string' ? ExpressCassandra.uuid(donoId) : donoId,
                crm: '123456-SP',
                ativo: true,
                created_at: timestamp,
                updated_at: timestamp
            }).save({ return_query: true })
        ];
        
        await new Promise((resolve, reject) => {
            require('../config/database').models.doBatch(queriesDono, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // 3. Criar Médico Padrão
        const cpfMedico = '98765432100';
        let medico = await usuarioRepository.findByCpf(cpfMedico);
        if (!medico) {
            medico = await usuarioService.criarUsuario({
                cpf: cpfMedico,
                nome_completo: 'Dr. Rafael Lima (Médico)',
                email: 'medico@tcc.com',
                senha: '123456'
            });
            console.log('-> Médico padrão criado: 98765432100 / 123456');
        }
            
        const medicoId = medico.id || medico.usuario_id;
        
        const queriesMedico = [
            new schemas.TenantUsuarioPorTenant({
                tenant_id: fixedTenantId,
                usuario_id: typeof medicoId === 'string' ? ExpressCassandra.uuid(medicoId) : medicoId,
                papeis: ['MEDICO', 'PACIENTE'],
                ativo: true,
                created_at: timestamp,
                updated_at: timestamp
            }).save({ return_query: true }),
            new schemas.TenantUsuarioPorUsuario({
                usuario_id: typeof medicoId === 'string' ? ExpressCassandra.uuid(medicoId) : medicoId,
                tenant_id: fixedTenantId,
                tenant_nome: 'Clínica Saúde APP',
                papeis: ['MEDICO', 'PACIENTE'],
                ativo: true
            }).save({ return_query: true }),
            new schemas.Medico({
                usuario_id: typeof medicoId === 'string' ? ExpressCassandra.uuid(medicoId) : medicoId,
                crm: 'CRM98765-RJ',
                ativo: true,
                created_at: timestamp,
                updated_at: timestamp
            }).save({ return_query: true })
        ];
        
        await new Promise((resolve, reject) => {
            require('../config/database').models.doBatch(queriesMedico, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        console.log('Seed finalizado com sucesso!');
    } catch (err) {
        console.error('Erro ao popular dados iniciais:', err.message);
    }
}

module.exports = runSeed;
