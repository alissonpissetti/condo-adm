import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected email = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    const msg = this.route.snapshot.queryParamMap.get('msg');
    if (msg === 'forbidden') {
      this.notice.set(
        'Esta conta não tem permissão de administrador da plataforma.',
      );
    }
  }

  submit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.auth
      .login(this.email.trim(), this.password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/app']);
        },
        error: (err: { error?: { message?: string }; status?: number }) => {
          this.loading.set(false);
          const m =
            err?.error?.message ??
            (err?.status === 401
              ? 'E-mail ou senha inválidos.'
              : 'Não foi possível entrar.');
          this.error.set(m);
        },
      });
  }
}
