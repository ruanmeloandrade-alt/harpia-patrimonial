import type { CatalogRepository } from '../catalog/catalogRepository';
import { filterPublicEligibleCatalogItems } from '../catalog/publicCatalog';

export type CommercialMetricKey =
  | 'leads'
  | 'visits'
  | 'proposals'
  | 'negotiations'
  | 'sales'
  | 'pipelineValue'
  | 'ticket'
  | 'conversionRate'
  | 'leadOrigins'
  | 'demandByRegion'
  | 'performanceByProduct'
  | 'nextActions';

export type CommercialMetricAvailability = Record<CommercialMetricKey, boolean>;

export interface CommercialDashboardMetrics {
  leads: number;
  visits: number;
  proposals: number;
  negotiations: number;
  sales: number;
  pipelineValue: number;
  ticket: number;
  conversionRate: number;
  leadOrigins: Array<{ label: string; value: number }>;
  demandByRegion: Array<{ label: string; value: number }>;
  performanceByProduct: Array<{ label: string; value: number }>;
  nextActions: Array<{ id: string; label: string; date?: string }>;
}

export interface CommercialMetricsProvider {
  getMetrics(): Promise<CommercialDashboardMetrics>;
  getAvailableMetrics?(): CommercialMetricKey[];
  subscribe?(listener: () => void): () => void;
}

export interface DashboardSnapshot {
  catalog: {
    active: number;
    hiddenPublished: number;
    inventoryCount: number;
    drafts: number;
    paused: number;
    sold: number;
    inventoryValue: number;
    byCity: Array<{ label: string; value: number }>;
    byPurpose: Array<{ label: string; value: number }>;
  };
  commercial: CommercialDashboardMetrics;
  commercialAvailability: CommercialMetricAvailability;
  commercialSource: 'connected' | 'awaiting-crm';
}

const commercialMetricKeys: CommercialMetricKey[] = [
  'leads',
  'visits',
  'proposals',
  'negotiations',
  'sales',
  'pipelineValue',
  'ticket',
  'conversionRate',
  'leadOrigins',
  'demandByRegion',
  'performanceByProduct',
  'nextActions',
];

export const emptyCommercialMetrics = (): CommercialDashboardMetrics => ({
  leads: 0,
  visits: 0,
  proposals: 0,
  negotiations: 0,
  sales: 0,
  pipelineValue: 0,
  ticket: 0,
  conversionRate: 0,
  leadOrigins: [],
  demandByRegion: [],
  performanceByProduct: [],
  nextActions: [],
});

export const commercialAvailability = (available: CommercialMetricKey[] = []): CommercialMetricAvailability => {
  const set = new Set(available);
  return commercialMetricKeys.reduce((result, key) => {
    result[key] = set.has(key);
    return result;
  }, {} as CommercialMetricAvailability);
};

function countBy(values: string[]) {
  const counter = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counter.set(value, (counter.get(value) ?? 0) + 1));
  return [...counter.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
}

export async function getDashboardSnapshot(
  repository: CatalogRepository,
  commercialProvider?: CommercialMetricsProvider,
): Promise<DashboardSnapshot> {
  const items = await repository.list();
  const publishedItems = items.filter((item) => item.status === 'published');
  const activeItems = filterPublicEligibleCatalogItems(publishedItems);
  const developmentIdsWithUnits = new Set(
    items
      .filter((item) => item.kind === 'unit' && item.parentId)
      .map((item) => item.parentId as string),
  );
  const inventoryItems = items.filter(
    (item) => item.status !== 'sold'
      && (item.kind !== 'development' || !developmentIdsWithUnits.has(item.id)),
  );
  const catalog = {
    active: activeItems.length,
    hiddenPublished: Math.max(0, publishedItems.length - activeItems.length),
    inventoryCount: inventoryItems.length,
    drafts: items.filter((item) => item.status === 'draft').length,
    paused: items.filter((item) => item.status === 'paused').length,
    sold: items.filter((item) => item.status === 'sold').length,
    inventoryValue: inventoryItems.reduce((total, item) => total + (item.price ?? 0), 0),
    byCity: countBy(activeItems.map((item) => item.location.city)),
    byPurpose: countBy(activeItems.map((item) => (item.purpose === 'sale' ? 'Venda' : 'Locação'))),
  };

  if (!commercialProvider) {
    return {
      catalog,
      commercial: emptyCommercialMetrics(),
      commercialAvailability: commercialAvailability(),
      commercialSource: 'awaiting-crm',
    };
  }

  try {
    const available = commercialProvider.getAvailableMetrics?.() ?? commercialMetricKeys;
    return {
      catalog,
      commercial: await commercialProvider.getMetrics(),
      commercialAvailability: commercialAvailability(available),
      commercialSource: 'connected',
    };
  } catch {
    return {
      catalog,
      commercial: emptyCommercialMetrics(),
      commercialAvailability: commercialAvailability(),
      commercialSource: 'awaiting-crm',
    };
  }
}