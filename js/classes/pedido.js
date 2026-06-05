/* ============================================================
   Body Paint · Pedidos (US-03, US-05, US-08, US-09, US-17)
   Creación del pedido, máquina de estados y efectos sobre el stock.

   REGLA DE STOCK (decisión de diseño):
   El stock se descuenta UNA sola vez, al confirmar el pedido el CLIENTE
   en el checkout (US-03). Si un pedido en "Pendiente de entrega" se
   cancela, el stock se REPONE. El paso Pendiente->Confirmado del vendedor
   (US-08) NO vuelve a descontar (evita el doble descuento que el propio
   análisis de brechas marcaba como riesgo de inconsistencia de inventario).
   ============================================================ */

const Pedidos = (() => {

  const listar = () => Api.listar(API.PEDIDOS);

  function parseItems(pedido)     { return Json.unpack(pedido.items, []) || []; }
  function parseDomicilio(pedido) { return Json.unpack(pedido.domicilio, {}) || {}; }

  /* Confirmar pedido (US-03 + US-14) */
  async function confirmar({ usuario, items, domicilio, cupon }) {
    if (!items || items.length === 0) throw new Error("El carro está vacío.");
    if (!domicilio || Object.keys(domicilio).length === 0)
      throw new Error("Seleccioná un domicilio de envío.");

    const subtotal = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
    const descuento = cupon ? Cupones.calcularDescuento(cupon, subtotal) : 0;
    const total = Math.max(0, subtotal - descuento);

    // Validación de stock en tiempo real antes de confirmar
    const productos = await Productos.listar();
    for (const it of items) {
      const p = productos.find((x) => x.id === it.id);
      if (!p || Number(p.stock) < it.cantidad)
        throw new Error(`Sin stock suficiente de "${it.nombre}".`);
    }

    const numero = "P-" + Date.now().toString().slice(-8);
    // Guardamos en el pedido solo los datos necesarios del ítem.
    // (No se persiste la imagen Base64: inflaba el payload y MockAPI devolvía
    //  HTTP 413 "Payload Too Large" al confirmar carros con varias imágenes.)
    const itemsPedido = items.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      codigo: i.codigo,
      color: i.color || "",
      precio: Number(i.precio),
      cantidad: Number(i.cantidad),
    }));
    const pedido = {
      numero,
      clienteId: String(usuario.id),
      clienteNombre: `${usuario.nombre} ${usuario.apellido}`,
      clienteEmail: usuario.email,
      fecha: new Date().toISOString(),
      items: Json.pack(itemsPedido),
      domicilio: Json.pack(domicilio),
      formaPago: "Efectivo contra entrega",
      estado: ESTADO.PENDIENTE,
      subtotal,
      descuento,
      total,
      cuponCodigo: cupon ? cupon.codigo : "",
    };
    const creado = await Api.crear(API.PEDIDOS, pedido);

    // Descontar stock (una sola vez)
    for (const it of items) {
      await Productos.ajustarStock(it.id, -it.cantidad);
    }
    // Marcar cupón usado
    if (cupon) await Cupones.marcarUsado(cupon.id);

    // Simulación de email de confirmación
    console.log(`[EMAIL simulado] Pedido ${numero} confirmado para ${usuario.email}. ` +
                `Total: ${UI.fmtMoneda(total)}.`);
    return creado;
  }

  /* Cambio de estado por el vendedor (US-08) con validación de transición */
  async function cambiarEstadoVendedor(id, nuevoEstado) {
    const pedido = await Api.obtener(API.PEDIDOS, id);
    const permitidos = TRANSICIONES_VENDEDOR[pedido.estado] || [];
    if (!permitidos.includes(nuevoEstado))
      throw new Error(`Transición no permitida: ${pedido.estado} → ${nuevoEstado}.`);

    // Si se cancela un pedido pendiente, se repone el stock
    if (nuevoEstado === ESTADO.CANCELADO) {
      for (const it of parseItems(pedido)) await Productos.ajustarStock(it.id, +it.cantidad);
    }
    return Api.actualizar(API.PEDIDOS, id, { ...pedido, estado: nuevoEstado });
  }

  /* Confirmación de recepción por el cliente (US-09) */
  async function confirmarRecepcion(id, usuarioId) {
    const pedido = await Api.obtener(API.PEDIDOS, id);
    if (String(pedido.clienteId) !== String(usuarioId))
      throw new Error("Solo el dueño del pedido puede confirmar la recepción.");
    if (pedido.estado !== ESTADO.EN_CAMINO)
      throw new Error("El pedido no está en estado 'En camino'.");
    return Api.actualizar(API.PEDIDOS, id, { ...pedido, estado: ESTADO.ENTREGADO });
  }

  /* Cancelación del pedido por el cliente (US-17)
     Solo el dueño puede cancelar, y solo mientras el pedido está
     "Pendiente de entrega" (antes de que el vendedor lo confirme/despache).
     Al cancelar se repone el stock, igual que en la cancelación del vendedor. */
  async function cancelarCliente(id, usuarioId) {
    const pedido = await Api.obtener(API.PEDIDOS, id);
    if (String(pedido.clienteId) !== String(usuarioId))
      throw new Error("Solo el dueño del pedido puede cancelarlo.");
    if (pedido.estado !== ESTADO.PENDIENTE)
      throw new Error("Solo se puede cancelar un pedido mientras está 'Pendiente de entrega'.");

    // Reposición de stock de cada producto del pedido
    for (const it of parseItems(pedido)) await Productos.ajustarStock(it.id, +it.cantidad);

    console.log(`[EMAIL simulado] Pedido ${pedido.numero} cancelado por el cliente ${pedido.clienteEmail}.`);
    return Api.actualizar(API.PEDIDOS, id, { ...pedido, estado: ESTADO.CANCELADO });
  }

  const misPedidos = async (usuarioId) =>
    (await listar()).filter((p) => String(p.clienteId) === String(usuarioId));

  return {
    listar, parseItems, parseDomicilio, confirmar,
    cambiarEstadoVendedor, confirmarRecepcion, cancelarCliente, misPedidos,
  };
})();
