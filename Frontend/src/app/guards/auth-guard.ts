// src/app/guards/auth.guard.ts

// Importe les types/fonctions nécessaires pour créer un guard routier
import { CanActivateFn, Router, UrlTree } from '@angular/router';
// Fournit l’API d’injection de dépendances en mode « standalone »
import { inject } from '@angular/core';
// Service d’authentification maison (statut connecté, rôle, etc.)
import { AuthService } from '../services/auth/auth';

// -------- Guard simple d’authentification --------

// Déclare un guard « standalone » (fonction) qui renvoie un booléen ou une UrlTree
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  // Récupère une instance d’AuthService via l’injection de dépendances
  const auth = inject(AuthService);
  // Récupère le Router pour pouvoir rediriger si besoin
  const router = inject(Router);
  // Si l’utilisateur est connecté => autorise (true), sinon => redirige vers /login
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// -------- Guard de rôle (autorise selon un ou plusieurs rôles) --------

// Fonction fabrique : reçoit une liste de rôles autorisés et retourne un CanActivateFn
export function roleGuard(roles: string[]): CanActivateFn {
  // Le guard retourné est une fonction (même contrat que ci-dessus)
  return (): boolean | UrlTree => {
    // Injection des services nécessaires
    const auth = inject(AuthService);
    const router = inject(Router);
    // Récupère le rôle courant (décodé du token par AuthService)
    const role = auth.role;
    // Si un rôle est présent et fait partie de la liste autorisée => ok
    // Sinon on redirige (ici vers /tabs/home ; ajustez la route si besoin)
    return role && roles.includes(role) ? true : router.createUrlTree(['/tabs/home']);
  };
}
