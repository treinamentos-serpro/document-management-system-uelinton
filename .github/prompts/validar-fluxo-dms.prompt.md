---
description: Valida um fluxo do DMS contra a especificação e executa as suítes pertinentes.
name: validar-fluxo-dms
argument-hint: fluxo a validar (upload, listagem, download ou integração)
agent: agent
---

# Validar fluxo do DMS

Valide o fluxo `${input:fluxo:upload, listagem, download ou integração}` no estado atual do workspace. Considere primeiro as mudanças locais; se não houver mudanças relacionadas, avalie a implementação existente.

1. Leia [a especificação do DMS](../../docs/specs/dms-spec.md) e as instruções do projeto em [copilot-instructions.md](../copilot-instructions.md).
2. Siga o fluxo afetado por todas as camadas pertinentes: componentes e serviço `fetch`, proxy `/api`, rotas, middleware, controller, service, repository e filesystem local.
3. Compare comportamento, validação, respostas/erros e testes com os requisitos e contratos da especificação. Para upload, considere limite, nome interno seguro e ausência de resíduos em falhas; para listagem e download, considere isolamento por `X-User-Id`.
4. Execute `cd backend && npm test` e `cd frontend && npm test`. Se houver mudanças no frontend, execute também `cd frontend && npm run build`.
5. Não altere arquivos. Apresente primeiro os achados, priorizados por severidade e com referências aos arquivos; depois resuma os testes executados e as lacunas de cobertura ou verificações que não puderam ser feitas.

Não marque como defeito uma decisão explicitamente fora do escopo da especificação. Se o fluxo ou o requisito estiver ambíguo, registre a suposição em vez de ampliar o escopo.