# Glosario — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Mapeo conceptual de entidades

Equivalencia entre los conceptos de la plataforma original (medisdiana, estudio
de pole dance) y los del proyecto actual (clínica general). Todo texto visible
al usuario debe usar la columna derecha.

| Concepto original (medisdiana)        | Concepto nuevo (Clínica General) |
|---------------------------------------|-----------------------------------|
| Instructores / Profesionales          | Médicos / Profesionales de salud |
| Clases / Sesiones / Disciplinas       | Consultas / Citas / Especialidades |
| Alumnos / Clientes / Usuarios         | Pacientes |
| Sedes / Salones                       | Sedes / Consultorios |
| Membresías / Planes                   | Planes / Membresías de paciente |
| Inscripción                           | Afiliación / Inscripción |

## Términos técnicos frecuentes

| Término | Significado |
|---------|-------------|
| **CuidameDoc** | Plataforma externa (`doc.cuidame.tech` / `doc-api.cuidame.tech`) que gestiona el agendamiento clínico real. |
| **`professional_id = 12`** | Identificador de la Dra. Diana en CuidameDoc. |
| **`prof_service_id`** | ID de un servicio configurado por la profesional en CuidameDoc (Mis Servicios). |
| **`clinical_service_id`** | Campo enviado en los POST de booking; corresponde al `prof_service_id` del servicio elegido. |
| **Slot** | Franja horaria disponible para agendar en un día concreto. |
