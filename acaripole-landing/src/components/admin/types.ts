export interface User {
  id: string;
  nombre: string;
  documento: string;
  rol: 'Usuario' | 'Administrador' | 'Profesional';
  estado: 'Activa' | 'Inactiva';
  imagen?: string;
  especialidades?: string[];
  raw?: any;
}
