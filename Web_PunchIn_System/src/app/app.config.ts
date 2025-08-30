import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

import { MessageService } from 'primeng/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes),
    provideAnimationsAsync(), 
    MessageService,
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
            darkModeSelector: false || 'none'
        }
        
      }
    })
  ]
};
