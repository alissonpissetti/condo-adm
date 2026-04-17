import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PlatformApiService,
  SaasVoucherRow,
} from '../../core/platform-api.service';

@Component({
  selector: 'app-vouchers',
  imports: [FormsModule],
  templateUrl: './vouchers.component.html',
  styleUrl: './vouchers.component.scss',
})
export class VouchersComponent {
  private readonly api = inject(PlatformApiService);

  protected readonly vouchers = signal<SaasVoucherRow[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly msg = signal<string | null>(null);

  protected newName = '';
  protected newCode = '';
  protected newDiscountPercent = 100;
  protected newValidFrom = '';
  protected newValidTo = '';
  protected newNotes = '';

  protected editingId: string | null = null;
  protected editName = '';
  protected editCode = '';
  protected editDiscount = 0;
  protected editValidFrom = '';
  protected editValidTo = '';
  protected editNotes = '';
  protected editActive = true;

  constructor() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    this.newValidFrom = `${y}-${m}-01`;
    const last = new Date(y, now.getMonth() + 1, 0);
    const dm = String(last.getMonth() + 1).padStart(2, '0');
    const dd = String(last.getDate()).padStart(2, '0');
    this.newValidTo = `${last.getFullYear()}-${dm}-${dd}`;
    this.refresh();
  }

  refresh(): void {
    this.error.set(null);
    this.api.vouchers().subscribe({
      next: (rows) => this.vouchers.set(rows),
      error: () => this.error.set('Não foi possível carregar os vouchers.'),
    });
  }

  create(): void {
    this.msg.set(null);
    const name = this.newName.trim();
    if (name.length < 2) {
      this.msg.set('Indique um nome para o voucher.');
      return;
    }
    const code = this.newCode.trim().replace(/\s+/g, '');
    if (code.length < 2 || !/^[A-Za-z0-9\-]+$/.test(code)) {
      this.msg.set(
        'Código: mín. 2 caracteres, só letras, números e hífen (sem espaços).',
      );
      return;
    }
    const d0 = this.newValidFrom.trim().slice(0, 10);
    const d1 = this.newValidTo.trim().slice(0, 10);
    if (d0.length < 10 || d1.length < 10) {
      this.msg.set('Indique as datas de vigência.');
      return;
    }
    const pct = Math.min(100, Math.max(0, Math.floor(this.newDiscountPercent)));
    this.api
      .createVoucher({
        name,
        code,
        discountPercent: pct,
        validFrom: d0,
        validTo: d1,
        notes: this.newNotes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.newName = '';
          this.newCode = '';
          this.newNotes = '';
          this.msg.set('Voucher criado no catálogo.');
          this.refresh();
        },
        error: () =>
          this.msg.set('Erro ao criar (código duplicado ou dados inválidos).'),
      });
  }

  startEdit(v: SaasVoucherRow): void {
    this.editingId = v.id;
    this.editName = v.name;
    this.editCode = v.code;
    this.editDiscount = v.discountPercent;
    this.editValidFrom = String(v.validFrom).slice(0, 10);
    this.editValidTo = String(v.validTo).slice(0, 10);
    this.editNotes = v.notes ?? '';
    this.editActive = v.active;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(id: string): void {
    this.msg.set(null);
    const name = this.editName.trim();
    const code = this.editCode.trim().replace(/\s+/g, '');
    if (name.length < 2 || code.length < 2 || !/^[A-Za-z0-9\-]+$/.test(code)) {
      this.msg.set('Nome e código inválidos.');
      return;
    }
    const d0 = this.editValidFrom.trim().slice(0, 10);
    const d1 = this.editValidTo.trim().slice(0, 10);
    this.api
      .patchVoucher(id, {
        name,
        code,
        discountPercent: Math.min(
          100,
          Math.max(0, Math.floor(this.editDiscount)),
        ),
        validFrom: d0,
        validTo: d1,
        notes: this.editNotes.trim() || null,
        active: this.editActive,
      })
      .subscribe({
        next: () => {
          this.editingId = null;
          this.msg.set('Voucher atualizado.');
          this.refresh();
        },
        error: () => this.msg.set('Erro ao salvar.'),
      });
  }
}
