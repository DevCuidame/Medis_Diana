export type ProfessionalStatus = 'available' | 'in_session' | 'offline'

// ─── DB row shape ─────────────────────────────────────────────────────────────
export interface ProfessionalRecord {
  id:                string
  email:             string
  first_name:        string
  last_name:         string
  phone:             string | null
  role:              string
  bio:               string | null
  specialties:       string[] | null
  instagram_url:     string | null
  avatar_url:        string | null
  status:            ProfessionalStatus
  is_active:         boolean
  is_verified:       boolean
  professional_type: 'dependiente' | 'independiente'
  id_type:                     string | null
  id_number:                   string | null
  middle_name:                 string | null
  second_last_name:            string | null
  personal_address:            string | null
  medical_registration_number: string | null
  sispro_username:             string | null
  created_at:        Date
  updated_at:        Date
  // joined from rating summary
  avg_score:     string | null
  total_reviews: string | null
}

// ─── API response shape ───────────────────────────────────────────────────────
export interface ProfessionalPublic {
  id:               string
  email:            string
  role:             'USER' | 'PROFESSIONAL' | 'ADMIN'
  firstName:        string
  lastName:         string
  phone:            string | null
  bio:              string | null
  specialties:      string[]
  instagramUrl:     string | null
  avatarUrl:        string | null
  status:           ProfessionalStatus
  isActive:         boolean
  isVerified:       boolean
  professionalType: 'dependiente' | 'independiente'
  idType:                   string | null
  idNumber:                 string | null
  middleName:               string | null
  secondLastName:           string | null
  personalAddress:          string | null
  medicalRegistrationNumber: string | null
  sisproUsername:           string | null
  avgScore:         number
  totalReviews:     number
  createdAt:        string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateProfessionalDTO {
  email:            string
  password:         string
  firstName:        string
  lastName:         string
  phone?:           string
  bio?:             string
  specialties?:     string[]
  instagramUrl?:    string
  avatarUrl?:       string
  professionalType?: 'dependiente' | 'independiente'
  idType:            string
  idNumber:          string
  middleName?:       string
  secondLastName?:   string
  personalAddress:   string
  medicalRegistrationNumber?: string
  sisproUsername?:   string
  sisproPassword?:   string
}

export interface UpdateProfessionalDTO {
  email?:       string
  password?:    string
  firstName?:   string
  lastName?:    string
  phone?:       string
  bio?:         string
  specialties?: string[]
  instagramUrl?: string
  avatarUrl?:   string
  isActive?:    boolean
  isVerified?:  boolean
  role?:            'USER' | 'PROFESSIONAL' | 'ADMIN'
  professionalType?: 'dependiente' | 'independiente'
  idType?:            string
  idNumber?:          string
  middleName?:        string
  secondLastName?:    string
  personalAddress?:   string
  medicalRegistrationNumber?: string
  sisproUsername?:    string
  sisproPassword?:    string
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface ProfessionalStats {
  totalProfessionals:  number
  activeProfessionals: number
  avgSatisfaction:     number
  weeklyBookings:      number
  totalDisciplines:    number
}
