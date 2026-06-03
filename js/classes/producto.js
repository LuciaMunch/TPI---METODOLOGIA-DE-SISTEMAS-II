/* ============================================================
   Body Paint · Productos (modelo + utilidades)
   Validaciones de alta/edición (US-07, US-11), carga de imagen
   con redimensionado y conversión a Base64 (US-10) y stock mínimo
   (US-12).
   ============================================================ */

const Productos = (() => {

  const listar = () => Api.listar(API.PRODUCTOS);

  /* Solo activos (los dados de baja quedan con activo=false) */
  async function listarActivos() {
    const todos = await listar();
    return todos.filter((p) => p.activo !== false);
  }

  /* ---------- Imagen: validar + redimensionar + Base64 (US-10) ---------- */
  function validarArchivoImagen(file) {
    if (!file) return "No se seleccionó ningún archivo.";
    if (!IMG_TIPOS_OK.includes(file.type)) return "Solo se aceptan imágenes PNG o JPG/JPEG.";
    if (file.size > IMG_MAX_BYTES) return "La imagen supera el tamaño máximo de 2 MB.";
    return null;
  }

  /* Redimensiona a un máximo de 720px y devuelve un dataURL JPEG liviano,
     para no exceder los límites de tamaño de MockAPI. */
  function archivoADataURL(file, maxLado = 720, calidad = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Imagen inválida."));
        img.onload = () => {
          let { width: w, height: h } = img;
          if (w > maxLado || h > maxLado) {
            const r = Math.min(maxLado / w, maxLado / h);
            w = Math.round(w * r); h = Math.round(h * r);
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", calidad));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Validación de datos del producto ---------- */
  /* `excluirId` permite ignorar el propio producto al editar (US-11). */
  function validar(datos, existentes, excluirId = null) {
    const { nombre, codigo, marca, precio, stock, color } = datos;
    if (!nombre || !codigo || !marca || color == null || precio == null || stock == null)
      return "Completá nombre, código, marca, color, precio y stock.";
    if (Number(precio) <= 0) return "El precio debe ser mayor a cero.";
    if (Number(stock) <= 0)  return "El stock inicial debe ser mayor a cero.";
    if (datos.stockMinimo != null && (!Number.isInteger(Number(datos.stockMinimo)) || Number(datos.stockMinimo) < 0))
      return "El stock mínimo debe ser un entero no negativo.";

    const otros = existentes.filter((p) => p.id !== excluirId);
    if (otros.some((p) => (p.codigo || "").toLowerCase() === codigo.toLowerCase()))
      return `Ya existe un producto con el código "${codigo}".`;
    if (otros.some((p) =>
          (p.nombre || "").toLowerCase() === nombre.toLowerCase() &&
          (p.color  || "").toLowerCase() === (color || "").toLowerCase()))
      return "Ya existe un producto con el mismo nombre y color.";
    return null;
  }

  async function crear(datos) {
    const existentes = await listar();
    const error = validar(datos, existentes);
    if (error) throw new Error(error);
    const payload = {
      nombre: datos.nombre.trim(),
      codigo: datos.codigo.trim(),
      marca: datos.marca.trim(),
      color: (datos.color || "").trim(),
      precio: Number(datos.precio),
      stock: Number(datos.stock),
      stockMinimo: Number(datos.stockMinimo || 0),
      imagen: datos.imagen || "",
      activo: true,
    };
    return Api.crear(API.PRODUCTOS, payload);
  }

  async function editar(id, datos) {
    const existentes = await listar();
    const error = validar(datos, existentes, id);
    if (error) throw new Error(error);
    const actual = existentes.find((p) => p.id === id) || {};
    const payload = {
      ...actual,
      nombre: datos.nombre.trim(),
      codigo: datos.codigo.trim(),
      marca: datos.marca.trim(),
      color: (datos.color || "").trim(),
      precio: Number(datos.precio),
      stock: Number(datos.stock),
      stockMinimo: Number(datos.stockMinimo ?? actual.stockMinimo ?? 0),
      imagen: datos.imagen != null ? datos.imagen : actual.imagen,
      activo: true,
    };
    return Api.actualizar(API.PRODUCTOS, id, payload);
  }

  /* Stock mínimo (US-12): entero positivo, sin tocar el resto */
  async function configurarStockMinimo(id, valorStr) {
    if (/[.,]/.test(String(valorStr))) throw new Error("El stock mínimo no admite decimales.");
    const n = parseInt(valorStr, 10);
    if (isNaN(n) || n <= 0) throw new Error("El stock mínimo debe ser un entero positivo.");
    const actual = await Api.obtener(API.PRODUCTOS, id);
    return Api.actualizar(API.PRODUCTOS, id, { ...actual, stockMinimo: n });
  }

  async function bajaLogica(id) {
    const actual = await Api.obtener(API.PRODUCTOS, id);
    return Api.actualizar(API.PRODUCTOS, id, { ...actual, activo: false });
  }

  /* Ajuste de stock (descuento al confirmar pedido / reposición al cancelar) */
  async function ajustarStock(id, delta) {
    const p = await Api.obtener(API.PRODUCTOS, id);
    const nuevo = Math.max(0, Number(p.stock || 0) + delta);
    return Api.actualizar(API.PRODUCTOS, id, { ...p, stock: nuevo });
  }

  const enAlerta = (p) => Number(p.stock) <= Number(p.stockMinimo || 0);

  return {
    listar, listarActivos, validarArchivoImagen, archivoADataURL, validar,
    crear, editar, configurarStockMinimo, bajaLogica, ajustarStock, enAlerta,
  };
})();
