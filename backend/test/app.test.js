const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtemp, readdir, readFile, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

async function createFixture(context) {
  const storageDir = await mkdtemp(path.join(tmpdir(), 'dms-test-'));
  context.after(() => rm(storageDir, { recursive: true, force: true }));
  const server = app.createApp({ storageDir, maxUploadBytes: 32 }).listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    storageDir,
    request: (endpoint, options = {}) => fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(5000),
    }),
    upload: (content = 'Documento de teste', owner = 'usuario-1', name = 'relatorio.txt') => {
      const body = new FormData();
      body.append('file', new Blob([content]), name);
      return fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': owner },
        body,
        signal: AbortSignal.timeout(5000),
      });
    },
  };
}

test('upload grava os bytes em disco com nome seguro e retorna apenas metadados públicos', async (context) => {
  const fixture = await createFixture(context);
  const response = await fixture.upload();
  assert.strictEqual(response.status, 201);
  const { document } = await response.json();
  assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.owner, 'usuario-1');
  assert.strictEqual(document.size, Buffer.byteLength('Documento de teste'));
  assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
  const files = await readdir(fixture.storageDir);
  assert.strictEqual(files.length, 1);
  assert.notStrictEqual(files[0], document.originalName);
  assert.strictEqual(await readFile(path.join(fixture.storageDir, files[0]), 'utf8'), 'Documento de teste');
});

test('lista somente documentos do proprietário, do mais recente para o mais antigo', async (context) => {
  const fixture = await createFixture(context);
  const first = (await (await fixture.upload('primeiro')).json()).document;
  const second = (await (await fixture.upload('segundo')).json()).document;
  await fixture.upload('outro', 'usuario-2');
  const response = await fixture.request('/documents', { headers: { 'X-User-Id': 'usuario-1' } });
  assert.strictEqual(response.status, 200);
  const { documents } = await response.json();
  assert.deepStrictEqual(documents.map((document) => document.id), [second.id, first.id]);
  assert.deepStrictEqual(Object.keys(documents[0]).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
  const empty = await fixture.request('/documents', { headers: { 'X-User-Id': 'usuario-3' } });
  assert.deepStrictEqual(await empty.json(), { documents: [] });
});

test('download devolve os bytes originais como anexo', async (context) => {
  const fixture = await createFixture(context);
  const content = new Uint8Array([0, 1, 255, 128, 10]);
  const { document } = await (await fixture.upload(content)).json();
  const response = await fixture.request(`/documents/${document.id}/download`, {
    headers: { 'X-User-Id': document.owner },
  });
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /attachment;.*relatorio\.txt/);
  assert.deepStrictEqual(new Uint8Array(await response.arrayBuffer()), content);
});

test('documento inexistente ou de outro proprietário retorna 404', async (context) => {
  const fixture = await createFixture(context);
  const { document } = await (await fixture.upload()).json();
  for (const id of [document.id, 'inexistente']) {
    const response = await fixture.request(`/documents/${id}/download`, {
      headers: { 'X-User-Id': 'usuario-2' },
    });
    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  }
});

test('identidade ausente ou vazia é rejeitada antes de gravar arquivos', async (context) => {
  const fixture = await createFixture(context);
  for (const headers of [{}, { 'X-User-Id': ' ' }]) {
    for (const [endpoint, method] of [['/upload', 'POST'], ['/documents', 'GET'], ['/documents/qualquer/download', 'GET']]) {
      const body = new FormData();
      body.append('file', new Blob(['teste']), 'teste.txt');
      const response = await fixture.request(endpoint, { method, headers, ...(method === 'POST' ? { body } : {}) });
      assert.strictEqual(response.status, 401);
      assert.strictEqual((await response.json()).error.code, 'USER_REQUIRED');
    }
  }
  assert.deepStrictEqual(await readdir(fixture.storageDir), []);
});

test('upload sem arquivo retorna 400', async (context) => {
  const fixture = await createFixture(context);
  const response = await fixture.request('/upload', { method: 'POST', headers: { 'X-User-Id': 'usuario-1' } });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');
});

test('upload acima do limite retorna 413 sem arquivos ou metadados residuais', async (context) => {
  const fixture = await createFixture(context);
  const response = await fixture.upload('a'.repeat(33));
  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
  assert.deepStrictEqual(await readdir(fixture.storageDir), []);
  const list = await fixture.request('/documents', { headers: { 'X-User-Id': 'usuario-1' } });
  assert.deepStrictEqual(await list.json(), { documents: [] });
});

test('campo inesperado e múltiplos arquivos retornam 400 sem resíduos', async (context) => {
  const fixture = await createFixture(context);
  for (const fields of [['document'], ['file', 'file']]) {
    const body = new FormData();
    for (const field of fields) body.append(field, new Blob(['teste']), 'teste.txt');
    const response = await fixture.request('/upload', { method: 'POST', headers: { 'X-User-Id': 'usuario-1' }, body });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'INVALID_UPLOAD');
    assert.deepStrictEqual(await readdir(fixture.storageDir), []);
  }
});

test('falha ao gravar arquivo retorna erro de armazenamento sem expor caminhos', async (context) => {
  const fixture = await createFixture(context);
  await rm(fixture.storageDir, { recursive: true });
  await writeFile(fixture.storageDir, 'não é um diretório');
  const response = await fixture.upload();
  assert.strictEqual(response.status, 500);
  const body = await response.json();
  assert.strictEqual(body.error.code, 'STORAGE_ERROR');
  assert.ok(!JSON.stringify(body).includes(fixture.storageDir));
});

test('arquivo ausente no disco retorna erro de armazenamento', async (context) => {
  const fixture = await createFixture(context);
  const { document } = await (await fixture.upload()).json();
  const [storageName] = await readdir(fixture.storageDir);
  await rm(path.join(fixture.storageDir, storageName));
  const response = await fixture.request(`/documents/${document.id}/download`, { headers: { 'X-User-Id': 'usuario-1' } });
  assert.strictEqual(response.status, 500);
  assert.strictEqual((await response.json()).error.code, 'STORAGE_ERROR');
});

test('instâncias da aplicação não compartilham metadados e saúde é preservada', async (context) => {
  const first = await createFixture(context);
  await first.upload();
  const second = await createFixture(context);
  const response = await second.request('/documents', { headers: { 'X-User-Id': 'usuario-1' } });
  assert.deepStrictEqual(await response.json(), { documents: [] });
  const health = await second.request('/health');
  assert.strictEqual(health.status, 200);
  assert.deepStrictEqual(await health.json(), { status: 'ok' });
});
