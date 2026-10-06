# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem documentos armazenados localmente, mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de documentos via interface web.
- Listagem dos documentos associados ao usuário atual.
- Download de documento pelo identificador.
- Associação de cada documento a um proprietário.
- Armazenamento local dos arquivos com `multer` e `diskStorage`.
- Interface em React e API em Express.

### Fora do escopo

- Persistência de metadados em banco de dados.
- Armazenamento em nuvem ou em serviços externos.
- Autenticação, autorização avançada e gestão de contas.
- Versionamento, compartilhamento, edição ou exclusão de documentos.
- Pré-visualização e conversão de arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo e arquivos acima do limite configurado. |
| RF-03 | O sistema deve gerar um identificador único e um nome interno seguro para cada arquivo. |
| RF-04 | O sistema deve registrar nome original, tamanho, data/hora do envio e proprietário do documento. |
| RF-05 | O usuário deve poder listar os metadados dos documentos associados ao seu identificador. |
| RF-06 | A listagem deve apresentar documentos do mais recente para o mais antigo. |
| RF-07 | O usuário deve poder baixar um documento pelo identificador, se ele pertencer ao usuário atual. |
| RF-08 | O sistema deve retornar erro apropriado para documento inexistente ou não pertencente ao usuário. |
| RF-09 | A interface deve permitir envio, listagem e download, apresentando estados de carregamento, sucesso e erro. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Arquivos devem ser gravados exclusivamente no filesystem local, em `backend/storage` por padrão, usando `multer` com `diskStorage`. |
| RNF-02 | Metadados devem permanecer em memória nesta fase; reiniciar o processo os apaga. |
| RNF-03 | A configuração operacional deve ser feita por variáveis de ambiente. |
| RNF-04 | O nome original não deve ser usado como caminho de armazenamento; o nome interno deve impedir colisões e traversal de diretórios. |
| RNF-05 | A API deve validar entrada e tratar erros de upload, filesystem e leitura de arquivos. |
| RNF-06 | O backend deve usar Node.js e Express em CommonJS; o frontend, React e Vite em ESM. |
| RNF-07 | Testes do backend devem usar o runner nativo `node:test`. |
| RNF-08 | A implementação deve preservar a separação `routes -> controllers -> services -> repositories`. |

## 5. Modelo de dados

Metadados mantidos em memória por documento:

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | API | Identificador único, preferencialmente UUID. |
| `originalName` | string | API | Nome informado pelo cliente, usado para exibição e download. |
| `size` | number | API | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | API | Data/hora UTC em ISO 8601. |
| `owner` | string | API | Identificador do usuário proprietário. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo. |

O caminho físico deve ser resolvido dentro do diretório configurado de armazenamento. Não deve ser retornado pela API. O registro em memória referencia o arquivo local; como metadados não persistem, após reinício os arquivos podem permanecer sem registro associado.

## 6. Contratos de API

Os caminhos abaixo são relativos ao backend. No frontend, as chamadas usam o prefixo `/api`, removido pelo proxy do Vite durante o desenvolvimento. JSON de erro segue o formato `{"error":{"code":"...","message":"..."}}`.

### Identidade do usuário

Para esta fase local, as requisições usam `X-User-Id` para identificar o proprietário. A ausência ou valor inválido deve resultar em `401`. Esse cabeçalho não autentica o usuário e não deve ser considerado seguro em uma implantação exposta a terceiros; autenticação real está fora do escopo.

### `POST /upload`

- Entrada: `multipart/form-data`, campo obrigatório `file`.
- Limite padrão: 10 MiB, configurável.
- Saída `201`:

```json
{
  "document": {
    "id": "uuid",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-10-06T12:00:00.000Z",
    "owner": "usuario-1"
  }
}
```

- Erros: `400` (`FILE_REQUIRED`), `401` (`USER_REQUIRED`), `413` (`FILE_TOO_LARGE`), `500` (`STORAGE_ERROR`).

### `GET /documents`

- Entrada: `X-User-Id`.
- Saída `200`, com lista limitada ao proprietário e ordenada por data decrescente:

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-10-06T12:00:00.000Z",
      "owner": "usuario-1"
    }
  ]
}
```

- Erro: `401` (`USER_REQUIRED`).

### `GET /documents/:id/download`

- Entrada: identificador na URL e `X-User-Id`.
- Saída `200`: conteúdo binário com `Content-Disposition: attachment` e nome original sanitizado.
- Erros: `401` (`USER_REQUIRED`), `404` (`DOCUMENT_NOT_FOUND`) para documento inexistente ou de outro proprietário, `500` (`STORAGE_ERROR`) se o arquivo não puder ser lido.

### Saúde

`GET /health` retorna `200` com `{"status":"ok"}`. Deve continuar independente das rotas de documentos.

## 7. Decisões arquiteturais

- `routes`: declaram os endpoints e conectam middleware e controllers.
- `controllers`: validam entrada HTTP e formatam status e respostas.
- `services`: aplicam regras de negócio, incluindo propriedade e ordenação.
- `repositories`: gerenciam metadados em memória e acesso aos arquivos locais.
- O middleware de upload configura `multer.diskStorage`; regras de negócio e respostas HTTP não devem ficar nele.
- A interface usa componentes React funcionais e um serviço baseado em `fetch`, chamando a API por `/api`.
- Configuração: `PORT` (padrão `3000`), `STORAGE_DIR` (padrão `backend/storage`) e `MAX_UPLOAD_BYTES` (padrão `10485760`).
- A identidade por cabeçalho é uma concessão de desenvolvimento local, não um mecanismo de autenticação.

## 8. Plano de execução

1. **Fechar contratos e configuração.** Confirmar campos, limites, códigos de erro e comportamento de propriedade. Aceite: contratos desta especificação são consistentes e as decisões locais estão documentadas.
2. **Estabelecer regras e persistência da fase inicial.** Definir ciclo de vida dos metadados em memória e gravação local. Aceite: nomes internos são seguros, metadados não sobrevivem ao reinício e arquivos não saem do diretório configurado.
3. **Disponibilizar operações da API.** Cobrir envio, listagem, download, identidade e erros. Aceite: respostas respeitam os contratos; documentos não podem ser listados ou baixados por outro proprietário.
4. **Disponibilizar os fluxos da interface.** Cobrir envio, atualização da lista e download. Aceite: estados de carregamento, sucesso e falha são compreensíveis e os fluxos usam o prefixo `/api`.
5. **Verificar integração e critérios de qualidade.** Validar limites, erros, isolamento, funcionamento do proxy e saúde do serviço. Aceite: fluxos principais e falhas previstas são verificáveis e a suíte automatizada passa.

**Riscos e limites:** a perda dos metadados no reinício pode deixar arquivos órfãos; o cabeçalho de usuário não oferece segurança real; indisponibilidade ou permissões do filesystem podem impedir uploads e downloads. Esses limites devem ser aceitos para a fase local e revistos antes de qualquer implantação multiusuário exposta.
