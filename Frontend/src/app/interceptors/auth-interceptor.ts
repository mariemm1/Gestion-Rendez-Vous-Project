// src/app/interceptors/auth-interceptor.ts

// Import des décorateurs et utilitaires d’injection Angular
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
// Helper Angular pour savoir si le code s’exécute dans un navigateur
import { isPlatformBrowser } from '@angular/common';
// Interfaces nécessaires pour créer un intercepteur HTTP
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
// Type Observable pour la chaîne des requêtes HTTP
import { Observable } from 'rxjs';
// Service qui lit/stocke le token (localStorage / Capacitor Preferences)
import { AuthTokenService } from '../services/auth-token/auth-token';

/**
 * Intercepteur qui ajoute l’en-tête Authorization: Bearer <token>
 * aux requêtes HTTP sortantes (uniquement côté navigateur).
 */
@Injectable() // Rend l’intercepteur injectable par le système de DI d’Angular
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    // Service maison qui expose la propriété `token`
    private tokens: AuthTokenService,
    // Injection du jeton de plateforme pour détecter navigateur vs serveur
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode appelée pour chaque requête HTTP sortante
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ne manipuler la requête que si on est dans un navigateur (pas en SSR)
    if (isPlatformBrowser(this.platformId)) {
      // Récupère le JWT courant (peut être null)
      const token = this.tokens.token;
      // Si présent, clone la requête en y ajoutant l’en-tête Authorization
      if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    // Passe la requête (originale ou clonée) à l’étape suivante du pipeline
    return next.handle(req);
  }
}
