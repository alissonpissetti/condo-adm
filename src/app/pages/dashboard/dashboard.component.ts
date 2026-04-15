import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  BulkChargeResultRow,
  PlatformApiService,
} from '../../core/platform-api.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly api = inject(PlatformApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly summary = signal<{
    condominiumTotal: number;
    pendingChargesThisMonth: number;
    referenceMonth: string;
  } | null>(null);
  protected readonly error = signal<string | null>(null);

  protected bulkMonth = new Date().toISOString().slice(0, 7);
  protected bulkDue = '';
  protected readonly bulkLoading = signal(false);
  protected readonly bulkMsg = signal<string | null>(null);
  protected readonly bulkResults = signal<BulkChargeResultRow[] | null>(null);

  constructor() {
    this.api.dashboardSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: () =>
        this.error.set('Não foi possível carregar o resumo. Verifique a API.'),
    });
  }

  runBulk(): void {
    this.bulkMsg.set(null);
    this.bulkResults.set(null);
    this.bulkLoading.set(true);
    const body: { referenceMonth: string; dueDate?: string } = {
      referenceMonth: this.bulkMonth.trim(),
    };
    if (this.bulkDue?.trim()) {
      body.dueDate = this.bulkDue.trim();
    }
    this.api
      .bulkCreateCharges(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.bulkLoading.set(false);
          this.bulkResults.set(res.results);
          const ok = res.results.filter((r) => r.ok).length;
          const fail = res.results.length - ok;
          this.bulkMsg.set(
            `Concluído: ${ok} com sucesso, ${fail} com erro (ver detalhes abaixo). Requer ASAAS_API_KEY e CPF dos titulares.`,
          );
        },
        error: () => {
          this.bulkLoading.set(false);
          this.bulkMsg.set('Pedido em massa falhou. Verifique a API e a Asaas.');
        },
      });
  }
}
