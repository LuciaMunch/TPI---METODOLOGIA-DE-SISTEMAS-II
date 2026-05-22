// ──────────────────────────────────────────────
// US-03: CONFIRMAR PEDIDO CON PAGO EN EFECTIVO
// ──────────────────────────────────────────────

const ESTADOS_PEDIDO = {
    PENDIENTE:  'Pendiente de entrega',
    EN_CAMINO:  'En camino',
    ENTREGADO:  'Entregado',
    CANCELADO:  'Cancelado'
};

class Pedido {
    constructor(cliente, items, domicilioEnvio, formaPago = 'Efectivo contra entrega') {
        this.id             = null; // asignado por la API
        this.cliente        = { id: cliente.id, nombre: cliente.nombre, apellido: cliente.apellido, email: cliente.email };
        this.items          = items.map(i => ({
            productoId: i.producto.id,
            codigoRef:  i.producto.codigoRef || '',
            nombre:     i.producto.nombre,
            marca:      i.producto.marca || '',
            color:      i.producto.color || '',
            imagen:     i.producto.imagen || '',
            precio:     i.producto.precio,
            cantidad:   i.cantidad,
            subtotal:   i.subtotal
        }));
        this.total          = items.reduce((s, i) => s + i.subtotal, 0);
        this.domicilioEnvio = domicilioEnvio;
        this.formaPago      = formaPago;          // US-03: único medio de pago por pedido
        this.estado         = ESTADOS_PEDIDO.PENDIENTE;
        this.fechaCreacion  = new Date().toISOString();
    }
}

/**
 * Confirma el pedido: valida carro + domicilio, descuenta stock, persiste.
 * @returns {Promise<{ exito: boolean, mensaje: string, pedido?: object }>}
 */
async function confirmarPedido(API_PEDIDOS, API_PRODUCTOS, cliente, carro, domicilio) {
    // Prueba: carro vacío → falla
    if (carro.estaVacio()) {
        return { exito: false, mensaje: 'El carro está vacío. Agregá productos antes de confirmar.' };
    }
    // Prueba: sin domicilio → falla
    if (!domicilio) {
        return { exito: false, mensaje: 'Debés seleccionar un domicilio de envío.' };
    }

    try {
        // Descontar stock de cada producto (US-03: debe ser atómico en una API real)
        for (const item of carro.items) {
            const resP = await fetch(`${API_PRODUCTOS}/${item.producto.id}`);
            if (resP.ok) {
                const prod = await resP.json();
                const nuevoStock = Number(prod.stockActual ?? 0) - item.cantidad;
                await fetch(`${API_PRODUCTOS}/${prod.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...prod, stockActual: nuevoStock })
                });
            }
        }

        // Crear pedido (sin campo "id": lo asigna MockAPI)
        // NOTA: MockAPI Free rompe arrays de objetos anidados y también strings JSON con comillas.
        // Solución: codificar items en Base64 (btoa) para evitar cualquier interferencia de MockAPI.
        const pedido = new Pedido(cliente, carro.items, domicilio);
        const { id: _omitir, ...pedidoBase } = pedido;
        const pedidoPayload = {
            ...pedidoBase,
            items: btoa(unescape(encodeURIComponent(JSON.stringify(pedidoBase.items))))  // Base64-encoded
        };
        const res = await fetch(API_PEDIDOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoPayload)
        });
        if (!res.ok) throw new Error(`Error al crear pedido: ${res.status}`);

        const pedidoCreado = await res.json();

        // Simular email de confirmación en consola
        console.log(`📧 Email enviado a ${cliente.email}: Pedido #${pedidoCreado.id} confirmado. Total: $${pedido.total}`);

        return { exito: true, mensaje: `Pedido confirmado. #${pedidoCreado.id}`, pedido: pedidoCreado };

    } catch (e) {
        return { exito: false, mensaje: `Error al confirmar el pedido: ${e.message}` };
    }
}

export { Pedido, ESTADOS_PEDIDO, confirmarPedido };