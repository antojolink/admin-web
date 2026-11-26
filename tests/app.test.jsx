import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../src/lib/api.js';
import { App } from '../src/main.jsx';
import { productPayload, validPrice } from '../src/lib/forms.js';
import { menuLink } from '../src/lib/qr.js';

vi.mock('../src/lib/api.js', () => ({ api: vi.fn(), uploadImage: vi.fn() }));
beforeEach(() => { sessionStorage.clear(); vi.mocked(api).mockReset(); });

describe('panel', () => {
  it('redirige una ruta protegida a login sin sesión', () => {
    render(<MemoryRouter initialEntries={['/productos']}><App/></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /tu restaurante/i })).toBeInTheDocument();
  });
  it('rechaza precios vacíos o negativos y formatea dos decimales', () => {
    expect(validPrice('')).toBeNull();
    expect(validPrice('-1')).toBeNull();
    expect(validPrice('25')).toBe('25.00');
    expect(() => productPayload({categoriaId:'a',nombre:'Taco',precio:'-1'})).toThrow(/precio válido/);
  });
  it('construye la URL exacta usada por el QR', () => {
    expect(menuLink('https://menu.example.com/', 'tacos-pepe')).toBe('https://menu.example.com/tacos-pepe');
  });
  it('envía una categoría nueva al backend con token de sesión', async () => {
    sessionStorage.setItem('antojolink.session', JSON.stringify({ token: 'test', expiresAt: Date.now()+60000 }));
    vi.mocked(api).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/categorias']}><App/></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Tacos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir categoría' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/categorias', { method:'POST', body:{ nombre:'Tacos', orden:0 } }));
  });
  it('permite elegir plantilla en Configuración y enviarla al backend', async () => {
    sessionStorage.setItem('antojolink.session', JSON.stringify({ token: 'test', expiresAt: Date.now()+60000 }));
    vi.mocked(api).mockResolvedValue({
      nombre: 'La Casa del Maíz',
      temaColor: '#1B5E20',
      plantilla: 'trattoria',
      logoUrl: null,
      telefono: '3319876543',
    });
    render(<MemoryRouter initialEntries={['/configuracion']}><App/></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue('La Casa del Maíz')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Artesanal Mexicana/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/restaurantes/me', {
      method: 'PUT',
      body: {
        nombre: 'La Casa del Maíz',
        temaColor: '#1B5E20',
        plantilla: 'maiz',
        logoUrl: null,
        telefono: '3319876543',
      },
    }));
  });
});
