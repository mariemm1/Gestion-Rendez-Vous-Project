// Backend uses French statuses + separate 'heure' field and client/prof IDs
export type RdvStatut = 'Confirmé' | 'Annulé' | 'En attente';

export interface RendezVous {
  _id: string;
  date: string;              // date from DB; treat as ISO string on the client
  heure: string;             // "HH:mm"
  statut: RdvStatut;
  client_id: string;         // ObjectId string of Client doc
  professionnel_id: string;  // ObjectId string of Professionnel doc
}
