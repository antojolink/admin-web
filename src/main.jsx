import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, uploadImage } from './lib/api.js';
import {
  completeTemporaryPassword,
  confirmRegistration,
  login,
  logout,
  readSession,
  register,
  resendConfirmationCode,
  startLocalDemo,
} from './lib/auth.js';
import { productPayload } from './lib/forms.js';
import { menuLink } from './lib/qr.js';
import { MENU_TEMPLATES } from './lib/templates.js';
import './styles.css';

function ErrorNotice({ message }) { return message ? <p className="error" role="alert">{message}</p> : null; }
function SuccessNotice({ message }) { return message ? <p className="success" role="status">{message}</p> : null; }
function Protected({ children }) { return readSession() ? children : <Navigate to="/login" replace />; }

function TemplatePicker({ value, onChange, previewColor, restaurantName }) {
  return (
    <fieldset className="template-fieldset">
      <legend>Plantilla del menú</legend>
      <div className="template-grid">
        {MENU_TEMPLATES.map((tpl) => {
          const selected = value === tpl.id;
          const accent = previewColor || tpl.accent;
          const title = restaurantName?.trim() || tpl.sampleTitle;
          return (
            <button
              type="button"
              key={tpl.id}
              className={`template-card${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(tpl.id)}
            >
              <div
                className={`tpl-mockup${tpl.rounded ? ' is-rounded' : ''}${tpl.id === 'trattoria' ? ' is-framed' : ''}`}
                style={{
                  background: tpl.paper,
                  color: tpl.ink,
                  borderColor: tpl.dark ? 'rgba(200,155,84,0.35)' : 'rgba(30,28,26,0.14)',
                  fontFamily: tpl.fontBody,
                }}
              >
                {tpl.id === 'maiz' && <span className="tpl-top-stripe" style={{ background: accent }} />}

                {/* Mini fixed navbar */}
                <div className="tpl-mini-nav" style={{ borderBottomColor: tpl.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
                  <span style={{ color: accent, borderBottomColor: accent }} className="tpl-mini-tab active">Entradas</span>
                  <span className="tpl-mini-tab">Fuertes</span>
                  <span className="tpl-mini-tab">Bebidas</span>
                </div>

                {/* Mini cover */}
                <div className={`tpl-mini-hero${tpl.id === 'maiz' ? ' left' : ''}${tpl.id === 'waffle' ? ' arched' : ''}`}>
                  <span className="tpl-mini-eyebrow" style={{ color: accent }}>{tpl.eyebrow}</span>
                  <strong className="tpl-mini-title" style={{ fontFamily: tpl.fontDisplay }}>{title}</strong>
                </div>

                {/* Mini category + dishes */}
                <div className="tpl-mini-body">
                  <div className="tpl-mini-cat" style={{ color: accent, fontFamily: tpl.fontDisplay }}>{tpl.sampleCategory}</div>
                  {tpl.sampleDishes.map((dish) => (
                    <div key={dish.name} className="tpl-mini-dish" style={{ borderBottomColor: tpl.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                      {dish.photo && <span className="tpl-mini-photo" style={{ background: accent }} />}
                      <div className="tpl-mini-dish-copy">
                        <div className="tpl-mini-dish-row">
                          <span style={{ fontFamily: tpl.fontDisplay }}>{dish.name}</span>
                          {tpl.dotted && <span className="tpl-mini-dots" />}
                          <strong style={{ color: tpl.id === 'trattoria' ? tpl.ink : accent }}>{dish.price}</strong>
                        </div>
                        <small>{dish.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini floating comanda bar */}
                <div
                  className="tpl-mini-comanda"
                  style={{
                    background: tpl.dark ? accent : tpl.ink,
                    color: tpl.paper,
                    borderColor: accent,
                  }}
                >
                  <span>1 · {tpl.listTitle}</span>
                  <span>{tpl.sampleDishes[0].price}</span>
                </div>
              </div>

              <div className="tpl-card-meta">
                <strong>{tpl.name}</strong>
                <small>{tpl.subtitle}</small>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('login'); // 'login' | 'register' | 'confirm'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [challenge, setChallenge] = React.useState(null);
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function goToApp() {
    try { await api('/restaurantes/me'); navigate('/dashboard', { replace: true }); }
    catch (err) { navigate(err.status === 403 ? '/onboarding' : '/dashboard', { replace: true }); }
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setInfo(''); setBusy(true);
    try {
      if (challenge) {
        await completeTemporaryPassword(email, newPassword, challenge);
        await goToApp();
        return;
      }
      if (mode === 'register') {
        const res = await register(email.trim(), password);
        if (res.userConfirmed) {
          await login(email.trim(), password);
          await goToApp();
        } else {
          setMode('confirm');
          setInfo('Te enviamos un código de verificación a tu correo.');
        }
        return;
      }
      if (mode === 'confirm') {
        await confirmRegistration(email.trim(), code);
        await login(email.trim(), password);
        await goToApp();
        return;
      }
      const result = await login(email.trim(), password);
      if (result.challenge) { setChallenge(result.session); return; }
      await goToApp();
    } catch (err) { setError(err.message || 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }

  async function resend() {
    setError(''); setInfo(''); setBusy(true);
    try {
      await resendConfirmationCode(email.trim());
      setInfo('Código reenviado a tu correo.');
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el código.');
    } finally {
      setBusy(false);
    }
  }

  async function enterDemo() {
    startLocalDemo();
    await goToApp();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">ANTOJOLINK</p>
        <h1>
          {challenge
            ? 'Crea tu contraseña'
            : mode === 'register'
              ? 'Crea tu cuenta'
              : mode === 'confirm'
                ? 'Verifica tu correo'
                : 'Tu restaurante, en tus manos'}
        </h1>
        <p>Administra tu menú digital desde un solo lugar.</p>

        {!challenge && mode !== 'confirm' && (
          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === 'login' ? 'active' : 'ghost'} onClick={() => { setMode('login'); setError(''); setInfo(''); }}>
              Iniciar sesión
            </button>
            <button type="button" className={mode === 'register' ? 'active' : 'ghost'} onClick={() => { setMode('register'); setError(''); setInfo(''); }}>
              Crear cuenta
            </button>
          </div>
        )}

        <form onSubmit={submit}>
          {!challenge && mode !== 'confirm' && (
            <>
              <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
              <label>
                Contraseña
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
                {mode === 'register' && <small className="field-hint">Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>}
              </label>
            </>
          )}
          {mode === 'confirm' && (
            <label>
              Código de verificación
              <input value={code} onChange={e => setCode(e.target.value)} required placeholder="123456" inputMode="numeric" />
            </label>
          )}
          {challenge && (
            <label>Nueva contraseña<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" /></label>
          )}
          <SuccessNotice message={info} />
          <ErrorNotice message={error} />
          <button disabled={busy}>
            {busy
              ? 'Espera…'
              : challenge
                ? 'Guardar contraseña'
                : mode === 'register'
                  ? 'Registrarme y crear menú'
                  : mode === 'confirm'
                    ? 'Confirmar y entrar'
                    : 'Entrar al panel'}
          </button>
          {mode === 'confirm' && (
            <div className="actions">
              <button type="button" className="ghost" onClick={resend} disabled={busy}>Reenviar código</button>
              <button type="button" className="ghost" onClick={() => setMode('login')}>Volver a login</button>
            </div>
          )}
        </form>
        {import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true' && (
          <button className="ghost demo-button" onClick={enterDemo}>Entrar en modo demo local</button>
        )}
      </section>
    </main>
  );
}

function Shell({ children }) {
  const navigate = useNavigate();
  return <div className="shell"><aside><Link className="brand" to="/dashboard">Antojo<span>Link</span></Link><p className="side-label">ADMINISTRACIÓN</p><nav><Link to="/dashboard">Resumen</Link><Link to="/categorias">Categorías</Link><Link to="/productos">Productos</Link><Link to="/configuracion">Configuración</Link></nav><button className="ghost logout" onClick={()=>{logout();navigate('/login',{replace:true});}}>Cerrar sesión</button></aside><main className="main">{children}</main></div>;
}

function useRequest(loader) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const loaderRef = React.useRef(loader);
  loaderRef.current = loader;
  const refresh = React.useCallback(async () => { setLoading(true); setError(''); try { setData(await loaderRef.current()); } catch(err) { setError(err.message); } finally { setLoading(false); } }, []);
  React.useEffect(() => { refresh(); }, [refresh]);
  return { data, error, loading, refresh, setError };
}

function Onboarding() {
  const navigate = useNavigate(); const [nombre,setNombre] = React.useState(''); const [temaColor,setColor] = React.useState('#9B2226'); const [plantilla,setPlantilla] = React.useState('trattoria'); const [error,setError] = React.useState(''); const [busy,setBusy] = React.useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/restaurantes',{method:'POST',body:{nombre,temaColor,plantilla}}); navigate('/dashboard'); } catch(err) { setError(err.message); } finally { setBusy(false); } }
  return <Shell><div className="page-head"><p className="eyebrow">PRIMER PASO</p><h1>Crea tu restaurante</h1><p>Tu menú tendrá una dirección propia para compartir por QR.</p></div><form className="card form" onSubmit={submit}><label>Nombre del restaurante<input value={nombre} onChange={e=>setNombre(e.target.value)} maxLength="120" required /></label><TemplatePicker value={plantilla} onChange={setPlantilla} previewColor={temaColor} restaurantName={nombre} /><label>Color del menú<input type="color" value={temaColor} onChange={e=>setColor(e.target.value)} /></label><ErrorNotice message={error}/><button disabled={busy}>Crear restaurante</button></form></Shell>;
}

function Dashboard() {
  const restaurant = useRequest(()=>api('/restaurantes/me'),[]);
  const categories = useRequest(()=>api('/categorias'),[]);
  const products = useRequest(()=>api('/productos'),[]);
  const [qr,setQr] = React.useState('');
  const slug = restaurant.data?.slug;
  const link = slug && import.meta.env.VITE_MENU_BASE_URL ? menuLink(import.meta.env.VITE_MENU_BASE_URL,slug) : '';
  React.useEffect(()=>{ if(link) QRCode.toDataURL(link,{width:1024,margin:2}).then(setQr).catch(()=>setQr('')); },[link]);
  function download() { const a=document.createElement('a'); a.href=qr; a.download=`qr-${slug}.png`; a.click(); }
  return <Shell><div className="page-head"><p className="eyebrow">RESUMEN</p><h1>{restaurant.data?.nombre || 'Tu restaurante'}</h1><p>Todo lo que necesitas para mantener tu menú actualizado.</p></div><ErrorNotice message={restaurant.error || categories.error || products.error}/>{restaurant.loading ? <p>Cargando…</p> : <><div className="stats"><div className="card"><span>Categorías</span><strong>{categories.data?.length ?? '—'}</strong></div><div className="card"><span>Productos</span><strong>{products.data?.length ?? '—'}</strong></div><div className="card"><span>Tu dirección</span><strong className="slug">/{slug}</strong></div></div><div className="card qr-card"><div><h2>Tu código QR</h2><p>Descárgalo e imprímelo para compartir tu menú.</p>{link ? <a href={link} target="_blank" rel="noreferrer">{link}</a> : <p>Configura VITE_MENU_BASE_URL para generar el QR.</p>}<br/><button onClick={download} disabled={!qr}>Descargar QR</button></div>{qr && <img src={qr} alt={`Código QR del menú de ${restaurant.data?.nombre}`} />}</div></>}</Shell>;
}

function Categories() {
  const {data,error,loading,refresh,setError}=useRequest(()=>api('/categorias'),[]);
  const [form,setForm]=React.useState({id:'',nombre:'',orden:0});
  async function submit(e){e.preventDefault();setError('');try{await api(form.id?`/categorias/${form.id}`:'/categorias',{method:form.id?'PUT':'POST',body:{nombre:form.nombre.trim(),orden:Number(form.orden)}});setForm({id:'',nombre:'',orden:0});refresh();}catch(err){setError(err.message);}}
  async function remove(id){if(!window.confirm('¿Eliminar esta categoría?'))return;try{await api(`/categorias/${id}`,{method:'DELETE'});refresh();}catch(err){setError(err.message);}}
  return <Shell><div className="page-head"><p className="eyebrow">ORGANIZA TU MENÚ</p><h1>Categorías</h1></div><ErrorNotice message={error}/><form className="card form inline" onSubmit={submit}><label>Nombre<input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required maxLength="100" /></label><label>Orden<input type="number" min="0" value={form.orden} onChange={e=>setForm({...form,orden:e.target.value})} required /></label><button>{form.id?'Guardar':'Añadir categoría'}</button>{form.id&&<button type="button" className="ghost" onClick={()=>setForm({id:'',nombre:'',orden:0})}>Cancelar</button>}</form><div className="card list">{loading?'Cargando…':!data?.length?'Aún no hay categorías.':data.map(c=><div className="list-row" key={c.id}><div><strong>{c.nombre}</strong><small>Orden {c.orden}</small></div><div><button className="ghost" onClick={()=>setForm({id:c.id,nombre:c.nombre,orden:c.orden})}>Editar</button><button className="danger" onClick={()=>remove(c.id)}>Eliminar</button></div></div>)}</div></Shell>;
}

const blankProduct={id:'',categoriaId:'',nombre:'',descripcion:'',precio:'',disponible:true,imagenUrl:''};
function Products() {
  const categories=useRequest(()=>api('/categorias'),[]);const products=useRequest(()=>api('/productos'),[]);
  const [form,setForm]=React.useState(blankProduct);const [error,setError]=React.useState('');const [busy,setBusy]=React.useState(false);
  async function submit(e){e.preventDefault();setError('');setBusy(true);try{const payload=productPayload(form);await api(form.id?`/productos/${form.id}`:'/productos',{method:form.id?'PUT':'POST',body:payload});setForm(blankProduct);products.refresh();}catch(err){setError(err.message);}finally{setBusy(false);}}
  async function image(e){const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');try{const imagenUrl=await uploadImage(file,'producto');setForm(prev=>({...prev,imagenUrl}));}catch(err){setError(err.message);}finally{setBusy(false);}}
  async function availability(p){try{await api(`/productos/${p.id}/disponibilidad`,{method:'PATCH',body:{disponible:!p.disponible}});products.refresh();}catch(err){setError(err.message);}}
  async function remove(id){if(!window.confirm('¿Eliminar este producto?'))return;try{await api(`/productos/${id}`,{method:'DELETE'});products.refresh();}catch(err){setError(err.message);}}
  return <Shell><div className="page-head"><p className="eyebrow">TU OFERTA</p><h1>Productos</h1></div><ErrorNotice message={error||categories.error||products.error}/><form className="card form grid" onSubmit={submit}><label>Nombre<input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required maxLength="150" /></label><label>Categoría<select value={form.categoriaId} onChange={e=>setForm({...form,categoriaId:e.target.value})} required><option value="">Selecciona una</option>{categories.data?.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Precio (MXN)<input inputMode="decimal" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})} required placeholder="0.00" /></label><label>Foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={image} />{form.imagenUrl&&<small>Foto subida correctamente</small>}</label><label className="wide">Descripción<textarea value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.disponible} onChange={e=>setForm({...form,disponible:e.target.checked})}/> Disponible</label><div className="actions"><button disabled={busy}>{busy?'Espera…':form.id?'Guardar producto':'Añadir producto'}</button>{form.id&&<button type="button" className="ghost" onClick={()=>setForm(blankProduct)}>Cancelar</button>}</div></form><div className="card list">{products.loading?'Cargando…':!products.data?.length?'Aún no hay productos.':products.data.map(p=><div className="list-row" key={p.id}><div><strong>{p.nombre}</strong><small>${Number(p.precio).toFixed(2)} · {p.disponible?'Disponible':'Agotado'}</small></div><div><button className="ghost" onClick={()=>setForm({...p,precio:String(p.precio),imagenUrl:p.imagenUrl||'',descripcion:p.descripcion||''})}>Editar</button><button className="ghost" onClick={()=>availability(p)}>{p.disponible?'Marcar agotado':'Marcar disponible'}</button><button className="danger" onClick={()=>remove(p.id)}>Eliminar</button></div></div>)}</div></Shell>;
}

function Settings() {
  const restaurant=useRequest(()=>api('/restaurantes/me'),[]);const [form,setForm]=React.useState(null);const [error,setError]=React.useState('');const [saved,setSaved]=React.useState('');const [busy,setBusy]=React.useState(false);
  React.useEffect(()=>{if(restaurant.data)setForm({nombre:restaurant.data.nombre,temaColor:restaurant.data.temaColor||'#9B2226',plantilla:restaurant.data.plantilla||'trattoria',logoUrl:restaurant.data.logoUrl||'',telefono:restaurant.data.telefono||''});},[restaurant.data]);
  const publicLink = restaurant.data?.slug && import.meta.env.VITE_MENU_BASE_URL ? menuLink(import.meta.env.VITE_MENU_BASE_URL, restaurant.data.slug) : '';
  async function image(e){const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');setSaved('');try{const logoUrl=await uploadImage(file,'logo');setForm(prev=>({...prev,logoUrl}));}catch(err){setError(err.message);}finally{setBusy(false);}}
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSaved('');try{await api('/restaurantes/me',{method:'PUT',body:{...form,logoUrl:form.logoUrl||null,telefono:form.telefono||null}});setSaved('Cambios guardados y publicados en tu menú.');restaurant.refresh();}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <Shell><div className="page-head"><p className="eyebrow">TU MARCA</p><h1>Configuración</h1>{publicLink && <p><a href={publicLink} target="_blank" rel="noreferrer">Ver menú público ↗</a></p>}</div><ErrorNotice message={error||restaurant.error}/><SuccessNotice message={saved}/>{!form?<p>Cargando…</p>:<form className="card form" onSubmit={submit}><label>Nombre<input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></label><TemplatePicker value={form.plantilla} onChange={plantilla=>setForm({...form,plantilla})} previewColor={form.temaColor} restaurantName={form.nombre} /><label>Color del menú<input type="color" value={form.temaColor} onChange={e=>setForm({...form,temaColor:e.target.value})}/></label><label>Teléfono<input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="Ej. 3314567890"/></label><label>Logo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={image}/>{form.logoUrl&&<div className="logo-preview"><img src={form.logoUrl} alt="Logo actual"/><small>Logo configurado</small></div>}</label><button disabled={busy}>{busy?'Guardando…':'Guardar cambios'}</button></form>}</Shell>;
}

export function App(){return <Routes><Route path="/login" element={<Login/>}/><Route path="/onboarding" element={<Protected><Onboarding/></Protected>}/><Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="/categorias" element={<Protected><Categories/></Protected>}/><Route path="/productos" element={<Protected><Products/></Protected>}/><Route path="/configuracion" element={<Protected><Settings/></Protected>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>;}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<BrowserRouter><App/></BrowserRouter>);
