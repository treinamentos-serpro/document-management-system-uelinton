import { useEffect, useState } from 'react';
import { Check, Files } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('usuario-1');
  const [ownerInput, setOwnerInput] = useState(owner);
  const [ownerError, setOwnerError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(owner, { signal: controller.signal })
      .then((documents) => {
        if (!controller.signal.aborted) setDocuments(documents);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [owner, revision]);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  function applyOwner(event) {
    event.preventDefault();
    const nextOwner = ownerInput.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/.test(nextOwner)) {
      setOwnerError('Use de 1 a 128 caracteres: letras, números, ponto, hífen, sublinhado ou @.');
      return;
    }
    setOwnerError('');
    setOwnerInput(nextOwner);
    if (nextOwner !== owner) {
      setDocuments([]);
      setError('');
      setLoading(true);
      setOwner(nextOwner);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark"><Files size={26} aria-hidden="true" /></div>
        <div className="brand-copy">
          <h1>Document Management System</h1>
          <p className="active-owner">Acervo de <strong>{owner}</strong></p>
        </div>
      </header>
      <form className="owner-form" onSubmit={applyOwner}>
        <div className="owner-field">
          <label htmlFor="owner">Usuário</label>
          <input
            id="owner"
            value={ownerInput}
            required
            maxLength={128}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(ownerError)}
            aria-describedby={ownerError ? 'owner-error' : undefined}
            onChange={(event) => { setOwnerInput(event.target.value); setOwnerError(''); }}
          />
        </div>
        <button className="button button-secondary" type="submit"><Check size={18} aria-hidden="true" /> Aplicar</button>
        {ownerError && <p id="owner-error" className="feedback feedback-error" role="alert">{ownerError}</p>}
      </form>
      <UploadComponent key={owner} owner={owner} onUploaded={refreshDocuments} />
      <DocumentList key={owner} documents={documents} owner={owner} loading={loading} error={error} onRefresh={refreshDocuments} />
    </main>
  );
}
