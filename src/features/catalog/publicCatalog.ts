import type { CatalogRepository } from './catalogRepository';
import type {
  PublicCatalogDevelopmentBundle,
  PublicCatalogFilters,
  PublicCatalogItem,
} from './types';

export interface PublicCatalogFilterOptions {
  cities: string[];
  locations: string[];
  lifestyleTags: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

function toPublicItem(item: Awaited<ReturnType<CatalogRepository['list']>>[number]): PublicCatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    kind: item.kind,
    parentId: item.parentId,
    typology: item.typology,
    purpose: item.purpose,
    description: item.description,
    location: item.location,
    price: item.price,
    isLaunch: item.isLaunch,
    features: item.features,
    lifestyleTags: item.lifestyleTags,
    developer: item.developer,
    media: item.media,
    status: 'published',
  };
}

function applyPublicFilters(
  items: Awaited<ReturnType<CatalogRepository['list']>>,
  filters: PublicCatalogFilters,
) {
  return items
    .filter((item) => !filters.purpose || item.purpose === filters.purpose)
    .filter((item) => !filters.city || item.location.city === filters.city)
    .filter((item) => {
      if (!filters.location) return true;
      return [item.location.neighborhood, item.location.condominium]
        .filter(Boolean)
        .some((value) => value === filters.location);
    })
    .filter((item) => filters.isLaunch === undefined || item.isLaunch === filters.isLaunch)
    .filter((item) => filters.minPrice === undefined || (item.price !== null && item.price >= filters.minPrice))
    .filter((item) => filters.maxPrice === undefined || (item.price !== null && item.price <= filters.maxPrice))
    .filter((item) => !filters.lifestyleTag || item.lifestyleTags.includes(filters.lifestyleTag));
}

export class PublicCatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async list(filters: PublicCatalogFilters = {}): Promise<PublicCatalogItem[]> {
    const items = await this.repository.list({ status: 'published' });
    return applyPublicFilters(items, filters).map(toPublicItem);
  }

  async listUnits(parentId: string, filters: PublicCatalogFilters = {}): Promise<PublicCatalogItem[]> {
    const items = await this.repository.list({ status: 'published', kind: 'unit' });
    return applyPublicFilters(
      items.filter((item) => item.parentId === parentId),
      filters,
    ).map(toPublicItem);
  }

  async getByIdOrCode(value: string): Promise<PublicCatalogItem | null> {
    const items = await this.repository.list({ status: 'published' });
    const item = items.find((candidate) => candidate.id === value || candidate.code === value);
    return item ? toPublicItem(item) : null;
  }

  async getDevelopmentWithUnits(value: string): Promise<PublicCatalogDevelopmentBundle | null> {
    const item = await this.getByIdOrCode(value);
    if (!item || item.kind !== 'development') return null;

    const units = await this.listUnits(item.id);
    const prices = units
      .map((unit) => unit.price)
      .filter((price): price is number => price !== null);

    if (!prices.length && item.price !== null) prices.push(item.price);

    return {
      development: item,
      units,
      priceRange: prices.length
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : null,
    };
  }

  async getFilterOptions(): Promise<PublicCatalogFilterOptions> {
    const items = await this.repository.list({ status: 'published' });
    const cities = new Set<string>();
    const locations = new Set<string>();
    const lifestyleTags = new Set<string>();
    const prices: number[] = [];

    for (const item of items) {
      if (item.location.city) cities.add(item.location.city);
      if (item.location.neighborhood) locations.add(item.location.neighborhood);
      if (item.location.condominium) locations.add(item.location.condominium);
      item.lifestyleTags.forEach((tag) => lifestyleTags.add(tag));
      if (item.price !== null) prices.push(item.price);
    }

    return {
      cities: [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      locations: [...locations].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      lifestyleTags: [...lifestyleTags].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    };
  }
}
