const schemas = require('../models');
const { models } = require('../config/database');
const ExpressCassandra = require('express-cassandra');

class DiagnosticoRepository {
    async create(diagnosticoData, acaoAuditoria) {
        const id = ExpressCassandra.uuid();
        const timestamp = new Date();
        const tenantId = typeof diagnosticoData.tenant_id === 'string' ? models.uuidFromString(diagnosticoData.tenant_id) : diagnosticoData.tenant_id;
        const pacienteId = typeof diagnosticoData.paciente_id === 'string' ? models.uuidFromString(diagnosticoData.paciente_id) : diagnosticoData.paciente_id;
        const medicoId = typeof diagnosticoData.medico_id === 'string' ? models.uuidFromString(diagnosticoData.medico_id) : diagnosticoData.medico_id;

        const diagnosticoPorTenant = new schemas.DiagnosticoPorTenant({
            tenant_id: tenantId,
            diagnostico_id: id,
            paciente_id: pacienteId,
            medico_id: medicoId,
            titulo: diagnosticoData.titulo,
            descricao: diagnosticoData.descricao,
            codigo_cid: diagnosticoData.codigo_cid || null,
            status: 'ATIVO',
            created_at: timestamp,
            updated_at: timestamp
        });

        const diagnosticoPorPaciente = new schemas.DiagnosticoPorPaciente({
            tenant_id: tenantId,
            paciente_id: pacienteId,
            diagnostico_id: id,
            medico_id: medicoId,
            titulo: diagnosticoData.titulo,
            descricao: diagnosticoData.descricao,
            codigo_cid: diagnosticoData.codigo_cid || null,
            status: 'ATIVO',
            created_at: timestamp,
            updated_at: timestamp
        });

        const auditoria = new schemas.AuditoriaPorTenant({
            tenant_id: tenantId,
            created_at: timestamp,
            acao: acaoAuditoria,
            usuario_id: medicoId,
            detalhes: JSON.stringify({ diagnostico_id: id.toString(), paciente_id: pacienteId.toString() })
        });

        const queries = [
            diagnosticoPorTenant.save({ return_query: true }),
            diagnosticoPorPaciente.save({ return_query: true }),
            auditoria.save({ return_query: true })
        ];

        return new Promise((resolve, reject) => {
            models.doBatch(queries, (err) => {
                if (err) return reject(err);
                resolve(id);
            });
        });
    }

    async findByTenant(tenantId, pageState, limit = 10) {
        const options = { raw: true, fetchSize: limit };
        if (pageState) options.pageState = pageState;

        return new Promise((resolve, reject) => {
            schemas.DiagnosticoPorTenant.find({ tenant_id: typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId }, options, (err, result) => {
                if (err) return reject(err);
                resolve({
                    data: result,
                    pageState: result.pageState ? result.pageState.toString('hex') : null
                });
            });
        });
    }

    async findByPaciente(tenantId, pacienteId, pageState, limit = 10) {
        const options = { raw: true, fetchSize: limit };
        if (pageState) options.pageState = pageState;

        if (tenantId === 'paciente_tenant') {
            options.allow_filtering = true;
            return new Promise((resolve, reject) => {
                schemas.DiagnosticoPorPaciente.find({ 
                    paciente_id: typeof pacienteId === 'string' ? models.uuidFromString(pacienteId) : pacienteId
                }, options, (err, result) => {
                    if (err) return reject(err);
                    
                    // Como a consulta global não respeita a ordenação da clustering key (pois a partition key varia), 
                    // precisamos ordenar manualmente pelo created_at (desc).
                    if (Array.isArray(result)) {
                        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    }
                    
                    resolve({
                        data: result,
                        pageState: result.pageState ? result.pageState.toString('hex') : null
                    });
                });
            });
        }

        return new Promise((resolve, reject) => {
            schemas.DiagnosticoPorPaciente.find({ 
                tenant_id: typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId,
                paciente_id: typeof pacienteId === 'string' ? models.uuidFromString(pacienteId) : pacienteId
            }, options, (err, result) => {
                if (err) return reject(err);
                resolve({
                    data: result,
                    pageState: result.pageState ? result.pageState.toString('hex') : null
                });
            });
        });
    }

    async findByIdAndTenant(tenantId, diagnosticoId) {
        // ALLOW FILTERING aqui é seguro porque estamos confinados na partição correta (tenant_id)
        return await schemas.DiagnosticoPorTenant.findOneAsync({ 
            tenant_id: typeof tenantId === 'string' ? models.uuidFromString(tenantId) : tenantId,
            diagnostico_id: typeof diagnosticoId === 'string' ? models.uuidFromString(diagnosticoId) : diagnosticoId
        }, { allow_filtering: true });
    }

    async updateStatus(diagnostico, novoStatus, acaoAuditoria, medicoId) {
        const timestamp = new Date();
        const tId = diagnostico.tenant_id;
        const pId = diagnostico.paciente_id;
        const dId = diagnostico.diagnostico_id;
        const createdAt = diagnostico.created_at;

        const queryTenant = { tenant_id: tId, created_at: createdAt, diagnostico_id: dId };
        const queryPaciente = { tenant_id: tId, paciente_id: pId, created_at: createdAt, diagnostico_id: dId };
        const updateValues = { status: novoStatus, updated_at: timestamp };

        const auditoria = new schemas.AuditoriaPorTenant({
            tenant_id: tId,
            created_at: timestamp,
            acao: acaoAuditoria,
            usuario_id: typeof medicoId === 'string' ? models.uuidFromString(medicoId) : medicoId,
            detalhes: JSON.stringify({ diagnostico_id: dId.toString(), paciente_id: pId.toString(), status_novo: novoStatus })
        });

        const queries = [
            schemas.DiagnosticoPorTenant.update(queryTenant, updateValues, { return_query: true }),
            schemas.DiagnosticoPorPaciente.update(queryPaciente, updateValues, { return_query: true }),
            auditoria.save({ return_query: true })
        ];

        return new Promise((resolve, reject) => {
            models.doBatch(queries, (err) => {
                if (err) return reject(err);
                resolve(dId);
            });
        });
    }
}

module.exports = new DiagnosticoRepository();
