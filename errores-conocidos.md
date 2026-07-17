# Errores conocidos — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

Registro de bugs conocidos, limitaciones y comportamientos sorprendentes,
para no re-diagnosticarlos desde cero.

## Formato de cada entrada

```
### [fecha] Título corto
- **Síntoma:** qué se observa.
- **Causa:** qué lo produce (si se conoce).
- **Estado:** abierto / mitigado / resuelto (con fecha).
- **Workaround:** cómo evitarlo mientras tanto.
```

## Errores y limitaciones actuales

_No hay errores registrados por ahora. Añadir aquí cualquier bug o limitación
que se descubra durante el desarrollo._

## Comportamientos a tener en cuenta (no son bugs)

- Si Diana no tiene servicios configurados en CuidameDoc, el paso 0 del
  booking no falla: muestra un botón directo para ir al calendario y los POST
  envían `clinical_service_id: undefined`.
