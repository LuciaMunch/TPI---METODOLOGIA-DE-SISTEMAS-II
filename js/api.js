/* ============================================================
   Body Paint · Capa de acceso a datos (MockAPI)
   CRUD genérico sobre fetch con manejo de errores.
   ============================================================ */

const Api = (() => {

  async function _req(url, opciones = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });
    if (!res.ok) {
      // MockAPI devuelve 404 con cuerpo "Not found" cuando no hay registros.
      if (res.status === 404) return [];
      const cuerpo = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} en ${url}. ${cuerpo}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  const listar = (recurso)        => _req(recurso);
  const obtener = (recurso, id)   => _req(`${recurso}/${id}`);
  const crear   = (recurso, data) => _req(recurso, { method: "POST", body: JSON.stringify(data) });
  const actualizar = (recurso, id, data) =>
                                     _req(`${recurso}/${id}`, { method: "PUT", body: JSON.stringify(data) });
  const eliminar = (recurso, id)  => _req(`${recurso}/${id}`, { method: "DELETE" });

  return { listar, obtener, crear, actualizar, eliminar };
})();

/* Helpers de (de)serialización para campos complejos guardados como
   string JSON en MockAPI (items, domicilios, clienteIds, etc.). */
const Json = {
  pack: (valor) => {
    try { return JSON.stringify(valor ?? null); } catch { return "null"; }
  },
  unpack: (texto, def = null) => {
    if (texto == null) return def;
    if (typeof texto !== "string") return texto;          // ya es objeto/array
    try { const v = JSON.parse(texto); return v == null ? def : v; }
    catch { return def; }
  },
};
