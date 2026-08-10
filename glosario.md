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
| **Cabeza / trabajador** | Relación organizacional entre profesionales en CuidameDoc: la "cabeza" es quien da de alta al "trabajador" desde Medis (ej. Diana `professional_id 12`, Ximena `professional_id 2`). Guardada en `professionals.head_professional_id` (self-FK, `NULL` = profesional independiente). Puramente organizacional — cada doctor ve solo lo suyo clínicamente. |
| **`head_professional_id`** | Columna en `professionals` (CuidameDoc) que enlaza un trabajador con su cabeza. |
| **`doc_professional_id`** | Columna en `users` (Medis) que guarda el `professional_id` que CuidameDoc le asignó a ese profesional al aprovisionarlo. `NULL` = no aprovisionado (o el intento falló). |
| **`docSync`** | Campo en la respuesta de `POST /api/professionals` (`{ ok, error? }`) que informa si el aprovisionamiento automático en CuidameDoc tuvo éxito — no bloquea ni afecta el éxito de la creación local. |
