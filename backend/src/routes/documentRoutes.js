const { Router } = require('express');
const { requireOwner } = require('../middleware/documentMiddleware');

function createDocumentRoutes(controller, upload) {
  const router = Router();
  router.post('/upload', requireOwner, upload, controller.upload);
  router.get('/documents', requireOwner, controller.list);
  router.get('/documents/:id/download', requireOwner, controller.download);
  return router;
}

module.exports = createDocumentRoutes;