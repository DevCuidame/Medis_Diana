import { useEffect, useState } from 'react'

// ─── Config (misma fuente que DianaBookingCalendar) ───────────────────────────
const DOC_API = 'https://doc-api.cuidame.tech/api'
const DIANA_PROFESSIONAL_ID = 12

export interface DocService {
  prof_service_id: number
  service_id: number
  name: string
  description: string | null
  duration_minutes: number
  category: string
  price?: string
  image_url?: string | null
}

export const CATEGORY_LABEL: Record<string, string> = {
  consultation: 'Consulta',
  therapy: 'Terapia',
  procedure: 'Procedimiento',
  exam: 'Examen',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

// ─── Cache a nivel de módulo: una sola petición compartida por toda la página ─
let cachedServices: DocService[] | null = null
let inflight: Promise<DocService[]> | null = null

function fetchDocServices(): Promise<DocService[]> {
  if (cachedServices) return Promise.resolve(cachedServices)
  if (inflight) return inflight

  inflight = fetch(`${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/services`)
    .then(r => r.json())
    .then((json: { success?: boolean; data?: unknown }) => {
      const list = Array.isArray(json?.data) ? (json.data as DocService[]) : []
      cachedServices = list
      return list
    })
    .finally(() => { inflight = null })

  return inflight
}

interface UseDocServicesResult {
  services: DocService[]
  loading: boolean
  error: boolean
}

/**
 * Catálogo público de servicios de la Dra. Diana en CuidameDoc.
 * Lo alimentan tanto el panel admin (/api/services/catalog) como la app
 * de la doctora — cualquier servicio creado en cualquiera de los dos
 * aparece aquí sin redesplegar.
 */
export function useDocServices(): UseDocServicesResult {
  const [services, setServices] = useState<DocService[]>(cachedServices ?? [])
  const [loading, setLoading] = useState(cachedServices === null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetchDocServices()
      .then(list => {
        if (!active) return
        setServices(list)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { services, loading, error }
}
