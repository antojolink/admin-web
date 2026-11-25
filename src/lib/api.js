import { readSession } from './auth.js';

export async function api(path, options = {}) {
  const session = readSession();
  if (!session) throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
  const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${session.token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(data?.error?.message || `Error ${response.status}`); error.status = response.status; error.code = data?.error?.code; throw error; }
  return data;
}

export async function uploadImage(file, tipo) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Usa una imagen JPG, PNG o WebP.');
  const { uploadUrl, publicUrl } = await api('/uploads/presign', { method: 'POST', body: { tipo, contentType: file.type } });
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new Error('No se pudo subir la imagen a S3.');
  return publicUrl;
}
