/* ============================================================
   Body Paint · Cupones de descuento (US-13, US-14)
   Generación por el vendedor y validación/aplicación por el cliente.
   ============================================================ */

const Cupones = (() => {

  const listar = () => Api.listar(API.CUPONES);

  function generarCodigo() {
    return "BP-" + Date.now().toString(36).toUpperCase() +
           "-" + Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  }

  /* dd/mm/aaaa -> Date (00:00). Devuelve null si el formato es inválido. */
  function parseFechaDD(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((str || "").trim());

    if (!m) return null;

    const [, a, mes, d] = m;

    return new Date(
      Number(a),
      Number(mes) - 1,
      Number(d),
      0, 0, 0, 0
    );
  }

  /* Crear cupón (US-13) */
  async function crear({ clienteIds, tipo, valor, desde, hasta }) {
    if (!Array.isArray(clienteIds) || clienteIds.length === 0)
      throw new Error("Seleccioná al menos un cliente.");
    if (!["porcentaje", "monto"].includes(tipo))
      throw new Error("Elegí el tipo de descuento (porcentaje o monto).");
    valor = Number(valor);
    if (!(valor > 0)) throw new Error("El valor del descuento debe ser mayor a cero.");
    if (tipo === "porcentaje" && valor > 100) throw new Error("El porcentaje no puede superar 100%.");
    valor = Math.round(valor * 100) / 100;            // hasta 2 decimales

    const fDesde = parseFechaDD(desde), fHasta = parseFechaDD(hasta);
    if (!fDesde || !fHasta) throw new Error("Las fechas deben tener formato dd/mm/aaaa.");
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (fDesde < hoy) throw new Error("La fecha 'desde' no puede estar en el pasado.");
    if (fHasta < hoy) throw new Error("La fecha 'hasta' no puede estar en el pasado.");
    if (fHasta < fDesde) throw new Error("La fecha 'hasta' debe ser posterior o igual a 'desde'.");

    const diasVigencia = (fHasta - fDesde) / (1000 * 60 * 60 * 24);
    if (diasVigencia > 365) throw new Error("La vigencia de un cupón no puede superar 365 días.");

    const payload = {
      codigo: generarCodigo(),
      tipo, valor,
      desde: fDesde.toISOString(),
      hasta: fHasta.toISOString(),
      clienteIds: Json.pack(clienteIds),
      usado: false,
    };
    return Api.crear(API.CUPONES, payload);
  }

  /* Validar y devolver el cupón aplicable (US-14) */
  async function validarPara(codigo, usuarioId, totalCarro) {
    const lista = await listar();
    const c = lista.find((x) => (x.codigo || "").toUpperCase() === (codigo || "").trim().toUpperCase());
    if (!c) throw new Error("El código de cupón no existe.");
    if (c.usado) throw new Error("Ese cupón ya fue utilizado.");

    const ids = Json.unpack(c.clienteIds, []) || [];
    if (!ids.map(String).includes(String(usuarioId)))
      throw new Error("Este cupón no está habilitado para tu cuenta.");

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const desde = new Date(c.desde), hasta = new Date(c.hasta);
    if (hoy < new Date(desde.toDateString()) || hoy > new Date(hasta.toDateString()))
      throw new Error("El cupón está fuera de su período de vigencia.");

    if (c.tipo === "monto" && Number(c.valor) >= Number(totalCarro))
      throw new Error("El descuento debe ser menor al total del pedido.");

    return c;
  }

  function calcularDescuento(cupon, total) {
    if (!cupon) return 0;
    const d = cupon.tipo === "porcentaje"
      ? total * (Number(cupon.valor) / 100)
      : Number(cupon.valor);
    return Math.min(d, total);
  }

  /* Cupones que el cliente puede usar ahora: dirigidos a él, no usados y vigentes */
  async function disponiblesPara(usuarioId) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const lista = await listar();
    return lista.filter((c) => {
      if (c.usado) return false;
      const ids = Json.unpack(c.clienteIds, []) || [];
      if (!ids.map(String).includes(String(usuarioId))) return false;
      const desde = new Date(c.desde), hasta = new Date(c.hasta);
      return hoy >= new Date(desde.toDateString()) && hoy <= new Date(hasta.toDateString());
    });
  }

  async function marcarUsado(id) {
    const c = await Api.obtener(API.CUPONES, id);
    return Api.actualizar(API.CUPONES, id, { ...c, usado: true });
  }

  return { listar, crear, validarPara, calcularDescuento, disponiblesPara, marcarUsado, parseFechaDD, generarCodigo };
})();
