async function request(endpoint, owner, options = {}) {
  let response;
  try {
    response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: { 'X-User-Id': owner },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `Não foi possível concluir a operação (HTTP ${response.status}).`);
  }
  return response;
}

export async function listDocuments(owner, { signal } = {}) {
  const response = await request('/documents', owner, { signal });
  const { documents } = await response.json();
  return documents;
}

export async function uploadDocument(file, owner, { signal } = {}) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', owner, { method: 'POST', body, signal });
  const { document } = await response.json();
  return document;
}

export async function downloadDocument(id, owner, { signal } = {}) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, owner, { signal });
  return response.blob();
}