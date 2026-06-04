/* ============================================================
   Body Paint · Aplicación (router + navegación + arranque)
   ============================================================ */

const App = (() => {

  /* Definición de rutas: render + roles permitidos (null = público) */
  const RUTAS = {
    "":            { fn: VistasCliente.landing,    roles: null },
    "catalogo":    { fn: VistasCliente.catalogo,   roles: [ROL.CLIENTE, ROL.VENDEDOR, ROL.ADMIN] },
    "carro":       { fn: VistasCliente.carro,      roles: [ROL.CLIENTE] },
    "checkout":    { fn: VistasCliente.checkout,   roles: [ROL.CLIENTE] },
    "mis-pedidos": { fn: VistasCliente.misPedidos, roles: [ROL.CLIENTE] },
    "login":       { fn: VistasCliente.login,      roles: null },
    "registro":    { fn: VistasCliente.registro,   roles: null },
    "vendedor":    { fn: VistasStaff.pedidos,      roles: [ROL.VENDEDOR] },
    "cupones":     { fn: VistasStaff.cupones,      roles: [ROL.VENDEDOR] },
    "reportes":    { fn: VistasStaff.reportes,     roles: [ROL.VENDEDOR, ROL.ADMIN] },
    "admin":       { fn: VistasStaff.admin,        roles: [ROL.ADMIN] },
  };

  function inicioPara(u) {
    if (!u) return "#";
    if (u.rol === ROL.ADMIN)    return "#admin";
    if (u.rol === ROL.VENDEDOR) return "#vendedor";
    return "#catalogo";
  }

  async function router() {
    const hash = location.hash.replace(/^#/, "");
    const ruta = RUTAS[hash] || RUTAS[""];
    const usuario = Auth.getUsuario();

    if (ruta.roles && (!usuario || !ruta.roles.includes(usuario.rol))) {
      if (!usuario) { UI.info("Iniciá sesión para continuar."); irA("login"); }
      else { UI.err("No tenés permisos para esa sección."); irA(inicioPara(usuario).slice(1)); }
      return;
    }
    refrescarNav();
    window.scrollTo(0, 0);
    try { await ruta.fn(); }
    catch (e) { console.error(e); document.getElementById("app").innerHTML =
        `<div class="error-box"><b>Ocurrió un error.</b><p>${UI.escape(e.message)}</p></div>`; }
    marcarActivo(hash);
  }

  function irA(hash) { location.hash = "#" + hash; }

  /* ---------- Navegación según rol ---------- */
  function refrescarNav() {
    const u = Auth.getUsuario();
    const nav = document.getElementById("nav-links");
    if (!nav) return;
    let links = [];

    if (!u) {
      links = [
        ["#login", "Iniciar sesión", "ghost"],
        ["#registro", "Registrarse", "solid"],
      ];
    } else if (u.rol === ROL.CLIENTE) {
      const n = Carro.cantidadTotal();
      links = [
        ["#catalogo", "Catálogo"],
        ["#carro", `Carro${n ? ` (${n})` : ""}`],
        ["#mis-pedidos", "Mis pedidos"],
        ["#logout", "Salir", "ghost"],
      ];
    } else if (u.rol === ROL.VENDEDOR) {
      links = [
        ["#vendedor", "Pedidos"],
        ["#cupones", "Cupones"],
        ["#reportes", "Reportes"],
        ["#logout", "Salir", "ghost"],
      ];
    } else if (u.rol === ROL.ADMIN) {
      links = [
        ["#admin", "Productos"],
        ["#reportes", "Reportes"],
        ["#logout", "Salir", "ghost"],
      ];
    }

    nav.innerHTML = links.map(([href, txt, estilo]) =>
        estilo ? `<a href="${href}" class="btn btn--${estilo} btn--sm">${txt}</a>`
            : `<a href="${href}" class="nav-link">${txt}</a>`).join("");

    const saludo = document.getElementById("nav-user");
    saludo.textContent = u ? `${u.nombre} · ${rolLabel(u.rol)}` : "";

    nav.querySelectorAll('a[href="#logout"]').forEach((a) => a.onclick = (e) => {
      e.preventDefault(); Auth.logout(); UI.info("Sesión cerrada."); refrescarNav(); irA("");
    });
  }

  const rolLabel = (r) => ({ [ROL.CLIENTE]:"Cliente", [ROL.VENDEDOR]:"Vendedor", [ROL.ADMIN]:"Admin" }[r] || r);

  function marcarActivo(hash) {
    document.querySelectorAll("#nav-links .nav-link").forEach((a) =>
        a.classList.toggle("nav-link--active", a.getAttribute("href") === "#" + hash));
  }

  /* ---------- Arranque ---------- */
  function init() {
    window.addEventListener("hashchange", router);
    document.getElementById("brand").onclick = (e) => { e.preventDefault(); irA(""); };
    refrescarNav();
    router();
  }

  return { init, router, refrescarNav, inicioPara, irA };
})();

document.addEventListener("DOMContentLoaded", App.init);