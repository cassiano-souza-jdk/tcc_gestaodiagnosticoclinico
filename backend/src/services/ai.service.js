const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AiService {
    async obterRecomendacoes(cidCode, pacienteHistorico = []) {
        try {
            const response = await fetch(`${aiServiceUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cid_code: cidCode,
                    paciente_historico: pacienteHistorico
                })
            });
            
            if (!response.ok) {
                console.warn(`[AI Service] Falha na recomendação: ${response.statusText}`);
                return [];
            }
            
            const data = await response.json();
            return data.recommendations;
        } catch (error) {
            console.error('[AI Service] Erro de comunicação com o microsserviço de IA:', error.message);
            return []; // Fails gracefully
        }
    }

    async enviarFeedbackEficacia(cidCode, medicamentoNome, notaEficacia) {
        try {
            const response = await fetch(`${aiServiceUrl}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cid_code: cidCode,
                    medicamento_nome: medicamentoNome,
                    nota_eficacia: notaEficacia
                })
            });
            
            if (!response.ok) {
                console.warn(`[AI Service] Falha ao enviar feedback: ${response.statusText}`);
            }
        } catch (error) {
            console.error('[AI Service] Erro de comunicação com o microsserviço de IA:', error.message);
        }
    }
}

module.exports = new AiService();
