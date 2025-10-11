// Matches backend model: utilisateur_id, role (CLIENT | PROFESSIONNEL), type, lue, dateEnvoi
export type NotificationType = 'Rendez-vous' | 'Annulation' | 'Rappel' | 'Confirmation';
export type NotificationRole = 'CLIENT' | 'PROFESSIONNEL';

export interface Notification {
  _id: string;
  utilisateur_id: string;   // owner userId
  role: NotificationRole;   // 'CLIENT' | 'PROFESSIONNEL'
  type: NotificationType;   // 'Rendez-vous' | 'Annulation' | 'Rappel' | 'Confirmation'
  message: string;
  lue: boolean;
  dateEnvoi: string;        // ISO date string from server
}
