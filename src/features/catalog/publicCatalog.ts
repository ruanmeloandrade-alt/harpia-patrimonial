import type { CatalogRepository } from './catalogRepository';
import type { PublicCatalogFilters, PublicCatalogItem } from './types';

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

export class PublicCatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async list(filters: PublicCatalogFilters = {}): Promise<PublicCatalogItem[]> {
    const items = await this.repository.list({ status: 'published' });
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
      .filter((item) => !filters.lifestyleTag || item.lifestyleTags.includes(filters.lifestyleTag))
      .map(toPublicItem);
  }

  async getByIdOrCode(value: string): Promise<PublicCatalogItem | null> {
    const items = await this.repository.list({ status: 'published' });
    const item = items.find((candidate) => candidate.id === value || candidate.code === value);
    return item ? toPublicItem(item) : null;
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
