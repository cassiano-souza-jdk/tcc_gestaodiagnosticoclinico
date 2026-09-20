const schemas = require('../models');

class MedicoRepository {
    async findByCrm(crm) {
        return await schemas.Medico.findOneAsync({ crm }, { allow_filtering: true });
    }

    async findById(usuario_id) {
        const { models } = require('../config/database');
        const queryId = typeof usuario_id === 'string' ? models.uuidFromString(usuario_id) : usuario_id;
        return await schemas.Medico.findOneAsync({ usuario_id: queryId });
    }
}

module.exports = new MedicoRepository();
