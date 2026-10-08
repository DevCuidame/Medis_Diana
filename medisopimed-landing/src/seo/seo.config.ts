export const SEO_CONFIG = {
  siteName: 'Medis',
  baseUrl: 'https://dianamedic.cuidame.tech',
  defaultTitle: 'Medis · Consultorio de Medicina Familiar',
  titleTemplate: (t: string) => `${t} · Medis`,
  defaultDescription:
    'Consultorio de la Dra. Diana Cristina Medina Camargo, especialista en ' +
    'Medicina Familiar y Comunitaria. Agenda tu cita en línea.',
  defaultImage: '/og/medis-og-cover.jpg',
  locale: 'es_CO',
  themeColor: '#2563EB',
} as const;
