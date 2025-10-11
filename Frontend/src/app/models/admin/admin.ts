export interface Admin {
  _id?: string;
  userId: string;       // ref to Utilisateur
  createdAt?: string;
  updatedAt?: string;
}
