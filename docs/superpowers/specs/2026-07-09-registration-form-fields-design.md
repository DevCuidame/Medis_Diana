# Ampliación del formulario de registro de usuario (Nueva Cuenta)

## Contexto
El formulario `CreateProfessionalModal.tsx` (admin → Nuevo Usuario) solo captura
nombre, apellido, tipo/número de documento (sin persistir), email, teléfono,
datos de perfil profesional y contraseña. Se requiere ampliarlo con campos de
identidad, contacto y credenciales médicas propios de una clínica colombiana,
sin romper la lógica existente de vinculación Dependiente/Independiente.

## Alcance
Solo el formulario de creación de cuentas (admin) y el backend que lo soporta
(`POST /api/professionals`, que internamente bifurca a `UserRepository.create`
para USER/ADMIN o `ProfessionalRepository.create` para PROFESSIONAL).

**Fuera de alcance:** edición/detalle/listado de estos campos en
`AdminProfessionals.tsx`, `ProfessionalProfile.tsx` u otras vistas — quedan
guardados en BD pero no se exponen en UI de consulta en esta iteración.

## A. Modelo de datos — migración `017_registration_identity_fields.sql`

Nuevas columnas en `users`, todas nullable a nivel de BD (12 usuarios ya
existentes no tienen estos datos); la obligatoriedad se valida en
formulario/API, no con `NOT NULL`.

| Columna | Tipo | Notas |
|---|---|---|
| `id_type` | VARCHAR(50) | Cédula de Ciudadanía / Extranjería / Pasaporte / RUC |
| `id_number` | VARCHAR(50) | `UNIQUE` — rechaza duplicados |
| `middle_name` | VARCHAR(100) | Segundo Nombre, opcional |
| `second_last_name` | VARCHAR(100) | Segundo Apellido, opcional |
| `personal_address` | VARCHAR(255) | Dirección Personal |
| `medical_registration_number` | VARCHAR(100) | Registro Médico — solo Profesional |
| `sispro_username` | VARCHAR(100) | Usuario SISPRO — solo Profesional |
| `sispro_password_hash` | VARCHAR(255) | Contraseña SISPRO, hash bcrypt (misma función `hashPassword`), irreversible — nunca se devuelve ni se puede recuperar |

`first_name`/`last_name` existentes se reutilizan como Primer Nombre/Primer
Apellido (sin renombrar columnas, solo relabeling en UI).

Índice `UNIQUE` en `id_number` (permite múltiples `NULL` para los usuarios
legacy sin documento registrado).

## B. Backend

- **Tipos** (`professional.types.ts`, `auth.types.ts`, shared-types si aplica):
  extender `CreateProfessionalDTO` / `RegisterDTO` con:
  `idType, idNumber, middleName?, secondLastName?, personalAddress,
  medicalRegistrationNumber?, sisproUsername?, sisproPassword?`.
  Los "Public" shapes exponen todo excepto `sisproPassword`
  (nunca se devuelve; se reemplaza por hash y no se incluye en respuestas).
- **`user.repository.ts` / `professional.repository.ts`**: `create()` inserta
  las columnas comunes (documento, segundo nombre/apellido, dirección).
  `professional.repository.ts` además inserta los 3 campos médicos cuando
  vienen en el DTO, hasheando `sisproPassword` con `hashPassword`.
- **`professional.service.ts`**: junto a la validación de email duplicado,
  agregar:
  - Verificar `id_number` duplicado → `409 "El número de documento ya está registrado."`
  - Validar que `idNumber` sea solo dígitos → `400` si no.
  - Si `role === 'PROFESSIONAL'`: exigir `medicalRegistrationNumber`,
    `sisproUsername`, `sisproPassword` → `400` si falta alguno.

## C. Frontend (`CreateProfessionalModal.tsx`)

- **Paso 1 — Identidad**: mantener Tipo/Número de Documento (ahora se envían
  al backend; Número con validación numérica); dividir "Nombres" →
  **Primer Nombre*** + Segundo Nombre (opcional); dividir "Apellidos" →
  **Primer Apellido*** + Segundo Apellido (opcional). Lógica
  Dependiente/Independiente sin cambios.
- **Paso 2 — Contacto**: agregar **Dirección Personal*** junto a
  teléfono/correo existentes.
- **Paso 3 — Perfil** (solo si rol = Profesional): agregar
  **Registro Médico***, **Usuario SISPRO***, **Contraseña SISPRO*** (con
  mismo toggle mostrar/ocultar que la contraseña principal de acceso).
- **Paso 4 — Acceso**: sin cambios.
- `validate()` y `submit()` actualizados para incluir/exigir los campos
  nuevos según paso y rol.

## Testing / verificación
- `npx tsc --noEmit` (frontend y backend) sin errores nuevos.
- Migración aplicada manualmente contra la BD dev (recordar: `run-migration.ts`
  no conoce migraciones >011, aplicar con script `pg` directo como en
  sesiones anteriores).
- Prueba E2E vía curl: crear un Profesional con todos los campos nuevos →
  verificar fila en `users` con `sispro_password_hash` hasheado (no texto
  plano) y `id_number` único; segundo intento con mismo `id_number` → 409;
  crear un Usuario normal (no Profesional) → verificar que no exige los 3
  campos médicos.
