# Body Paint · Sistema de ventas online

E-commerce de productos para body painting (pinturas, pinceles, esponjas, glitter,
plantillas). SPA en JavaScript puro, sin frameworks ni build. Persiste los datos en
**MockAPI** y el carro en `localStorage`.

Proyecto académico — TPI Metodología de Sistemas II (2026). Cubre las US-01 a US-16
de los Sprints 1, 2 y 3.

---

## Cómo correr

No necesita servidor. **Abrí `index.html` con doble clic** (funciona desde `file://`).
Los scripts se cargan con etiquetas `<script>` clásicas, sin módulos ES.

> Si tu navegador bloquea algo por CORS al abrir desde `file://`, podés servir la
> carpeta con cualquier servidor estático, por ejemplo:
> `python3 -m http.server` y entrar a `http://localhost:8000`.

---

## Estructura

```
bodypaint/
├── index.html                  Punto de entrada + orden de carga de scripts
├── css/
│   └── styles.css              Estilos completos
├── img/                        Imágenes de ejemplo y placeholder.svg
└── js/
    ├── config.js               URLs de API, roles, estados, transiciones, constantes
    ├── ui.js                   Toasts, modales, confirm, formato de moneda/fecha
    ├── api.js                  CRUD genérico sobre fetch + helpers Json.pack/unpack
    ├── vistas-cliente.js       Vistas del cliente (catálogo, carro, checkout, mis pedidos)
    ├── main.js                 Router por hash, navegación por rol, datos de ejemplo
    └── classes/                Clases de dominio (una por entidad)
        ├── usuario.js          Registro, login, sesión, domicilios (US-01, US-04)
        ├── carro.js            Carro en localStorage (US-02)
        ├── producto.js         Productos, validaciones, imagen Base64 (US-06/07/10/11/12)
        ├── cupon.js            Cupones (US-13, US-14)
        ├── pedido.js           Pedidos y máquina de estados (US-03/05/08/09)
        └── paneladmin.js       Vistas de vendedor y admin (pedidos, cupones, reportes, ABM)
```

### Mapa de archivo → objeto global (namespace)

Los archivos no usan módulos ES; cada uno publica un objeto global y se
comunican entre sí a través de él. El orden de carga en `index.html` respeta esta
cadena de dependencias: infraestructura → clases de dominio → vistas → arranque.

| Archivo | Objeto global que expone |
|---------|--------------------------|
| `js/config.js` | `API`, `ROL`, `ESTADO`, `TRANSICIONES_VENDEDOR`, constantes |
| `js/ui.js` | `UI` |
| `js/api.js` | `Api`, `Json` |
| `js/classes/usuario.js` | `Auth` (entidad Usuario: registro, login, sesión, domicilios) |
| `js/classes/carro.js` | `Carro` |
| `js/classes/producto.js` | `Productos` |
| `js/classes/cupon.js` | `Cupones` |
| `js/classes/pedido.js` | `Pedidos` |
| `js/vistas-cliente.js` | `VistasCliente` (+ helper global `badgeEstado`) |
| `js/classes/paneladmin.js` | `VistasStaff` |
| `js/main.js` | `App` (router y arranque) |

> `vistas-cliente.js` se carga **antes** que `paneladmin.js` porque define la
> función global `badgeEstado` que ambas vistas reutilizan.

---

## Configuración de MockAPI

El sistema usa **dos proyectos** de MockAPI (las URLs ya están cargadas en
`js/config.js`; cambialas ahí si creás proyectos nuevos):

| Recurso  | Proyecto | URL |
|----------|----------|-----|
| producto | Base A   | `…/api/TPI/producto` |
| cupon    | Base A   | `…/api/TPI/cupon` |
| usuario  | Base B   | `…/api/TPI/usuario` |
| pedido   | Base B   | `…/api/TPI/pedido` |

> MockAPI crea `id` y `createdAt` automáticamente; no hace falta declararlos a mano,
> pero conviene dejarlos en el esquema. Los campos compuestos (listas y objetos) se
> guardan como **string JSON** para evitar problemas con el tipado de MockAPI; el
> código los serializa/deserializa con `Json.pack` / `Json.unpack`.

### Esquema de campos por recurso

**`producto`** (Base A)

| Campo        | Tipo     | Notas |
|--------------|----------|-------|
| id           | ObjectID | Generado por MockAPI |
| nombre       | String   | Obligatorio |
| codigo       | String   | Único en el sistema (US-07) |
| marca        | String   | Obligatorio |
| color        | String   | Parte de la identidad: mismo nombre + color = duplicado |
| precio       | Number   | > 0 |
| stock        | Number   | Entero ≥ 0 (al crear, > 0) |
| stockMinimo  | Number   | Entero ≥ 0; dispara la alerta visual (US-12) |
| imagen       | String   | Ruta (`img/...`) o dataURL Base64 (US-10); vacío = placeholder |
| activo       | Boolean  | `false` = baja lógica (US-06) |
| createdAt    | Date     | Generado por MockAPI |

**`cupon`** (Base A)

