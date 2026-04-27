import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlatformMe {
  email: string;
  platformAdmin: true;
}

export interface PlatformUserRow {
  id: string;
  email: string;
  phone: string | null;
  createdAt: string;
  condominiumCount: number;
  planId: number | null;
  planName: string | null;
}

export interface PlatformUsersPage {
  items: PlatformUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface PlatformCondominiumRow {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  billing: {
    monthlyAmountCents: number;
    currency: string;
    status: string;
  } | null;
  lastCharge: {
    referenceMonth: string;
    status: string;
    dueDate: string;
  } | null;
}

export interface PlatformCondominiumsPage {
  items: PlatformCondominiumRow[];
  total: number;
  page: number;
  limit: number;
}

export interface SaasBillingProfile {
  condominiumId: string;
  monthlyAmountCents: number;
  currency: string;
  asaasCustomerId: string | null;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export interface SaasChargeRow {
  id: string;
  condominiumId: string;
  referenceMonth: string;
  amountCents: number;
  dueDate: string;
  status: string;
  asaasPaymentId: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixQrPayload: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  condominiumTotal: number;
  pendingChargesThisMonth: number;
  referenceMonth: string;
}

export interface SaasPlanPriceTier {
  minUnits: number;
  maxUnits: number | null;
  pricePerUnitCents: number;
}

/**
 * Chaves canônicas de módulos habilitados/bloqueados por plano (espelham o
 * menu do painel do condomínio). Mantém sincronizada com
 * `condo-api/src/platform/saas-plan-features.ts` e
 * `condo-web/src/app/core/condominium-plan-features.ts`.
 */
export const SAAS_PLAN_FEATURE_KEYS = [
  'editCondominium',
  'units',
  'invitations',
  'members',
  'unitShortcuts',
  'financialTransactions',
  'financialStatement',
  'funds',
  'condoFees',
  'planning',
  'documents',
] as const;

export type SaasPlanFeatureKey = (typeof SAAS_PLAN_FEATURE_KEYS)[number];
export type SaasPlanFeatures = Record<SaasPlanFeatureKey, boolean>;

export const SAAS_PLAN_FEATURE_LABELS: Record<SaasPlanFeatureKey, string> = {
  editCondominium: 'Editar condomínio',
  units: 'Unidades',
  invitations: 'Convites',
  members: 'Membros',
  unitShortcuts: 'Atalhos por unidade',
  financialTransactions: 'Transações financeiras',
  financialStatement: 'Extrato',
  funds: 'Fundos',
  condoFees: 'Taxas condominiais',
  planning: 'Pautas / planejamento',
  documents: 'Comunicação',
};

export interface SaasPlanRow {
  id: number;
  name: string;
  pricePerUnitCents: number;
  unitPriceTiers?: SaasPlanPriceTier[] | null;
  currency: string;
  isDefault: boolean;
  active: boolean;
  catalogBlurb?: string | null;
  notes: string | null;
  /** `null` em planos legados = sem restrição (todos os módulos liberados). */
  features?: Partial<SaasPlanFeatures> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CondominiumPlanPricing {
  condominiumId: string;
  unitCount: number;
  planId: number;
  planName: string;
  pricePerUnitCents: number;
  monthlyCents: number;
  currency: string;
  baseMonthlyCents?: number;
  discountPercent?: number;
  appliedVoucherIds?: string[];
  appliedLabels?: string[];
  referenceMonth?: string;
}

/** Catálogo de vouchers (nome + código único). */
export interface SaasVoucherRow {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  validFrom: string;
  validTo: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaasVoucherSaved {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  validFrom: string;
  validTo: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CondominiumVoucherAssignment {
  voucher: {
    id: string;
    name: string;
    code: string;
    discountPercent: number;
    validFrom: string;
    validTo: string;
    active: boolean;
  } | null;
}

export interface BulkChargeResultRow {
  condominiumId: string;
  ok: boolean;
  reused?: boolean;
  error?: string;
  charge?: SaasChargeRow;
}

export type PlatformSupportTicketTarget = 'platform' | 'condominium';

export type PlatformSupportTicketCategory =
  | 'bug'
  | 'correction'
  | 'feature'
  | 'improvement'
  | 'other'
  | 'condo_complaint'
  | 'condo_request'
  | 'condo_order'
  | 'condo_information'
  | 'condo_agenda_suggestion'
  | 'condo_other';

export type PlatformSupportTicketStatus =
  | 'open'
  | 'triaged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface PlatformSupportTicketRow {
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string | null;
  userFullName: string | null;
  target: PlatformSupportTicketTarget;
  condominiumId: string | null;
  condominiumName: string | null;
  category: PlatformSupportTicketCategory;
  title: string;
  body: string;
  status: PlatformSupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  /** Link com token para o cliente (e-mail); null se `FRONTEND_PUBLIC_URL` não estiver definida na API. */
  clientFollowUrl: string | null;
}

export interface PlatformSupportTicketMessage {
  id: string;
  body: string;
  createdAt: string;
  fromPlatformAdmin: boolean;
  authorUserId: string;
  authorEmail?: string;
}

export interface PlatformSupportTicketConversation {
  ticket: PlatformSupportTicketRow;
  messages: PlatformSupportTicketMessage[];
}

export interface PlatformSupportTicketsPage {
  items: PlatformSupportTicketRow[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/platform`;

  me(): Observable<PlatformMe> {
    return this.http.get<PlatformMe>(`${this.base}/me`);
  }

  users(page = 1, limit = 20): Observable<PlatformUsersPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PlatformUsersPage>(`${this.base}/users`, { params });
  }

  condominiums(page = 1, limit = 20): Observable<PlatformCondominiumsPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PlatformCondominiumsPage>(`${this.base}/condominiums`, {
      params,
    });
  }

  dashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`);
  }

