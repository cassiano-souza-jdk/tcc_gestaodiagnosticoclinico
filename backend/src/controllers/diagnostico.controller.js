const diagnosticoService = require('../services/diagnostico.service');

const criarDiagnostico = async (req, res) => {
    try {
        const tenant_id = req.tenant.id; 
        const medico_id = req.user.id;   

        const result = await diagnosticoService.emitirDiagnostico(
            req.body,
            tenant_id,
            medico_id,
            { tipo_tenant: req.tenant.tipo_tenant, tenant_nome: req.tenant.nome }
        );
        
        return res.status(201).json({ message: 'Diagnóstico emitido com sucesso', data: result });
    } catch (error) {
        if (
            error.message.includes('obrigatório') || 
            error.message.includes('não pertence') ||
            error.message.includes('não encontrado') ||
            error.message.includes('inativo') ||
            error.message.includes('não possui papel') ||
            error.message.includes('Não é permitido')
        ) {
            return res.status(400).json({ error: error.message });
        }
        
        console.error('Erro no Controller de Diagnosticos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const listarDiagnosticos = async (req, res) => {
    try {
        const tenant_id = req.tenant.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const pageState = req.query.pageState;

        const result = await diagnosticoService.listarPorTenant(tenant_id, pageState, limit);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Erro no Controller de Diagnosticos (Listar):', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const listarHistoricoPaciente = async (req, res) => {
    try {
        const tenant_id = req.tenant.id;
        const paciente_id = req.params.pacienteId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const pageState = req.query.pageState;

        // Autorização: Se for apenas PACIENTE, só pode ver seu próprio histórico
        if (req.tenant.papeis.includes('PACIENTE') && !req.tenant.papeis.includes('MEDICO') && !req.tenant.papeis.includes('DONO')) {
            if (req.user.id !== paciente_id) {
                return res.status(403).json({ error: 'Acesso negado: Você só pode consultar o seu próprio histórico.' });
            }
        }

        const result = await diagnosticoService.listarPorPaciente(tenant_id, paciente_id, pageState, limit);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Erro no Controller de Diagnosticos (Histórico):', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const cancelarDiagnostico = async (req, res) => {
    try {
        const tenant_id = req.tenant.id;
        const medico_id = req.user.id;
        const diagnostico_id = req.params.id;

        await diagnosticoService.cancelarDiagnostico(diagnostico_id, tenant_id, medico_id);
        
        return res.status(200).json({ message: 'Diagnóstico cancelado com sucesso.' });
    } catch (error) {
        if (
            error.message.includes('não encontrado') || 
            error.message.includes('já está cancelado') ||
            error.message.includes('inválido ou inativo')
        ) {
            return res.status(400).json({ error: error.message });
        }
        
        console.error('Erro no Controller de Diagnosticos (Cancelar):', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const aiService = require('../services/ai.service');

const obterRecomendacoesIA = async (req, res) => {
    try {
        const { cid } = req.query;
        if (!cid) {
            return res.status(400).json({ error: 'Código CID é obrigatório para recomendação.' });
        }
        
        const recomendacoes = await aiService.obterRecomendacoes(cid, []);
        return res.status(200).json({ data: recomendacoes });
    } catch (error) {
        console.error('Erro ao obter recomendações da IA:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const enviarFeedbackIA = async (req, res) => {
    try {
        const { cid, medicamento_nome, nota_eficacia } = req.body;
        if (!cid || !medicamento_nome || !nota_eficacia) {
            return res.status(400).json({ error: 'CID, medicamento e nota de eficácia são obrigatórios.' });
        }
        
        // Aqui nós poderíamos salvar o feedback na nova tabela `AvaliacaoMedicamento`
        // Mas por ora, vamos enviar diretamente para a IA para o Aprendizado por Reforço
        await aiService.enviarFeedbackEficacia(cid, medicamento_nome, nota_eficacia);
        
        return res.status(200).json({ message: 'Feedback computado com sucesso.' });
    } catch (error) {
        console.error('Erro ao enviar feedback para IA:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    criarDiagnostico,
    listarDiagnosticos,
    listarHistoricoPaciente,
    cancelarDiagnostico,
    obterRecomendacoesIA,
    enviarFeedbackIA
};
