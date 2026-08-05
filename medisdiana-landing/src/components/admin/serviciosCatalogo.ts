// medisdiana-landing/src/components/admin/serviciosCatalogo.ts

export interface Grupo {
  code: string;
  name: string;
}

export const GRUPOS: Grupo[] = [
  { code: '01', name: 'Consulta externa' },
  { code: '02', name: 'Apoyo diagnóstico y complementación terapéutica' },
  { code: '03', name: 'Internación' },
  { code: '04', name: 'Quirúrgico' },
  { code: '05', name: 'Atención inmediata' },
  { code: '06', name: 'Otros servicios' },
];

export interface Subgrupo {
  code: string;
  name: string;
}

/** Subgrupo is always a small, fixed enumeration hardcoded here — Categoría/Subcategoría always come from the backend. */
export const SUBGRUPOS: Record<string, Subgrupo[]> = {
  '01': [
    { code: '0101', name: 'Atención domiciliaria' },
    { code: '0102', name: 'Consulta de primera vez' },
    { code: '0103', name: 'Consulta de control o seguimiento' },
    { code: '0104', name: 'Interconsulta' },
    { code: '0105', name: 'Junta médica' },
    { code: '0106', name: 'Manejo intrahospitalario' },
    { code: '0107', name: 'Consulta de urgencias' },
  ],
  '02': [
    { code: '0201', name: 'Diagnóstico' },
    { code: '0202', name: 'Complementación terapéutica' },
  ],
  '03': [
    { code: '0301', name: 'Manejo intrahospitalario' },
  ],
  '04': [
    { code: '0401', name: 'Sistema nervioso' },
    { code: '0402', name: 'Sistema endocrino' },
    { code: '0403', name: 'Ojo' },
    { code: '0404', name: 'Oído' },
    { code: '0405', name: 'Nariz, boca y faringe' },
    { code: '0406', name: 'Sistema respiratorio' },
    { code: '0407', name: 'Sistema cardiovascular' },
    { code: '0408', name: 'Sistema hemático y linfático' },
    { code: '0409', name: 'Sistema digestivo' },
    { code: '0410', name: 'Sistema urinario' },
    { code: '0411', name: 'Órganos genitales masculinos' },
    { code: '0412', name: 'Órganos genitales femeninos' },
    { code: '0413', name: 'Procedimientos obstétricos' },
    { code: '0414', name: 'Sistema osteomuscular' },
    { code: '0415', name: 'Sistema tegumentario' },
  ],
  '05': [
    { code: '0501', name: 'Atención inicial de urgencias' },
  ],
  '06': [],
};

/** Every non-escape group fetches Categoría/Subcategoría from the backend. */
export const GRUPOS_DINAMICOS = ['01', '02', '03', '04', '05'];