| Campo      | Tipo     | Notas |
|------------|----------|-------|
| id         | ObjectID | Generado por MockAPI |
| codigo     | String   | Único, autogenerado (US-13) |
| tipo       | String   | `"porcentaje"` o `"monto"` |
| valor      | Number   | > 0 (porcentaje o monto fijo) |
| desde      | String   | Fecha ISO de inicio de vigencia |
| hasta      | String   | Fecha ISO de fin de vigencia |
| clienteIds | String   | JSON array de ids de cliente alcanzados |
| usado      | Boolean  | `true` cuando se aplica a un pedido (US-14) |
| createdAt  | Date     | Generado por MockAPI |

**`usuario`** (Base B)

| Campo      | Tipo     | Notas |
|------------|----------|-------|
| id         | ObjectID | Generado por MockAPI |
| nombre     | String   | Obligatorio |
| apellido   | String   | Obligatorio |
| email      | String   | Único, con formato válido (US-01) |
| password   | String   | Mínimo 8 caracteres (texto plano: solo demo académica) |
| rol        | String   | `"cliente"`, `"vendedor"` o `"admin"` |
| domicilios | String   | JSON array de objetos domicilio (ver abajo) |
| createdAt  | Date     | Generado por MockAPI |

Objeto **domicilio** (dentro del array `domicilios`):
`{ pais, provincia, localidad, calle, numero, piso?, depto? }`
(`piso` y `depto` opcionales).

**`pedido`** (Base B)

| Campo         | Tipo     | Notas |
|---------------|----------|-------|
| id            | ObjectID | Generado por MockAPI |
| numero        | String   | Identificador legible (`P-########`) |
| clienteId     | String   | Id del usuario que compró |
| clienteNombre | String   | Nombre y apellido (snapshot) |
| clienteEmail  | String   | Email del cliente (snapshot) |
| fecha         | String   | Fecha ISO de confirmación |
| items         | String   | JSON array `{ id, nombre, precio, cantidad }` |
| domicilio     | String   | JSON del domicilio de envío |
| formaPago     | String   | `"Efectivo contra entrega"` |
| estado        | String   | Ver máquina de estados |
| subtotal      | Number   | Suma de items sin descuento |
| descuento     | Number   | Monto descontado por cupón |
| total         | Number   | `subtotal - descuento` |
| cuponCodigo   | String   | Código del cupón aplicado (o vacío) |
| createdAt     | Date     | Generado por MockAPI |

---

## Usuarios de prueba (roles)

El registro desde la app crea siempre usuarios con rol **cliente**. Para tener un
**vendedor** o un **admin**:

1. Registrá un usuario normal desde la pantalla de registro.
2. Entrá al panel de MockAPI, recurso `usuario`, y cambiá el campo `rol` de ese
   usuario a `"vendedor"` o `"admin"`.
3. Iniciá sesión con ese email/contraseña. La navegación se ajusta sola al rol.

| Rol      | Accede a |
|----------|----------|
| cliente  | Catálogo, carro, checkout, mis pedidos |
| vendedor | Pedidos (cambio de estado), cupones, reportes de ventas |
| admin    | ABM de productos, stock mínimo, reporte de stock crítico |

---

## Máquina de estados del pedido

```
Pendiente de entrega ──(vendedor)──► Confirmado ──(vendedor)──► En camino ──(cliente)──► Entregado
        │
        └────────(cliente/vendedor)──► Cancelado
```

- Solo se puede **cancelar** desde *Pendiente de entrega*.
- *Entregado* y *Cancelado* son estados finales.
- El **cliente** confirma la recepción (*En camino → Entregado*), acción irreversible
  y solo sobre sus propios pedidos.

### Regla de stock (decisión de diseño)

El stock se **descuenta una sola vez**, al confirmar el pedido el cliente en el
checkout (US-03). Si un pedido *Pendiente de entrega* se **cancela**, el stock se
**repone**. El paso *Pendiente → Confirmado* del vendedor **no** vuelve a descontar.

Esto resuelve la contradicción entre US-03 (descuenta al confirmar el cliente) y US-08
(descuenta al pasar a *Confirmado*): aplicar ambas produciría un doble descuento, que
el propio análisis de brechas del documento marcaba como riesgo de inconsistencia de
inventario. La regla queda documentada en `js/orders.js`.

---

## Datos de ejemplo

En el panel de admin (rol admin) hay un botón **"Cargar ejemplo"** que da de alta un
set de productos de demostración (incluye uno con stock bajo para ver la alerta roja).
Útil para probar el sistema con catálogo vacío.

---

## Cobertura de User Stories

US-01 registro · US-02 carro · US-03 checkout efectivo · US-04 domicilios ·
US-05 panel de pedidos · US-06 catálogo admin + búsqueda + alerta de stock ·
US-07 alta de producto · US-08 estados por vendedor · US-09 recepción por cliente ·
US-10 carga de imagen · US-11 edición · US-12 stock mínimo · US-13 cupones ·
US-14 aplicar cupón · US-15 reporte de stock · US-16 reporte de más vendidos.
