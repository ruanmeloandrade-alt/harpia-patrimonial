import type { CommercialDashboardMetrics, CommercialMetricsProvider } from './dashboardService';

export interface CrmMetricLead {
  id: string;
  source?: string;
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
 */
export class CrmSnapshotMetricsProvider implements CommercialMetricsProvider {
  constructor(private readonly crm: CrmSnapshotPort) {}

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
      demandByRegion: [],
      nextActions: pendingTasks.map((task) => ({
        id: task.id,
        label: task.title,
        date: task.dueAt,
      })),
    };
  }
}
