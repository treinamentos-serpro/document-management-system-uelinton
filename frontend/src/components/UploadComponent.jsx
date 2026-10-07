import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ owner, onUploaded }) {
  const inputId = useId();
  const requestRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    const controller = new AbortController();
    requestRef.current = controller;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const document = await uploadDocument(file, owner, { signal: controller.signal });
      if (controller.signal.aborted) return;
      form.reset();
      setFile(null);
      setSuccess(`${document.originalName} enviado com sucesso.`);
      onUploaded();
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form className="upload-form" onSubmit={handleSubmit} aria-busy={uploading}>
        <label className="file-picker" htmlFor={inputId}>
          <Upload size={22} aria-hidden="true" />
          <span className="file-selection">{file?.name || 'Selecionar arquivo'}</span>
          <input
            className="visually-hidden"
            id={inputId}
            name="file"
            type="file"
            required
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files[0] || null);
              setError('');
              setSuccess('');
            }}
          />
        </label>
        <button className="button button-primary" type="submit" disabled={!file || uploading}>
          {uploading ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
          {uploading ? 'Enviando…' : 'Enviar arquivo'}
        </button>
      </form>
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}
      {success && <p className="feedback feedback-success" role="status">{success}</p>}
    </section>
  );
}