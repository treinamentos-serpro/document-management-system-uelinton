import { FileText, Files, LoaderCircle, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${numberFormatter.format(bytes / 1024)} KB`;
  return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, owner, loading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={loading}>
      <div className="section-toolbar">
        <div className="section-heading">
          <h2 id="documents-title">Documentos</h2>
          <span className="document-count">{documents.length}</span>
        </div>
        <button className="button button-secondary" type="button" title="Atualizar documentos" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spin' : undefined} aria-hidden="true" />
          Atualizar
        </button>
      </div>
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}
      {loading && <p className="list-status" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /> Carregando documentos…</p>}
      {!loading && !error && documents.length === 0 && (
        <div className="empty-state">
          <Files size={36} aria-hidden="true" />
          <p>Nenhum documento encontrado.</p>
        </div>
      )}
      {documents.length > 0 && (
        <>
          <div className="document-columns" aria-hidden="true">
            <span>Arquivo</span><span>Tamanho</span><span>Enviado em</span><span />
          </div>
          <ul className="document-list">
            {documents.map((document) => (
              <li className="document-row" key={document.id}>
                <div className="document-name"><FileText size={20} aria-hidden="true" /><span>{document.originalName}</span></div>
                <span className="document-size">{formatSize(document.size)}</span>
                <time className="document-date" dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time>
                <DownloadButton document={document} owner={owner} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}