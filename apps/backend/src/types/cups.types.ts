export interface CupsCandidate {
  cupsCode: string;
  procedureName: string;
}

export type CupsLookupResult =
  | { match: 'unique'; cupsCode: string; procedureName: string }
  | { match: 'ambiguous'; candidates: CupsCandidate[] };

export interface ClassificationCategory {
  serviceCategory: string;
  categoryName: string;
}

export interface ClassificationSubcategory {
  serviceSubcategory: string;
  procedureName: string;
}

export interface CreateMappingDTO {
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  cupsCode: string;
}
