export interface Disponibilite {
  date: string;         // ISO date (backend stores Date)
  heure_debut: string;  // "HH:mm"
  heure_fin: string;    // "HH:mm"
}

export interface Professionnel {
  _id?: string;
  userId: string;       // ref Utilisateur
  specialite: string;
  disponibilites?: Disponibilite[];
  createdAt?: string;
  updatedAt?: string;
}