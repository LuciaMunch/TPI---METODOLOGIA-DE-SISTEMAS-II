/* ============================================================
   Body Paint · Configuración global
   ------------------------------------------------------------
   Dos proyectos de MockAPI:
     - Base A (producto, cupon)
     - Base B (usuario, pedido)
   ============================================================ */

const API_A = "https://69ef48a4112e1b968e244eba.mockapi.io/api/TPI";
const API_B = "https://6a1f4c03b79eec0d6cf0a3ee.mockapi.io/api/TPI";

const API = {
  PRODUCTOS: `${API_A}/producto`,
  CUPONES:   `${API_A}/cupon`,
  USUARIOS:  `${API_B}/usuario`,
  PEDIDOS:   `${API_B}/pedido`,
};

/* Roles del sistema */
const ROL = {
  CLIENTE:  "cliente",
  VENDEDOR: "vendedor",
  ADMIN:    "admin",
};

/* Estados del pedido */
const ESTADO = {
  PENDIENTE:  "Pendiente de entrega",
  CONFIRMADO: "Confirmado",
  EN_CAMINO:  "En camino",
  ENTREGADO:  "Entregado",
  CANCELADO:  "Cancelado",
};

/* Máquina de estados — transiciones que puede hacer el VENDEDOR.
   El cliente confirma la recepción (En camino -> Entregado) aparte. */
const TRANSICIONES_VENDEDOR = {
  [ESTADO.PENDIENTE]:  [ESTADO.CONFIRMADO, ESTADO.CANCELADO],
  [ESTADO.CONFIRMADO]: [ESTADO.EN_CAMINO],
  [ESTADO.EN_CAMINO]:  [],
  [ESTADO.ENTREGADO]:  [],
  [ESTADO.CANCELADO]:  [],
};

/* Clave de persistencia del carro en localStorage */
const CARRO_KEY    = "carro_bodypaint";
const SESION_KEY   = "bp_sesion";

/* Reglas de negocio */
const PASSWORD_MIN   = 8;
const IMG_MAX_BYTES  = 2 * 1024 * 1024;          // 2 MB
const IMG_TIPOS_OK   = ["image/png", "image/jpeg"];
const PORCENTAJE_UMBRAL_STOCK = 1.0;             // reporte: stock <= stockMinimo * 1.0

/* Imagen por defecto (placeholder) cuando un producto no tiene foto */
const PLACEHOLDER_IMG = "img/placeholder.svg";
