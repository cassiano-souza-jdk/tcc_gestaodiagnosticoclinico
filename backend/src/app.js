const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const medicoRoutes = require('./routes/medico.routes');
const diagnosticoRoutes = require('./routes/diagnostico.routes');
const pacienteRoutes = require('./routes/paciente.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/auth', authRoutes);
app.use('/tenants', tenantRoutes);
app.use('/medicos', medicoRoutes);
app.use('/diagnosticos', diagnosticoRoutes);
app.use('/pacientes', pacienteRoutes);
app.use('/integrations', integrationsRoutes);

module.exports = app;
