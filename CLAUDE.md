# CLAUDE.md — JSM Flow

> Plataforma SaaS de operación para **JSM**, agencia de **promocionales y eventos**.
> Gestiona el ciclo completo: **Cotización → Validación → Confirmación → Proyecto → Compra → Pago → Facturación → Cobranza → Cierre**, con **agentes de IA** que asisten en cada etapa.
>
> Este archivo es el **contrato de trabajo** del proyecto. Antes de tocar código, léelo. Al cerrar cada fase, actualízalo (ver §12).

---

## 1. Contexto de negocio

JSM es una agencia que vende **promocionales** (~25 ítems base) y organiza **eventos** (~25 ítems base). Ejemplos reales de trabajos:

- Cotizaciones de promocionales (promoción con Amazon, fiestas infantiles).
- Flete de transportación para evento de visita médica.
- Cotización en Excel para cliente.
- Promotoría a 6 meses con personal (supervisor / promotor / coordinador) por X días.

**Comunicación con clientes:** WhatsApp (~60%) + Email (~40%). En el producto: Email primero (Fase 1–2), WhatsApp API oficial después (Fase 4).

**Problema actual:** el flujo vive en Excel, correos y mensajes sueltos. No hay trazabilidad, consecutivos confiables, ni control de pagos/cobranza. Se construye **desde cero**.

### 1.1 Flujo operativo real (swimlane JSM)

Origen: `inputs/flujo-trabajo.pdf` + `inputs/flujo-automatizacion.html`. Carriles y pasos:

