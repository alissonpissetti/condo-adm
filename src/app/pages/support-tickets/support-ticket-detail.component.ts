import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PlatformApiService,
  type PlatformSupportTicketConversation,
  type PlatformSupportTicketMessage,
  type PlatformSupportTicketRow,
  type PlatformSupportTicketStatus,
  type PlatformSupportTicketTarget,
} from '../../core/platform-api.service';

const STATUS_OPTIONS: { value: PlatformSupportTicketStatus; label: string }[] = [
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
  selector: 'app-support-ticket-detail',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './support-ticket-detail.component.html',
  styleUrl: './support-ticket-detail.component.scss',
})
export class SupportTicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PlatformApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;
  protected readonly targetLabel = (t: PlatformSupportTicketTarget | undefined) =>
    t === 'condominium'
      ? 'Solicitação ao condomínio'
      : 'Solicitação à plataforma Meu Condomínio';
  protected readonly statusLabel = (s: PlatformSupportTicketStatus) =>
    STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

  protected readonly loadError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly ticket = signal<PlatformSupportTicketRow | null>(null);
  protected readonly messages = signal<PlatformSupportTicketMessage[]>([]);

  protected readonly statusDraft = signal<PlatformSupportTicketStatus>('open');
  protected readonly patchBusy = signal(false);
  protected readonly patchError = signal<string | null>(null);

  protected readonly replyForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20000)]],
  });
  protected readonly replyBusy = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySuccess = signal<string | null>(null);

  protected readonly copyHint = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('ticketId');
    if (!id) {
      this.loadError.set('Chamado inválido.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.supportTicketConversation(id).subscribe({
      next: (res: PlatformSupportTicketConversation) => {
        this.applyConversation(res);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadError.set(
          err instanceof HttpErrorResponse
            ? err.status === 404
              ? 'Chamado não encontrado.'
              : 'Não foi possível carregar o chamado.'
            : 'Não foi possível carregar o chamado.',
        );
      },
    });
  }

  private applyConversation(res: PlatformSupportTicketConversation): void {
    this.ticket.set(res.ticket);
    this.messages.set(res.messages);
    this.statusDraft.set(res.ticket.status);
  }

  protected saveStatus(): void {
    const t = this.ticket();
    const id = t?.id;
    if (!t || !id) {
      return;
    }
    const next = this.statusDraft();
    if (next === t.status) {
      return;
    }
    this.patchBusy.set(true);
    this.patchError.set(null);
    this.api.patchSupportTicket(id, { status: next }).subscribe({
      next: (row) => {
        this.ticket.set(row);
        this.patchBusy.set(false);
      },
      error: () => {
        this.patchBusy.set(false);
        this.patchError.set('Não foi possível atualizar o estado.');
      },
    });
  }

  protected setStatusDraftFromEvent(ev: Event): void {
    this.statusDraft.set(
      (ev.target as HTMLSelectElement).value as PlatformSupportTicketStatus,
    );
  }

  protected submitReply(): void {
    const t = this.ticket();
    const id = t?.id;
    if (!t || !id || t.status === 'closed') {
      return;
    }
    this.replyError.set(null);
    this.replySuccess.set(null);
    if (this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      return;
    }
    this.replyBusy.set(true);
    this.api
      .postSupportTicketMessage(id, { body: this.replyForm.controls.body.value.trim() })
      .subscribe({
        next: (res) => {
          this.applyConversation(res);
          this.replyForm.reset({ body: '' });
          this.replyBusy.set(false);
          this.replySuccess.set('Resposta enviada. O cliente recebeu um e-mail com o link para acompanhar.');
        },
        error: () => {
          this.replyBusy.set(false);
          this.replyError.set('Não foi possível enviar a resposta.');
        },
      });
  }

  protected copyClientLink(): void {
    const url = this.ticket()?.clientFollowUrl;
    if (!url?.trim()) {
      this.copyHint.set('Defina FRONTEND_PUBLIC_URL na API para gerar o link.');
      return;
    }
    void navigator.clipboard.writeText(url).then(
      () => {
        this.copyHint.set('Link copiado para a área de transferência.');
      },
      () => {
        this.copyHint.set('Não foi possível copiar. Copie manualmente: ' + url);
      },
    );
  }

  protected backToList(): void {
    void this.router.navigate(['/app', 'suporte']);
  }
}
