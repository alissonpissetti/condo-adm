import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PlatformApiService,
  PlatformCondominiumRow,
} from '../../core/platform-api.service';

@Component({
  selector: 'app-condominiums-list',
  imports: [RouterLink],
  templateUrl: './condominiums-list.component.html',
  styleUrl: './condominiums-list.component.scss',
})
export class CondominiumsListComponent {
  private readonly api = inject(PlatformApiService);

  protected readonly items = signal<PlatformCondominiumRow[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly error = signal<string | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit)),
  );

  constructor() {
    this.load(1);
  }

  load(p: number): void {
    this.error.set(null);
    this.api.condominiums(p, this.limit).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.page.set(res.page);
      },
      error: () =>
        this.error.set('Não foi possível carregar os condomínios.'),
    });
  }

  formatCents(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  prev(): void {
    const p = this.page();
    if (p > 1) {
      this.load(p - 1);
    }
  }

  next(): void {
    const p = this.page();
    if (p * this.limit < this.total()) {
      this.load(p + 1);
    }
  }

  billingBadgeClass(b: PlatformCondominiumRow['billing']): string {
    if (!b) {
      return 'adm-badge adm-badge--neutral';
    }
    return b.status === 'active'
      ? 'adm-badge adm-badge--success'
      : 'adm-badge adm-badge--warning';
  }

  billingBadgeText(b: PlatformCondominiumRow['billing']): string {
    if (!b) {
      return 'Sem perfil';
    }
    return b.status === 'active' ? 'Ativo' : 'Suspenso';
  }

  chargeBadgeClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'adm-badge adm-badge--success';
      case 'overdue':
        return 'adm-badge adm-badge--warning';
      case 'cancelled':
        return 'adm-badge adm-badge--danger';
      default:
        return 'adm-badge adm-badge--neutral';
    }
  }

  chargeStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Paga',
      overdue: 'Atraso',
      cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }
}
