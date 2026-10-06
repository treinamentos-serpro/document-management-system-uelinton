const multer = require('multer');
const { mkdir } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner || !/^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/.test(owner)) {
    return res.status(401).json({
      error: { code: 'USER_REQUIRED', message: 'Informe um identificador de usuário válido em X-User-Id.' },
    });
  }
  req.owner = owner;
  next();
}

function createUpload(storageDir, maxUploadBytes) {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      mkdir(storageDir, { recursive: true })
        .then(() => callback(null, storageDir), callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  });
  const upload = multer({
    storage,
    defParamCharset: 'utf8',
    limits: { fileSize: maxUploadBytes, files: 1, fields: 0 },
  }).single('file');

  return (req, res, next) => upload(req, res, (error) => {
    if (error && !(error instanceof multer.MulterError) && !error.code) {
      error.status = 400;
      error.code = 'INVALID_UPLOAD';
      error.message = 'Envio multipart inválido.';
    }
    next(error);
  });
}

function handleDocumentError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: tooLarge ? 'O arquivo excede o tamanho permitido.' : 'Envie apenas um arquivo no campo file.',
      },
    });
  }

  const expected = error.code === 'DOCUMENT_NOT_FOUND' || error.code === 'INVALID_UPLOAD';
  res.status(expected ? error.status : 500).json({
    error: {
      code: expected ? error.code : 'STORAGE_ERROR',
      message: expected ? error.message : 'Não foi possível acessar o armazenamento local.',
    },
  });
}

module.exports = { requireOwner, createUpload, handleDocumentError };