# Guia Completo de Instalação e Execução - Saúde App TCC

Este guia detalha o passo a passo para configurar o ambiente de desenvolvimento do zero, unificando a orquestração do banco de dados (Apache Cassandra), da Inteligência Artificial (PyTorch/FastAPI) e da API (Node.js) através do Docker Compose, além da execução do Frontend do projeto em React Native.

---

## 1. Pré-requisitos
Certifique-se de ter as seguintes ferramentas instaladas em sua máquina:
- **[Git](https://git-scm.com/)**: Para clonar o repositório.
- **[Node.js](https://nodejs.org/en/) (v16 ou superior)**: Ambiente de execução do frontend (e backend avulso, se necessário).
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Para rodar o ecossistema completo (Cassandra, Node.js e IA em Python) em rede fechada e sem conflitos de sistema operacional.

---

## 2. Clonando o Repositório
Baixe o código fonte do sistema para a sua máquina:

```bash
git clone https://github.com/JapaMassakiDev/TCC_GestaoDiagnosticoClinico.git
cd TCC_GestaoDiagnosticoClinico
```

---

## 3. Subindo a Arquitetura (Cassandra + Backend + IA) via Docker Compose
O projeto foi modernizado para utilizar o Docker Compose. Com um único comando, as imagens do Cassandra, do Backend em Node.js e da IA em Python (FastAPI + PyTorch) são compiladas, conectadas e iniciadas em paralelo.

1. Abra o seu terminal (Powershell, CMD ou Bash) na raiz do projeto (`TCC_GestaoDiagnosticoClinico`).
2. Execute o comando de orquestração:
   ```bash
   docker-compose up -d --build
   ```
3. **Aguarde a inicialização**: O Docker baixará o Python, o Node e o Cassandra. A API do Node.js está configurada com um *Healthcheck* e só inicializará de fato após o Cassandra estar 100% ativo (o que leva cerca de 45 segundos). O microsserviço de Inteligência Artificial processará as matrizes matemáticas de treinamento supervisionado na primeira inicialização e ficará exposto na porta 8000.

> **Mágica do Sync:** Antes da API (Node.js) subir na porta 3000, um script interno sincronizará automaticamente o Keyspace (`saude_app`) e as tabelas (incluindo as de IA) no Cassandra.

*(Nota: Caso você já tivesse um container solto rodando o Cassandra, lembre-se de excluí-lo usando `docker rm -f cassandra-tcc` antes de rodar o Compose para evitar conflito de porta 9042).*

### 3.1. Testando as Rotas (Postman / Insomnia)
Na pasta `/backend`, você encontrará as coleções prontas:
- `TCC_Postman_Collection.json`
- `TCC_Insomnia_Collection.json`
Basta importar. As rotas originais e as novas rotas do serviço de IA já estão mapeadas para o `localhost:3000`.

---

## 4. Configurando e Rodando o Frontend (Interface)

O Frontend roda por fora do Docker para facilitar o desenvolvimento pelo Expo e o escaneamento de QR Code pelo seu celular.

Abra uma **nova janela do terminal** e entre na pasta do frontend:

```bash
cd frontend
```

### 4.1. Instalação das Dependências
Instale todos os pacotes necessários:
```bash
npm install
```

### 4.2. Execução
O frontend utiliza `Metro` como compilador do framework Expo. Para iniciá-lo, rode:
```bash
npx expo start
```

O terminal exibirá uma URL (geralmente `http://localhost:8081/`), na qual, ao clicar, abrirá o painel de desenvolvimento no navegador.

### 4.3. Execução no Expo Go (Opcional - App Mobile)
O projeto oferece suporte mobile. Caso queira utilizar como aplicativo no seu próprio smartphone:
1. Baixe o Expo Go na **[App Store](https://apps.apple.com/br/app/expo-go/id982107779)** (IOS) ou **[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=pt_BR)** (Android).
2. Conecte o seu celular na mesma rede Wi-Fi que o seu computador.
3. Com o Expo Go aberto, escaneie o **QR code** gerado pelo terminal do comando `npx expo start`.

Pronto! A interface carregará no seu celular e conversará perfeitamente com a API Node.js e a Inteligência Artificial rodando no Docker do seu computador.

---

## 5. Comandos Úteis (Docker)

Se você desligar o PC e quiser voltar a codar no dia seguinte, os contêineres estarão desligados. Não é necessário rodar `--build` novamente (a menos que mude algum pacote NPM ou PIP).

- **Ligar todo o ecossistema:**
  ```bash
  docker-compose up -d
  ```
- **Acompanhar os logs (ver se teve algum erro no Node ou no Python):**
  ```bash
  docker-compose logs -f
  ```
- **Desligar o ecossistema preservando os dados:**
  ```bash
  docker-compose down
  ```
- **Resetar tudo (apagar o banco e as imagens):**
  ```bash
  docker-compose down -v
  ```
