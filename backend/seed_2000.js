const { connectDB } = require('./src/config/database');
const schemas = require('./src/models');
const { models } = require('./src/config/database');
const bcrypt = require('bcrypt');

const CIDs = [
    { code: 'CA23.0', title: 'Asma e alergia', meds: ['Loratadina 10 mg', 'Solução salina nasal 0,9%', 'Budesonida Spray'] },
    { code: 'J00', title: 'Resfriado comum', meds: ['Paracetamol 750 mg', 'Dipirona 500 mg', 'Vitamina C'] },
    { code: 'I10', title: 'Hipertensão Essencial', meds: ['Losartana 50 mg', 'Atenolol 25 mg', 'Hidroclorotiazida 25 mg'] },
    { code: 'E11', title: 'Diabetes tipo 2', meds: ['Metformina 500 mg', 'Gliclazida 30 mg', 'Insulina NPH'] },
    { code: 'M54.5', title: 'Dor lombar baixa', meds: ['Ibuprofeno 400 mg', 'Ciclobenzaprina 5 mg', 'Paracetamol 750 mg'] }
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomCpf() {
    return Math.floor(10000000000 + Math.random() * 90000000000).toString();
}

async function seed2000() {
    console.log('Iniciando conexão com Cassandra para Seed Massivo...');
    await connectDB();
    
    const timestamp = new Date();
    const tenantId = models.uuid();
    const senhaHash = await bcrypt.hash('123456', 10);

    console.log('Criando Instituição (Tenant)...');
    await new schemas.Tenant({
        id: tenantId,
        tipo_tenant: 'CLINICA',
        cnpj: '99888777000166',
        razao_social: 'Clínica Seed 2000 Ltda',
        nome_fantasia: 'Clínica Saúde IA',
        dono_id: models.uuid(),
        ativo: true,
        created_at: timestamp,
        updated_at: timestamp
    }).saveAsync();

    console.log('Gerando 10 Médicos...');
    const medicos = [];
    for (let i = 0; i < 10; i++) {
        const userId = models.uuid();
        const cpf = generateRandomCpf();
        await new schemas.Usuario({
            id: userId, cpf, nome_completo: `Dr(a). Médico ${i}`,
            email: `medico${i}@seed.com`, senha_hash: senhaHash,
            ativo: true, created_at: timestamp, updated_at: timestamp
        }).saveAsync();

        await new schemas.Medico({
            usuario_id: userId, crm: `CRM-${10000 + i}`,
            ativo: true, created_at: timestamp, updated_at: timestamp
        }).saveAsync();

        medicos.push({ id: userId, nome: `Dr(a). Médico ${i}` });
    }

    console.log('Gerando 100 Pacientes...');
    const pacientes = [];
    for (let i = 0; i < 100; i++) {
        const userId = models.uuid();
        const cpf = generateRandomCpf();
        await new schemas.Usuario({
            id: userId, cpf, nome_completo: `Paciente Real ${i}`,
            email: `paciente${i}@seed.com`, senha_hash: senhaHash,
            ativo: true, created_at: timestamp, updated_at: timestamp
        }).saveAsync();

        pacientes.push({ id: userId, nome: `Paciente Real ${i}`, cpf });
    }

    console.log('Gerando 2000 Diagnósticos e Prescrições (Aguarde alguns segundos)...');
    let diagCount = 0;
    
    // Chunking to avoid overwhelming the memory/driver (Cassandra batch too large limit)
    for (let i = 0; i < 200; i++) {
        const queries = [];
        for (let j = 0; j < 10; j++) {
            const paciente = getRandomItem(pacientes);
            const medico = getRandomItem(medicos);
            const cidObj = getRandomItem(CIDs);
            const diagId = models.uuid();
            const diagTime = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
            
            // Generate 1 to 2 medications from the CID mapping
            const numMeds = Math.floor(Math.random() * 2) + 1;
            const prescritos = [];
            for (let m = 0; m < numMeds; m++) {
                prescritos.push({
                    medicamento_id: models.uuid().toString(),
                    nome: getRandomItem(cidObj.meds),
                    dose: 'Padrão',
                    frequencia: '1x ao dia',
                    duracao: '7 dias',
                    observacao: 'Uso contínuo ou conforme sintomas'
                });
            }

            const diagData = {
                diagnostico_id: diagId,
                tenant_id: tenantId,
                paciente_id: paciente.id,
                medico_id: medico.id,
                paciente_nome: paciente.nome,
                paciente_cpf: paciente.cpf,
                medico_nome: medico.nome,
                titulo: `Consulta para ${cidObj.title}`,
                descricao: `Paciente apresentou sintomas típicos de ${cidObj.title}.`,
                codigo_cid: cidObj.code,
                titulo_cid: cidObj.title,
                medicamentos: prescritos,
                status: 'ATIVO',
                tipo_tenant: 'CLINICA',
                created_at: diagTime,
                updated_at: diagTime
            };

            queries.push(new schemas.DiagnosticoPorTenant(diagData).save({ return_query: true }));
            queries.push(new schemas.DiagnosticoPorPaciente(diagData).save({ return_query: true }));

            // Add prescricoes to train AI feedback
            for (const med of prescritos) {
                queries.push(new schemas.Prescricao({
                    tenant_id: tenantId,
                    paciente_id: paciente.id,
                    diagnostico_id: diagId,
                    prescricao_id: models.uuid(),
                    medico_id: medico.id,
                    medicamento_nome: med.nome,
                    dosagem: 'Padrão',
                    duracao: '7 dias',
                    created_at: diagTime
                }).save({ return_query: true }));
            }
        }
        
        await new Promise((resolve, reject) => {
            models.doBatch(queries, (err) => {
                if (err) return reject(err);
                diagCount += 10;
                process.stdout.write(`...${diagCount} `);
                resolve();
            });
        });
    }

    console.log('\n2000 Registros criados com sucesso!');
    process.exit(0);
}

seed2000().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
