fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: '11122233344', senha: '123456' })
}).then(res => res.json()).then(data => {
    console.log('Dono:', data);
    
    // Teste do Endpoint de IA usando o token e o Tenant do médico
    fetch('http://localhost:3000/diagnosticos/ia/recomendacoes?cid=CA23.0', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + data.token,
            'X-Tenant-ID': data.usuario.tenant_id
        }
    }).then(res => res.json()).then(aiData => {
        console.log('Sugestões da IA para a asma (CA23.0):', aiData);
    }).catch(err => console.error('Erro na IA:', err));
});

fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: '12345678901', senha: '123456' })
}).then(res => res.json()).then(data => {
    console.log('Paciente:', data);
});

