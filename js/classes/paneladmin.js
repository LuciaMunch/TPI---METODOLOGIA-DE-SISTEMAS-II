import { Usuario } from './classes/usuario.js';
import { Producto } from './classes/producto.js'; // Importación de la clase de Lu

// URL base para MockAPI (reemplazá con tu endpoint real)
const PRODUCTOS_URL = 'https://664c36f635bb1e476aaf7af9.mockapi.io/api/v1/productos'; 

/**
 * Carga y renderiza el panel de administración si el usuario tiene los permisos.
 * @param {Usuario} usuarioLogueado 
 */
function cargarPanelAdmin(usuarioLogueado) {
    // 1. Validar el Rol (Tiene 2 opciones: ADMIN o CLIENTE)
    if (!usuarioLogueado || usuarioLogueado.getRole() !== 'ADMIN') {
        console.warn("Acceso denegado: El usuario no es ADMIN o es un CLIENTE.");
        return; 
    }

    // 2. Traer productos de MockAPI
    fetch(PRODUCTOS_URL)
        .then(response => {
            if (!response.ok) throw new Error(`Error en el servidor: ${response.status}`);
            return response.json();
        })
        .then(productos => {
            const tabla = document.getElementById('cuerpo-tabla-productos');
            if (!tabla) return;
            
            tabla.innerHTML = ''; // Limpiar tabla

            productos.forEach(p => {
                const fila = document.createElement('tr');

                // Mapeo seguro de atributos (Coincidiendo con la estructura de la clase Producto)
                const stockActual = p.StockActual || p.stockActual || 0;
                const stockMinimo = p.StockMinimo || p.stockMinimo || 0;
                const codigo = p.codigoId || p.codigo || 'S/N';

                // Lógica de Visualización (US 07): Resaltar en rojo si hay poco stock
                if (stockActual <= stockMinimo) {
                    fila.style.backgroundColor = '#f8d7da'; // Color rojo de alerta
                    fila.style.color = '#721c24';
                }

                fila.innerHTML = `
                    <td>${codigo}</td>
                    <td>${p.nombre}</td>
                    <td>${stockActual}</td>
                    <td>${stockMinimo}</td>
                    <td>${stockActual <= stockMinimo ? '⚠️ REPONER' : '✅ OK'}</td>
                `;
                tabla.appendChild(fila);
            });
        })
        .catch(err => console.error("Error al cargar el panel:", err));
}

// ──────────────────────────────────────────────
// Validaciones de Producto
// ──────────────────────────────────────────────

/**
 * Valida los campos del producto antes de enviarlo a MockAPI.
 * @param {{ nombre: string, codigoId: string, marca: string, color: string, precio: number, StockActual: number, imagen: string }} datos
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarProducto({ nombre, codigoId, marca, color, precio, StockActual, imagen }) {

    if (!nombre || !codigoId || !marca || !color) {
        return { valido: false, mensaje: 'Los campos nombre, código, marca y color son obligatorios.' };
    }

    if (isNaN(precio) || precio <= 0) {
        return { valido: false, mensaje: 'El precio debe ser mayor a 0. No se permite precio igual a cero ni negativo.' };
    }

    if (isNaN(StockActual) || StockActual <= 0) {
        return { valido: false, mensaje: 'El stock inicial debe ser mayor a 0. No se permite stock igual a cero ni negativo.' };
    }

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

    const validacion = validarProducto({ nombre, codigoId, marca, color, precio, StockActual, imagen });
    if (!validacion.valido) {
        return { exito: false, mensaje: validacion.mensaje };
    }

    try {
        const res = await fetch(PRODUCTOS_URL);
        if (!res.ok) throw new Error(`Error al obtener productos: ${res.status}`);
        const productos = await res.json();

        // Validar unicidad de código
        if (productos.some(p => (p.codigoId === codigoId || p.codigo === codigoId))) {
            return { exito: false, mensaje: 'Ya existe un producto con ese código. El código debe ser único en el sistema.' };
        }

        // Validar duplicados (mismo nombre + mismo color)
        if (productos.some(p =>
            p.nombre.toLowerCase() === nombre.toLowerCase() &&
            p.color.toLowerCase()  === color.toLowerCase()
        )) {
            return { exito: false, mensaje: 'Ya existe un producto con el mismo nombre y color. Esto se considera un producto duplicado.' };
        }

        // Instanciación usando la clase Producto como me pediste
        const nuevoProducto = new Producto(nombre, codigoId, marca, color, precio, StockActual, StockMinimo, imagen);

        const resPOST = await fetch(PRODUCTOS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto)
        });

        if (!resPOST.ok) throw new Error(`Error al crear producto: ${resPOST.status}`);

        const productoCreado = await resPOST.json();

        return { exito: true, mensaje: '¡Producto creado exitosamente! Ya está disponible en el catálogo.', producto: productoCreado };

    } catch (e) {
        return { exito: false, mensaje: `Error al conectar con el servidor: ${e.message}` };
    }
}

export { cargarPanelAdmin, validarProducto, crearProducto };