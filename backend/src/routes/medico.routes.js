const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medico.controller');
const authenticate = require('../middleware/authenticate');

router.get('/por-crm/:crm', authenticate, medicoController.buscarPorCrm);

module.exports = router;