  getBilling(condominiumId: string): Observable<SaasBillingProfile | null> {
    return this.http.get<SaasBillingProfile | null>(
      `${this.base}/condominiums/${condominiumId}/billing`,
    );
  }

  patchBilling(
    condominiumId: string,
    body: Partial<{
      monthlyAmountCents: number;
      currency: string;
      status: string;
      notes: string | null;
    }>,
  ): Observable<SaasBillingProfile> {
    return this.http.patch<SaasBillingProfile>(
      `${this.base}/condominiums/${condominiumId}/billing`,
      body,
    );
  }

  charges(condominiumId: string): Observable<SaasChargeRow[]> {
    return this.http.get<SaasChargeRow[]>(
      `${this.base}/condominiums/${condominiumId}/billing/charges`,
    );
  }

  createCharge(
    condominiumId: string,
    body: { referenceMonth: string; dueDate?: string },
  ): Observable<{ reused: boolean; charge: SaasChargeRow }> {
    return this.http.post<{ reused: boolean; charge: SaasChargeRow }>(
      `${this.base}/condominiums/${condominiumId}/billing/charges`,
      body,
    );
  }

  plans(): Observable<SaasPlanRow[]> {
    return this.http.get<SaasPlanRow[]>(`${this.base}/plans`);
  }

  createPlan(body: {
    name: string;
    pricePerUnitCents: number;
    unitPriceTiers?: SaasPlanPriceTier[] | null;
    currency?: string;
    active?: boolean;
    notes?: string | null;
    catalogBlurb?: string | null;
    features?: Partial<SaasPlanFeatures> | null;
  }): Observable<SaasPlanRow> {
    return this.http.post<SaasPlanRow>(`${this.base}/plans`, body);
  }

  patchPlan(
    planId: number,
    body: Partial<{
      name: string;
      pricePerUnitCents: number;
      unitPriceTiers: SaasPlanPriceTier[] | null;
      currency: string;
      active: boolean;
      notes: string | null;
      catalogBlurb: string | null;
      features: Partial<SaasPlanFeatures> | null;
    }>,
  ): Observable<SaasPlanRow> {
    return this.http.patch<SaasPlanRow>(`${this.base}/plans/${planId}`, body);
  }

