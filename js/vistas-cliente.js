/* ============================================================
   Body Paint · Vistas públicas y de cliente
   landing · catálogo · carro · checkout · login/registro · mis pedidos
   ============================================================ */

const VistasCliente = (() => {
  const app = () => document.getElementById("app");
  const E = UI.escape, $ = UI.fmtMoneda;

  function imgSrc(p) {
    return (p.imagen && p.imagen.length > 4) ? p.imagen : PLACEHOLDER_IMG;
  }

  /* ============ LANDING ============ */
  function landing() {
    const u = Auth.getUsuario();
    let cta;
    if (!u) {
      // Visitante: no puede explorar el catálogo; lo invitamos a registrarse o entrar.
      cta = `
        <a href="#registro" class="btn btn--solid btn--lg">Crear cuenta</a>
        <a href="#login" class="btn btn--ghost btn--lg">Iniciar sesión</a>`;
    } else if (u.rol === ROL.CLIENTE) {
      cta = `
        <a href="#catalogo" class="btn btn--solid btn--lg">Explorar catálogo</a>
        <a href="#mis-pedidos" class="btn btn--ghost btn--lg">Mis pedidos</a>`;
    } else {
      const destino = App.inicioPara(u);
      cta = `<a href="${destino}" class="btn btn--solid btn--lg">Ir al panel</a>`;
    }

    app().innerHTML = `
      <section class="hero">
        <div class="hero__bg" style="background-image:url('img/imagen-8.jpeg')"></div>
        <div class="hero__grain"></div>
        <div class="hero__inner">
          <p class="hero__eyebrow">Arte temporal · pinturas · pinceles · glitter</p>
          <h1 class="hero__title">El cuerpo<br><em>como lienzo.</em></h1>
          <p class="hero__lead">Todo lo que necesitás para el body painting, en un solo lugar.
             Pinturas profesionales, pinceles, esponjas, brillantina y plantillas.</p>
          <div class="hero__cta">${cta}</div>
        </div>
        <div class="hero__strip">
          ${[6,7,9,11,12,14].map(n => `<span style="background-image:url('img/imagen-${n}.jpeg')"></span>`).join("")}
        </div>
      </section>
      <section class="feats">
        <article><h3>Catálogo curado</h3><p>Marcas y colores seleccionados para artistas.</p></article>
        <article><h3>Compra simple</h3><p>Armá tu carro y pagá en efectivo contra entrega.</p></article>
        <article><h3>Seguimiento</h3><p>Mirá el estado de tu pedido hasta tu puerta.</p></article>
      </section>`;
  }

  /* ============ CATÁLOGO ============ */
  async function catalogo() {
    app().innerHTML = `
      <header class="view-head">
        <div><h2 class="view-title">Catálogo</h2>
        <p class="view-sub">Elegí tus productos y sumalos al carro.</p></div>
        <div class="search"><input id="cat-buscar" placeholder="Buscar por nombre, marca o color…"></div>
      </header>
      <div id="cat-grid" class="grid-prod"><p class="loading">Cargando productos…</p></div>`;

    let productos = [];
    try { productos = await Productos.listarActivos(); }
    catch (e) { app().querySelector("#cat-grid").innerHTML = errorBox(e); return; }

    const pintar = (lista) => {
      const grid = document.getElementById("cat-grid");
      if (!lista.length) { grid.innerHTML = `<p class="empty">No se encontraron productos.</p>`; return; }
      grid.innerHTML = lista.map(cardProducto).join("");
      grid.querySelectorAll("[data-add]").forEach((b) =>
        b.addEventListener("click", () => {
          if (!Auth.tieneRol(ROL.CLIENTE)) return;   // visitante/staff: botón deshabilitado
          const p = lista.find((x) => x.id === b.dataset.add);
          if (Carro.agregar(p)) { UI.ok(`"${p.nombre}" agregado al carro.`); App.refrescarNav(); }
        }));
    };
    pintar(productos);

    document.getElementById("cat-buscar").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      pintar(productos.filter((p) =>
        [p.nombre, p.marca, p.color, p.codigo].some((c) => (c || "").toLowerCase().includes(q))));
    });
  }

  function cardProducto(p) {
    const sin = Number(p.stock) <= 0;
    const esCliente = !!Auth.tieneRol(ROL.CLIENTE);
    const logueado = Auth.estaLogueado();

    let boton;
    if (sin) {
      boton = `<button class="btn btn--solid btn--sm" disabled>Agotado</button>`;
    } else if (esCliente) {
      boton = `<button class="btn btn--solid btn--sm" data-add="${p.id}">Agregar</button>`;
    } else if (!logueado) {
      // Visitante: puede ver el catálogo, pero no agregar al carro.
      boton = `<button class="btn btn--solid btn--sm" disabled title="Iniciá sesión como cliente para comprar">Agregar</button>`;
    } else {
      // Logueado pero no es cliente (vendedor/admin)
      boton = `<button class="btn btn--solid btn--sm" disabled title="Solo los clientes pueden comprar">Solo clientes</button>`;
    }

    return `
      <article class="card-prod ${sin ? "card-prod--out" : ""}">
        <div class="card-prod__img" style="background-image:url('${E(imgSrc(p))}')">
          ${p.color ? `<span class="chip-color">${E(p.color)}</span>` : ""}
          ${sin ? `<span class="chip-out">Sin stock</span>` : ""}
        </div>
        <div class="card-prod__body">
          <p class="card-prod__brand">${E(p.marca || "")}</p>
          <h3 class="card-prod__name">${E(p.nombre)}</h3>
          <div class="card-prod__foot">
            <span class="card-prod__price">${$(p.precio)}</span>
            ${boton}
          </div>
        </div>
      </article>`;
  }

  /* ============ CARRO ============ */
  function carro() {
    const items = Carro.obtener();
    if (Carro.estaVacio()) {
      app().innerHTML = `
        <header class="view-head"><h2 class="view-title">Tu carro</h2></header>
        <div class="empty-box">
          <p>Tu carro está vacío.</p>
          <a href="#catalogo" class="btn btn--solid">Ir al catálogo</a>
        </div>`;
      return;
    }
    app().innerHTML = `
      <header class="view-head"><h2 class="view-title">Tu carro</h2></header>
      <div class="cart">
        <div class="cart__list">
          ${items.map(filaCarro).join("")}
        </div>
        <aside class="cart__sum">
          <h3>Resumen</h3>
          <div class="cart__row"><span>Productos</span><b>${Carro.cantidadTotal()}</b></div>
          <div class="cart__row cart__row--total"><span>Total</span><b id="cart-total">${$(Carro.total())}</b></div>
          <a href="#checkout" class="btn btn--solid btn--block">Confirmar pedido</a>
          <button class="btn btn--ghost btn--block" id="cart-clear">Vaciar carro</button>
        </aside>
      </div>`;

    const rerender = () => { carro(); App.refrescarNav(); };
    app().querySelectorAll("[data-inc]").forEach((b) => b.onclick = () => { Carro.cambiarCantidad(b.dataset.inc, +1); rerender(); });
    app().querySelectorAll("[data-dec]").forEach((b) => b.onclick = () => { Carro.cambiarCantidad(b.dataset.dec, -1); rerender(); });
    app().querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { Carro.eliminar(b.dataset.del); rerender(); });
    const clr = document.getElementById("cart-clear");
    clr.onclick = async () => { if (await UI.confirmar("Vaciar el carro", "¿Querés quitar todos los productos?")) { Carro.vaciar(); rerender(); } };
  }

  function filaCarro(i) {
    return `
      <div class="cart-item">
        <div class="cart-item__img" style="background-image:url('${E((i.imagen && i.imagen.length>4)?i.imagen:PLACEHOLDER_IMG)}')"></div>
        <div class="cart-item__info">
          <h4>${E(i.nombre)}</h4>
          <p>${E(i.color || "")} · ${$(i.precio)} c/u</p>
        </div>
        <div class="stepper">
          <button data-dec="${i.id}">−</button><span>${i.cantidad}</span><button data-inc="${i.id}">+</button>
        </div>
        <div class="cart-item__sub">${$(i.precio * i.cantidad)}</div>
        <button class="cart-item__del" data-del="${i.id}" title="Quitar">✕</button>
      </div>`;
  }

  /* ============ CHECKOUT ============ */
  async function checkout() {
    const usuario = Auth.getUsuario();
    if (!usuario) { UI.info("Iniciá sesión para confirmar tu pedido."); location.hash = "#login"; return; }
    if (Carro.estaVacio()) { UI.info("Tu carro está vacío."); location.hash = "#catalogo"; return; }

    const domicilios = Auth.domiciliosDe(usuario);
    let cuponAplicado = null;

    app().innerHTML = `
      <header class="view-head"><h2 class="view-title">Checkout</h2>
        <p class="view-sub">Pago: <b>Efectivo contra entrega</b></p></header>
      <div class="checkout">
        <section class="panel">
          <h3>Domicilio de envío</h3>
          <div id="dom-lista">
            ${domicilios.length
              ? domicilios.map((d, idx) => `
                <label class="radio-dom">
                  <input type="radio" name="dom" value="${idx}" ${idx===0?"checked":""}>
                  <span>${E(domTexto(d))}</span>
                </label>`).join("")
              : `<p class="muted">No tenés domicilios guardados. Agregá uno abajo.</p>`}
          </div>
          <details class="nuevo-dom" ${domicilios.length ? "" : "open"}>
            <summary>Agregar nuevo domicilio</summary>
            ${formDomicilioHTML()}
            <label class="check"><input type="checkbox" id="dom-guardar" checked> Guardar en mi perfil</label>
            <button class="btn btn--ghost btn--sm" id="dom-add">Usar este domicilio</button>
          </details>
        </section>

        <section class="panel">
          <h3>Cupón de descuento</h3>
          <div class="cupon-box">
            <input id="cupon-input" placeholder="Ingresá tu código (opcional)">
            <button class="btn btn--ghost btn--sm" id="cupon-apply">Aplicar</button>
          </div>
          <p id="cupon-msg" class="muted"></p>
          <div id="cupon-disp" class="cupon-disp"></div>
        </section>

        <aside class="panel checkout__sum">
          <h3>Resumen</h3>
          <div id="sum-detalle">${resumenHTML(Carro.total(), 0)}</div>
          <button class="btn btn--solid btn--block btn--lg" id="confirmar">Confirmar pedido</button>
        </aside>
      </div>`;

    // Selección de domicilio
    let domicilioElegido = domicilios[0] || null;
    app().querySelectorAll('input[name="dom"]').forEach((r) =>
      r.addEventListener("change", () => { domicilioElegido = domicilios[Number(r.value)]; }));

    // Agregar nuevo domicilio
    document.getElementById("dom-add").onclick = async () => {
      const d = leerFormDomicilio();
      const faltan = Auth.validarDomicilio(d);
      if (faltan.length) { UI.err("Faltan datos del domicilio: " + faltan.join(", ")); return; }
      if (document.getElementById("dom-guardar").checked) {
        try { await Auth.agregarDomicilio(d); UI.ok("Domicilio guardado en tu perfil."); }
        catch (e) { UI.err(e.message); }
      }
      domicilioElegido = d;
      UI.ok("Domicilio seleccionado para este pedido.");
      checkout();  // re-render con el nuevo domicilio en la lista
    };

    // Aplicar cupón
    document.getElementById("cupon-apply").onclick = async () => {
      const cod = document.getElementById("cupon-input").value;
      const msg = document.getElementById("cupon-msg");
      if (!cod.trim()) { cuponAplicado = null; actualizarResumen(); msg.textContent = ""; return; }
      try {
        cuponAplicado = await Cupones.validarPara(cod, usuario.id, Carro.total());
        msg.className = "ok-text";
        msg.textContent = `Cupón aplicado: ${cuponAplicado.tipo === "porcentaje" ? cuponAplicado.valor + "%" : $(cuponAplicado.valor)} de descuento.`;
      } catch (e) {
        cuponAplicado = null; msg.className = "err-text"; msg.textContent = e.message;
      }
      actualizarResumen();
    };

    function actualizarResumen() {
      const subtotal = Carro.total();
      const desc = cuponAplicado ? Cupones.calcularDescuento(cuponAplicado, subtotal) : 0;
      document.getElementById("sum-detalle").innerHTML = resumenHTML(subtotal, desc);
    }

    // Mostrar los cupones que el cliente tiene disponibles (los que le emitió el vendedor)
    async function cargarCuponesDisponibles() {
      const cont = document.getElementById("cupon-disp");
      let disp = [];
      try { disp = await Cupones.disponiblesPara(usuario.id); }
      catch { return; }
      if (!disp.length) {
        cont.innerHTML = `<p class="muted cupon-disp__empty">No tenés cupones disponibles por ahora.</p>`;
        return;
      }
      cont.innerHTML = `<p class="cupon-disp__tit">Tus cupones disponibles:</p>` +
        disp.map((c) => {
          const etiqueta = c.tipo === "porcentaje" ? `${c.valor}%` : $(c.valor);
          const vence = UI.fmtFecha(c.hasta);
          return `<button class="cupon-chip" data-cod="${E(c.codigo)}">
                    <b>${E(c.codigo)}</b><span>${etiqueta} · vence ${vence}</span>
                  </button>`;
        }).join("");
      cont.querySelectorAll(".cupon-chip").forEach((b) =>
        b.addEventListener("click", () => {
          document.getElementById("cupon-input").value = b.dataset.cod;
          document.getElementById("cupon-apply").click();
        }));
    }
    cargarCuponesDisponibles();

    // Confirmar
    document.getElementById("confirmar").onclick = async () => {
      if (!domicilioElegido) { UI.err("Seleccioná un domicilio de envío."); return; }
      const btn = document.getElementById("confirmar");
      btn.disabled = true; btn.textContent = "Procesando…";
      try {
        const pedido = await Pedidos.confirmar({
          usuario, items: Carro.obtener(), domicilio: domicilioElegido, cupon: cuponAplicado,
        });
        Carro.vaciar(); App.refrescarNav();
        UI.ok(`¡Pedido ${pedido.numero} confirmado! Te enviamos un email (simulado).`);
        location.hash = "#mis-pedidos";
      } catch (e) {
        UI.err(e.message); btn.disabled = false; btn.textContent = "Confirmar pedido";
      }
    };
  }

  function resumenHTML(subtotal, desc) {
    const total = Math.max(0, subtotal - desc);
    return `
      <div class="cart__row"><span>Subtotal</span><b>${$(subtotal)}</b></div>
      ${desc > 0 ? `<div class="cart__row"><span>Descuento</span><b class="ok-text">− ${$(desc)}</b></div>` : ""}
      <div class="cart__row cart__row--total"><span>Total</span><b>${$(total)}</b></div>`;
  }

  /* ============ MIS PEDIDOS (cliente) ============ */
  async function misPedidos() {
    const usuario = Auth.getUsuario();
    if (!usuario) { location.hash = "#login"; return; }
    app().innerHTML = `<header class="view-head"><h2 class="view-title">Mis pedidos</h2></header>
      <div id="mp"><p class="loading">Cargando…</p></div>`;

    let pedidos = [];
    try { pedidos = await Pedidos.misPedidos(usuario.id); }
    catch (e) { document.getElementById("mp").innerHTML = errorBox(e); return; }

    pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const cont = document.getElementById("mp");
    if (!pedidos.length) { cont.innerHTML = `<div class="empty-box"><p>Todavía no realizaste pedidos.</p><a href="#catalogo" class="btn btn--solid">Ir al catálogo</a></div>`; return; }

    cont.innerHTML = pedidos.map(cardPedidoCliente).join("");
    cont.querySelectorAll("[data-recibir]").forEach((b) => b.onclick = async () => {
      if (!(await UI.confirmar("Confirmar recepción", "¿Confirmás que recibiste este pedido? Esta acción es irreversible."))) return;
      try { await Pedidos.confirmarRecepcion(b.dataset.recibir, usuario.id); UI.ok("¡Gracias! Pedido marcado como entregado."); misPedidos(); }
      catch (e) { UI.err(e.message); }
    });
  }

  function cardPedidoCliente(p) {
    const items = Pedidos.parseItems(p);
    const puedeRecibir = p.estado === ESTADO.EN_CAMINO;
    return `
      <article class="pedido">
        <div class="pedido__top">
          <div><b>${E(p.numero)}</b><span class="pedido__date">${UI.fmtFecha(p.fecha)}</span></div>
          ${badgeEstado(p.estado)}
        </div>
        <ul class="pedido__items">
          ${items.map((i) => `<li>${i.cantidad}× ${E(i.nombre)} <span>${$(i.precio * i.cantidad)}</span></li>`).join("")}
        </ul>
        <div class="pedido__foot">
          <span class="muted">${E(domTexto(Pedidos.parseDomicilio(p)))}</span>
          <div class="pedido__totales">
            ${p.descuento > 0 ? `<span class="muted">Desc. ${$(p.descuento)}</span>` : ""}
            <b>${$(p.total)}</b>
          </div>
        </div>
        ${puedeRecibir ? `<button class="btn btn--solid btn--sm" data-recibir="${p.id}">Confirmar recepción</button>` : ""}
      </article>`;
  }

  /* ============ AUTH ============ */
  function login() {
    app().innerHTML = `
      <div class="auth">
        <div class="auth__card">
          <h2>Iniciar sesión</h2>
          <label>Email<input id="lg-email" type="email" autocomplete="username"></label>
          <label>Contraseña<input id="lg-pass" type="password" autocomplete="current-password"></label>
          <button class="btn btn--solid btn--block" id="lg-btn">Entrar</button>
          <p class="auth__alt">¿No tenés cuenta? <a href="#registro">Registrate</a></p>
          <p class="auth__hint">Demo: para acceder como vendedor o admin, registrá un usuario y cambiá su <code>rol</code> en MockAPI a <code>vendedor</code> o <code>admin</code>.</p>
        </div>
      </div>`;
    document.getElementById("lg-btn").onclick = async () => {
      const email = document.getElementById("lg-email").value;
      const pass = document.getElementById("lg-pass").value;
      try { const u = await Auth.login(email, pass); UI.ok(`¡Hola, ${u.nombre}!`); App.refrescarNav(); location.hash = App.inicioPara(u); }
      catch (e) { UI.err(e.message); }
    };
  }

  function registro() {
    app().innerHTML = `
      <div class="auth">
        <div class="auth__card auth__card--wide">
          <h2>Crear cuenta</h2>
          <div class="grid-2">
            <label>Nombre<input id="rg-nombre"></label>
            <label>Apellido<input id="rg-apellido"></label>
          </div>
          <label>Email<input id="rg-email" type="email"></label>
          <label>Contraseña (mín. ${PASSWORD_MIN})<input id="rg-pass" type="password"></label>
          <h3 class="auth__section">Domicilio de envío</h3>
          ${formDomicilioHTML("rg")}
          <button class="btn btn--solid btn--block" id="rg-btn">Registrarme</button>
          <p class="auth__alt">¿Ya tenés cuenta? <a href="#login">Iniciá sesión</a></p>
        </div>
      </div>`;
    document.getElementById("rg-btn").onclick = async () => {
      const datos = {
        nombre: val("rg-nombre"), apellido: val("rg-apellido"),
        email: val("rg-email"), password: val("rg-pass"),
        domicilio: leerFormDomicilio("rg"),
      };
      try {
        await Auth.registrar(datos);
        UI.ok("¡Cuenta creada! Ya podés iniciar sesión.");
        location.hash = "#login";
      } catch (e) { UI.err(e.message); }
    };
  }

  /* ---------- Helpers de domicilio ---------- */
  function formDomicilioHTML(pref = "nd") {
    return `
      <div class="grid-2">
        <label>País<input id="${pref}-pais" value="Argentina"></label>
        <label>Provincia/Estado<input id="${pref}-prov"></label>
      </div>
      <div class="grid-2">
        <label>Localidad<input id="${pref}-loc"></label>
        <label>Calle<input id="${pref}-calle"></label>
      </div>
      <div class="grid-3">
        <label>Número<input id="${pref}-num"></label>
        <label>Piso (opc.)<input id="${pref}-piso"></label>
        <label>Depto (opc.)<input id="${pref}-depto"></label>
      </div>`;
  }
  function leerFormDomicilio(pref = "nd") {
    return {
      pais: val(`${pref}-pais`), provincia: val(`${pref}-prov`), localidad: val(`${pref}-loc`),
      calle: val(`${pref}-calle`), numero: val(`${pref}-num`),
      piso: val(`${pref}-piso`), depto: val(`${pref}-depto`),
    };
  }
  function domTexto(d) {
    if (!d || !d.calle) return "—";
    const pd = [d.piso && `Piso ${d.piso}`, d.depto && `Dto ${d.depto}`].filter(Boolean).join(", ");
    return `${d.calle} ${d.numero}${pd ? " (" + pd + ")" : ""}, ${d.localidad}, ${d.provincia}, ${d.pais}`;
  }

  /* ---------- Comunes ---------- */
  function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function errorBox(e) {
    return `<div class="error-box"><b>No se pudieron cargar los datos.</b>
      <p>${E(e.message)}</p><p class="muted">Verificá la conexión y la configuración de MockAPI.</p></div>`;
  }

  return { landing, catalogo, carro, checkout, misPedidos, login, registro };
})();

/* Badge de estado reutilizable */
function badgeEstado(estado) {
  const map = {
    [ESTADO.PENDIENTE]:  "pend", [ESTADO.CONFIRMADO]: "conf",
    [ESTADO.EN_CAMINO]:  "camino", [ESTADO.ENTREGADO]: "entreg",
    [ESTADO.CANCELADO]:  "canc",
  };
  return `<span class="badge badge--${map[estado] || "pend"}">${UI.escape(estado)}</span>`;
}
