const { models } = require('../config/database');

const schemas = {};

schemas.Usuario = models.loadSchema('usuarios', require('./usuario.model'));
schemas.UsuarioPorCpf = models.loadSchema('usuarios_por_cpf', require('./usuarioPorCpf.model'));
schemas.UsuarioPorEmail = models.loadSchema('usuarios_por_email', require('./usuarioPorEmail.model'));
schemas.Medico = models.loadSchema('medicos', require('./medico.model'));
schemas.Tenant = models.loadSchema('tenants', require('./tenant.model'));
schemas.TenantPorCnpj = models.loadSchema('tenants_por_cnpj', require('./tenantPorCnpj.model'));
schemas.TenantPorCpf = models.loadSchema('tenants_por_cpf', require('./tenantPorCpf.model'));
schemas.TenantUsuarioPorTenant = models.loadSchema('tenant_usuarios_por_tenant', require('./tenantUsuarioPorTenant.model'));
schemas.TenantUsuarioPorUsuario = models.loadSchema('tenant_usuarios_por_usuario', require('./tenantUsuarioPorUsuario.model'));
schemas.DiagnosticoPorTenant = models.loadSchema('diagnosticos_por_tenant', require('./diagnosticoPorTenant.model'));
schemas.DiagnosticoPorPaciente = models.loadSchema('diagnosticos_por_paciente', require('./diagnosticoPorPaciente.model'));
schemas.AuditoriaPorTenant = models.loadSchema('auditoria_por_tenant', require('./auditoriaPorTenant.model'));
schemas.Prescricao = models.loadSchema('prescricoes', require('./prescricao.model'));
schemas.AvaliacaoMedicamento = models.loadSchema('avaliacoes_medicamento', require('./avaliacaoMedicamento.model'));

module.exports = schemas;
