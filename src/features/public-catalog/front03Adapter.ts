import type {
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

export interface Front03PublicCatalogServicePort {
  list(filters?: Front03Filters): Promise<Front03PublishedItem[]>;
  getByIdOrCode(value: string): Promise<Front03PublishedItem | null>;
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

function bestLocation(location: Front03Location) {
  return location.condominium || location.neighborhood || location.city;
}

function toPublicItem(item: Front03PublishedItem): PublicCatalogItem {
  return {
    id: item.id,
    slug: item.code || item.id,
    code: item.code,
    title: item.name,
    propertyType: mapKind(item.kind),
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
  };
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
      return items.map(toPublicItem);
    },

    async getPublishedBySlug(slug) {
      const item = await service.getByIdOrCode(slug);
      return item ? toPublicItem(item) : null;
    },
  };
}