  setDefaultPlan(planId: number): Observable<SaasPlanRow> {
    return this.http.post<SaasPlanRow>(
      `${this.base}/plans/${planId}/set-default`,
      {},
    );
  }

  deletePlan(planId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plans/${planId}`);
  }

  condominiumPlanPricing(
    condominiumId: string,
    referenceMonth?: string,
  ): Observable<CondominiumPlanPricing> {
    let params = new HttpParams();
    if (referenceMonth?.trim()) {
      params = params.set('referenceMonth', referenceMonth.trim());
    }
    return this.http.get<CondominiumPlanPricing>(
      `${this.base}/condominiums/${condominiumId}/plan-pricing`,
      { params },
    );
  }

  vouchers(): Observable<SaasVoucherRow[]> {
    return this.http.get<SaasVoucherRow[]>(`${this.base}/vouchers`);
  }

  createVoucher(body: {
    name: string;
    code: string;
    discountPercent: number;
    validFrom: string;
    validTo: string;
    notes?: string | null;
    active?: boolean;
  }): Observable<SaasVoucherSaved> {
    return this.http.post<SaasVoucherSaved>(`${this.base}/vouchers`, body);
  }

  patchVoucher(
    voucherId: string,
    body: Partial<{
      name: string;
      code: string;
      discountPercent: number;
      validFrom: string;
      validTo: string;
      notes: string | null;
      active: boolean;
    }>,
  ): Observable<SaasVoucherSaved> {
    return this.http.patch<SaasVoucherSaved>(
      `${this.base}/vouchers/${voucherId}`,
      body,
    );
  }

  getCondominiumVoucher(
    condominiumId: string,
  ): Observable<CondominiumVoucherAssignment> {
    return this.http.get<CondominiumVoucherAssignment>(
      `${this.base}/condominiums/${condominiumId}/voucher`,
    );
  }

  patchCondominiumVoucher(
    condominiumId: string,
    body: { code: string | null },
  ): Observable<CondominiumVoucherAssignment> {
    return this.http.patch<CondominiumVoucherAssignment>(
      `${this.base}/condominiums/${condominiumId}/voucher`,
      body,
    );
  }

  bulkCreateCharges(body: {
    referenceMonth: string;
    dueDate?: string;
  }): Observable<{ results: BulkChargeResultRow[] }> {
    return this.http.post<{ results: BulkChargeResultRow[] }>(
      `${this.base}/billing/charges/bulk`,
      body,
    );
  }

  supportTickets(
    page = 1,
    limit = 20,
    status?: PlatformSupportTicketStatus | '' | null,
  ): Observable<PlatformSupportTicketsPage> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    const s = status?.trim();
    if (s) {
      params = params.set('status', s);
    }
    return this.http.get<PlatformSupportTicketsPage>(
      `${this.base}/support-tickets`,
      { params },
    );
  }

  patchSupportTicket(
    ticketId: string,
    body: { status: PlatformSupportTicketStatus },
  ): Observable<PlatformSupportTicketRow> {
    return this.http.patch<PlatformSupportTicketRow>(
      `${this.base}/support-tickets/${ticketId}`,
      body,
    );
  }

  supportTicketConversation(
    ticketId: string,
  ): Observable<PlatformSupportTicketConversation> {
    return this.http.get<PlatformSupportTicketConversation>(
      `${this.base}/support-tickets/${ticketId}/conversation`,
    );
  }

  postSupportTicketMessage(
    ticketId: string,
    body: { body: string },
  ): Observable<PlatformSupportTicketConversation> {
    return this.http.post<PlatformSupportTicketConversation>(
      `${this.base}/support-tickets/${ticketId}/messages`,
      body,
    );
  }
}
