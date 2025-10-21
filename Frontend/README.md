# 📱 Frontend – Gestion de Rendez-vous (Ionic + Angular + Capacitor)

## 🧾 Description du projet

Ce dépôt contient l’application **frontend** réalisée avec **Ionic (Angular)** et **Capacitor**.  
Elle consomme l’API REST de l’application backend (Node/Express/MongoDB) et propose trois espaces distincts :

- **Client** : prise de rendez-vous, consultation, notifications.
- **Professionnel** : gestion des disponibilités et confirmation des RDV.
- **Admin** : vue globale (statistiques, contrôle, modération).

L’interface est responsive (mobile/web) et sécurisée par **JWT** (via un Interceptor + Guards).

---

## ✨ Fonctionnalités principales

- 🔐 **Authentification JWT** (login/register), lecture du profil `/auth/me`
- 👥 **Rôles** : `CLIENT`, `PROFESSIONNEL`, `ADMIN` (guards + UI spécifique)
- 📅 **Rendez-vous** : création, confirmation, annulation, suppression
- 🩺 **Disponibilités Pro** : ajout/suppression de créneaux (jour + heures)
- 🔔 **Notifications** : badge non lus + liste + marquer comme lue/supprimer
- 🧭 **Navigation structurée** : Shell latéral (sidebar) + routes par rôle
- 🖌️ **Design** : composants Ionic, pages Angular, SCSS propres
- 📱 **Capacitor** prêt pour Android (et iOS si activé)

---

## 🧰 Pile technique

| Tech             | Usage                                      |
|------------------|--------------------------------------------|
| Ionic (Angular)  | UI & navigation (web + mobile)             |
| Capacitor        | Build mobile natif (Android/iOS)           |
| RxJS             | Flux réactifs (HTTP, stores)               |
| JWT Interceptor  | Injection du token `Authorization: Bearer` |
| SCSS             | Styles modulaires                          |

---


---

## ⚙️ Configuration

### 1) Variables d’environnement (API URL)

`src/environments/environment.ts` :
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000' // <-- Backend URL
};
