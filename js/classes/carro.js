/* ============================================================
   Body Paint · Carro de compras (US-02)
   Persiste en localStorage. Valida stock. Recalcula el total.
   Estructura de un ítem: { id, nombre, codigo, precio, color, imagen, cantidad, stock }
   ============================================================ */

const Carro = (() => {
  let items = cargarDesdeStorage();

  function cargarDesdeStorage() {
    try {
      const raw = localStorage.getItem(CARRO_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];                         // contexto sin localStorage
    }
  }
  function _persistir() {
    try { localStorage.setItem(CARRO_KEY, JSON.stringify(items)); }
    catch { /* contexto estricto: el carro vive solo en memoria */ }
  }

  const obtener      = () => items.slice();
  const cantidadTotal = () => items.reduce((a, i) => a + i.cantidad, 0);
  const total        = () => items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const estaVacio    = () => items.length === 0;

  /* Agregar respetando el stock disponible del producto */
  function agregar(producto) {
    if (Number(producto.stock) <= 0) {
      UI.err(`"${producto.nombre}" no tiene stock disponible.`);
      return false;
    }
    const exist = items.find((i) => i.id === producto.id);
    if (exist) {
      if (exist.cantidad + 1 > Number(producto.stock)) {
        UI.err(`No hay más stock de "${producto.nombre}" (máx. ${producto.stock}).`);
        return false;
      }
      exist.cantidad += 1;
      exist.stock = Number(producto.stock);
    } else {
      items.push({
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        precio: Number(producto.precio),
        color: producto.color || "",
        imagen: producto.imagen || "",
        cantidad: 1,
        stock: Number(producto.stock),
      });
    }
    _persistir();
    return true;
  }

  function cambiarCantidad(id, delta) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const nueva = it.cantidad + delta;
    if (nueva <= 0) { eliminar(id); return; }
    if (nueva > it.stock) { UI.err(`Stock máximo alcanzado (${it.stock}).`); return; }
    it.cantidad = nueva;
    _persistir();
  }

  function eliminar(id) {
    items = items.filter((i) => i.id !== id);
    _persistir();
  }

  function vaciar() { items = []; _persistir(); }

  return { obtener, cantidadTotal, total, estaVacio, agregar, cambiarCantidad, eliminar, vaciar };
})();
