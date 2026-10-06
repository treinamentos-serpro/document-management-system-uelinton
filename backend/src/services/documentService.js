const { randomUUID } = require('node:crypto');
const path = require('node:path');

function toPublicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

function createDocumentService(repository) {
  return {
    upload(file, owner) {
      const document = repository.save({
        id: randomUUID(),
        originalName: path.basename(file.originalname.replace(/\\/g, '/'))
          .replace(/[\u0000-\u001f\u007f]/g, '_'),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      });
      return toPublicDocument(document);
    },
    list(owner) {
      return repository.findByOwner(owner)
        .reverse()
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },
    async download(id, owner) {
      const document = repository.findById(id);
      if (!document || document.owner !== owner) {
        throw Object.assign(new Error('Documento não encontrado.'), {
          status: 404,
          code: 'DOCUMENT_NOT_FOUND',
        });
      }
      return {
        filePath: await repository.getFilePath(document),
        originalName: document.originalName,
      };
    },
  };
}

module.exports = createDocumentService;