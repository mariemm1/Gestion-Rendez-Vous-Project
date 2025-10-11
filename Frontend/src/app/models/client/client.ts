export interface Client {
  _id?: string;
  userId: string;                 // ref to Utilisateur
  historiqueRendezVous?: string[]; // RendezVous IDs
  createdAt?: string;
  updatedAt?: string;
}
