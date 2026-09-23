module.exports = {
    table_name: 'avaliacoes_medicamento',
    fields: {
        tenant_id: 'uuid',
        paciente_id: 'uuid',
        avaliacao_id: 'uuid',
        prescricao_id: 'uuid',
        medicamento_nome: 'text',
        diagnostico_id: 'uuid',
        nota_eficacia: 'int', // 1 a 5
        comentarios: 'text',
        feedback_aplicado_na_ia: 'boolean', // Flag para controle de RL
        created_at: 'timestamp'
    },
    key: [['tenant_id', 'paciente_id'], 'created_at', 'avaliacao_id'],
    clustering_order: {
        created_at: 'desc'
    }
};
