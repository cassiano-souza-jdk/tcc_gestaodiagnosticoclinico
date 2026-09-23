const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, 'src', 'repositories', 'medico.repository.js');
const repoContent = fs.readFileSync(repoPath, 'utf8');
const repoNewContent = repoContent.replace(
    'async findById(usuario_id) {',
    `async findByCrm(crm) {
        return await schemas.Medico.findOneAsync({ crm }, { allow_filtering: true });
    }

    async findById(usuario_id) {`
);
fs.writeFileSync(repoPath, repoNewContent);

const servicePath = path.join(__dirname, 'src', 'services', 'medico.service.js');
const serviceContent = fs.readFileSync(servicePath, 'utf8');
const serviceNewContent = serviceContent.replace(
    'class MedicoService {',
    `class MedicoService {
    async buscarPorCrm(crm) {
        const medico = await medicoRepository.findByCrm(crm);
        if (!medico) {
            throw new Error('Nenhum médico encontrado com este CRM.');
        }
        
        const usuarioRepo = require('../repositories/usuario.repository');
        const usuario = await usuarioRepo.findById(medico.usuario_id);
        
        if (!usuario) {
            throw new Error('Médico sem usuário associado.');
        }

        return {
            id: medico.usuario_id.toString(),
            crm: medico.crm,
            uf_crm: medico.uf_crm,
            especialidade: medico.especialidade,
            nome_completo: usuario.nome_completo,
            email: usuario.email
        };
    }`
);
fs.writeFileSync(servicePath, serviceNewContent);

const controllerCode = `const medicoService = require('../services/medico.service');

const buscarPorCrm = async (req, res) => {
    try {
        const { crm } = req.params;
        const medico = await medicoService.buscarPorCrm(crm);
        return res.status(200).json(medico);
    } catch (error) {
        if (error.message.includes('Nenhum') || error.message.includes('sem')) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Erro ao buscar CRM:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = { buscarPorCrm };
`;
fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'medico.controller.js'), controllerCode);

const routeCode = `const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medico.controller');
const authenticate = require('../middleware/authenticate');

router.get('/por-crm/:crm', authenticate, medicoController.buscarPorCrm);

module.exports = router;
`;
fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'medico.routes.js'), routeCode);

const appPath = path.join(__dirname, 'src', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes("require('./routes/medico.routes')")) {
    const appNewContent = appContent
        .replace("const tenantRoutes = require('./routes/tenant.routes');", "const tenantRoutes = require('./routes/tenant.routes');\nconst medicoRoutes = require('./routes/medico.routes');")
        .replace("app.use('/tenants', tenantRoutes);", "app.use('/tenants', tenantRoutes);\napp.use('/medicos', medicoRoutes);");
    fs.writeFileSync(appPath, appNewContent);
}

console.log('Medico API fixed.');
