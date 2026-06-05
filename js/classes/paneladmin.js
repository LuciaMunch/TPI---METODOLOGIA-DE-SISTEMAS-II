/* ============================================================
   Body Paint · Vistas de staff
   panel vendedor (pedidos) · cupones · reportes · panel admin (productos)
   ============================================================ */

const VistasStaff = (() => {
  const app = () => document.getElementById("app");
  const E = UI.escape, $ = UI.fmtMoneda;

  /* ============ PANEL VENDEDOR · PEDIDOS (US-05, US-08) ============ */
  async function pedidos() {
    app().innerHTML = `
      <header class="view-head">
        <div><h2 class="view-title">Pedidos</h2><p class="view-sub">Gestioná el ciclo de vida de cada entrega.</p></div>
        <div class="filtros">
          <select id="f-estado">
            <option value="">Todos los estados</option>
            ${Object.values(ESTADO).map((e) => `<option>${e}</option>`).join("")}
          </select>
        </div>
      </header>
      <div id="ped-cont"><p class="loading">Cargando pedidos…</p></div>`;

    let todos = [];
    try { todos = await Pedidos.listar(); }
    catch (e) { document.getElementById("ped-cont").innerHTML = errorBox(e); return; }
    todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const pintar = () => {
      const f = document.getElementById("f-estado").value;
      const lista = f ? todos.filter((p) => p.estado === f) : todos;
      const cont = document.getElementById("ped-cont");
      if (!lista.length) { cont.innerHTML = `<p class="empty">No hay pedidos para mostrar.</p>`; return; }
      cont.innerHTML = `<div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${lista.map(fila).join("")}</tbody></table></div>`;
      wire(lista);
    };

    function fila(p) {
      const destinos = TRANSICIONES_VENDEDOR[p.estado] || [];
      let accion;
      if (destinos.length) {
        accion = `<select class="sel-estado" data-id="${p.id}" data-actual="${E(p.estado)}">
            <option value="">Cambiar a…</option>
            ${destinos.map((d) => `<option value="${E(d)}">${E(d)}</option>`).join("")}
          </select>`;
      } else {
        accion = `<span class="muted">—</span>`;
      }
      return `<tr>
        <td><b>${E(p.numero)}</b><button class="link-ver" data-ver="${p.id}">ver detalle</button></td>
        <td>${E(p.clienteNombre || "")}<br><span class="muted">${E(p.clienteEmail || "")}</span></td>
        <td>${UI.fmtFecha(p.fecha)}</td>
        <td>${$(p.total)}</td>
        <td>${badgeEstado(p.estado)}</td>
        <td>${accion}</td>
      </tr>`;
    }

    function wire(lista) {
      document.querySelectorAll(".sel-estado").forEach((sel) => sel.onchange = async () => {
        const nuevo = sel.value; if (!nuevo) return;
        const id = sel.dataset.id;
        const accion = nuevo === ESTADO.CANCELADO ? "cancelar" : "pasar a " + nuevo;
        if (!(await UI.confirmar("Cambiar estado", `¿Confirmás ${accion} el pedido?`))) { sel.value = ""; return; }
        try {
          await Pedidos.cambiarEstadoVendedor(id, nuevo);
          UI.ok(`Pedido actualizado a "${nuevo}".`);
          todos = await Pedidos.listar(); todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          pintar();
        } catch (e) { UI.err(e.message); sel.value = ""; }
      });
      document.querySelectorAll("[data-ver]").forEach((b) => b.onclick = () => {
        const p = lista.find((x) => x.id === b.dataset.ver);
        verDetalle(p);
      });
    }

    function verDetalle(p) {
      const items = Pedidos.parseItems(p);
      const d = Pedidos.parseDomicilio(p);
      UI.modal(`
        <button class="modal__close" data-cerrar>✕</button>
        <h3 class="modal__title">Pedido ${E(p.numero)}</h3>
        <p class="muted">${E(p.clienteNombre)} · ${E(p.clienteEmail)}</p>
        <p class="muted">${UI.fmtFecha(p.fecha)} · ${badgeEstado(p.estado)}</p>
        <table class="tabla tabla--mini"><tbody>
          ${items.map((i) => `<tr><td>${i.cantidad}× ${E(i.nombre)}</td><td>${$(i.precio*i.cantidad)}</td></tr>`).join("")}
        </tbody></table>
        <p><b>Envío:</b> ${E([d.calle,d.numero,d.localidad,d.provincia,d.pais].filter(Boolean).join(", "))}</p>
        <p><b>Pago:</b> ${E(p.formaPago)}</p>
        ${p.cuponCodigo ? `<p><b>Cupón:</b> ${E(p.cuponCodigo)} (−${$(p.descuento)})</p>` : ""}
        <p class="modal__total"><b>Total: ${$(p.total)}</b></p>`, { ancho: "520px" });
    }

    document.getElementById("f-estado").onchange = pintar;
    pintar();
  }

  /* ============ CUPONES (US-13) ============ */
  async function cupones() {
    app().innerHTML = `
      <header class="view-head"><h2 class="view-title">Cupones de descuento</h2>
        <p class="view-sub">Premiá a tus clientes con una oferta.</p></header>
      <div class="cupon-layout">
        <section class="panel">
          <h3>Nuevo cupón</h3>
          <label>Tipo
            <select id="cp-tipo"><option value="porcentaje">Porcentaje (%)</option><option value="monto">Monto fijo ($)</option></select>
          </label>
          <label>Valor<input id="cp-valor" type="number" step="0.01" min="0.01" placeholder="Ej: 15"></label>
          <div class="grid-2">
            <label>Desde (dd/mm/aaaa)<input id="cp-desde" placeholder="01/06/2026" type="date"></label>
            <label>Hasta (dd/mm/aaaa)<input id="cp-hasta" placeholder="30/06/2026" type="date"></label>
          </div>
          <label>Clientes destino</label>
          <div id="cp-clientes" class="clientes-list"><p class="loading">Cargando clientes…</p></div>
          <button class="btn btn--solid btn--block" id="cp-crear">Generar cupón</button>
        </section>
        <section class="panel">
          <h3>Cupones emitidos</h3>
          <div id="cp-lista"><p class="loading">Cargando…</p></div>
        </section>
      </div>`;

    // Clientes
    let clientes = [];
    try {
      clientes = (await Api.listar(API.USUARIOS)).filter((u) => u.rol === ROL.CLIENTE);
      const cont = document.getElementById("cp-clientes");
      cont.innerHTML = clientes.length
        ? clientes.map((c) => `<label class="check"><input type="checkbox" value="${c.id}"> ${E(c.nombre)} ${E(c.apellido)} <span class="muted">(${E(c.email)})</span></label>`).join("")
        : `<p class="muted">No hay clientes registrados.</p>`;
    } catch (e) { document.getElementById("cp-clientes").innerHTML = errorBox(e); }

    await listarCupones();

    document.getElementById("cp-crear").onclick = async () => {
      const ids = [...document.querySelectorAll("#cp-clientes input:checked")].map((c) => c.value);
      try {
        const c = await Cupones.crear({
          clienteIds: ids,
          tipo: document.getElementById("cp-tipo").value,
          valor: document.getElementById("cp-valor").value,
          desde: document.getElementById("cp-desde").value,
          hasta: document.getElementById("cp-hasta").value,
        });
        const nombres = clientes.filter((x) => ids.includes(x.id)).map((x) => x.email);
        console.log(`[EMAIL simulado] Cupón ${c.codigo} enviado a: ${nombres.join(", ")}. ` +
                    `${c.tipo === "porcentaje" ? c.valor + "%" : "$" + c.valor} · vigencia ${new Date(c.desde).toLocaleDateString("es-AR")}–${new Date(c.hasta).toLocaleDateString("es-AR")}.`);
        UI.ok(`Cupón ${c.codigo} generado y enviado (simulado).`);
        document.getElementById("cp-valor").value = "";
        await listarCupones();
      } catch (e) { UI.err(e.message); }
    };

    async function listarCupones() {
      const cont = document.getElementById("cp-lista");
      try {
        const lista = (await Cupones.listar()).sort((a, b) => new Date(b.desde) - new Date(a.desde));
        cont.innerHTML = lista.length ? lista.map((c) => `
          <div class="cupon-chip ${c.usado ? "cupon-chip--used" : ""}">
            <code>${E(c.codigo)}</code>
            <span>${c.tipo === "porcentaje" ? c.valor + "%" : $(c.valor)}</span>
            <span class="muted">${new Date(c.desde).toLocaleDateString("es-AR")}–${new Date(c.hasta).toLocaleDateString("es-AR")}</span>
            <span class="badge ${c.usado ? "badge--canc" : "badge--conf"}">${c.usado ? "Usado" : "Vigente"}</span>
          </div>`).join("") : `<p class="muted">Sin cupones emitidos.</p>`;
      } catch (e) { cont.innerHTML = errorBox(e); }
    }
  }

  /* ============ REPORTES (US-15 stock · US-16 más vendidos) ============ */
  async function reportes() {
    const u = Auth.getUsuario();
    const esAdmin = u && u.rol === ROL.ADMIN;
    const esVend  = u && u.rol === ROL.VENDEDOR;
    app().innerHTML = `
      <header class="view-head"><h2 class="view-title">Reportes</h2></header>
      <div class="reportes">
        ${esAdmin ? `<section class="panel"><h3>Stock mínimo</h3>
          <button class="btn btn--solid btn--sm" id="rep-stock-btn">Generar reporte</button>
          <div id="rep-stock"></div></section>` : ""}
        ${esVend ? `<section class="panel"><h3>Productos más vendidos</h3>
          <div class="filtros">
            <select id="rep-mes"><option value="">Todos los meses</option>
              ${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m,i)=>`<option value="${i+1}">${m}</option>`).join("")}
            </select>
            <select id="rep-anio"><option value="">Todos los años</option>
              ${[2025,2026].map((a)=>`<option value="${a}">${a}</option>`).join("")}
            </select>
            <button class="btn btn--solid btn--sm" id="rep-vend-btn">Generar</button>
          </div>
          <div id="rep-vend"></div></section>` : ""}
      </div>`;

    if (esAdmin) document.getElementById("rep-stock-btn").onclick = reporteStock;
    if (esVend)  document.getElementById("rep-vend-btn").onclick  = reporteVendidos;
  }

  async function reporteStock() {
    const cont = document.getElementById("rep-stock");
    cont.innerHTML = `<p class="loading">Generando…</p>`;
    try {
      const prods = (await Productos.listarActivos())
        .filter((p) => Number(p.stock) <= Number(p.stockMinimo || 0) * PORCENTAJE_UMBRAL_STOCK)
        .sort((a, b) => Number(a.stock) - Number(b.stock));
      if (!prods.length) { cont.innerHTML = `<p class="ok-text">✓ Todos los productos tienen stock suficiente.</p>`; return; }
      cont.innerHTML = `<div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Producto</th><th>Código</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead>
        <tbody>${prods.map((p) => {
          const sin = Number(p.stock) <= 0;
          return `<tr><td>${E(p.nombre)}</td><td>${E(p.codigo)}</td><td>${p.stock}</td><td>${p.stockMinimo||0}</td>
            <td><span class="badge ${sin ? "badge--canc" : "badge--pend"}">${sin ? "Sin stock" : "Stock crítico"}</span></td></tr>`;
        }).join("")}</tbody></table></div>`;
    } catch (e) { cont.innerHTML = errorBox(e); }
  }

  async function reporteVendidos() {
    const cont = document.getElementById("rep-vend");
    cont.innerHTML = `<p class="loading">Generando…</p>`;
    const mes = document.getElementById("rep-mes").value;
    const anio = document.getElementById("rep-anio").value;
    try {
      const pedidos = (await Pedidos.listar()).filter((p) => p.estado !== ESTADO.CANCELADO);
      const conteo = {};
      for (const p of pedidos) {
        const f = new Date(p.fecha);
        if (mes && (f.getMonth() + 1) != Number(mes)) continue;
        if (anio && f.getFullYear() != Number(anio)) continue;
        for (const it of Pedidos.parseItems(p)) {
          conteo[it.nombre] = (conteo[it.nombre] || 0) + it.cantidad;
        }
      }
      const ranking = Object.entries(conteo).map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
      if (!ranking.length) { cont.innerHTML = `<p class="muted">No hay ventas para el período seleccionado.</p>`; return; }
      const max = ranking[0].cantidad;
      cont.innerHTML = `<ol class="ranking">${ranking.map((r, i) => `
        <li><span class="ranking__pos">${i+1}</span>
          <div class="ranking__bar-wrap"><div class="ranking__bar" style="width:${(r.cantidad/max)*100}%"></div>
            <span class="ranking__name">${E(r.nombre)}</span></div>
          <b>${r.cantidad}</b></li>`).join("")}</ol>`;
    } catch (e) { cont.innerHTML = errorBox(e); }
  }

  /* ============ PANEL ADMIN · PRODUCTOS (US-06, US-07, US-10, US-11, US-12) ============ */
  async function admin() {
    app().innerHTML = `
      <header class="view-head"><h2 class="view-title">Administración de productos</h2></header>
      <div class="admin-layout">
        <section class="panel" id="form-panel">
          <h3 id="form-titulo">Crear producto</h3>
          <input type="hidden" id="p-id">
          <div class="grid-2">
            <label>Nombre<input id="p-nombre"></label>
            <label>Código<input id="p-codigo"></label>
          </div>
          <div class="grid-2">
            <label>Marca<input id="p-marca"></label>
            <label>Color<input id="p-color"></label>
          </div>
          <div class="grid-3">
            <label>Precio<input id="p-precio" type="number" step="0.01" min="0.01"></label>
            <label>Stock<input id="p-stock" type="number" min="1"></label>
            <label>Stock mín.<input id="p-stockmin" type="number" min="0" value="0"></label>
          </div>
          <label>Imagen (PNG/JPG, máx 2MB)<input id="p-img" type="file" accept=".png,.jpg,.jpeg"></label>
          <div id="p-preview" class="img-preview" hidden>
            <img id="p-preview-img" alt="previsualización">
            <button type="button" class="btn btn--ghost btn--sm" id="p-img-quitar">Quitar imagen</button>
          </div>
          <div class="form-actions">
            <button class="btn btn--solid" id="p-guardar">Crear producto</button>
            <button class="btn btn--ghost" id="p-cancelar" hidden>Cancelar</button>
          </div>
        </section>
        <section class="panel panel--grow">
          <div class="view-head view-head--inline">
            <h3>Catálogo</h3>
            <div class="head-tools">
              <button class="btn btn--ghost btn--xs" id="adm-seed">Cargar ejemplo</button>
              <div class="search"><input id="adm-buscar" placeholder="Buscar por nombre, código o marca…"></div>
            </div>
          </div>
          <div id="adm-tabla"><p class="loading">Cargando…</p></div>
        </section>
      </div>`;

    let imagenActual = "";   // dataURL o path
    let productos = [];

    /* --- Imagen --- */
    const fileInput = document.getElementById("p-img");
    const preview = document.getElementById("p-preview");
    const previewImg = document.getElementById("p-preview-img");
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      const err = Productos.validarArchivoImagen(file);
      if (err) { UI.err(err); fileInput.value = ""; return; }
      try {
        imagenActual = await Productos.archivoADataURL(file);
        previewImg.src = imagenActual; preview.hidden = false;
      } catch (e) { UI.err(e.message); fileInput.value = ""; }
    };
    document.getElementById("p-img-quitar").onclick = () => {
      imagenActual = ""; fileInput.value = ""; preview.hidden = true;
    };

    /* --- Tabla --- */
    async function cargar() {
      try { productos = await Productos.listarActivos(); }
      catch (e) { document.getElementById("adm-tabla").innerHTML = errorBox(e); return; }
      pintarTabla(productos);
    }
    function pintarTabla(lista) {
      const cont = document.getElementById("adm-tabla");
      if (!lista.length) { cont.innerHTML = `<p class="empty">No hay productos. Creá el primero.</p>`; return; }
      cont.innerHTML = `<div class="tabla-wrap"><table class="tabla">
        <thead><tr><th></th><th>Nombre</th><th>Código</th><th>Marca</th><th>Color</th><th>Precio</th><th>Stock</th><th>Mín</th><th></th></tr></thead>
        <tbody>${lista.map(filaProd).join("")}</tbody></table></div>`;
      wireTabla(lista);
    }
    function filaProd(p) {
      const alerta = Productos.enAlerta(p);
      return `<tr class="${alerta ? "fila-alerta" : ""}">
        <td><div class="mini-img" style="background-image:url('${E((p.imagen&&p.imagen.length>4)?p.imagen:PLACEHOLDER_IMG)}')"></div></td>
        <td>${E(p.nombre)}</td><td>${E(p.codigo)}</td><td>${E(p.marca||"")}</td><td>${E(p.color||"")}</td>
        <td>${$(p.precio)}</td>
        <td>${alerta ? `<span class="alerta-stock" title="Stock en o bajo el mínimo">⚠ ${p.stock}</span>` : p.stock}</td>
        <td>${p.stockMinimo||0}</td>
        <td class="acciones">
          <button class="btn btn--ghost btn--xs" data-edit="${p.id}">Editar</button>
          <button class="btn btn--ghost btn--xs" data-min="${p.id}">Stock mín.</button>
          <button class="btn btn--ghost btn--xs" data-baja="${p.id}">Baja</button>
        </td></tr>`;
    }
    function wireTabla(lista) {
      document.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => cargarEnForm(lista.find((p) => p.id === b.dataset.edit)));
      document.querySelectorAll("[data-min]").forEach((b) => b.onclick = () => configStockMin(lista.find((p) => p.id === b.dataset.min)));
      document.querySelectorAll("[data-baja]").forEach((b) => b.onclick = async () => {
        const p = lista.find((x) => x.id === b.dataset.baja);
        if (!(await UI.confirmar("Dar de baja", `¿Dar de baja "${p.nombre}"? No aparecerá más en el catálogo.`))) return;
        try { await Productos.bajaLogica(p.id); UI.ok("Producto dado de baja."); cargar(); }
        catch (e) { UI.err(e.message); }
      });
    }

    /* --- Modo edición (US-11) --- */
    function cargarEnForm(p) {
      document.getElementById("p-id").value = p.id;
      set("p-nombre", p.nombre); set("p-codigo", p.codigo); set("p-marca", p.marca);
      set("p-color", p.color); set("p-precio", p.precio); set("p-stock", p.stock);
      set("p-stockmin", p.stockMinimo || 0);
      imagenActual = p.imagen || "";
      if (imagenActual && imagenActual.length > 4) { previewImg.src = imagenActual; preview.hidden = false; }
      else { preview.hidden = true; }
      document.getElementById("form-titulo").textContent = "Editar producto";
      document.getElementById("p-guardar").textContent = "Guardar cambios";
      document.getElementById("p-cancelar").hidden = false;
      document.getElementById("form-panel").classList.add("panel--editando");
      document.getElementById("form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function resetForm() {
      ["p-nombre","p-codigo","p-marca","p-color","p-precio","p-stock"].forEach((i)=>set(i,""));
      set("p-stockmin", 0); document.getElementById("p-id").value = "";
      imagenActual = ""; fileInput.value = ""; preview.hidden = true;
      document.getElementById("form-titulo").textContent = "Crear producto";
      document.getElementById("p-guardar").textContent = "Crear producto";
      document.getElementById("p-cancelar").hidden = true;
      document.getElementById("form-panel").classList.remove("panel--editando");
    }
    document.getElementById("p-cancelar").onclick = resetForm;

    /* --- Guardar --- */
    document.getElementById("p-guardar").onclick = async () => {
      const datos = {
        nombre: val("p-nombre"), codigo: val("p-codigo"), marca: val("p-marca"),
        color: val("p-color"), precio: val("p-precio"), stock: val("p-stock"),
        stockMinimo: val("p-stockmin"), imagen: imagenActual,
      };
      const id = document.getElementById("p-id").value;
      const btn = document.getElementById("p-guardar"); btn.disabled = true;
      try {
        if (id) { await Productos.editar(id, datos); UI.ok("Producto actualizado."); }
        else    { await Productos.crear(datos);     UI.ok("Producto creado."); }
        resetForm(); await cargar();
      } catch (e) { UI.err(e.message); }
      finally { btn.disabled = false; }
    };

    /* --- Stock mínimo (US-12) --- */
    function configStockMin(p) {
      const { el, cerrar } = UI.modal(`
        <h3 class="modal__title">Stock mínimo · ${E(p.nombre)}</h3>
        <p class="muted">Valor actual: ${p.stockMinimo || 0}</p>
        <label>Nuevo stock mínimo (entero positivo)<input id="sm-valor" type="number" min="1" value="${p.stockMinimo||1}"></label>
        <div class="modal__actions">
          <button class="btn btn--ghost" data-cerrar>Cancelar</button>
          <button class="btn btn--solid" id="sm-ok">Guardar</button>
        </div>`, { ancho: "420px" });
      el.querySelector("#sm-ok").onclick = async () => {
        try { await Productos.configurarStockMinimo(p.id, el.querySelector("#sm-valor").value);
          UI.ok("Stock mínimo actualizado."); cerrar(); cargar(); }
        catch (e) { UI.err(e.message); }
      };
    }

    document.getElementById("adm-buscar").oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      pintarTabla(productos.filter((p) =>
        [p.nombre, p.codigo, p.marca].some((c) => (c || "").toLowerCase().includes(q))));
    };

    document.getElementById("adm-seed").onclick = async () => {
      if (!(await UI.confirmar("Cargar datos de ejemplo", "Se agregarán productos de muestra al catálogo. ¿Continuar?"))) return;
      await App.seedProductos();
      await cargar();
    };

    await cargar();
    function set(id, v) { const e = document.getElementById(id); if (e) e.value = v ?? ""; }
  }

  /* comunes */
  function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function errorBox(e) {
    return `<div class="error-box"><b>No se pudieron cargar los datos.</b><p>${E(e.message)}</p></div>`;
  }

  return { pedidos, cupones, reportes, admin };
})();
