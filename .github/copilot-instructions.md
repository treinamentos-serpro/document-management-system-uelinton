# Instruções do projeto - Document Management System (DMS)

Estas instruções são aplicadas automaticamente pelo GitHub Copilot em todas as
interações neste repositório. Use-as como contexto de engenharia para gerar
código consistente com a arquitetura e as convenções do projeto.

## Visão geral

Sistema web para gestão de documentos com:

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário

## Stack

- Backend: Node.js + Express (CommonJS)
- Frontend: React + Vite (ESM)
- Testes: runner nativo do Node (`node:test`) no backend e frontend
- Frontend requer Node.js 24 ou superior
- Sem TypeScript nesta fase (JavaScript puro)

## Comandos

- Backend: `cd backend && npm test`; desenvolvimento: `cd backend && npm run dev`
- Frontend: `cd frontend && npm test && npm run build`; desenvolvimento: `cd frontend && npm run dev`
- Execute os comandos na pasta de cada pacote; não há scripts na raiz.

Consulte [a especificação](../docs/specs/dms-spec.md) como fonte de verdade para
contratos da API, configuração, requisitos e critérios de aceite.

## Princípios obrigatórios

- SOLID, DRY, KISS, YAGNI
- 12-Factor App (configuração via variáveis de ambiente)
- Código legível tem prioridade sobre código complexo
- Sem overengineering e sem abstrações desnecessárias

## Arquitetura do backend (Clean Architecture simples)

Separe responsabilidades em quatro camadas dentro de `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada/saída HTTP e validação básica
- `services/`: concentram as regras de negócio
- `repositories/`: cuidam da persistência
- `middleware/`: integra o upload HTTP com `multer`; mantenha regras de negócio
  nos services e formatação de respostas nos controllers

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas.
Use os arquivos existentes em `backend/src` como referência de nomenclatura e
estilo antes de criar novas camadas.

## Endpoints previstos

- `POST /upload` - envia um documento
- `GET /documents` - lista os documentos
- `GET /documents/:id/download` - baixa um documento

## Armazenamento (restrição importante)

- Os arquivos enviados são gravados no filesystem local da aplicação, na pasta
  `backend/storage`, utilizando `multer` com `diskStorage`.
- Os metadados dos documentos (id, nome original, tamanho, data, dono) ficam em
  memória nesta fase inicial.
- Não utilize provedores de armazenamento externos ou serviços de upload de
  terceiros. O armazenamento é estritamente local à aplicação.

## Convenções do frontend

- Componentes funcionais com React Hooks
- Organização baseada em componentes: `components/`, `pages/`, `services/`
- A comunicação com o backend é feita via `fetch`, através do prefixo `/api`
  (proxy configurado no Vite)
- Reutilize componentes e evite duplicação
- Mantenha chamadas HTTP em `frontend/src/services` e cubra-as em
  `frontend/test`; use componentes funcionais com hooks.

## Estilo de código

- Nomes descritivos em inglês para símbolos de código
- Mensagens ao usuário e comentários em português
- Funções pequenas e com responsabilidade única
- Trate erros nos limites do sistema (entrada HTTP, leitura/escrita de arquivos)

## Restrições gerais

- Não quebrar funcionalidades existentes
- Preferir dependências já presentes no `package.json`
- Metadados são voláteis e ficam em memória; arquivos ficam exclusivamente no
  filesystem local. Não introduza banco de dados ou armazenamento externo sem
  mudança explícita de escopo.
