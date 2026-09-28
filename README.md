# ⛪ Sistema de Gestión — Iglesia Agua Viva

Aplicación web para la gestión de registros ministeriales, control de asistencia e inscripciones a la Escuela de Liderazgo (EDL).

## Funcionalidades

- **Dashboard** — Vista general con totales y accesos directos
- **Registro de Asistencia** — Control de ingreso a servicios con filtros por fecha y tipo
- **EDL (Escuela de Liderazgo)** — Inscripciones a cursos, control de pagos, subida de comprobantes (Yape/Plin/Transferencia/Efectivo), exportación a Excel
- **Predicadores y Anfitriones** — Gestión del equipo de predicación y anfitriones
- **Creativos** — Gestión del equipo creativo
- **Modo Invitado** — Acceso limitado a Asistencia y EDL sin necesidad de cuenta admin

## Tecnologías

- HTML5 + CSS3 + Vanilla JS
- Supabase (PostgREST, API REST sin SDK) — `supabase.js`
- Sesión local con localStorage (`auth.js`)
- SheetJS (exportación a Excel)

## Requisitos

- Navegador web moderno
- Conexión a internet (Supabase)

## Desarrollo local

```bash
python3 -m http.server 8080
# Abrir http://127.0.0.1:8080
```

## Estructura

```
├── index.html            — Login + entrada invitado
├── dashboard.html        — Admin dashboard
├── ingreso.html          — Registro de asistencia
├── edl.html              — Escuela de Liderazgo (admin + invitado)
├── kids.html             — Ministerio KIDS
├── lideres.html          — Ministerio Líderes
├── predicadores.html     — Gestión predicadores/anfitriones
├── creativos.html        — Gestión equipo creativo
├── aula-virtual.html     — Aula virtual (solo localStorage)
├── guest.html            — Landing para invitados
├── auth.js               — Manejo de sesión (localStorage)
├── supabase.js           — Capa de datos (REST + shim compatible Firestore)
├── supabase-schema.sql   — Esquema de las 9 tablas en Supabase
└── apps-script-edl.js    — Script de Google Apps Script (EDL)
```

## Base de datos

Supabase (proyecto `bhuxtunecrqybnlmdspy`). El esquema está en
`supabase-schema.sql`; se ejecuta en el SQL Editor de Supabase.
RLS con acceso público para lectura/escritura (el sistema no usa
auth de Supabase, la sesión es local en `auth.js`).
