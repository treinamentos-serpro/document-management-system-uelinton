const path = require('node:path');
const { access } = require('node:fs/promises');
const { constants } = require('node:fs');

function createDocumentRepository(storageDir) {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, document);
      return document;
    },
    findById(id) {
      return documents.get(id);
    },
    findByOwner(owner) {
      return [...documents.values()].filter((document) => document.owner === owner);
    },
    async getFilePath(document) {
      const filePath = path.join(storageDir, document.storageName);
      await access(filePath, constants.R_OK);
      return filePath;
    },
  };
}

module.exports = createDocumentRepository;