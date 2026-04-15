import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Garante JWT + perfil `platform_admin` na API (GET /platform/me). */
export const platformGuard: CanActivateFn = () => {
  const http = inject(HttpClient);
  const auth = inject(AuthService);
  const router = inject(Router);
  return http
    .get<{ email: string; platformAdmin: boolean }>(
      `${environment.apiUrl}/platform/me`,
    )
    .pipe(
      map(() => true),
      catchError((err: { status?: number }) => {
        if (err?.status === 403) {
          auth.logout();
          return of(
            router.createUrlTree(['/login'], {
              queryParams: { msg: 'forbidden' },
            }),
          );
        }
        auth.logout();
        return of(router.createUrlTree(['/login']));
      }),
    );
};
