import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  PlatformApiService,
  type PlatformSupportTicketRow,
  type PlatformSupportTicketStatus,
  type PlatformSupportTicketTarget,
} from '../../core/platform-api.service';

const STATUS_OPTIONS: { value: PlatformSupportTicketStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os estados' },
  { value: 'open', label: 'Aberto' },
  { value: 'triaged', label: 'Triado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Encerrado' },
];

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Erro',
  correction: 'Correção',
  improvement: 'Melhoria',
  feature: 'Nova funcionalidade',
  other: 'Outro',
  condo_complaint: 'Reclamação',
  condo_request: 'Solicitação',
  condo_order: 'Pedido',
  condo_information: 'Informação',
  condo_agenda_suggestion: 'Sugestão de pauta condominial',
  condo_other: 'Outros',
};

@Component({
  selector: 'app-support-tickets',
  imports: [DatePipe],
  templateUrl: './support-tickets.component.html',
  styleUrl: './support-tickets.component.scss',
})
export class SupportTicketsComponent {
  private readonly api = inject(PlatformApiService);
  private readonly router = inject(Router);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;
  protected readonly targetLabel = (t: PlatformSupportTicketTarget | undefined) =>
    t === 'condominium' ? 'Ao condomínio' : 'À plataforma';
  protected readonly statusLabel = (s: PlatformSupportTicketStatus) =>
    STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

  protected readonly items = signal<PlatformSupportTicketRow[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly error = signal<string | null>(null);
  protected readonly filterStatus = signal<PlatformSupportTicketStatus | ''>('');

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit)),
  );

  constructor() {
    this.load(1);
  }

  load(p: number): void {
    this.error.set(null);
    const st = this.filterStatus();
    this.api.supportTickets(p, this.limit, st || undefined).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.page.set(res.page);
      },
      error: () =>
        this.error.set('Não foi possível carregar as solicitações de suporte.'),
    });
  }

  protected setFilterFromEvent(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value as
      | PlatformSupportTicketStatus
      | '';
    this.filterStatus.set(v);
    this.load(1);
  }

  protected openTicket(id: string): void {
    void this.router.navigate(['/app', 'suporte', id]);
  }

  protected prev(): void {
    const p = this.page();
    if (p > 1) {
      this.load(p - 1);
    }
  }

  protected next(): void {
    const p = this.page();
    if (p * this.limit < this.total()) {
      this.load(p + 1);
    }
  }
}
