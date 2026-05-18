// ──────────────────────────────────────────────
// CLASE: Paneladmin
// US-06: Visualizar catálogo de productos (Admin)
// US-07: Crear nuevos productos
//
// Depende de: Producto (entidad de dominio)
//
// NOTA sobre codigoId:
// MockAPI lo define como "Object ID" (autogenerado).
// → No se envía en el POST.
// → MockAPI lo devuelve en el GET como campo "codigoId".
// → Se valida unicidad comparando contra los existentes
//   ANTES de hacer el POST, usando el valor que el admin
//   ingresó como referencia de negocio — ese valor se
//   guarda en un campo separado "codigoRef" que sí es String.
// ──────────────────────────────────────────────

import { Producto } from './producto.js';

export class Paneladmin {

    /** @param {string} apiUrl  URL del endpoint de productos en MockAPI */
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }

    // ── Helper privado ──────────────────────────

    async _fetchTodos() {
        try {
            const res = await fetch(this.apiUrl);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('[Paneladmin] Error al obtener productos:', e);
            return [];
        }
    }

    // ── US-06: Visualizar ───────────────────────

    /**
     * Devuelve todos los productos con filtro opcional.
     * @param {string} [filtro='']
     * @returns {Promise<{ exito: boolean, productos: object[], mensaje?: string }>}
     */
    async listar(filtro = '') {
        try {
            const res = await fetch(this.apiUrl);
            if (!res.ok) return { exito: true, productos: [] };

            let productos = await res.json();
            if (!Array.isArray(productos)) productos = [];

            if (filtro.trim()) {
                const f = filtro.toLowerCase();
                productos = productos.filter(p => {
                    const f = filtro.toLowerCase();
                    return (
                        p.nombre?.toLowerCase().includes(f)            ||
                        String(p.codigoId ?? '').toLowerCase().includes(f) ||
                        String(p.codigoRef ?? '').toLowerCase().includes(f) ||
                        p.marca?.toLowerCase().includes(f)             ||
                        p.color?.toLowerCase().includes(f)
                    );
                });
            }

            return { exito: true, productos };
        } catch (e) {
            return { exito: false, productos: [], mensaje: `Error al cargar productos: ${e.message}` };
        }
    }

    /** US-06: alerta visual de stock bajo */
    static tieneStockBajo(p) {
        return Number(p.stockActual) <= Number(p.stockMinimo ?? 0);
    }

    /**
     * Edita un producto existente (PUT).
     * @param {string} id - ID interno de MockAPI del producto
     * @param {object} datos - mismos campos que crear()
     * @returns {Promise<{ exito: boolean, mensaje: string, producto?: object }>}
     */
    async editar(id, datos) {
        const {
            nombre, codigoId, marca, color,
            precio, stockActual,
            stockMinimo = 5,
            imagen = ''
        } = datos;

        // Validación reutilizando Producto.validar()
        const validacion = Producto.validar({ nombre, codigoId, marca, color, precio, stockActual, imagen });
        if (!validacion.valido) return { exito: false, mensaje: validacion.mensaje };

        // Verificar unicidad de código y duplicado excluyendo el propio producto
        const existentes = await this._fetchTodos();

        if (existentes.some(p =>
            p.id !== id &&
            (p.codigoRef ?? p.codigoId) === codigoId
        )) {
            return { exito: false, mensaje: 'Ya existe otro producto con ese código.' };
        }

        if (existentes.some(p =>
            p.id !== id &&
            p.nombre?.toLowerCase() === nombre.toLowerCase() &&
            p.color?.toLowerCase()  === color.toLowerCase()
        )) {
            return { exito: false, mensaje: 'Ya existe otro producto con el mismo nombre y color.' };
        }

        const payload = {
            nombre, marca, color,
            precio: Number(precio),
            stockActual: Number(stockActual),
            stockMinimo: Number(stockMinimo),
            imagen: imagen || '',
            codigoRef: codigoId,
            activo: true
        };

        try {
            const res = await fetch(`${this.apiUrl}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const txt = await res.text();
                return { exito: false, mensaje: `Error ${res.status}: ${txt}` };
            }
            const updated = await res.json();
            return { exito: true, mensaje: 'Producto actualizado exitosamente.', producto: updated };
        } catch (e) {
            return { exito: false, mensaje: `Error de red: ${e.message}` };
        }
    }

    // ── US-07: Crear ────────────────────────────

    /**
     * Valida y crea un nuevo producto.
     * codigoId ingresado por el admin se guarda como "codigoRef" (String),
     * ya que MockAPI gestiona "codigoId" como su Object ID interno.
     *
     * @param {object} datos
     * @returns {Promise<{ exito: boolean, mensaje: string, producto?: object }>}
     */
    async crear(datos) {
        const {
            nombre, codigoId, marca, color,
            precio, stockActual,
            stockMinimo = 5,
            imagen = ''
        } = datos;

        // 1) Validación con Producto.validar()
        const validacion = Producto.validar({ nombre, codigoId, marca, color, precio, stockActual, imagen });
        if (!validacion.valido) return { exito: false, mensaje: validacion.mensaje };

        // 2) Verificar unicidad contra existentes
        const existentes = await this._fetchTodos();

        // Código único: comparar contra codigoRef (campo String que guardamos nosotros)
        if (existentes.some(p =>
            (p.codigoRef ?? p.codigoId) === codigoId
        )) {
            return { exito: false, mensaje: 'Ya existe un producto con ese código.' };
        }

        // Duplicado nombre + color
        if (existentes.some(p =>
            p.nombre?.toLowerCase() === nombre.toLowerCase() &&
            p.color?.toLowerCase()  === color.toLowerCase()
        )) {
            return { exito: false, mensaje: 'Ya existe un producto con el mismo nombre y color.' };
        }

        // 3) Construir payload SIN codigoId (lo genera MockAPI)
        //    El código de negocio va en "codigoRef"
        const producto = new Producto(nombre, marca, color, precio, stockActual, stockMinimo, imagen);
        const payload  = { ...producto, codigoRef: codigoId };

        try {
            const resPOST = await fetch(this.apiUrl, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            const ct = resPOST.headers.get('content-type') || '';
            const responseBody = ct.includes('application/json')
                ? await resPOST.json()
                : await resPOST.text();

            if (!resPOST.ok) {
                let detalle = '';
                if (typeof responseBody === 'object' && responseBody !== null) {
                    detalle = responseBody.message || responseBody.error || JSON.stringify(responseBody);
                } else {
                    detalle = String(responseBody || '');
                }
                console.error('[MockAPI] Status:', resPOST.status);
                console.error('[MockAPI] Payload:', JSON.stringify(payload, null, 2));
                console.error('[MockAPI] Respuesta:', detalle);
                return {
                    exito: false,
                    mensaje: detalle || `Error ${resPOST.status}: la API rechazó el pedido.`
                };
            }

            return { exito: true, mensaje: 'Producto creado exitosamente.', producto: responseBody };

        } catch (e) {
            return { exito: false, mensaje: `Error de red: ${e.message}` };
        }
    }
}