import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PlatformApiService,
  type SaasPlanPriceTier,
  type SaasPlanRow,
} from '../../core/platform-api.service';

/** Linha de edição de faixa (última com maxUnits vazio = sem limite). */
interface TierLine {
  minUnits: number;
  maxUnits: string;
  priceReais: string;
}

@Component({
  selector: 'app-plans',
  imports: [FormsModule],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
})
export class PlansComponent {
  private readonly api = inject(PlatformApiService);

  protected readonly plans = signal<SaasPlanRow[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly msg = signal<string | null>(null);

  protected newName = '';
  protected newPriceReais = 0;
  protected newUseTiers = false;
  protected newTierLines: TierLine[] = PlansComponent.defaultTierLinesFromCents(0);

  protected editingId: number | null = null;
  protected editName = '';
  protected editPriceReais = 0;
  protected editActive = true;
  protected editCurrency = 'BRL';
  protected editCatalogBlurb = '';
  protected editNotes = '';
  protected editUseTiers = false;
  protected editTierLines: TierLine[] = PlansComponent.defaultTierLinesFromCents(0);

  constructor() {
    this.refresh();
  }

  private static defaultTierLinesFromCents(cents: number): TierLine[] {
    const pr = PlansComponent.formatReaisInput(cents);
    return [
      { minUnits: 1, maxUnits: '20', priceReais: pr },
      { minUnits: 21, maxUnits: '', priceReais: pr },
    ];
  }

  private static formatReaisInput(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  refresh(): void {
    this.error.set(null);
    this.api.plans().subscribe({
      next: (rows) => this.plans.set(rows),
      error: () => this.error.set('Não foi possível carregar os planos.'),
    });
  }

  formatCents(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  protected priceLabel(p: SaasPlanRow): string {
    if (p.unitPriceTiers?.length) {
      return `${p.unitPriceTiers.length} faixa(s) por volume`;
    }
    return this.formatCents(p.pricePerUnitCents);
  }

  protected onNewTiersModeChange(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.newUseTiers = checked;
    if (checked) {
      this.newTierLines = PlansComponent.defaultTierLinesFromCents(
        Math.round(this.newPriceReais * 100),
      );
    }
    this.msg.set(null);
  }

  protected onEditTiersModeChange(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.editUseTiers = checked;
    if (checked) {
      this.editTierLines = PlansComponent.defaultTierLinesFromCents(
        Math.round(this.editPriceReais * 100),
      );
    }
    this.msg.set(null);
  }

  protected addNewTierLine(): void {
    this.addTierLine(this.newTierLines);
  }

  protected addEditTierLine(): void {
    this.addTierLine(this.editTierLines);
  }

  protected removeNewTierLine(i: number): void {
    this.removeTierLine(this.newTierLines, i);
  }

  protected removeEditTierLine(i: number): void {
    this.removeTierLine(this.editTierLines, i);
  }

  private addTierLine(lines: TierLine[]): void {
    const prev = lines[lines.length - 1];
    const prevMaxRaw = String(prev.maxUnits ?? '').trim();
    if (prevMaxRaw === '') {
      this.msg.set(
        'Preencha "Até" da faixa actual antes de adicionar outra; a última faixa fica sem limite superior.',
      );
      return;
    }
    const prevMax = parseInt(prevMaxRaw, 10);
    if (!Number.isFinite(prevMax)) {
      this.msg.set('Máximo da faixa actual inválido.');
      return;
    }
    lines.push({
      minUnits: prevMax + 1,
      maxUnits: '',
      priceReais: prev.priceReais,
    });
    this.msg.set(null);
  }

  private removeTierLine(lines: TierLine[], index: number): void {
    if (lines.length <= 1) {
      return;
    }
    lines.splice(index, 1);
  }

  create(): void {
    this.msg.set(null);
    const name = this.newName.trim();
    if (name.length < 2) {
      this.msg.set('Indique um nome para o plano.');
      return;
    }

    if (this.newUseTiers) {
      const built = this.buildTiersFromLines(this.newTierLines);
      if (typeof built === 'string') {
        this.msg.set(built);
        return;
      }
      this.api
        .createPlan({
          name,
          pricePerUnitCents: built[0].pricePerUnitCents,
          unitPriceTiers: built,
        })
        .subscribe({
          next: () => {
            this.newName = '';
            this.newPriceReais = 0;
            this.newUseTiers = false;
            this.newTierLines = PlansComponent.defaultTierLinesFromCents(0);
            this.msg.set('Plano criado.');
            this.refresh();
          },
          error: (e) => this.msg.set(this.httpErr(e, 'Erro ao criar plano.')),
        });
      return;
    }

    const pricePerUnitCents = Math.round(this.newPriceReais * 100);
    if (pricePerUnitCents < 0) {
      this.msg.set('Preço inválido.');
      return;
    }
    this.api.createPlan({ name, pricePerUnitCents }).subscribe({
      next: () => {
        this.newName = '';
        this.newPriceReais = 0;
        this.msg.set('Plano criado.');
        this.refresh();
      },
      error: (e) => this.msg.set(this.httpErr(e, 'Erro ao criar plano.')),
    });
  }

  startEdit(p: SaasPlanRow): void {
    this.msg.set(null);
    this.editingId = p.id;
    this.editName = p.name;
    this.editPriceReais = p.pricePerUnitCents / 100;
    this.editActive = p.active;
    this.editCurrency = p.currency || 'BRL';
    this.editCatalogBlurb = p.catalogBlurb ?? '';
    this.editNotes = p.notes ?? '';
    const has = !!(p.unitPriceTiers && p.unitPriceTiers.length);
    this.editUseTiers = has;
    if (has) {
      const sorted = [...p.unitPriceTiers!].sort(
        (a, b) => a.minUnits - b.minUnits,
      );
      this.editTierLines = sorted.map((t) => ({
        minUnits: t.minUnits,
        maxUnits: t.maxUnits == null ? '' : String(t.maxUnits),
        priceReais: PlansComponent.formatReaisInput(t.pricePerUnitCents),
      }));
    } else {
      this.editTierLines = PlansComponent.defaultTierLinesFromCents(
        p.pricePerUnitCents,
      );
    }
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(id: number): void {
    this.msg.set(null);
    const body: Parameters<PlatformApiService['patchPlan']>[1] = {
      name: this.editName.trim(),
      active: this.editActive,
      currency: this.editCurrency.trim().toUpperCase().slice(0, 3),
      catalogBlurb: this.editCatalogBlurb.trim() || null,
      notes: this.editNotes.trim() || null,
    };

    if (this.editUseTiers) {
      const built = this.buildTiersFromLines(this.editTierLines);
      if (typeof built === 'string') {
        this.msg.set(built);
        return;
      }
      body.unitPriceTiers = built;
    } else {
      const pricePerUnitCents = Math.round(this.editPriceReais * 100);
      if (pricePerUnitCents < 0) {
        this.msg.set('Preço inválido.');
        return;
      }
      body.unitPriceTiers = null;
      body.pricePerUnitCents = pricePerUnitCents;
    }

    this.api.patchPlan(id, body).subscribe({
      next: () => {
        this.editingId = null;
        this.msg.set('Plano actualizado.');
        this.refresh();
      },
      error: (e) => this.msg.set(this.httpErr(e, 'Erro ao guardar.')),
    });
  }

  setDefault(id: number): void {
    this.msg.set(null);
    this.api.setDefaultPlan(id).subscribe({
      next: () => {
        this.msg.set('Plano padrão actualizado (novos registos).');
        this.refresh();
      },
      error: (e) =>
        this.msg.set(this.httpErr(e, 'Erro ao definir plano padrão.')),
    });
  }

  private buildTiersFromLines(
    rows: TierLine[],
  ): SaasPlanPriceTier[] | string {
    if (rows.length === 0) {
      return 'Adicione pelo menos uma faixa.';
    }
    const tiers: SaasPlanPriceTier[] = [];
    for (let i = 0; i < rows.length; i++) {
      const isLast = i === rows.length - 1;
      const minU = Math.floor(Number(rows[i].minUnits));
      if (!Number.isFinite(minU) || minU < 1) {
        return `Faixa ${i + 1}: mínimo de unidades inválido.`;
      }
      let maxU: number | null;
      if (isLast) {
        maxU = null;
      } else {
        const raw = String(rows[i].maxUnits ?? '').trim();
        maxU = parseInt(raw, 10);
        if (!Number.isFinite(maxU) || maxU < minU) {
          return `Faixa ${i + 1}: máximo inválido (≥ mínimo).`;
        }
      }
      const pr = this.parseReaisToCents(rows[i].priceReais);
      if (pr == null || pr < 0) {
        return `Faixa ${i + 1}: preço inválido (ex.: 8 ou 8,50).`;
      }
      tiers.push({
        minUnits: minU,
        maxUnits: maxU,
        pricePerUnitCents: pr,
      });
    }
    const lastRow = rows[rows.length - 1];
    if (!lastRow || String(lastRow.maxUnits ?? '').trim() !== '') {
      return 'A última faixa deve deixar "Até" vazio (sem limite superior).';
    }
    return tiers;
  }

  private parseReaisToCents(raw: string): number | null {
    const n = parseFloat(raw.trim().replace(',', '.'));
    if (!Number.isFinite(n)) {
      return null;
    }
    return Math.round(n * 100);
  }

  private httpErr(err: HttpErrorResponse, fallback: string): string {
    const o = err.error as { message?: string | string[] } | undefined;
    if (Array.isArray(o?.message)) {
      return o.message.join('; ');
    }
    if (typeof o?.message === 'string') {
      return o.message;
    }
    return fallback;
  }
}
