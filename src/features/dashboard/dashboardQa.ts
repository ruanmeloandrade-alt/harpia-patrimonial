import type { CatalogRepository } from '../catalog/catalogRepository';
import { getDashboardSnapshot, type CommercialMetricsProvider } from './dashboardService';

export interface DashboardQaResult {
  ok: boolean;
  checks: Array<{ code: string; ok: boolean; message: string }>;
}

export async function validateDashboardSnapshot(
  catalogRepository: CatalogRepository,
  commercialProvider?: CommercialMetricsProvider,
): Promise<DashboardQaResult> {
  const snapshot = await getDashboardSnapshot(catalogRepository, commercialProvider);
  const checks = [
    {
      code: 'catalog-counts-non-negative',
      ok: [
        snapshot.catalog.active,
        snapshot.catalog.hiddenPublished,
        snapshot.catalog.inventoryCount,
        snapshot.catalog.drafts,
        snapshot.catalog.paused,
        snapshot.catalog.sold,
      ].every((value) => value >= 0),
      message: 'Contagens do catálogo não podem ser negativas.',
    },
    {
      code: 'inventory-value-non-negative',
      ok: snapshot.catalog.inventoryValue >= 0,
      message: 'Valor de estoque não pode ser negativo.',
    },
    {
      code: 'commercial-zero-when-disconnected',
      ok: snapshot.commercialSource === 'connected'
        || (
          snapshot.commercial.leads === 0
          && snapshot.commercial.visits === 0
          && snapshot.commercial.proposals === 0
          && snapshot.commercial.negotiations === 0
          && snapshot.commercial.sales === 0
          && snapshot.commercial.pipelineValue === 0
          && snapshot.commercial.ticket === 0
          && snapshot.commercial.conversionRate === 0
        ),
      message: 'Sem CRM conectado, métricas comerciais devem permanecer zeradas.',
    },
  ];

  return { ok: checks.every((check) => check.ok), checks };
}
