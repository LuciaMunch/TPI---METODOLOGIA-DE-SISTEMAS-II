// ──────────────────────────────────────────────
// HU-07: CREAR PRODUCTO
// ──────────────────────────────────────────────
class Producto {
    constructor(nombre, codigoId, marca, color, precio, StockActual, StockMinimo, imagen) {
        this.nombre      = nombre;
        this.codigoId    = codigoId;
        this.marca       = marca;
        this.color       = color;
        this.precio      = precio;
        this.StockActual = StockActual;
        this.StockMinimo = StockMinimo;
        this.imagen      = imagen;
        this.activo      = true;
    }
}

// ──────────────────────────────────────────────
// Validaciones
// ──────────────────────────────────────────────

/**
 * Valida los campos del producto antes de enviarlo a MockAPI.
 * @param {{ nombre: string, codigoId: string, marca: string, color: string, precio: number, StockActual: number, imagen: string }} datos
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarProducto({ nombre, codigoId, marca, color, precio, StockActual, imagen }) {

    // Prueba: campos obligatorios vacíos → falla
    if (!nombre || !codigoId || !marca || !color) {
        return { valido: false, mensaje: 'Los campos nombre, código, marca y color son obligatorios.' };
    }

    // Prueba: precio igual a cero o negativo → falla
    if (isNaN(precio) || precio <= 0) {
        return { valido: false, mensaje: 'El precio debe ser mayor a 0. No se permite precio igual a cero ni negativo.' };
    }

    // Prueba: stock inicial igual a cero o negativo → falla
    if (isNaN(StockActual) || StockActual <= 0) {
        return { valido: false, mensaje: 'El stock inicial debe ser mayor a 0. No se permite stock igual a cero ni negativo.' };
    }

    // Prueba: imagen en formato no permitido (ej: PDF) → falla
    // Prueba: sin imagen (campo opcional) → pasa
    if (imagen && !/\.(png|jpg|jpeg)(\?.*)?$/i.test(imagen)) {
        return { valido: false, mensaje: 'La imagen debe estar en formato PNG o JPG. No se permiten otros formatos (ej: PDF).' };
    }

    return { valido: true, mensaje: '' };
}

// ──────────────────────────────────────────────
// Función principal: crear producto
// ──────────────────────────────────────────────

/**
 * Crea un nuevo producto en MockAPI si pasa todas las validaciones.
 * @param {{ nombre: string, codigoId: string, marca: string, color: string, precio: number, StockActual: number, StockMinimo?: number, imagen?: string }} datos
 * @returns {Promise<{ exito: boolean, mensaje: string, producto?: object }>}
 */
async function crearProducto({ nombre, codigoId, marca, color, precio, StockActual, StockMinimo = 5, imagen = '' }) {

    // 1. Validaciones locales
    const validacion = validarProducto({ nombre, codigoId, marca, color, precio, StockActual, imagen });
    if (!validacion.valido) {
        return { exito: false, mensaje: validacion.mensaje };
    }

    try {
        // 2. Obtener productos existentes para validar unicidad y duplicados
        const res = await fetch(PRODUCTOS_URL);
        if (!res.ok) throw new Error(`Error al obtener productos: ${res.status}`);
        const productos = await res.json();

        // Prueba: código ya existente → falla
        if (productos.some(p => p.codigoId === codigoId)) {
            return { exito: false, mensaje: 'Ya existe un producto con ese código. El código debe ser único en el sistema.' };
        }

        // Prueba: mismo nombre + mismo color (duplicado) → falla
        if (productos.some(p =>
            p.nombre.toLowerCase() === nombre.toLowerCase() &&
            p.color.toLowerCase()  === color.toLowerCase()
        )) {
            return { exito: false, mensaje: 'Ya existe un producto con el mismo nombre y color. Esto se considera un producto duplicado.' };
        }

        // 3. Crear el objeto producto
        const nuevoProducto = new Producto(nombre, codigoId, marca, color, precio, StockActual, StockMinimo, imagen);

        // 4. Persistir en MockAPI
        const resPOST = await fetch(PRODUCTOS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto)
        });

        if (!resPOST.ok) throw new Error(`Error al crear producto: ${resPOST.status}`);

        const productoCreado = await resPOST.json();

        // Prueba: producto creado exitosamente → pasa
        // El producto queda activo y disponible en el catálogo de inmediato
        return { exito: true, mensaje: 'Producto creado exitosamente. Ya está disponible en el catálogo.', producto: productoCreado };

    } catch (e) {
        return { exito: false, mensaje: `Error al conectar con el servidor: ${e.message}` };
    }
}

export { Producto, validarProducto, crearProducto };