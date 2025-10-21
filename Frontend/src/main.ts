import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { AuthInterceptor } from './app/interceptors/auth-interceptor';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// 👇 Add this to enable camera UI on the web (localhost/https)
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // Let Angular DI supply interceptors to HttpClient
    provideHttpClient(withInterceptorsFromDi()),

    // Register our auth interceptor
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
}).catch(err => console.error(err));