| Carril | Pasos |
|---|---|
| **Ejecutivo** | INICIO (cliente/fecha) → ① Creación de Tarea (auto) → Requisición (oferta + producto/servicio) |
| **Operaciones** (Hector / Nivia / Ricardo) | Pull de Proveedores ★ (Amazon, DF, Sorteo, KFC) → Tiempo × días → Pago/Dispersión → Sube a Portal del Cliente (notifica Contabilidad) |
| **Compras / Finanzas** | ② Master de Proyectos ★ (Ejecutivo de Cuenta + Cóvac, Hijo/RIB, Validación #, asignar # al PDF final) → Resguardo/Cierre (¿cliente confirma?) → PO CONFIRMA / CONFORMS → ¿Mueve? ★ (cambian fechas/montos) → Entregas → Liquidación (+anticipo/traspaso, −depósito, −entrega $) |
| **Contabilidad** | Recepción Contable → JSM Factura → ④ Facturación de Proveedores → ⑤ Track ID y Fechas ★★ → FIN (Control de Flujo ★★) |

### 1.2 Flujo de aprobación (narrado en `inputs/init.md`)

1. **Agente inicial** genera **consecutivo** para cotizaciones con **precios públicos generales**.
2. Se **notifica al equipo**.
3. El **Owner de la cuenta** (Ejecutivo) genera la cotización **a costo** (como empresa).
4. Va a **Admin**, que **valida** que los precios hagan sentido.
5. Admin entrega el **consecutivo** al usuario para enviarlo al **cliente**.
6. Se genera la **orden de compra**.
7. Va a **Admin** → **Contabilidad**.
8. Autorizado, se manda al usuario con **comprobante de pago para proveedores**.
9. Se genera **factura para el portal**.
10. El usuario manda al **proveedor** y **da seguimiento**.
11. **Notificaciones de cobranza**.

### 1.3 Qué crear (★) vs qué ya existe

- **A crear (★):** Pull de Proveedores, Master de Proyectos, Resguardo/Cierre con cliente, lógica "¿Mueve?" (cambio de fechas/montos), Track ID y Fechas.
- **Ya existe en JSM:** Portal del cliente, "JSM Factura" (sistema de facturación/timbrado), proceso base de liquidación. → **El SaaS NO timbra CFDI**; se **integra** registrando folio + XML/PDF del sistema actual.

### 1.4 Glosario — términos JSM `[POR CONFIRMAR con el cliente]`

Términos del swimlane que aún no tienen significado verificado. **No inventar lógica sobre ellos hasta confirmar:**

- **Cóvac** — ¿co-validador / contraparte de cuenta?
- **Hijo / RIB** — ¿sub-proyecto / referencia interna bancaria?
- **CONFORMS** vs **PO CONFIRMA** — estados de confirmación del cliente (sí/no).
- **Fix de palosos** — ¿corrección de facturas/registros con error?
- **a Cop. Pep** — ¿destino contable? (¿"copia a..."?)
- **JSM o Robos** — ¿razones sociales / entidades emisoras?
- **Cotizop** — ¿herramienta/registro de cotización en contabilidad?

> Acción: levantar estas dudas con JSM en la Fase 1. Mientras tanto se modelan como campos/estados configurables, no como reglas duras.

---

## 2. Objetivo del producto

Un **SaaS multi-rol, multi-tenant y de alto nivel visual** que reemplace el Excel/correo con:

- **CRM** de clientes y contactos.
- **Catálogo** de productos/servicios con doble precio (**costo** interno y **público**).
- **Cotizaciones** con **consecutivo automático**, **versionado/modificaciones** y export **PDF/Excel**.
- **Flujo de aprobación** Ejecutivo → Admin → Cliente con estados auditables.
- **Master de Proyectos** + **tareas tipo Trello (Kanban)** + **trazabilidad** total (Track ID y fechas).
- **Pull de Proveedores** con búsqueda por tiempo/costo.
- **Órdenes de compra, comprobantes de pago, registro de facturas** y **cobranza**.
- **Forms** (solicitud de pago/requisición) que sí funcionen.
- **Dashboards** de tareas, finanzas y trazabilidad; cruces entre DB.
- **Agentes de IA** que automatizan los nodos marcados como candidatos.

---

## 3. Stack técnico (confirmado)

| Capa | Tecnología |
|---|---|
| Frontend | **Next.js 15** (App Router, RSC) + **TypeScript** + **Tailwind CSS** + **shadcn/ui** |
| Backend | Next.js API routes / Server Actions |
| DB / Auth / Storage | **Supabase** (Postgres + Row Level Security + Auth + Storage) |
| Agentes IA | **LangGraph.js** + **OpenAI** (GPT API) |
| Jobs / colas / cron | Supabase scheduled functions + **Trigger.dev** (o cron) para recordatorios y notificaciones |
| Email (Fase 1+) | **Resend** (o SES) |
| WhatsApp (Fase 4+) | **WhatsApp Business Cloud API** (Meta) o Twilio |
| Export | PDF (`@react-pdf/renderer` o Puppeteer) · Excel (`exceljs`) |
| Validación | **Zod** (esquemas compartidos cliente/servidor) |
| Estado servidor | TanStack Query donde aplique; RSC + Server Actions por defecto |
| Tests | Vitest (unit) + Playwright (e2e) |
| Deploy | Vercel (app) + Supabase (datos) |

**Principios:** todo en TypeScript end-to-end; Zod como fuente de verdad de tipos; RLS por organización en **toda** tabla; Server Actions sobre endpoints REST cuando sea posible; UI con design system consistente.

---

## 4. Arquitectura

```
proyecto_agencia/
├── CLAUDE.md                  # este archivo (plan vivo)
├── inputs/                    # material fuente del cliente (no tocar)
├── app/                       # Next.js App Router
│   ├── (auth)/                # login, registro, recuperación
│   ├── (app)/                 # área autenticada (layout con rol)
│   │   ├── dashboard/
│   │   ├── crm/               # clientes, contactos
│   │   ├── catalogo/          # productos/servicios, proveedores
│   │   ├── cotizaciones/      # crear, versionar, validar, exportar
│   │   ├── proyectos/         # master de proyectos + kanban
│   │   ├── compras/           # PO, pull proveedores
│   │   ├── finanzas/          # pagos, liquidación, cobranza
│   │   └── admin/             # config, usuarios, consecutivos
│   ├── (portal)/              # portal externo del cliente
│   └── api/                   # webhooks (email/WA), agentes
├── lib/
│   ├── supabase/              # clients (server/browser), tipos generados
│   ├── agents/                # grafos LangGraph + tools
│   ├── schemas/               # Zod (fuente de tipos)
│   ├── auth/                  # RBAC, guards
│   └── services/              # lógica de dominio (state machine, consecutivos)
├── components/                # UI (shadcn + propios)
├── supabase/
│   ├── migrations/            # SQL versionado
│   └── seed.sql               # datos demo (catálogo, roles)
└── tests/
```

### 4.1 Roles (RBAC)

| Rol | Capacidades |
|---|---|
| `super_admin` | Configuración de la organización, usuarios, series de consecutivos. |
| `ejecutivo` | Owner de cuenta: crea cotizaciones a costo, gestiona sus clientes/proyectos. |
| `admin` | Valida precios, autoriza pagos, asigna consecutivos. |
| `operaciones` | Pull de proveedores, tiempos, dispersión (Hector/Nivia/Ricardo). |
| `compras_finanzas` | Master de proyectos, PO, liquidación. |
| `contabilidad` | Recepción contable, registro de facturas, Track ID. |
| `cliente` | Portal externo: ve cotización, confirma, ve estatus. |

RBAC se aplica en **dos capas**: RLS en Postgres (defensa real) + guards en UI/Server Actions (UX).

### 4.2 Máquina de estados de la Cotización/Proyecto

```
borrador            (Ejecutivo arma a costo)
  → en_validacion   (enviada a Admin)
  → validada        (Admin OK → asigna CONSECUTIVO)   | rechazada → borrador
  → enviada_cliente (Admin/Ejecutivo envía PDF)
  → confirmada      (cliente acepta = PO CONFIRMA)    | en_negociacion (¿Mueve? → nueva versión)
  → proyecto_activo (se crea Master de Proyecto + tareas)
  → orden_compra    (PO generada)
  → autorizacion    (Admin + Contabilidad)
  → pago_proveedor  (comprobante emitido)
  → facturado       (registro de factura/folio en portal)
  → seguimiento     (usuario con proveedor)
  → cobranza        (notificaciones de cobro)
  → cerrada
```

Transiciones centralizadas en `lib/services/state-machine.ts`. Cada transición escribe en `bitacora` (Track ID, actor, timestamp) → trazabilidad §1.3.

### 4.3 Modelo de datos (núcleo)

Toda tabla lleva `org_id` (multi-tenant) + RLS. Entidades:

- `organizations`, `profiles` (usuario + rol + org)
- `clientes`, `contactos`
- `proveedores` (Amazon, DF, Sorteo, KFC…), `proveedor_items`
- `productos_servicios` (tipo: promocional|evento|servicio; `costo`, `precio_publico`)
- `cotizaciones` (consecutivo, version, estado, owner_id, cliente_id)
- `cotizacion_items` (producto, cantidad, costo, precio, margen)
- `cotizacion_versiones` (historial de modificaciones — "¿Mueve?")
- `consecutivos` (series por tipo/año, generación atómica)
- `proyectos` (creado al confirmar; vincula cotización)
- `tareas` (kanban: columna, orden, responsable, fechas)
- `ordenes_compra`, `solicitudes_pago`, `pagos` (anticipo|dispersión|liquidación), `comprobantes`
- `facturas` (folio + xml_url + pdf_url; integración, sin timbrar)
- `documentos` (Storage)
- `notificaciones`, `bitacora` (auditoría/Track ID), `audit_log`

> El detalle de columnas vive en `supabase/migrations/`. El modelo evoluciona por fase; cada cambio = nueva migración.

### 4.4 Agentes de IA (LangGraph.js)

| Agente | Función | Fase |
|---|---|---|
| **Cotizador** | Genera consecutivo, arma cotización desde catálogo a precio público, sugiere márgenes, redacta y exporta PDF/Excel. | 1 |
| **Notificador** | Avisa al equipo y al cliente en cada transición de estado (email Fase 1, WA Fase 4). | 1–2 |
| **Pull de Proveedores** | Recomienda proveedores por criterio tiempo/costo a partir del catálogo y requisición. | 3 |
| **Cobranza** | Recordatorios de pago/seguimiento según vencimientos. | 4 |
| **Trazabilidad / Track ID** | Registra IDs y timestamps al cerrar PO; vigila el "Control de Flujo". | 4 |

Cada agente: grafo en `lib/agents/<nombre>/`, con tools tipadas (Zod) que llaman a `lib/services`. **Los agentes nunca escriben DB directo**: pasan por servicios de dominio que aplican la state machine y RLS.

---

## 5. Fases de desarrollo (con gates de validación)

> Metodología: cada fase termina en un **gate de validación** + un **stress test**. No se avanza de fase sin pasar el gate. Al cerrar, actualizar §12.

### Fase 0 — Fundaciones
- Scaffold Next.js 15 + TS + Tailwind + shadcn/ui.
- Supabase: proyecto, migraciones base, `organizations`/`profiles`, RLS, Auth.
- RBAC (roles §4.1), guards, layout autenticado con navegación por rol.
- Design system: tokens, tema, componentes base, branding JSM.
- Zod base, clientes Supabase (server/browser), CI (lint + typecheck + test).
- **Gate:** login multi-rol; un usuario solo ve datos de su `org`; RLS verificada con test; CI verde.

### Fase 1 — CRM + Catálogo + Cotizaciones (núcleo de valor)
- CRM: clientes y contactos (alta/edición/búsqueda).
- Catálogo: productos/servicios con costo y precio público; proveedores base.
- Cotizaciones: alta con **consecutivo atómico**, ítems, márgenes, **versionado**, export **PDF + Excel**.
- Flujo de aprobación **Ejecutivo → Admin → Cliente** (estados §4.2 hasta `enviada_cliente`).
- **Agente Cotizador** (v1) + **Notificador** por email.
- **Gate:** crear cotización end-to-end, consecutivo único bajo concurrencia, validación de Admin, export PDF/Excel correcto, email al enviar.
- **Stress test:** 100 cotizaciones concurrentes → 0 consecutivos duplicados.

### Fase 2 — Master de Proyectos + Tareas (Kanban) + Portal cliente
- Al **confirmar** la cotización → crea `proyecto` + tareas iniciales.
- Kanban tipo Trello (drag&drop, columnas, responsables, fechas).
- **Trazabilidad** completa: `bitacora` por transición; vista de timeline.
- **Portal del cliente**: ver cotización, **confirmar/pedir cambios** ("¿Mueve?" → nueva versión).
- **Gate:** confirmación del cliente genera proyecto+tareas; cambios crean versión; timeline muestra todo el historial.
- **Stress test:** mover 500 tareas en Kanban sin pérdida de orden ni condiciones de carrera.

### Fase 3 — Compras + Finanzas
- **Pull de Proveedores** (búsqueda por tiempo/costo) + **Agente Pull**.
- **Órdenes de compra** (PO) ligadas a proyecto.
- **Forms** de solicitud de pago/requisición (los que "no funcionan" hoy).
- **Pagos**: anticipos, dispersión por tiempo×días, liquidación; comprobantes.
- **Registro de facturas** (folio + XML/PDF, integración con sistema JSM; sin timbrar).
- **Cobranza** básica.
- **Gate:** flujo PO → autorización → comprobante → registro de factura → cierre, todo auditado.
- **Stress test:** integridad financiera — suma de pagos/anticipos/liquidación cuadra en 1,000 operaciones.

### Fase 4 — Agentes avanzados + WhatsApp + Dashboards
- **WhatsApp API oficial** (plantillas + webhooks); unificar notificaciones email+WA.
- **Dashboards**: tareas, finanzas, trazabilidad; **cruces entre DB** (cliente×proyecto×proveedor×pago).
- **Agente Cobranza** + **Agente Track ID/Control de Flujo**.
- **Gate:** notificación WA real entregada; dashboards con métricas reales; cobranza dispara recordatorios.

### Fase 5 — Hardening + Deploy
- Seguridad (auditoría RLS, rate limit, secretos), performance, accesibilidad.
- Cobertura de tests, e2e críticos, observabilidad.
- Deploy productivo (Vercel + Supabase), backups, runbook.
- **Gate:** security review limpio; e2e de los 5 flujos críticos en verde; deploy reproducible.

---

## 6. Convenciones de código

- **TypeScript estricto**; sin `any` sin justificar.
- **Zod** define el esquema → tipos se derivan (`z.infer`). Validar en todo borde (form, action, webhook).
- **Server Actions** por defecto; API routes solo para webhooks/agentes.
- **Nombres de dominio en español** (cotizacion, proveedor, liquidacion) para alinear con el negocio; código/infra en inglés (helpers, hooks).
- **RLS obligatoria** en cada tabla nueva; ninguna query confía solo en el guard de UI.
- **Migraciones versionadas** en `supabase/migrations/` (nunca editar el esquema a mano en prod).
- Componentes UI pequeños y composables; lógica de dominio en `lib/services`, no en componentes.
- Comentarios escasos y en español, solo donde el "por qué" no es obvio.

## 7. Comandos

```bash
npm run dev            # desarrollo
npm run build          # build producción
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # vitest
npm run test:e2e       # playwright
npx supabase start     # supabase local
npx supabase migration new <nombre>
npx supabase db reset  # aplica migraciones + seed
npm run gen:types      # genera tipos TS desde el esquema Supabase
```

## 8. Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # solo servidor
OPENAI_API_KEY=
RESEND_API_KEY=                   # Fase 1+
NOTIFY_ADMIN_EMAIL=               # destino de "cotización por validar"
NOTIFY_CONTABILIDAD_EMAIL=        # Fase 8: avisos a Contabilidad (sube a portal / PO CONFIRMA)
WHATSAPP_TOKEN=                   # Fase 4+
WHATSAPP_PHONE_ID=                # Fase 4+
```

## 9. Seguridad

- RLS por `org_id` en todas las tablas; `service_role` solo en servidor, nunca expuesto.
- Portal del cliente con acceso restringido por token/rol `cliente`, sin ver datos internos (costos).
- **Nunca** exponer `costo` al rol `cliente` (solo `precio_publico`).
- Validación de entrada con Zod en cada Server Action/webhook.
- Secretos solo en variables de entorno; sin claves en el repo.

## 10. Riesgos y decisiones abiertas

- Glosario JSM sin confirmar (§1.4) — bloquea reglas de Contabilidad/Compras finas.
- "JSM Factura" / portal existentes: falta su API/forma de integración real.
- Reglas de **dispersión "Tiempo × días"** y **liquidación** requieren ejemplos concretos del cliente.
- WhatsApp oficial requiere número verificado y aprobación de plantillas (lead time Meta).

## 13. Capa visual — Dashboards dinámicos (Fase 6, planeada)

> Objetivo: convertir JSM Flow en una **consola de operación muy visual y dinámica**, con gráficas y micro-animaciones. NO es una landing de marketing; es un *control room* B2B para decidir de un vistazo.

### 13.1 Dirección de diseño (anti-defaults)
Se evitan los tres clichés de IA (crema+serif+terracota; negro+verde ácido; broadsheet) y el dashboard admin genérico (4 tarjetas + 1 línea + tabla con librería por defecto). Se mantiene la identidad **índigo/violeta** ya existente y se eleva con datos.

- **Color (paleta de datos):** base `#F7F8FA` / texto `#0D1117`; primario índigo `#2A4BD7`; acento violeta `#7C3AED`; secuencia de series → índigo `#3056D3`, violeta `#7C3AED`, teal `#0EA5A4`, ámbar `#F5B335`, coral `#E4513B`, slate `#64748B`. Semánticos: éxito `#10B981`, alerta `#F59E0B`, peligro `#EF4444`.
- **Tipografía (firma):** números con `font-variant-numeric: tabular-nums` + tracking ajustado en KPIs grandes (sensación "tablero de control"); display sans en negrita apretada, sin fuentes web nuevas (rendimiento).
- **Layout:** **bento grid** (tiles de tamaños variados) en vez de la cuadrícula uniforme actual.
- **Elemento firma:** **"Flujo JSM"** — cinta horizontal del pipeline real del cliente (Cotización → Validación → Confirmada → Proyecto → OC → Pago → Cobranza) con conteos, montos y **% de conversión** entre etapas; relleno animado al cargar. Toma directamente el swimlane que entregó el cliente (`inputs/`).

### 13.2 Decisión técnica
Gráficas **SVG propias** (kit ligero en `components/charts/`), no una librería con look de plantilla y sin riesgo de compatibilidad con React 19. Animaciones con CSS/transición + `prefers-reduced-motion` respetado. Datos calculados en **servicios puros** (testeables) y pasados como props a componentes cliente.

### 13.3 Kit de componentes (`components/charts/`)
- `count-up.tsx` — número con animación de conteo (tabular-nums).
- `sparkline.tsx` — mini-tendencia en KPIs.
- `area-chart.tsx` — serie temporal (ingresos por mes) con degradado.
- `bar-chart.tsx` — barras horizontales (top clientes, aging de cobranza).
- `donut.tsx` — dona con leyenda (cobranza: por cobrar/cobrado/vencido).
- `progress-ring.tsx` — anillo de avance (saldo OC, tareas de proyecto).
- `flujo-ribbon.tsx` — **firma** (pipeline JSM).

### 13.4 Agregaciones de datos (en `lib/services/dashboard.ts`, puras)
- `serieMensualIngresos(cotizaciones)` → `[{ mes, monto }]` (confirmadas por mes).
- `embudoFlujo(...)` → etapas con conteo y conversión (alimenta la cinta).
- `agingCobranza(facturas, hoy)` → buckets (corriente / 1-30 / 31-60 / 60+).
- Reusa `resumenCobranza`, `construirDashboard`.

### 13.5 Dónde se aplica
- **Dashboard**: KPIs con count-up + sparkline → cinta **Flujo JSM** → área de ingresos → dona de cobranza → barras top clientes → panel de Control de Flujo (restyled).
- **Finanzas**: dona de cobranza + barras de aging.
- **Proyectos**: anillo de avance (tareas hechas/total) en lista y detalle.
- **Compras**: anillo de saldo (pagado/total) en el detalle de OC.

### 13.6 Gate de Fase 6
Tests puros de las nuevas agregaciones; `typecheck`/`lint`/`build`/`vitest` verdes; **screenshot** del dashboard renderizado (Playwright) para verificación visual; e2e existentes siguen en verde; accesibilidad (focus visible, motion reducido).

## 14. Agentes y chatbots por sección (Fase 7, planeada)

> Objetivo: que **cada sección tenga un copiloto conversacional** que entienda lenguaje natural, **consulte y ejecute acciones reales** (con aprobación humana en lo irreversible), recuerde la conversación y respete RLS/roles. Más un **Copiloto global** que orquesta varias secciones.

### 14.1 Arquitectura en capas (decisión por el árbol del ecosistema LangChain)
Stack ya presente: **LangChain → LangGraph → Deep Agents** (todo en TypeScript). Regla de elección:

| Necesidad | Capa | API |
|---|---|---|
| Extracción / 1 llamada al modelo (sin loop) | LangChain directo | `withStructuredOutput` (ya usado por Cotizador/Pull/Cobranza) |
| Chatbot de **una sección** con set fijo de herramientas | **LangChain** | `createAgent({ model, tools, middleware, checkpointer })` |
| Flujo de control determinista a medida | LangGraph | `StateGraph` |
| Copiloto **multi-sección** con planeación, memoria y delegación | **Deep Agents** | `createDeepAgent({ subagents, ... })` |

Diseño: **Deep Agent (Copiloto JSM) → agentes de sección como `subagents` → herramientas → `lib/services`**. Los 3 agentes actuales (Cotizador, Pull, Cobranza) se conservan y se **exponen como herramientas/subagentes** (no se reescriben).

### 14.2 Mapa por sección
| Sección | Copiloto | Capa | Lo que hace | Escrituras (HITL) | Rol |
|---|---|---|---|---|---|
| **Dashboard** | Analista | LangChain (solo lectura) | Responde sobre KPIs/flujo ("¿cuánto vencido tengo?", "cotizaciones sin respuesta >5 días") | — (sin escritura) | todos |
| **CRM** | Asistente de clientes | LangChain | Alta/edición de clientes y contactos, resume historial del cliente | sí | crm.gestionar |
| **Catálogo** | Asistente de catálogo | LangChain | Alta de productos/proveedores, sugiere precio público desde costo+margen, normaliza unidades | sí | catalogo.gestionar |
| **Cotizaciones** | Chatbot de cotización | LangChain (usa **Cotizador** como tool) | Construye/ajusta partidas en lenguaje natural ("+10% margen"), explica, dispara transiciones | sí (enviar/validar) | cotizacion.* |
| **Proyectos** | Coordinador | LangChain | Genera plan de tareas desde el brief, crea/mueve/asigna tareas, resume riesgos | mover: no · crear/cerrar: sí | proyecto.gestionar |
| **Compras** | Asistente de compras | LangChain (usa **Pull** como tool) | Arma OC desde requisición, elige proveedor, prepara solicitudes de pago | sí | compras.gestionar |
| **Finanzas** | Asistente de cobranza | LangChain (usa **Cobranza** como tool) | Redacta/agenda recordatorios, concilia pagos vs OC, autoriza/rechaza solicitudes | sí (autorizar = HITL fuerte) | finanzas.* / pago.autorizar |
| **Portal cliente** | Chat del cliente (externo) | LangChain (scoped, barato) | Resuelve dudas de **su** cotización (precio público, alcance, tiempos — **nunca costos**); confirma o pide cambios conversando | confirmar/pedir-cambios con confirmación | público por token |
| **Admin** | **Copiloto JSM** | **Deep Agents** | Orquesta flujos multi-sección ("cotiza esto, crea el proyecto y agenda cobranza"), planea y delega | hereda HITL de subagentes | super_admin/admin |

### 14.3 Memoria y persistencia (LangGraph)
- **Corto plazo (checkpointer):** `PostgresSaver` sobre la **misma DB Supabase** (reusa `DB_URL`); `thread_id` = id de conversación → el chat sobrevive recargas y reinicios. (En dev, `MemorySaver`.)
- **Largo plazo (Store):** memoria por `(org_id, user_id)` para preferencias y hechos aprendidos (p.ej. "este cliente factura a 30 días"). `runtime.store` dentro de tools.
- Tabla ligera `conversaciones` (org_id, user_id, seccion, titulo, thread_id, created_at) para **listar** chats en la UI; el contenido lo gestionan las tablas del checkpointer.

### 14.4 Herramientas RLS-aware (clave de seguridad)
- **Tool factory** que recibe el **cliente Supabase del usuario autenticado** (no el `service_role`) → toda lectura/escritura del agente **pasa por RLS** y por la **misma `lib/services`** y máquina de estados que la UI. El agente **nunca** puede ver/tocar datos de otra organización ni saltarse un estado.
- Cada tool valida **capacidad de rol** (reusa `lib/auth/rbac`) y registra en **`bitacora`** (toda acción del agente queda auditada igual que la de un humano, con `actor = agente:<seccion>`).
- Tools tipadas con **Zod** (mismos esquemas de `lib/schemas`).

### 14.5 Aprobación humana y gobernanza (HITL)
- `humanInTheLoopMiddleware({ interruptOn: { crear_cotizacion: {...}, autorizar_pago: {...}, enviar_a_cliente: {...} } })` con decisiones **approve / edit / reject**; requiere checkpointer + thread_id. Resume con `Command({ resume: { decisions } })`.
- Política por riesgo: **lectura** sin HITL; **escritura reversible** (mover tarea) sin HITL o "approve" simple; **escritura irreversible/financiera** (validar, enviar al cliente, autorizar pago, registrar factura) **siempre** approve/edit/reject.
- Límites: `recursionLimit`, tope de tokens, **model tiering** (gpt-4o-mini por defecto; escalar sólo si hace falta). El bot del portal usa prompts con límites duros (sin costos, solo su cotización).

### 14.6 Copiloto global (Deep Agents)
`createDeepAgent` con los agentes de sección como **`subagents`** (delegación vía herramienta `task`), planeación (TodoList), memoria (Store) y HITL heredado. Ejemplo de objetivo: *"Para el evento médico: arma cotización a costo, mándala a validación y, al confirmarse, crea el proyecto y programa la cobranza a 30 días."*

### 14.7 Portal del cliente (bot externo acotado)
- Acceso por **token** (igual que el portal actual), **sin sesión**; modelo barato; **solo lectura de su cotización** + acciones confirmar/pedir-cambios (que llaman a los servicios del portal existentes). Reglas duras en el system prompt: nunca revelar costos/márgenes ni datos de otros clientes. Rate-limit reusando `lib/security`.

### 14.8 Observabilidad y evaluación
- **LangSmith** (`LANGSMITH_API_KEY`, `LANGSMITH_TRACING=true`, `LANGSMITH_PROJECT`) para trazar cada corrida.
- **Evals** de LangSmith sobre los flujos críticos (cotización correcta, no fuga de costos en portal, no cruce de org) antes de habilitar escrituras en producción.

### 14.9 Entrega al frontend (streaming + UI)
- Endpoint **route handler** `/api/agents/chat` con **streaming** (los Server Actions no transmiten bien); la UI consume tokens en vivo. Componente de **chat lateral reutilizable** por sección (recibe `seccion` + `thread_id`), con render de interrupciones HITL (tarjeta approve/edit/reject).

### 14.10 Dependencias nuevas
`langchain` (`createAgent`), `@langchain/langgraph-checkpoint-postgres` (PostgresSaver), `deepagents`. (Ya están `@langchain/langgraph`, `@langchain/openai`, `@langchain/core`.) Todo corre **server-side** (route handlers, runtime Node).

### 14.11 Sub-fases y gate
- **7.0 Infra**: tool factory RLS-aware + capability guard + bitácora; checkpointer Postgres + Store; tabla `conversaciones`; endpoint de streaming; panel de chat; LangSmith.
- **7.1 Tools de dominio** (envolviendo `lib/services`, Zod, auditadas).
- **7.2 Agentes de sección** (`createAgent` + HITL + memoria) — empezar por Dashboard (read-only, sin riesgo) y Cotizaciones.
- **7.3 Copiloto global** (Deep Agent con subagentes).
- **7.4 Bot del portal** (acotado).
- **7.5 Gobernanza/evals** (políticas HITL, dashboards y evals LangSmith, coste/rate-limit).
- **Gate**: tools con tests (capability + **RLS niega cross-org**); HITL approve/edit/reject probado e2e; memoria persiste tras recarga; trazas en LangSmith; **prueba negativa**: un agente logueado en una org no obtiene datos de otra; el bot del portal no revela costos. `typecheck`/`lint`/`build`/`vitest` verdes.

### 14.12 Riesgos / decisiones abiertas
- **Coste de tokens** (mitigado con tiering + HITL + caché). 
- **Confiabilidad de escrituras**: HITL obligatorio en lo financiero; toda acción auditada y reversible donde se pueda.
- **Modelo**: por defecto OpenAI `gpt-4o-mini`; evaluar `gpt-4.1`/Claude para el Copiloto global. *(Para apps con Claude, preferir los modelos Claude más recientes.)*
- **`PostgresSaver` vs RLS**: las tablas del checkpointer son de infraestructura (no RLS); el aislamiento se garantiza porque los `thread_id` se generan en el servidor y el acceso se controla por la sesión de la app.

## 15. Fase 8 — Especificidad JSM (cierre de gaps de fidelidad al flujo)

> **Origen:** auditoría estricta de `inputs/` (init.md + flujo-automatizacion.html + flujo-trabajo.pdf) contra el código real (2026-06-24). El sistema implementa un flujo **genérico** completo, pero faltan piezas **específicas del flujo JSM** que el cliente pidió por escrito. Esta fase las cierra. Las sub-fases bloqueadas por glosario (§1.4) **no se desarrollan** hasta confirmar con JSM.
>
> Principio: no romper lo existente. Toda columna nueva es **nullable / con default**; los ítems y pagos actuales siguen calculando igual (retrocompatibilidad). Cada sub-fase = migración + Zod + servicio puro + UI + test, según §11.

### 15.1 Gaps detectados (trazados al insumo del cliente)

| # | Gap | Insumo (cita) | Estado real hoy | Severidad |
|---|---|---|---|---|
| G1 | Catálogo base 25 + 25 | init.md: "Promocionales (25 items) y eventos (25 items)" | 6 productos en `seed.sql` | 🔴 |
| G2 | Cotización de **personal** (rol × personas × días) | init.md: "promotoría a 6 meses (supervisor/promotor/coordinador) personas por x días" | `cotizacion_items` solo `cantidad × precio` | 🔴 |
| G3 | **Dispersión Tiempo × días** (cálculo de pago) | flujo: "Tiempo × días → Pago / Dispersión" | `tipo='dispersion'` es etiqueta sin lógica | 🔴 |
| G4 | **Master de Proyectos** con campos JSM | flujo: "Ejecutivo de Cuenta + Cóvac · Hijo/RIB · Validación # · asignar # al PDF Final" | `proyectos` genérico | 🟠 |
| G5 | **PO CONFIRMA vs CONFORMS** | flujo: "¿Cliente confirma? → PO CONFIRMA vs CONFORMS" | solo `confirmada`/`en_negociacion` | 🟠 |
| G6 | **Liquidación** con composición contable | flujo: "+ Anticipo/Traspaso · − Depósito · − Traspaso/Entrega $" | tipo `liquidacion` sin desglose | 🟠 |
| G7 | "Sube a portal → **notifica a Contabilidad**" | flujo: "Sube a Portal del Cliente · Notifica a Contabilidad" | portal auto; sin notif. a contabilidad | 🟠 |
| G8 | Forms de solicitud de pago/requisición **funcionando** | init.md: "Forms de solicitud de pago pero no funciona" | forms existen; falta verificación e2e real | 🟠 |
| G9 | **Recepción Contable / Cotizop** | flujo: "Recepción Contable · Cotizop · Informa" | ausente | 🟡 bloqueado |
| G10 | **Facturación de Proveedores** → JSM/Robos · Fix de palosos · a Cop. Pep | flujo lane Contabilidad | ausente | 🟡 bloqueado |

### 15.2 Sub-fases (orden de ejecución)

- **8.0 — Catálogo 25 + 25 (G1).** Ampliar `supabase/seed.sql`: 25 promocionales + 25 eventos realistas del dominio JSM (+ servicios de personal). Mantener `on conflict do nothing`. *Gate:* `db reset` carga ≥50 productos base; conteo por tipo correcto.
- **8.1 — Modelo de personal en cotización (G2).** Migración `0009`: a `cotizacion_items` agregar `modalidad` (`producto`|`personal`, default `producto`), `rol text`, `dias int`. Subtotal de personal = `cantidad (personas) × dias × precio_unitario`; producto sigue `cantidad × precio_unitario`. Actualizar `lib/services/calculos.ts` (factor `dias ?? 1`), `lib/schemas` (`CotizacionItemSchema`), UI de alta de ítems (toggle producto/personal con rol+personas+días) y exports PDF/Excel. *Gate + stress:* test puro de `calcularTotales` con líneas mixtas; cotización de promotoría (3 roles × N personas × D días) cuadra al centavo.
- **8.2 — Dispersión Tiempo × días (G3).** Servicio puro `lib/services/dispersion.ts`: `calcularDispersion(montoTotal, dias, opciones)` → calendario de parcialidades `[{fecha, monto, concepto}]` con `Σ montos === montoTotal` (sin deriva por redondeo). Conectar a OC/proyecto (generar `solicitudes_pago` programadas a partir del calendario). UI en detalle de OC/proyecto. *Gate + stress:* test puro, 1000 calendarios, suma exacta = total.
- **8.3 — Master de Proyectos JSM (G4).** Migración `0010`: a `proyectos` agregar `covac_id uuid` (ref `profiles`, 2º responsable/co-validador), `hijo_rib text`, `validacion_num text`, `pdf_num text`. **Modelados como campos configurables, sin reglas duras** (§1.4 sin confirmar). UI: editar/mostrar en detalle de proyecto; `pdf_num` se sugiere desde el consecutivo de la cotización. *Gate:* alta/edición persiste; RLS por `org_id`.
- **8.4 — PO CONFIRMA vs CONFORMS (G5).** Distinguir confirmación efectiva (PO CONFIRMA → `confirmada`) de conformidad pendiente (CONFORMS = enviada, sin respuesta → estado/feature `conforme_pendiente` que dispara seguimiento). Migración del enum + transición en `state-machine.ts` + acción en portal y en UI interna. *Gate:* las tres ramas desde `enviada_cliente` (confirma / conforms-pendiente / pide-cambios) transitan y quedan en bitácora.
- **8.5 — Liquidación con composición (G6).** Agregar `concepto` a `pagos` (anticipo|traspaso|deposito|entrega|abono) y servicio puro `calcularLiquidacion(proyecto)` = `+anticipos +traspasos −depósitos −entregas` → saldo de liquidación. UI: estado de cuenta de liquidación en detalle de proyecto/OC. *Gate + stress:* invariante contable estable en 1000 operaciones mixtas.
- **8.6 — Notificar a Contabilidad (G7).** En `notificador.ts`/`mensajeria.ts`, al "subir a portal"/confirmar, notificar al rol `contabilidad` (por `profiles.rol='contabilidad'` o `NOTIFY_CONTABILIDAD_EMAIL`), con log en `notificaciones`. *Gate:* test de selección de destinatarios; no-op seguro sin credenciales.
- **8.7 — Verificación de forms (G8).** E2E Playwright del ciclo real: requisición → solicitud de pago → autorización, y alta de OC con líneas. Corregir lo que falle. *Gate:* e2e verde de ambos forms end-to-end.
- **8.8 — BLOQUEADO (G9, G10).** Recepción Contable/Cotizop y Facturación JSM/Robos/Fix de palosos/Cop. Pep: **no se desarrollan**. Se levantan como preguntas a JSM (§1.4) antes de modelar. Mientras tanto, los campos quedan como `documentos`/`facturas` genéricos ya existentes.

### 15.3 Preguntas a JSM (desbloquean 8.8 y afinan 8.3–8.5)
1. **Cóvac**: ¿es un 2º ejecutivo/co-validador de la cuenta? ¿quién lo asigna?
2. **Hijo / RIB**: ¿sub-proyecto, o referencia interna bancaria? ¿formato?
3. **CONFORMS** vs **PO CONFIRMA**: ¿CONFORMS = "aún no confirma, hay que perseguir", o es un documento distinto?
4. **Liquidación**: dar 1–2 ejemplos numéricos reales (anticipo, depósito, traspaso, entrega $) para validar el desglose.
5. **Tiempo × días**: ¿la dispersión es lineal por día hábil, por hitos, o % fijos (ej. 50/30/20)?
6. **Recepción Contable / Cotizop**: ¿qué documentos recopila y qué valida antes de facturar?
7. **JSM o Robos / a Cop. Pep / Fix de palosos**: ¿razones sociales emisoras, destino contable y corrección de facturas con error? Confirmar significado.

### 15.4 Gate global de Fase 8
`typecheck`/`lint`/`build`/`vitest` verdes; nuevos tests puros (personal, dispersión, liquidación) + e2e de forms; cotización de promotoría real cuadra; seed con ≥50 productos; **nada de lo existente se rompe** (suite previa sigue verde). Actualizar §12.

## 16. Widget de feedback Live-Dev (UAT / pruebas con JSM)

> **Objetivo:** embeber el widget **Live-Dev** para que el equipo JSM (y stakeholders internos) den feedback in-situ durante las pruebas: atajo de teclado → señalar cualquier elemento → comentario + screenshot opcional → se crea un **GitHub issue** (label `live-dev`) en el repo conectado. Sirve de bucle de retroalimentación directo desde la app a nuestro backlog.

### 16.1 Cómo funciona (resumen del proveedor)
- El widget es un bundle externo que se carga desde el dashboard de Live-Dev: `https://web-production-4be48.up.railway.app/livedev-overlay.js`.
- Configuración vía `window.__LIVEDEV__ = { apiUrl, token, appId }` antes de inyectar el `<script>`.
- Atajo para abrir: **Shift + Ctrl/Cmd + L**. Los screenshots requieren **contexto seguro (HTTPS)** — funciona en prod/preview; en local solo `localhost` o HTTPS.
- El **GitHub token vive server-side en el dashboard de Live-Dev**; la app solo expone un **widget token público** (`lvt_…`). No hay secreto nuestro en el cliente.

### 16.2 Decisiones de diseño (este proyecto)
- **Alcance: solo el área interna autenticada.** Se monta en `app/(app)/layout.tsx`, NO en el root layout. Motivo de seguridad/UX: el portal externo `/portal/[token]` es la única superficie que toca un **cliente real**; no debe exponer un canal de feedback→issues ni el branding interno. Login/auth tampoco lo necesitan. (El loader queda parametrizado por si más adelante se decide encenderlo también en el portal con un flag explícito.)
- **Entornos: todos** (dev/preview/prod), siempre que existan las env vars. Kill-switch opcional `NEXT_PUBLIC_LIVEDEV_ENABLED=false` para apagarlo sin quitar las llaves.
- **Activación condicionada a env:** si falta `NEXT_PUBLIC_LIVEDEV_APP_ID` o `NEXT_PUBLIC_LIVEDEV_TOKEN`, el loader es **no-op** (no inyecta script). Mismo patrón "degrada sin credenciales" que Resend/WhatsApp/OpenAI en este repo.

### 16.2.1 El widget ya trae su propio botón (verificado en el bundle)
Inspección de `livedev-overlay.js`: el widget inyecta un botón flotante propio `<button class="livedev-toggle">● Live-Dev</button>` en `position:fixed; right:16px; bottom:16px` (z-index altísimo) que **abre el overlay al hacer clic** (no depende del atajo). El atajo es `e.key === "L" && e.shiftKey && (e.ctrlKey || e.metaKey)` sobre `document`. **No expone API global** salvo `window.__LIVEDEV__`. → Por eso **no creamos un botón propio ni disparamos eventos sintéticos**: reusamos su botón y solo lo **reposicionamos/resaltamos por CSS** para que quede a la izquierda del Copiloto y sea "muy llamativo" (pedido del cliente: un cuadro vistoso junto al copiloto). El botón nativo, además, refleja el estado on/off.

### 16.3 Qué hay que implementar
1. **Componente loader** `components/livedev-overlay-loader.tsx` (Client Component, kebab-case según convención del repo). ~15 líneas: setea `window.__LIVEDEV__` e inyecta el `<script async>` una sola vez (`data-livedev-loaded`), con cleanup. Props: `appId`, `token`, `apiUrl` (default railway), `enabled`. **No-op** si falta `appId`/`token` o `enabled=false`.
2. **Montaje** en `app/(app)/layout.tsx`, junto al `<CopilotoPanel/>` (no en root, no en portal/login). `enabled` = `NEXT_PUBLIC_LIVEDEV_ENABLED !== "false"`. Lee `appId`/`token` de env públicas.
3. **CSS override** en `app/globals.css`: regla `button.livedev-toggle` (+`!important`, gana sobre el `<style>` inyectado por el widget) que lo mueve a `right:168px; bottom:20px` (a la izquierda del Copiloto), lo pinta violeta con anillo pulsante (respeta `prefers-reduced-motion`) y en `max-width:520px` lo sube encima del Copiloto para no encimarse.
4. **Env vars** nuevas en `.env.example` y `.env.local`:
   ```
   # Live-Dev feedback widget (UAT). Sin estas llaves el widget no se carga.
   NEXT_PUBLIC_LIVEDEV_APP_ID=        # uuid del proyecto en el dashboard Live-Dev
   NEXT_PUBLIC_LIVEDEV_TOKEN=         # lvt_… (widget token público, no es secreto)
   NEXT_PUBLIC_LIVEDEV_ENABLED=       # opcional; "false" para apagar sin quitar llaves
   ```
   Documentar también en §8.
5. **CSP / headers:** hoy `next.config.mjs` no define `Content-Security-Policy`, así que el script externo carga sin bloqueo. Si en hardening (§5 Fase 5 / futura) se agrega CSP, debe permitir el dominio `web-production-4be48.up.railway.app` en `script-src`, `connect-src` e `img-src` (screenshots). Dejar nota en §9.

### 16.4 Setup operativo (fuera del código, en el dashboard Live-Dev)
Crear proyecto → fijar repo GitHub (`owner/repo`) → asegurar GitHub token con `Issues: write` (por-proyecto o global) → copiar `appId` + widget token a nuestras env vars. Sin este setup el widget carga pero los issues no se crean.

### 16.5 Gate de la integración
`typecheck`/`lint`/`build` verdes; sin env el loader es no-op (no rompe nada, suite existente sigue verde); con env en un entorno HTTPS: el atajo abre el overlay y un envío de prueba crea un issue `live-dev` en el repo conectado. Es integración ligera (sin DB ni RLS): no requiere migración ni test unitario nuevo, salvo —opcional— una verificación de que el loader no inyecta script cuando faltan llaves.

## 11. Definición de "Hecho" (por feature)

1. Esquema Zod + migración + RLS. 2. Server Action/servicio con state machine. 3. UI accesible y consistente. 4. Test (unit + e2e si es flujo crítico). 5. Lint + typecheck verdes. 6. Bitácora/auditoría si cambia estado.

## 12. Bitácora de avance (actualizar al cerrar cada fase)

| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| 0 — Fundaciones | ✅ Hecha | 2026-06-23 | Scaffold Next 15 + TS + Tailwind + shadcn base; Supabase (clientes server/browser/admin), migración `0001_base` (organizations/profiles/roles/RLS + helpers `auth_org_id`/`auth_role`); RBAC (`lib/auth`), middleware de sesión, login (Server Action + Zod), layout autenticado con nav por rol, dashboard; seed demo (6 roles); CI (lint+typecheck+build). Gate: `typecheck` y `build` verdes. Pendiente verificar RLS contra Supabase local (requiere `supabase start`). |
| 1 — CRM/Catálogo/Cotizaciones | ✅ Hecha | 2026-06-23 | Migración `0002` (CRM, catálogo, cotizaciones, consecutivos, bitácora, RLS, `next_consecutivo` atómico). Zod en `lib/schemas`. Servicios: cálculos, state-machine, consecutivo, bitácora, cotizaciones, notificador. UI+actions: CRM (clientes/contactos), Catálogo (productos/proveedores), Cotizaciones (lista/alta/detalle/versión) con flujo Ejecutivo→Admin→Cliente. Export **PDF** (@react-pdf) y **Excel** (exceljs) sin exponer costos al cliente. **Agente Cotizador** (LangGraph+OpenAI, salida estructurada) + **Notificador** email (Resend, no-op sin key). Tests: 14 verdes (cálculos + state-machine). Gate: typecheck/lint/build verdes. Stress test consecutivos en `supabase/tests/consecutivo_stress.sql` (requiere DB local). |
| 2 — Proyectos/Kanban/Portal | ✅ Hecha | 2026-06-23 | Migración `0003` (proyectos, tareas, `portal_token`, enums, RLS). Servicios: `kanban` (helpers puros), `proyectos` (crear desde cotización + tareas iniciales, crear/mover/reindexar/editar tareas), `portal` (vía service-role por token). UI: lista y detalle de proyectos con **Kanban drag&drop** (dnd-kit, multi-columna, reindexado determinista), alta de tareas, edición de proyecto y **timeline de trazabilidad** (proyecto + cotización). **Portal del cliente** público `/portal/[token]`: ver cotización (sin costos), **confirmar** (→ crea proyecto+tareas) o **pedir cambios** (→ en_negociación). `portal_token` se genera al enviar al cliente; enlace visible en el detalle. Tests: 21 verdes incl. **stress de 500 tareas** (orden íntegro). Gate: typecheck/lint/build verdes. |
| 3 — Compras/Finanzas | ✅ Hecha | 2026-06-23 | Migración `0004` (ordenes_compra+items, solicitudes_pago, pagos, facturas; enums; RLS). Servicios: `finanzas` (totales OC, **resumenPagos** con invariante pagado+saldo=total, cobranza), `compras` (OC con folio `OC` atómico, máquina de estados OC, solicitudes, pagos, registro de facturas sin timbrar, cobranza), `pull-proveedores` (ranking puro por tiempo/costo). **Agente Pull** (LangGraph+OpenAI) con fallback determinista. UI: **Compras** (lista/alta/detalle OC con autorización, pagos, facturas, saldo) + **Pull** (requisición→recomendaciones); **Finanzas** (solicitudes de pago con autorización, cobranza con vencidos, registrar factura a cliente). Tests: 32 verdes incl. **integridad financiera 1000 ops** sin deriva. Gate: typecheck/lint/build verdes. |
| 4 — Agentes/WhatsApp/Dashboards | ✅ Hecha | 2026-06-23 | Migración `0005` (notificaciones multicanal + RLS). **WhatsApp Cloud API** (`whatsapp.ts`, texto/plantilla, no-op sin token) + **webhook** GET/POST + **mensajería unificada** (`mensajeria.ts`: email/WA con log en `notificaciones`); notificador refactorizado a multicanal. Servicios puros: `dashboard` (KPIs + cruces cliente×proyecto×proveedor×pago) y `control-flujo` (detección de anomalías). **Agente Cobranza** (LangGraph+OpenAI) + `cobranza.ts` (selección de vencidas + envío) con disparo manual (botón) y **endpoint cron** `/api/cron/cobranza` (protegido por CRON_SECRET). **Dashboard real** con métricas, embudo, top clientes y panel de Control de Flujo. Tests: 36 verdes (dashboard, control-flujo, cobranza). Gate: typecheck/lint/build verdes. Pendiente real: credenciales WhatsApp/SMTP para envío en vivo. |
| 6 — Capa visual (dashboards dinámicos) | ✅ Hecha | 2026-06-24 | Agregaciones puras en `dashboard.ts` (serieMensualIngresos, embudoFlujo, agingCobranza) + 3 tests. **Kit de gráficas SVG propio** (`components/charts/`: count-up, sparkline, area, bar, donut, progress-ring y la firma **flujo-ribbon**), animado y con `prefers-reduced-motion`. **Dashboard** rediseñado (KPIs con count-up+sparkline, cinta **Flujo JSM**, área de ingresos, dona+aging de cobranza, top clientes, control de flujo). Gráficas también en **Finanzas** (dona+antigüedad), **Proyectos** (anillo de avance) y **Compras** (anillo de saldo). Fix RSC: el prop `format` (función) no cruza a Client Components → tokens string (`format.ts`). Gate: typecheck/lint/build + **43 unit** + **10 e2e** verdes + **screenshot** del dashboard verificado. |
| 7 — Agentes y chatbots (piloto) | ✅ Hecha (piloto) | 2026-06-24 | Familia `@langchain/*` migrada a **v1** (core/langgraph/openai) + `langchain@1.5` + `@langchain/langgraph-checkpoint-postgres`. **Copiloto JSM** con `createAgent` + **`humanInTheLoopMiddleware`** (approve/edit/reject en escrituras) + checkpointer (`MemorySaver`; Postgres en prod). **Tools RLS-aware** (`lib/agents/tools.ts`) que envuelven `lib/services` con guard de capacidad por rol y bitácora: lectura (clientes, catálogo, cotizaciones, resumen finanzas) + escritura (crear cliente/cotización/solicitud de pago). Endpoint `/api/agents/chat` (mensaje + aprobar/rechazar, degrada sin API key). **Panel de chat flotante** consciente de la sección en todo el área autenticada. Migración `0008` (`conversaciones` + RLS). Tests: **48 unit** (incl. gating de capacidad) + **11 e2e** (incl. smoke del copiloto) verdes; typecheck/lint/build verdes; screenshots de dashboard y copiloto verificados. **Para activar el LLM:** poner `OPENAI_API_KEY` en `.env.local` y reiniciar. **Verificado EN VIVO con LLM real:** lectura ("¿cuánto por cobrar?" → respuesta correcta vía herramienta) y escritura (crear cliente → tarjeta HITL con la acción concreta → aprobar → **persistido y auditado en bitácora** `via=copiloto`). Fixes: extracción del interrupt v1 (`value.actionRequests`) para mostrar acción+args; `LOGIN_MAX_PER_MIN` (env) para que el rate-limit no bloquee e2e desde una IP. Pendiente (siguiente iteración §14): streaming token-a-token, Copiloto global con Deep Agents/subagentes, bot del portal acotado, PostgresSaver en prod, evals LangSmith. |
| 8 — Especificidad JSM (cierre de gaps) | ✅ Hecha (8.0–8.7) | 2026-06-24 | Plan en §15. **G1** catálogo ampliado a 25 promocionales + 25 eventos + 3 roles de personal + proveedores Amazon/DF/Sorteo/KFC (`seed.sql`). **G2** modelo de personal en cotización: migración `0009` (`cotizacion_items.modalidad/rol/dias`), `calculos.ts` con factor días (`importeItem`/`costoItem`, retrocompat productos), Zod, UI (toggle producto/personal + rol + días + label Personas), export PDF/Excel con desglose. **G3** dispersión Tiempo×días: servicio puro `dispersion.ts` (Σ=total, última parcialidad absorbe residuo), `programarDispersion` (genera N solicitudes), UI en detalle de OC. **G4** Master de Proyectos: migración `0010` (`covac_id/hijo_rib/validacion_num/pdf_num`, campos configurables §1.4), UI de edición + placeholder con folio. **G5** PO CONFIRMA vs CONFORMS: migración `0011` (estado `conforme_pendiente`), transición `marcar_conforms`, portal acepta confirmar/cambios desde ambos estados. **G6** liquidación con composición: migración `0012` (`pagos.concepto`), servicio puro `liquidacion.ts` (+anticipo/traspaso/abono −depósito/entrega = neto), selector de concepto en form de pago + tarjeta de estado de cuenta. **G7** notificar a Contabilidad (`notificarContabilidad` al subir a portal y al confirmar; `NOTIFY_CONTABILIDAD_EMAIL`). **G8** e2e ampliados (autorizar solicitud, dispersión, partida de personal). Tests: **72 unit** verdes (antes 48; +calculos personal, +dispersión stress 1000, +liquidación stress 1000, +notificador). Gate: typecheck/lint/build verdes. **G9/G10 bloqueados** por glosario §1.4 (Recepción Contable/Cotizop, Facturación JSM-Robos/Fix palosos/Cop.Pep) → preguntas a JSM en §15.3. **Pendiente vivo:** aplicar migraciones 0009–0012 contra Supabase local + correr e2e nuevos. |
| 5 — Hardening/Deploy | ✅ Hecha | 2026-06-23 | **Seguridad**: rate limiter (`lib/security`, aplicado a login y portal), security headers en `next.config`, `/api/health`, migración `0006` (FORCE RLS + revoke anon en las 19 tablas) y auditoría `supabase/tests/rls_audit.sql`. **E2E Playwright**: `playwright.config.ts` + smoke (health, rutas protegidas, portal 404) + flujos críticos (cotización ejecutivo→admin, compras OC→pago). **Deploy**: `vercel.json` (cron diario de cobranza), `DEPLOY.md` (runbook Vercel+Supabase, backups, rollback, observabilidad). Tests: 40 verdes (incl. rate-limit). Gate: typecheck/lint/build verdes. **Verificado en vivo (local, Supabase CLI + Docker):** 7 migraciones aplicadas, seed OK, auditoría RLS ✅ y stress de consecutivos ✅ contra la DB real; app corriendo con health/RBAC/portal-404 OK. **Fixes encontrados al desplegar:** (1) seed creaba `auth.users` con `ON CONFLICT(email)` que falla por índice único parcial → ahora usuarios vía API admin (`scripts/seed-users.mjs`, `npm run seed:users`); (2) faltaban grants DML a `authenticated`/`service_role` → migración `0007_grants.sql`; (3) `tailwind.config.ts` usaba `require()` que rompe en `next dev` (ESM) → cambiado a `import`. |
