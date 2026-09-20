const medicoService = require('../services/medico.service');

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
