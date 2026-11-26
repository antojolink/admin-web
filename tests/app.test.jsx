import React from 'react';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../src/lib/api.js';
import { confirmRegistration, register } from '../src/lib/auth.js';
import { App } from '../src/main.jsx';
import { productPayload, validPrice } from '../src/lib/forms.js';
import { menuLink } from '../src/lib/qr.js';

vi.mock('../src/lib/api.js', () => ({ api: vi.fn(), uploadImage: vi.fn() }));
vi.mock('../src/lib/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    register: vi.fn(),
    confirmRegistration: vi.fn(),
  };
});
afterEach(() => { cleanup(); });
beforeEach(() => { sessionStorage.clear(); vi.mocked(api).mockReset(); vi.mocked(register).mockReset(); vi.mocked(confirmRegistration).mockReset(); });

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
  it('permite crear cuenta nueva desde el login y pide código de verificación', async () => {
    vi.mocked(register).mockResolvedValueOnce({ userConfirmed: false });
    render(<MemoryRouter initialEntries={['/login']}><App/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'nuevo@restaurante.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Secreta123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme y crear menú' }));
    await waitFor(() => expect(register).toHaveBeenCalledWith('nuevo@restaurante.com', 'Secreta123'));
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
  });
});
