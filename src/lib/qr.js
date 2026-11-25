export function menuLink(base, slug) {
  if (!base || !slug) throw new Error('Falta la URL del menú o el slug.');
  return `${base.replace(/\/$/, '')}/${encodeURIComponent(slug)}`;
}
