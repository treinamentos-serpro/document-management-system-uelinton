function createDocumentController(service) {
  return {
    upload(req, res) {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo file.' },
        });
      }
      res.status(201).json({ document: service.upload(req.file, req.owner) });
    },
    list(req, res) {
      res.json({ documents: service.list(req.owner) });
    },
    async download(req, res, next) {
      const document = await service.download(req.params.id, req.owner);
      res.download(document.filePath, document.originalName, (error) => {
        if (error) next(error);
      });
    },
  };
}

module.exports = createDocumentController;