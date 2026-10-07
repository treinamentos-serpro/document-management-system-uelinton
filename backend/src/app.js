const express = require('express');
const path = require('node:path');
const createDocumentRepository = require('./repositories/documentRepository');
const createDocumentService = require('./services/documentService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRoutes = require('./routes/documentRoutes');
const { createUpload, handleDocumentError } = require('./middleware/documentMiddleware');

const PORT = process.env.PORT || 3000;

function createApp(options = {}) {
  const storageDir = path.resolve(__dirname, '..', options.storageDir || process.env.STORAGE_DIR || 'storage');
  const maxUploadBytes = Number(options.maxUploadBytes ?? process.env.MAX_UPLOAD_BYTES ?? 10485760);
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) {
    throw new Error('MAX_UPLOAD_BYTES deve ser um inteiro positivo.');
  }

  const app = express();
  const repository = createDocumentRepository(storageDir);
  const service = createDocumentService(repository);
  const controller = createDocumentController(service);

  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(createDocumentRoutes(controller, createUpload(storageDir, maxUploadBytes)));
  app.use(handleDocumentError);
  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
