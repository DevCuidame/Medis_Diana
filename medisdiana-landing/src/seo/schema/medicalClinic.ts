import { SEO_CONFIG } from '../seo.config';

const { baseUrl, defaultImage } = SEO_CONFIG;

export function buildMedicalClinicSchema(): Record<string, unknown> {
  // TODO: Replace TODO_ placeholders (addressLocality, streetAddress, telephone)
  // with the clinic's real NAP (Name, Address, Phone) data before going live.
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    '@id': `${baseUrl}/#clinic`,
    name: SEO_CONFIG.siteName,
    url: baseUrl,
    image: new URL(defaultImage, baseUrl).toString(),
    logo: `${baseUrl}/Logo_Medis.png`,
    priceRange: '$$',
    medicalSpecialty: 'FamilyPractice',
    availableService: {
      '@type': 'MedicalProcedure',
      name: 'Consulta de Medicina Familiar y Comunitaria',
    },
    physician: {
      '@type': 'Physician',
      name: 'Dra. Diana Cristina Medina Camargo',
      medicalSpecialty: 'FamilyPractice',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CO',
      addressLocality: 'TODO_CIUDAD',
      streetAddress: 'TODO_DIRECCION',
    },
    telephone: 'TODO_TELEFONO',
    potentialAction: {
      '@type': 'ReserveAction',
      target: `${baseUrl}/agendar`,
      name: 'Agendar cita',
    },
  };
}
