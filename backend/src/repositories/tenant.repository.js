const schemas = require('../models');
const { models } = require('../config/database');
const ExpressCassandra = require('express-cassandra');

class TenantRepository {
    async findById(tenantId) {
        const id = typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId;
        return await schemas.Tenant.findOneAsync({ id });
    }

    async findByCnpj(cnpj) {
        return await schemas.TenantPorCnpj.findOneAsync({ cnpj });
    }

    async findUserInTenant(tenantId, usuarioId) {
        return await schemas.TenantUsuarioPorTenant.findOneAsync({ 
            tenant_id: typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId, 
            usuario_id: typeof usuarioId === 'string' ? models.uuidFromString(usuarioId) : usuarioId 
        });
    }

    async findByCpf(cpf) {
        return await schemas.TenantPorCpf.findOneAsync({ cpf });
    }

    async upsertUserInTenant({ tenantId, usuarioId, tenantNome, papeis }) {
        const tenantUuid = typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId;
        const usuarioUuid = typeof usuarioId === 'string' ? models.uuidFromString(usuarioId) : usuarioId;
        const existente = await this.findUserInTenant(tenantId.toString(), usuarioId.toString());
        const papeisCombinados = [...new Set([...(existente?.papeis || []), ...papeis])];
        const timestamp = new Date();

        const porTenant = new schemas.TenantUsuarioPorTenant({
            tenant_id: tenantUuid,
            usuario_id: usuarioUuid,
            papeis: papeisCombinados,
            ativo: true,
            created_at: existente?.created_at || timestamp,
            updated_at: timestamp
        });
        const porUsuario = new schemas.TenantUsuarioPorUsuario({
            usuario_id: usuarioUuid,
            tenant_id: tenantUuid,
            tenant_nome: tenantNome,
            papeis: papeisCombinados,
            ativo: true
        });

        return new Promise((resolve, reject) => {
            models.doBatch([
                porTenant.save({ return_query: true }),
                porUsuario.save({ return_query: true })
            ], (err) => {
                if (err) return reject(err);
                resolve({ ativo: true, papeis: papeisCombinados });
            });
        });
    }

    async create(tenantData) {
        const { models } = require('../config/database');
        const tenantId = ExpressCassandra.uuid();
        const timestamp = new Date();
        const usuarioId = typeof tenantData.dono_id === 'string' ? models.uuidFromString(tenantData.dono_id) : tenantData.dono_id;

        const tenant = new schemas.Tenant({
            id: tenantId,
            tipo_tenant: tenantData.tipo_tenant,
            cpf: tenantData.cpf,
            cnpj: tenantData.cnpj,
            razao_social: tenantData.razao_social,
            nome_fantasia: tenantData.nome_fantasia,
            dono_id: usuarioId,
            ativo: true,
            created_at: timestamp,
            updated_at: timestamp
        });

        const tenantUsuarioPorTenant = new schemas.TenantUsuarioPorTenant({
            tenant_id: tenantId,
            usuario_id: usuarioId,
            papeis: tenantData.papeis,
            ativo: true,
            created_at: timestamp,
            updated_at: timestamp
        });

        const tenantUsuarioPorUsuario = new schemas.TenantUsuarioPorUsuario({
            usuario_id: usuarioId,
            tenant_id: tenantId,
            tenant_nome: tenantData.nome_fantasia,
            papeis: tenantData.papeis,
            ativo: true
        });

        // Batch execution
        const queries = [
            tenant.save({ return_query: true }),
            tenantUsuarioPorTenant.save({ return_query: true }),
            tenantUsuarioPorUsuario.save({ return_query: true })
        ];

        if (tenantData.tipo_tenant === 'CLINICA') {
            const tenantPorCnpj = new schemas.TenantPorCnpj({
                cnpj: tenantData.cnpj,
                tenant_id: tenantId,
                razao_social: tenantData.razao_social,
                nome_fantasia: tenantData.nome_fantasia,
                ativo: true
            });
            queries.push(tenantPorCnpj.save({ return_query: true }));
        } else if (tenantData.tipo_tenant === 'AUTONOMO') {
            const tenantPorCpf = new schemas.TenantPorCpf({
                cpf: tenantData.cpf,
                tenant_id: tenantId,
                razao_social: tenantData.razao_social,
                nome_fantasia: tenantData.nome_fantasia,
                ativo: true
            });
            queries.push(tenantPorCpf.save({ return_query: true }));
        }

        return new Promise((resolve, reject) => {
            models.doBatch(queries, (err) => {
                if (err) return reject(err);
                resolve(tenantId);
            });
        });
    }
}

module.exports = new TenantRepository();
