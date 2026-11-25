import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, uploadImage } from '../src/lib/api.js';
import { startLocalDemo } from '../src/lib/auth.js';

beforeEach(() => sessionStorage.setItem('antojolink.session', JSON.stringify({ token: 'token-de-prueba', expiresAt: Date.now()+60000 })));
afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('integración API', () => {
  it('manda el token Bearer al backend', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetcher);
    await api('/categorias');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer token-de-prueba');
  });
  it('usa la URL prefirmada para subir una foto directamente a S3', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ uploadUrl: 'https://s3.example/upload', publicUrl: 'https://cdn.example/foto.png' }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetcher);
    const file = new File(['imagen'], 'foto.png', { type: 'image/png' });
    expect(await uploadImage(file, 'producto')).toBe('https://cdn.example/foto.png');
    expect(fetcher.mock.calls[0][0]).toContain('/uploads/presign');
    expect(fetcher.mock.calls[1][0]).toBe('https://s3.example/upload');
    expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: file });
  });
  it('envía la identidad de demostración solo en desarrollo', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    startLocalDemo();
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);
    await api('/restaurantes/me');
    expect(fetcher.mock.calls[0][1].headers['x-dev-sub']).toBe('antojolink-local-demo');
  });
});
