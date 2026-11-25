export function validPrice(input) {
  const value = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : null;
}

export function productPayload(form) {
  const precio = validPrice(form.precio);
  if (!form.nombre?.trim()) throw new Error('Escribe el nombre del producto.');
  if (!form.categoriaId) throw new Error('Selecciona una categoría.');
  if (precio === null) throw new Error('Escribe un precio válido, no negativo y con máximo dos decimales.');
  return { categoriaId: form.categoriaId, nombre: form.nombre.trim(), descripcion: form.descripcion?.trim() || null, precio, disponible: !!form.disponible, imagenUrl: form.imagenUrl || null };
}
