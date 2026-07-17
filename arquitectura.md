# Arquitectura — Medis Diana / dianamedic.cuidame.tech

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Visión general del sistema

Este proyecto es la **landing + portal** de la **Dra. Diana Cristina Medina Camargo**,
desplegado en producción en `https://dianamedic.cuidame.tech`.

El código vive en `diana/medis/medisdiana-landing/` (monorepo en `diana/medis/`).
Parte de una copia de la plataforma **medisdiana** (estudio de pole dance)
adaptada para uso médico. El backend propio del proyecto corre en el monorepo
(`diana/medis/apps/backend/`), pero el **agendamiento de citas clínicas** se
delega completamente al backend de CuidameDoc (`https://doc-api.cuidame.tech/api`).

**Diana en CuidameDoc:** `professional_id = 12`.

## Stack (medisdiana-landing)

- Vite + React + TypeScript
- Tailwind CSS
- Framer Motion (animaciones de pasos del booking)
- Deploy: VM `instance-esmart1` (us-east1-b), script `deploy-Dianamedic.ps1`

## Estructura de pantallas / rutas

### Landing pública (`/`)
- medisdiana-landing/src/components/Hero.tsx
- medisdiana-landing/src/components/About.tsx
- medisdiana-landing/src/components/Classes.tsx
- medisdiana-landing/src/components/Instructors.tsx
- medisdiana-landing/src/components/Testimonials.tsx
- medisdiana-landing/src/components/FinalCTA.tsx
- medisdiana-landing/src/components/Navbar.tsx
- medisdiana-landing/src/components/Footer.tsx

### Autenticación (`/login`)
- medisdiana-landing/src/components/ArtistLogin.tsx

### Panel Admin (`/admin/*`)
- medisdiana-landing/src/components/admin/MainDashboard.tsx
- medisdiana-landing/src/components/admin/UsuariosDashboard.tsx
- medisdiana-landing/src/components/admin/AdminClasses.tsx
- medisdiana-landing/src/components/admin/CreateService.tsx
- medisdiana-landing/src/components/admin/SedesDashboard.tsx
- medisdiana-landing/src/components/admin/EspaciosDashboard.tsx
- medisdiana-landing/src/components/admin/FinanzasDashboard.tsx
- medisdiana-landing/src/components/admin/MembresiasDashboard.tsx
- medisdiana-landing/src/components/admin/BeneficiosDashboard.tsx
- medisdiana-landing/src/components/admin/InscripcionesDashboard.tsx

### Portal Paciente (`/user/*`)
- medisdiana-landing/src/components/user/UserLayout.tsx
- medisdiana-landing/src/components/user/UserCalendario.tsx
- medisdiana-landing/src/components/user/UserServicios.tsx
- medisdiana-landing/src/components/user/UserMisServicios.tsx
- medisdiana-landing/src/components/user/UserMembresias.tsx
- medisdiana-landing/src/components/user/UserProfesionales.tsx

### Portal Profesional/Médico (`/professional/*`)
- medisdiana-landing/src/components/professional/ProfessionalDashboard.tsx
- medisdiana-landing/src/components/professional/ProfessionalClasses.tsx
- medisdiana-landing/src/components/professional/ProfessionalProfile.tsx

### Componentes legacy / no enrutados (revisar si eliminar)
- medisdiana-landing/src/components/user/UserClasses.tsx
- medisdiana-landing/src/components/user/UserDashboard.tsx
- medisdiana-landing/src/components/user/UserMemberships.tsx

---

## DianaBookingCalendar — Agendamiento de citas con la Dra. Diana

**Archivo:** `medisdiana-landing/src/components/DianaBookingCalendar.tsx`

Componente standalone (no depende del backend propio del monorepo). Consume
directamente la API de **CuidameDoc** (`https://doc-api.cuidame.tech/api`).

### Flujo de pasos (en orden)

```
service → calendar → slots → form → success
```

| Paso | Key | Descripción |
|------|-----|-------------|
| 0 | `service` | El paciente selecciona qué tipo de consulta quiere |
| 1 | `calendar` | Selecciona el día (calendario mensual con disponibilidad preloaded) |
| 2 | `slots` | Elige el horario disponible |
| 3 | `form` | Ingresa sus datos (paciente existente o nuevo registro) |
| 4 | `success` | Confirmación con resumen de la cita |

### Endpoints que consume (todos contra `doc-api.cuidame.tech`)

| Método | URL | Uso |
|--------|-----|-----|
| `GET` | `/api/booking/professionals/12/services` | Carga los servicios de Diana en el paso 0 |
| `GET` | `/api/booking/professionals/12/slots/:date` | Verifica disponibilidad por día (preloaded + al seleccionar) |
| `POST` | `/api/booking/request` | Agenda cita para paciente **existente** (por número de documento) |
| `POST` | `/api/booking/register-and-book` | Registra paciente **nuevo** y agenda la cita en una sola llamada |

### Campos enviados en los POST

Ambos endpoints reciben `clinical_service_id` (el `prof_service_id` del servicio seleccionado en paso 0, o `undefined` si no hay servicios).

`register-and-book` además envía: `first_name`, `last_name`, `identification_type`, `identification_number`, `email`, `phone`, `professional_id: 12`, `appointment_date`, `start_time`, `end_time`, `notes`.

`request` envía: `identification_number`, `professional_id: 12`, `appointment_date`, `start_time`, `end_time`, `notes`.

### Estado React relevante

```ts
selectedServiceId: number | null   // prof_service_id seleccionado
selectedServiceName: string        // para mostrar en resumen/éxito
services: ProfService[]            // cargados al montar
step: 'service'|'calendar'|'slots'|'form'|'success'
```

### Reglas de navegación (`goBack`)

- `success` → resetea todo y vuelve a `service`
- `form` → vuelve a `slots`
- `slots` → vuelve a `calendar` (limpia `selectedDate`)
- `calendar` → vuelve a `service`
- `service` → llama `onBackToHome()` (vuelve a la landing)

### Servicios de Diana en CuidameDoc

Se crean desde `doc.cuidame.tech` → Mis Servicios (sidebar profesional). Cada servicio tiene `prof_service_id`, `name`, `description`, `duration_minutes`, `category`. Si no hay servicios configurados, el paso 0 muestra un botón directo para ir al calendario.

### Constantes clave del componente

```ts
const DOC_API = 'https://doc-api.cuidame.tech/api'
const DIANA_PROFESSIONAL_ID = 12
```
