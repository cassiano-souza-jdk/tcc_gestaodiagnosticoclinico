const { connectDB } = require('./database');
const schemas = require('../models');
const runSeed = require('./seed');

async function syncAll() {
    await connectDB();
    for (const modelName of Object.keys(schemas)) {
        console.log(`Sincronizando tabela para: ${modelName}`);
        await schemas[modelName].syncDBAsync();
    }
    console.log('Todas as tabelas foram criadas/sincronizadas com sucesso!');
    
    // Executa a carga inicial (seed)
    await runSeed();
    
    process.exit(0);
}

syncAll().catch(err => {
    console.error(err);
    process.exit(1);
});
