/* ============================================================
   Body Paint · Utilidades de interfaz
   Toasts, diálogos de confirmación, formato de moneda y fechas.
   ============================================================ */

const UI = (() => {

  /* ---------- Toasts ---------- */
  function toast(mensaje, tipo = "info", ms = 3200) {
    let cont = document.getElementById("toast-container");
    if (!cont) {
      cont = document.createElement("div");
      cont.id = "toast-container";
      document.body.appendChild(cont);
    }
    const t = document.createElement("div");
    t.className = `toast toast--${tipo}`;
    t.innerHTML = `<span class="toast__dot"></span><p>${escape(mensaje)}</p>`;
    cont.appendChild(t);
    requestAnimationFrame(() => t.classList.add("toast--show"));
    setTimeout(() => {
      t.classList.remove("toast--show");
      setTimeout(() => t.remove(), 280);
    }, ms);
  }
  const ok   = (m) => toast(m, "ok");
  const err  = (m) => toast(m, "err", 4200);
  const info = (m) => toast(m, "info");

  /* ---------- Confirmación (promesa) ---------- */
  function confirmar(titulo, texto = "", { okText = "Confirmar", cancelText = "Cancelar" } = {}) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "modal-back";
      back.innerHTML = `
        <div class="modal modal--confirm" role="dialog" aria-modal="true">
          <h3 class="modal__title">${escape(titulo)}</h3>
          ${texto ? `<p class="modal__text">${escape(texto)}</p>` : ""}
          <div class="modal__actions">
            <button class="btn btn--ghost" data-x="cancel">${escape(cancelText)}</button>
            <button class="btn btn--solid" data-x="ok">${escape(okText)}</button>
          </div>
        </div>`;
      document.body.appendChild(back);
      requestAnimationFrame(() => back.classList.add("modal-back--show"));
      const close = (val) => {
        back.classList.remove("modal-back--show");
        setTimeout(() => back.remove(), 220);
        resolve(val);
      };
      back.addEventListener("click", (e) => {
        if (e.target === back) close(false);
        const x = e.target.closest("[data-x]");
        if (!x) return;
        close(x.dataset.x === "ok");
      });
    });
  }

  /* ---------- Modal con contenido HTML arbitrario ---------- */
  function modal(html, { ancho = "" } = {}) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" style="${ancho ? `max-width:${ancho}` : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add("modal-back--show"));
    const cerrar = () => {
      back.classList.remove("modal-back--show");
      setTimeout(() => back.remove(), 220);
    };
    back.addEventListener("click", (e) => {
      if (e.target === back || e.target.closest("[data-cerrar]")) cerrar();
    });
    return { el: back.querySelector(".modal"), cerrar };
  }

  /* ---------- Formato ---------- */
  const fmtMoneda = (n) =>
    "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtFecha = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("es-AR") + " " +
           d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  return { toast, ok, err, info, confirmar, modal, fmtMoneda, fmtFecha, escape };
})();
