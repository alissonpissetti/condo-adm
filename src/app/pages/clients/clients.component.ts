import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { PlatformApiService, PlatformUserRow } from '../../core/platform-api.service';

@Component({
  selector: 'app-clients',
  imports: [DatePipe],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent {
  private readonly api = inject(PlatformApiService);

  protected readonly items = signal<PlatformUserRow[]>([]);
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
    this.api.users(p, this.limit).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.page.set(res.page);
      },
      error: () =>
        this.error.set('Não foi possível carregar os clientes.'),
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
}
