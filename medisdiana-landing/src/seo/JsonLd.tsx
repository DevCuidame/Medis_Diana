import React from 'react';
import { buildMedicalClinicSchema } from './schema/medicalClinic';

export function MedicalClinicJsonLd(): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildMedicalClinicSchema()),
      }}
    />
  );
}
