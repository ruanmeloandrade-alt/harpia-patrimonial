import type { CatalogRepository } from '../catalog/catalogRepository';
import type {
  CommercialDashboardMetrics,
  CommercialMetricKey,
  CommercialMetricsProvider,
} from './dashboardService';

export interface CrmMetricLead {
  id: string;
  source?: string;
  interest?: {
    referenceId?: string;
    label?: string;
  };
}

export interface CrmMetricTask {
  id: string;
  title: string;
  dueAt?: string;
  status: 'pending' | 'done' | 'cancelled';
}

export interface CrmMetricSnapshot {
  leads: CrmMetricLead[];
  tasks: CrmMetricTask[];
}

export interface CrmSnapshotPort {
  snapshot(): CrmMetricSnapshot;
  subscribe?(listener: () => void): () => void;
}

export interface CrmRepositorySnapshotPort {
  load(): CrmMetricSnapshot;
}

/**
 * Adapter estrutural para repositórios como BrowserCrmRepository da Frente04.
 * Lê o estado mais recente em cada snapshot, evitando depender da mesma instância de CrmService.
 */
export class CrmRepositorySnapshotSource implements CrmSnapshotPort {
  constructor(
    private readonly repository: CrmRepositorySnapshotPort,
    private readonly changedEventName = 'harpia:crm-updated',
  ) {}

  snapshot(): CrmMetricSnapshot {
    return this.repository.load();
  }

  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => listener();
    window.addEventListener(this.changedEventName, handler);
    return () => window.removeEventListener(this.changedEventName, handler);
  }
}

function countLabels(values: Array<string | undefined>) {
  const counts = new Map<string, number>();
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
}

/**
 * Adapta somente métricas que o CRM da Frente04 expõe de forma objetiva hoje.
 * Não tenta inferir visita, proposta, negociação ou venda pelo nome configurável das etapas.
 * Quando recebe o catálogo, cruza o referenceId real do interesse do lead para derivar
 * demanda por região e interesse por produto sem duplicar dados.
 */
export class CrmSnapshotMetricsProvider implements CommercialMetricsProvider {
  constructor(
    private readonly crm: CrmSnapshotPort,
    private readonly catalog?: CatalogRepository,
  ) {}

  getAvailableMetrics(): CommercialMetricKey[] {
    const metrics: CommercialMetricKey[] = ['leads', 'leadOrigins', 'nextActions'];
    if (this.catalog) metrics.push('demandByRegion', 'performanceByProduct');
    return metrics;
  }

  subscribe(listener: () => void): () => void {
    return this.crm.subscribe?.(listener) ?? (() => undefined);
  }

  async getMetrics(): Promise<CommercialDashboardMetrics> {
    const snapshot = this.crm.snapshot();
    const pendingTasks = snapshot.tasks
      .filter((task) => task.status === 'pending')
      .sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return a.title.localeCompare(b.title, 'pt-BR');
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return a.dueAt.localeCompare(b.dueAt);
      });

    const catalogItems = this.catalog ? await this.catalog.list({ includeDeleted: true }) : [];
    const catalogByReference = new Map<string, (typeof catalogItems)[number]>();
    for (const item of catalogItems) {
      catalogByReference.set(item.id, item);
      catalogByReference.set(item.code, item);
    }

    const demandLabels: string[] = [];
    const productLabels: string[] = [];

    for (const lead of snapshot.leads) {
      const referenceId = lead.interest?.referenceId;
      const item = referenceId ? catalogByReference.get(referenceId) : undefined;

      if (item) {
        const region = [item.location.city, item.location.neighborhood].filter(Boolean).join(' / ');
        if (region) demandLabels.push(region);

        if (item.kind === 'unit' && item.parentId) {
          const parent = catalogByReference.get(item.parentId);
          productLabels.push(parent?.name ?? item.name);
        } else {
          productLabels.push(item.name);
        }
      } else if (lead.interest?.label?.trim()) {
        productLabels.push(lead.interest.label.trim());
      }
    }

    return {
      leads: snapshot.leads.length,
      visits: 0,
      proposals: 0,
      negotiations: 0,
      sales: 0,
      pipelineValue: 0,
      ticket: 0,
      conversionRate: 0,
      leadOrigins: countLabels(snapshot.leads.map((lead) => lead.source)),
      demandByRegion: this.catalog ? countLabels(demandLabels) : [],
      performanceByProduct: this.catalog ? countLabels(productLabels) : [],
      nextActions: pendingTasks.map((task) => ({
        id: task.id,
        label: task.title,
        date: task.dueAt,
      })),
    };
  }
}
