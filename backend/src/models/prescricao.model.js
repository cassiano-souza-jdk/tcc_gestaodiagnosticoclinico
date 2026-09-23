module.exports = {
    table_name: 'prescricoes',
    fields: {
        tenant_id: 'uuid',
        paciente_id: 'uuid',
        diagnostico_id: 'uuid',
        prescricao_id: 'uuid',
        medico_id: 'uuid',
        medicamento_nome: 'text',
        medicamento_id_sngpc: 'text', // Optional ID from API SNGPC
        dosagem: 'text',
        duracao: 'text',
        created_at: 'timestamp'
    },
    key: [['tenant_id', 'paciente_id'], 'created_at', 'prescricao_id'],
    clustering_order: {
        created_at: 'desc'
    }
};
