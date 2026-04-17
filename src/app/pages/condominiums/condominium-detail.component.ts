import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CondominiumPlanPricing,
  CondominiumVoucherAssignment,
  PlatformApiService,
  SaasBillingProfile,
  SaasChargeRow,
} from '../../core/platform-api.service';

@Component({
  selector: 'app-condominium-detail',
  imports: [FormsModule, RouterLink],
  templateUrl: './condominium-detail.component.html',
  styleUrl: './condominium-detail.component.scss',
})
export class CondominiumDetailComponent {
  private readonly api = inject(PlatformApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly condoId = signal<string | null>(null);
  protected readonly billing = signal<SaasBillingProfile | null>(null);
  protected readonly billingLoaded = signal(false);
  protected readonly charges = signal<SaasChargeRow[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly saveMsg = signal<string | null>(null);
  protected readonly chargeMsg = signal<string | null>(null);
  protected readonly planPricing = signal<CondominiumPlanPricing | null>(null);
  protected readonly condoVoucher = signal<CondominiumVoucherAssignment | null>(
    null,
  );
  protected readonly voucherMsg = signal<string | null>(null);

  protected status: 'active' | 'suspended' = 'active';
  protected notes = '';
  protected referenceMonth = new Date().toISOString().slice(0, 7);
  protected dueDate = '';
  /** Rascunho do código a aplicar (GET preenche com o código actual). */
  protected voucherCodeInput = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.condoId.set(id);
    if (id) {
      this.refresh(id);
    }
  }

  refresh(id: string): void {
    this.error.set(null);
    this.billingLoaded.set(false);
    this.api.getBilling(id).subscribe({
      next: (b) => {
        this.billing.set(b);
        this.billingLoaded.set(true);
        if (b) {
          this.status = b.status as 'active' | 'suspended';
          this.notes = b.notes ?? '';
        } else {
          this.status = 'active';
          this.notes = '';
        }
      },
      error: () => {
        this.billingLoaded.set(true);
        this.error.set('Não foi possível carregar o faturamento.');
      },
    });
    this.api.charges(id).subscribe({
      next: (c) => this.charges.set(c),
      error: () => {},
    });
    this.api.getCondominiumVoucher(id).subscribe({
      next: (r) => {
        this.condoVoucher.set(r);
        this.voucherCodeInput = r.voucher?.code ?? '';
      },
      error: () => {
        this.condoVoucher.set(null);
        this.voucherCodeInput = '';
      },
    });
    this.loadPlanPricing(id);
  }

  /** Atualiza só a pré-visualização (plano × unidades × vouchers do mês). */
  reloadPlanPricing(): void {
    const id = this.condoId();
    if (!id) {
      return;
    }
    this.loadPlanPricing(id);
  }

  private loadPlanPricing(condominiumId: string): void {
    const ref = this.referenceMonth?.trim() ?? '';
    this.api.condominiumPlanPricing(condominiumId, ref || undefined).subscribe({
      next: (p) => this.planPricing.set(p),
      error: () => this.planPricing.set(null),
    });
  }

  saveBilling(): void {
    const id = this.condoId();
    if (!id) {
      return;
    }
    this.saveMsg.set(null);
    this.api
      .patchBilling(id, {
        status: this.status,
        notes: this.notes || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.billing.set(b);
          this.saveMsg.set('Salvo.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.saveMsg.set(err?.error?.message ?? 'Erro ao salvar.');
        },
      });
  }

  applyVoucherCode(): void {
    const id = this.condoId();
    if (!id) {
      return;
    }
    this.voucherMsg.set(null);
    const raw = this.voucherCodeInput.trim();
    this.api
      .patchCondominiumVoucher(id, {
        code: raw === '' ? null : raw,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.condoVoucher.set(r);
          this.voucherMsg.set(
            r.voucher
              ? `Voucher «${r.voucher.name}» (${r.voucher.code}) aplicado.`
              : 'Voucher removido deste condomínio.',
          );
          this.loadPlanPricing(id);
        },
        error: (err: { error?: { message?: string } }) => {
          this.voucherMsg.set(
            err?.error?.message ?? 'Não foi possível aplicar o código.',
          );
        },
      });
  }

  removeVoucherFromCondominium(): void {
    const id = this.condoId();
    if (!id) {
      return;
    }
    this.voucherMsg.set(null);
    this.api
      .patchCondominiumVoucher(id, { code: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.condoVoucher.set(r);
          this.voucherCodeInput = '';
          this.voucherMsg.set('Voucher removido.');
          this.loadPlanPricing(id);
        },
        error: (err: { error?: { message?: string } }) => {
          this.voucherMsg.set(
            err?.error?.message ?? 'Não foi possível remover o voucher.',
          );
        },
      });
  }

  generateCharge(): void {
    const id = this.condoId();
    if (!id) {
      return;
    }
    this.chargeMsg.set(null);
    const body: { referenceMonth: string; dueDate?: string } = {
      referenceMonth: this.referenceMonth,
    };
    if (this.dueDate?.trim()) {
      body.dueDate = this.dueDate.trim();
    }
    this.api
      .createCharge(id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const ch = res.charge;
          const bonificado =
            !res.reused && ch && Number(ch.amountCents) === 0;
          this.chargeMsg.set(
            res.reused
              ? 'Já existia cobrança para este mês; dados devolvidos.'
              : bonificado
                ? 'Mês bonificado — registro local (sem cobrança Asaas).'
                : 'Cobrança criada na Asaas.',
          );
          this.refresh(id);
        },
        error: (err: { error?: { message?: string } }) => {
          this.chargeMsg.set(
            err?.error?.message ?? 'Não foi possível gerar a cobrança.',
          );
        },
      });
  }

  formatCents(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  chargeStatusBadgeClass(status: string): string {
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
      overdue: 'Em atraso',
      cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }
}
