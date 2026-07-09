# CLAUDE.md — Proyecto "Medis" (Clínica General)

Este proyecto parte de una copia de la plataforma **medisdiana** (estudio de pole dance)
y se está adaptando para convertirse en un sistema de gestión para una **clínica médica
de medicina general** (agendamiento de citas, pacientes, médicos, planes/membresías,
finanzas, etc.).

## Reglas globales (aplican a TODA la migración de pantallas)

- **Temática**: médica (clínica general). Todo el contenido, textos de ejemplo, datos
  semilla (seed) e imágenes deben reflejar un entorno de salud — consultas, médicos,
  pacientes, especialidades, exámenes, tratamientos — sin rastros de pole dance, danza
  o estudios de baile (nombres de disciplinas, salones, instructoras, etc.).
- **Colores**: blancos, azules, limpios. La paleta visual debe transmitir confianza,
  higiene y profesionalismo médico. Evitar la paleta original de dorados/rosas
  (`#775A00`, `#B08D32`, `#BE185D`, `#DB2777`, etc.) y reemplazarla por tonos blancos
  (`#FFFFFF`, `#F5F7FA`) y azules (`#1D4ED8`, `#2563EB`, `#0EA5E9`, etc.).
- **Textos**: formales y orientados a salud/pacientes. Lenguaje claro, respetuoso y
  profesional, dirigido a pacientes y personal médico (evitar tono "fitness/estudio").

## Mapeo conceptual de entidades

| Concepto original (medisdiana)        | Concepto nuevo (Clínica General) |
|---------------------------------------|-----------------------------------|
| Instructores / Profesionales          | Médicos / Profesionales de salud |
| Clases / Sesiones / Disciplinas       | Consultas / Citas / Especialidades |
| Alumnos / Clientes / Usuarios         | Pacientes |
| Sedes / Salones                       | Sedes / Consultorios |
| Membresías / Planes                   | Planes / Membresías de paciente |
| Inscripción                           | Afiliación / Inscripción |

## Pantallas detectadas a migrar

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
