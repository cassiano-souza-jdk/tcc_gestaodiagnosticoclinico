const express = require('express');
const router = express.Router();
const diagnosticoController = require('../controllers/diagnostico.controller');
const authenticate = require('../middleware/authenticate');
const requireTenantRoles = require('../middleware/authTenantRbac');
const resolveDiagnosticoTenant = require('../middleware/resolveDiagnosticoTenant');

// A cadeia de segurança: Token JWT Válido -> Papel de Médico Ativo na Clínica -> Controller
router.post('/', authenticate, resolveDiagnosticoTenant, diagnosticoController.criarDiagnostico);

// Consultar todos do Tenant
router.get('/', authenticate, requireTenantRoles('MEDICO', 'DONO'), diagnosticoController.listarDiagnosticos);

// Cancelar diagnóstico (Somente Médico)
router.patch('/:id/cancelar', authenticate, requireTenantRoles('MEDICO'), diagnosticoController.cancelarDiagnostico);

// IA: Recomendações e Feedback
router.get('/ia/recomendacoes', authenticate, diagnosticoController.obterRecomendacoesIA);
router.post('/ia/feedback', authenticate, diagnosticoController.enviarFeedbackIA);

module.exports = router;
