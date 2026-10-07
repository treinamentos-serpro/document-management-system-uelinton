import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listDocuments, uploadDocument, downloadDocument } from '../src/services/documentApi.js';

test('listagem usa /api, identidade e sinal de cancelamento', async (context) => {
  const documents = [{ id: 'documento-1' }];
  const controller = new AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents');
    assert.deepEqual(options.headers, { 'X-User-Id': 'usuario-1' });
    assert.equal(options.signal, controller.signal);
    return Response.json({ documents });
  });
  assert.deepEqual(await listDocuments('usuario-1', { signal: controller.signal }), documents);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('upload envia um arquivo multipart sem fixar Content-Type', async (context) => {
  const file = new File(['teste'], 'relatorio.txt');
  const document = { id: 'documento-1', originalName: file.name };
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.headers, { 'X-User-Id': 'usuario-1' });
    assert.deepEqual([...options.body.keys()], ['file']);
    assert.equal(options.body.get('file').name, file.name);
    assert.equal(await options.body.get('file').text(), 'teste');
    return Response.json({ document }, { status: 201 });
  });
  assert.deepEqual(await uploadDocument(file, 'usuario-1'), document);
});

test('download codifica o identificador, envia identidade e retorna bytes', async (context) => {
  const bytes = new Uint8Array([0, 255, 128]);
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents/id%2Fespecial/download');
    assert.deepEqual(options.headers, { 'X-User-Id': 'usuario-1' });
    return new Response(bytes);
  });
  const blob = await downloadDocument('id/especial', 'usuario-1');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
});

test('mensagens de erro da API são preservadas', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho permitido.' },
  }, { status: 413 }));
  await assert.rejects(uploadDocument(new File(['teste'], 'teste.txt'), 'usuario-1'), {
    message: 'O arquivo excede o tamanho permitido.',
  });
});

test('erro sem JSON produz mensagem legível', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Bad gateway', { status: 502 }));
  await assert.rejects(listDocuments('usuario-1'), /HTTP 502/);
});

test('falhas de rede são traduzidas e cancelamentos são preservados', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(listDocuments('usuario-1'), /Não foi possível conectar ao servidor/);
  const abortError = new DOMException('Cancelado', 'AbortError');
  fetchMock.mock.mockImplementation(async () => { throw abortError; });
  await assert.rejects(listDocuments('usuario-1'), (error) => error === abortError);
});