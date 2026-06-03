/* ============================================================
   Body Paint · Autenticación y sesión
   Registro (US-01), login, logout y gestión de domicilios.
   Los usuarios se persisten en MockAPI (recurso usuario).
   ============================================================ */

const Auth = (() => {

  /* ---------- Sesión ---------- */
  function getUsuario() {
    return Json.unpack(localStorage.getItem(SESION_KEY), null);
  }
  function setUsuario(u) {
    if (u) localStorage.setItem(SESION_KEY, Json.pack(u));
    else   localStorage.removeItem(SESION_KEY);
  }
  function estaLogueado() { return !!getUsuario(); }
  function tieneRol(rol)  { const u = getUsuario(); return u && u.rol === rol; }
  function logout() { setUsuario(null); }

  /* ---------- Validaciones ---------- */
  const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

  function validarDomicilio(d) {
    const faltan = [];
    if (!d.pais)      faltan.push("país");
    if (!d.provincia) faltan.push("provincia");
    if (!d.localidad) faltan.push("localidad");
    if (!d.calle)     faltan.push("calle");
    if (!d.numero)    faltan.push("número");
    return faltan;   // piso y depto son opcionales
  }

  /* ---------- Registro (US-01) ---------- */
  async function registrar({ nombre, apellido, email, password, domicilio }) {
    nombre = (nombre || "").trim();
    apellido = (apellido || "").trim();
    email = (email || "").trim().toLowerCase();

    if (!nombre || !apellido || !email || !password)
      throw new Error("Completá nombre, apellido, email y contraseña.");
    if (!emailValido(email))
      throw new Error("El email no tiene un formato válido (falta @ o dominio).");
    if (password.length < PASSWORD_MIN)
      throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);

    const faltan = validarDomicilio(domicilio || {});
    if (faltan.length)
      throw new Error("El domicilio de envío requiere: " + faltan.join(", ") + ".");

    // Unicidad de email
    const existentes = await Api.listar(API.USUARIOS);
    if (existentes.some((u) => (u.email || "").toLowerCase() === email))
      throw new Error("Ya existe una cuenta registrada con ese email.");

    const nuevo = {
      nombre, apellido, email,
      password,                         // demo: en producción se almacenaría hasheada
      rol: ROL.CLIENTE,
      domicilios: Json.pack([domicilio]),
    };
    const creado = await Api.crear(API.USUARIOS, nuevo);
    return creado;
  }

  /* ---------- Login ---------- */
  async function login(email, password) {
    email = (email || "").trim().toLowerCase();
    const usuarios = await Api.listar(API.USUARIOS);
    const u = usuarios.find(
      (x) => (x.email || "").toLowerCase() === email && x.password === password
    );
    if (!u) throw new Error("Email o contraseña incorrectos.");
    // Normalizamos domicilios a array en memoria
    u.domicilios = Json.unpack(u.domicilios, []);
    setUsuario(u);
    return u;
  }

  /* ---------- Domicilios del usuario actual ---------- */
  function domiciliosDe(u) { return Json.unpack(u && u.domicilios, []) || []; }

  async function agregarDomicilio(domicilio) {
    const u = getUsuario();
    if (!u) throw new Error("No hay sesión activa.");
    const lista = domiciliosDe(u);
    lista.push(domicilio);
    await Api.actualizar(API.USUARIOS, u.id, { ...u, domicilios: Json.pack(lista) });
    u.domicilios = lista;
    setUsuario(u);
    return lista;
  }

  return {
    getUsuario, setUsuario, estaLogueado, tieneRol, logout,
    emailValido, validarDomicilio, registrar, login,
    domiciliosDe, agregarDomicilio,
  };
})();
