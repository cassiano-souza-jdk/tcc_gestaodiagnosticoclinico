const request = require('supertest');
const app = require('../src/app');
const diagnosticoRepository = require('../src/repositories/diagnostico.repository');
const medicoRepository = require('../src/repositories/medico.repository');
const tenantRepository = require('../src/repositories/tenant.repository');
const usuarioRepository = require('../src/repositories/usuario.repository');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/diagnostico.repository');
jest.mock('../src/repositories/medico.repository');
jest.mock('../src/repositories/tenant.repository');
jest.mock('../src/repositories/usuario.repository');

describe('Diagnósticos (Emissão e Consulta)', () => {
    let tokenMedico, tokenPaciente;
    const tenantId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
    const medicoId = 'a390f1ee-6c54-4b01-90e6-d701748f0851';
    const pacienteId = 'b490f1ee-6c54-4b01-90e6-d701748f0851';
    const tenantAutonomoId = 'e690f1ee-6c54-4b01-90e6-d701748f0851';

    beforeAll(() => {
        tokenMedico = jwt.sign({ sub: medicoId }, process.env.JWT_SECRET || 'super_secret_key_tcc');
        tokenPaciente = jwt.sign({ sub: pacienteId }, process.env.JWT_SECRET || 'super_secret_key_tcc');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        tenantRepository.findUserInTenant.mockImplementation(async (tId, uId) => {
            if (tId === tenantId && uId === medicoId) return { ativo: true, papeis: ['MEDICO'] };
            if (tId === tenantId && uId === pacienteId) return { ativo: true, papeis: ['PACIENTE'] };
            return null;
        });

        medicoRepository.findById.mockResolvedValue({ ativo: true });
        usuarioRepository.findById.mockImplementation(async (id) => id === medicoId
            ? { id: medicoId, cpf: '98765432100', nome_completo: 'Médico Autônomo', ativo: true }
            : { id, ativo: true });
        tenantRepository.upsertUserInTenant.mockResolvedValue({ ativo: true, papeis: ['PACIENTE'] });
        diagnosticoRepository.create.mockResolvedValue('novo-diagnostico-uuid');
        
        diagnosticoRepository.findByTenant.mockResolvedValue({
            data: [{ diagnostico_id: 'd1', titulo: 'D1' }],
            pageState: 'abc123state'
        });

        diagnosticoRepository.findByPaciente.mockResolvedValue({
            data: [{ diagnostico_id: 'd2', titulo: 'D2' }],
            pageState: null
        });
    });

    describe('POST /diagnosticos', () => {
        it('deve emitir um diagnóstico com sucesso (201)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: pacienteId,
                    titulo: 'Gripe Comum',
                    descricao: 'Repouso',
                    codigo_cid: 'J10'
                });
            expect(response.status).toBe(201);
            expect(diagnosticoRepository.create).toHaveBeenCalled();
        });

        it('deve emitir diagnóstico autônomo sem X-Tenant-ID (201)', async () => {
            tenantRepository.findByCpf.mockResolvedValue(null);
            tenantRepository.create.mockResolvedValue(tenantAutonomoId);

            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .send({
                    tipo_tenant: 'AUTONOMO',
                    paciente_id: pacienteId,
                    titulo: 'Consulta autônoma',
                    descricao: 'Acompanhamento',
                    codigo_cid: 'Z00'
                });

            expect(response.status).toBe(201);
            expect(tenantRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                tipo_tenant: 'AUTONOMO',
                cpf: '98765432100',
                papeis: expect.arrayContaining(['MEDICO'])
            }));
            expect(tenantRepository.upsertUserInTenant).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: tenantAutonomoId,
                usuarioId: pacienteId,
                papeis: ['PACIENTE']
            }));
            expect(diagnosticoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ tenant_id: tenantAutonomoId, medico_id: medicoId, paciente_id: pacienteId }),
                'CRIAR_DIAGNOSTICO'
            );
            expect(response.body.data.tipo_tenant).toBe('AUTONOMO');
        });

        it('deve falhar se faltar o título (400)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: pacienteId,
                    descricao: 'Falta o titulo'
                });
            expect(response.status).toBe(400);
        });

        it('deve falhar se o médico emitir diagnóstico para si mesmo (400)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: medicoId, // Medico is the patient
                    titulo: 'Dor de cabeca',
                    descricao: 'Auto-diagnostico'
                });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Não é permitido emitir um diagnóstico para si mesmo.');
        });

        it('deve falhar se paciente não pertencer ao tenant (400)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: 'c590f1ee-6c54-4b01-90e6-d701748f0851', // Outro paciente
                    titulo: 'Gripe',
                    descricao: 'Repouso'
                });
            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/não pertence/);
        });

        it('deve falhar se paciente estiver inativo no tenant (400)', async () => {
            tenantRepository.findUserInTenant.mockImplementation(async (tId, uId) => {
                if (tId === tenantId && uId === medicoId) return { ativo: true, papeis: ['MEDICO'] };
                if (tId === tenantId && uId === pacienteId) return { ativo: false, papeis: ['PACIENTE'] }; // Paciente inativo
                return null;
            });

            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: pacienteId,
                    titulo: 'Gripe',
                    descricao: 'Repouso'
                });
            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/inativo/);
        });

        it('deve bloquear paciente tentando criar diagnóstico (403)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenPaciente}`) // Paciente chamando a rota POST
                .set('X-Tenant-ID', tenantId)
                .send({
                    paciente_id: pacienteId,
                    titulo: 'Auto-Diagnóstico',
                    descricao: 'Não autorizado'
                });
            expect(response.status).toBe(403);
            expect(response.body.error).toMatch(/Papel insuficiente/);
        });

        it('deve bloquear se médico for de outro tenant ou inativo (403)', async () => {
            const response = await request(app)
                .post('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', 'f990f1ee-6c54-4b01-90e6-d701748f0851') // Outro tenant onde ele não é medico
                .send({
                    paciente_id: pacienteId,
                    titulo: 'Gripe',
                    descricao: 'Repouso'
                });
            expect(response.status).toBe(403); // O middleware vai negar por não achar ele no tenant
        });
    });

    describe('GET /diagnosticos', () => {
        it('deve listar os diagnósticos do tenant para um médico (200)', async () => {
            const response = await request(app)
                .get('/diagnosticos')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(200);
            expect(response.body.data[0].titulo).toBe('D1');
            expect(response.body.pageState).toBe('abc123state');
            expect(diagnosticoRepository.findByTenant).toHaveBeenCalled();
        });

        it('deve bloquear paciente de listar todos diagnósticos do tenant (403)', async () => {
            const response = await request(app)
                .get('/diagnosticos')
                .set('Authorization', `Bearer ${tokenPaciente}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(403);
            expect(response.body.error).toMatch(/Papel insuficiente/);
        });
    });

    describe('GET /pacientes/:pacienteId/diagnosticos', () => {
        it('deve permitir que o próprio paciente consulte seu histórico (200)', async () => {
            const response = await request(app)
                .get(`/pacientes/${pacienteId}/diagnosticos`)
                .set('Authorization', `Bearer ${tokenPaciente}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(200);
            expect(response.body.data[0].titulo).toBe('D2');
            expect(diagnosticoRepository.findByPaciente).toHaveBeenCalled();
        });

        it('deve impedir que paciente consulte histórico de outro paciente (403)', async () => {
            const response = await request(app)
                .get(`/pacientes/c590f1ee-6c54-4b01-90e6-d701748f0851/diagnosticos`) // Id de outro paciente
                .set('Authorization', `Bearer ${tokenPaciente}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(403);
            expect(response.body.error).toMatch(/Você só pode consultar o seu próprio histórico/);
        });

        it('deve permitir que um médico consulte o histórico de qualquer paciente do tenant (200)', async () => {
            const response = await request(app)
                .get(`/pacientes/c590f1ee-6c54-4b01-90e6-d701748f0851/diagnosticos`) // Id de outro paciente
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(200);
            expect(response.body.data[0].titulo).toBe('D2');
        });
    });

    describe('PATCH /diagnosticos/:id/cancelar', () => {
        beforeEach(() => {
            diagnosticoRepository.findByIdAndTenant.mockResolvedValue({
                tenant_id: tenantId,
                paciente_id: pacienteId,
                diagnostico_id: 'd1',
                created_at: new Date(),
                status: 'ATIVO'
            });
            diagnosticoRepository.updateStatus.mockResolvedValue('d1');
        });

        it('deve permitir que um médico cancele o diagnóstico (200)', async () => {
            const response = await request(app)
                .patch('/diagnosticos/d1/cancelar')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(200);
            expect(response.body.message).toMatch(/cancelado com sucesso/);
            expect(diagnosticoRepository.updateStatus).toHaveBeenCalled();
        });

        it('deve impedir que um paciente cancele o diagnóstico (403)', async () => {
            const response = await request(app)
                .patch('/diagnosticos/d1/cancelar')
                .set('Authorization', `Bearer ${tokenPaciente}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(403);
            expect(response.body.error).toMatch(/Papel insuficiente/);
            expect(diagnosticoRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('deve falhar se o diagnóstico não pertencer ao tenant (400)', async () => {
            diagnosticoRepository.findByIdAndTenant.mockResolvedValue(null);

            const response = await request(app)
                .patch('/diagnosticos/d1/cancelar')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/não encontrado/);
        });

        it('deve falhar se o diagnóstico já estiver cancelado (400)', async () => {
            diagnosticoRepository.findByIdAndTenant.mockResolvedValue({
                tenant_id: tenantId,
                paciente_id: pacienteId,
                diagnostico_id: 'd1',
                created_at: new Date(),
                status: 'CANCELADO'
            });

            const response = await request(app)
                .patch('/diagnosticos/d1/cancelar')
                .set('Authorization', `Bearer ${tokenMedico}`)
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/já está cancelado/);
        });
    });
});
