import type {
  PublicCatalogFilterOptions,
  PublicCatalogFilters,
  PublicCatalogItem,
  PublicCatalogReader,
} from './contracts';

type Front03Purpose = 'sale' | 'rent';
type Front03Kind = 'development' | 'unit' | 'standalone';
type Front03MediaType = 'image' | 'video' | 'document' | 'floorplan';

interface Front03Location {
  city: string;
  neighborhood: string;
  condominium?: string;
  address?: string;
}

interface Front03Media {
  id: string;
  type: Front03MediaType;
  url: string;
  label?: string;
  isCover?: boolean;
}

/**
 * Shape exposed by Frente03's PublicCatalogService.
 * This is an integration port, not a second catalog domain model.
 * It exists so Frente02 can adapt the producer contract without changing
 * the internal model owned by Frente03.
 */
export interface Front03PublishedItem {
  id: string;
  code: string;
  name: string;
  kind: Front03Kind;
  parentId?: string;
  typology?: string;
  purpose: Front03Purpose;
  description: string;
  location: Front03Location;
  price: number | null;
  isLaunch: boolean;
  features: string[];
  lifestyleTags: string[];
  developer?: string;
  media: Front03Media[];
  status: 'published';
}

interface Front03Filters {
  purpose?: Front03Purpose;
  city?: string;
  location?: string;
  isLaunch?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lifestyleTag?: string;
}

interface Front03FilterOptions {
  cities: string[];
  locations: string[];
  lifestyleTags: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export interface Front03PublicCatalogServicePort {
  list(filters?: Front03Filters): Promise<Front03PublishedItem[]>;
  getByIdOrCode(value: string): Promise<Front03PublishedItem | null>;
  getFilterOptions?(): Promise<Front03FilterOptions>;
}

function mapPurposeToFront03(purpose?: string): Front03Purpose | undefined {
  if (!purpose) return undefined;
  const normalized = purpose.trim().toLowerCase();
  if (normalized === 'sale' || normalized === 'venda') return 'sale';
  if (normalized === 'rent' || normalized === 'locacao' || normalized === 'locação') return 'rent';
  return undefined;
}

function mapPurposeToPublic(purpose: Front03Purpose) {
  return purpose === 'sale' ? 'Venda' : 'Locação';
}

function mapKind(kind: Front03Kind) {
  if (kind === 'development') return 'Empreendimento';
  if (kind === 'unit') return 'Unidade';
  return 'Imóvel';
}

function mapPropertyType(item: Front03PublishedItem) {
  const typology = item.typology?.trim();
  return typology || mapKind(item.kind);
}

function bestLocation(location: Front03Location) {
  return location.condominium || location.neighborhood || location.city;
}

function toPublicItem(item: Front03PublishedItem, parent?: Front03PublishedItem | null): PublicCatalogItem {
  return {
    id: item.id,
    slug: item.code || item.id,
    code: item.code,
    title: item.name,
    propertyType: mapPropertyType(item),
    purpose: mapPurposeToPublic(item.purpose),
    city: item.location.city,
    location: bestLocation(item.location),
    price: item.price,
    isLaunch: item.isLaunch,
    status: 'published',
    description: item.description,
    lifestyleTags: item.lifestyleTags,
    features: item.features,
    media: item.media
      .filter((media) => media.type === 'image' || media.type === 'video')
      .sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)))
      .map((media) => ({
        type: media.type as 'image' | 'video',
        url: media.url,
        alt: media.label,
      })),
    development:
      item.kind === 'unit' && item.parentId && parent
        ? {
            id: parent.id,
            title: parent.name,
            unitLabel: item.code || undefined,
          }
        : undefined,
  };
}

function toFront03Filters(filters: PublicCatalogFilters = {}): Front03Filters {
  return {
    purpose: mapPurposeToFront03(filters.purpose),
    city: filters.city,
    location: filters.location,
    isLaunch: filters.launch,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    lifestyleTag: filters.lifestyleTag,
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function deriveFilterOptions(items: Front03PublishedItem[]): PublicCatalogFilterOptions {
  const developmentIdsWithPublishedUnits = new Set(
    items
      .filter((item) => item.kind === 'unit' && item.parentId)
      .map((item) => item.parentId as string),
  );
  const prices = items
    .filter((item) => item.price !== null)
    .filter((item) => item.kind !== 'development' || !developmentIdsWithPublishedUnits.has(item.id))
    .map((item) => item.price as number);

  const locationsByCity = items.reduce<Record<string, string[]>>((accumulator, item) => {
    const city = item.location.city.trim();
    if (!city) return accumulator;
    const locations = [item.location.neighborhood, item.location.condominium ?? ''].filter(Boolean);
    accumulator[city] = unique([...(accumulator[city] ?? []), ...locations]);
    return accumulator;
  }, {});

  return {
    purposes: unique(items.map((item) => mapPurposeToPublic(item.purpose))),
    cities: unique(items.map((item) => item.location.city)),
    locations: unique(items.flatMap((item) => [item.location.neighborhood, item.location.condominium ?? ''])),
    locationsByCity,
    lifestyleTags: unique(items.flatMap((item) => item.lifestyleTags)),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

async function resolveParents(
  service: Front03PublicCatalogServicePort,
  items: Front03PublishedItem[],
) {
  const parents = new Map<string, Front03PublishedItem>();
  items.forEach((item) => {
    if (item.kind === 'development') parents.set(item.id, item);
  });

  const missingParentIds = unique(
    items
      .filter((item) => item.kind === 'unit' && item.parentId && !parents.has(item.parentId))
      .map((item) => item.parentId ?? ''),
  );

  const resolved = await Promise.all(
    missingParentIds.map(async (parentId) => [parentId, await service.getByIdOrCode(parentId)] as const),
  );

  resolved.forEach(([parentId, parent]) => {
    if (parent?.kind === 'development') parents.set(parentId, parent);
  });

  return parents;
}

function isPublicEligibleItem(item: Front03PublishedItem, parents: Map<string, Front03PublishedItem>) {
  if (item.kind !== 'unit') return true;
  return Boolean(item.parentId && parents.has(item.parentId));
}

/**
 * Creates the concrete read adapter expected by the public experience.
 * After branch integration, pass Frente03's PublicCatalogService instance here.
 */
export function createFront03PublicCatalogReader(
  service: Front03PublicCatalogServicePort,
): PublicCatalogReader {
  return {
    async listPublished(filters) {
      const items = await service.list(toFront03Filters(filters));
      const parents = await resolveParents(service, items);
      return items
        .filter((item) => isPublicEligibleItem(item, parents))
        .map((item) => toPublicItem(item, item.parentId ? parents.get(item.parentId) : undefined));
    },

    async getPublishedBySlug(slug) {
      const item = await service.getByIdOrCode(slug);
      if (!item) return null;
      if (item.kind !== 'unit') return toPublicItem(item);
      if (!item.parentId) return null;

      const parent = await service.getByIdOrCode(item.parentId);
      if (!parent || parent.kind !== 'development') return null;
      return toPublicItem(item, parent);
    },

    async getFilterOptions() {
      const items = await service.list();
      const parents = await resolveParents(service, items);
      return deriveFilterOptions(items.filter((item) => isPublicEligibleItem(item, parents)));
    },
  };
}
