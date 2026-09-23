const tenantRepository = require('../repositories/tenant.repository');

const requireTenantRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // A Autenticação (authenticate.js) deve rodar antes disto
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            // O Tenant_id deve obrigatoriamente vir no cabeçalho HTTP, nunca no Body
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                return res.status(400).json({ error: 'Header X-Tenant-ID ausente.' });
            }

            // Validação simples de formato UUID para evitar crash do Express-Cassandra
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            if (tenantId === 'paciente_tenant') {
                req.tenant = { id: 'paciente_tenant', papeis: ['PACIENTE'] };
                if (!allowedRoles.includes('PACIENTE')) {
                    return res.status(403).json({ error: 'Acesso negado: Perfil não tem permissão para esta rota.' });
                }
                return next();
            }

            if (!uuidRegex.test(tenantId)) {
                return res.status(400).json({ error: 'Header X-Tenant-ID inválido.' });
            }

            // Consulta direta e performática (O(1)) no Cassandra usando a Chave de Partição e de Agrupamento
            const tenantUser = await tenantRepository.findUserInTenant(tenantId, req.user.id);

            if (!tenantUser) {
                return res.status(403).json({ error: 'Acesso negado: Usuário não pertence a este tenant.' });
            }

            if (!tenantUser.ativo) {
                return res.status(403).json({ error: 'Acesso negado: Usuário inativo neste tenant.' });
            }

            // Verificação de Interseção: O usuário logado possui algum dos papeis permitidos?
            const hasRole = allowedRoles.some(role => tenantUser.papeis.includes(role));
            if (!hasRole) {
                return res.status(403).json({ error: 'Acesso negado: Papel insuficiente.' });
            }

            // Armazenar o contexto validado para os próximos middlewares e controllers
            req.tenant = {
                id: tenantId,
                papeis: tenantUser.papeis
            };

            next();
        } catch (error) {
            console.error('Erro no Middleware RBAC:', error);
            return res.status(500).json({ error: 'Erro interno na autorização' });
        }
    };
};

module.exports = requireTenantRoles;
