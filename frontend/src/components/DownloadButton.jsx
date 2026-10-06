import { useEffect, useId, useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document, owner }) {
  const errorId = useId();
  const pending = useRef({ controller: null, url: null, timer: null });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    pending.current.controller?.abort();
    clearTimeout(pending.current.timer);
    if (pending.current.url) URL.revokeObjectURL(pending.current.url);
  }, []);

  async function handleDownload() {
    if (downloading) return;
    const controller = new AbortController();
    pending.current.controller = controller;
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id, owner, { signal: controller.signal });
      if (controller.signal.aborted) return;
      clearTimeout(pending.current.timer);
      if (pending.current.url) URL.revokeObjectURL(pending.current.url);
      const url = URL.createObjectURL(blob);
      pending.current.url = url;
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        pending.current.timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          pending.current.url = null;
        }, 1000);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="button button-secondary"
        type="button"
        title={`Baixar ${document.originalName}`}
        aria-label={`Baixar ${document.originalName}`}
        aria-describedby={error ? errorId : undefined}
        aria-busy={downloading}
        disabled={downloading}
        onClick={handleDownload}
      >
        {downloading ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
        {downloading ? 'Baixando…' : 'Baixar'}
      </button>
      {error && <p className="feedback feedback-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}