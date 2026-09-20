const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const authenticate = require('../middleware/authenticate');

// Apenas usuários logados podem criar uma instituição
router.post('/', authenticate, tenantController.criarTenant);
router.get('/me', authenticate, tenantController.listarMeusTenants);
router.post('/minha-unidade/medicos', authenticate, tenantController.adicionarMedico);

module.exports = router;
