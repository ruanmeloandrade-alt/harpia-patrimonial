import type { PublicCatalogFilters } from '../public-catalog/contracts';

function parseNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseText(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseLaunch(value: string | null) {
  if (value === 'sim') return true;
  if (value === 'nao') return false;
  return undefined;
}

function safeNumber(value?: number) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function normalizeCatalogFilters(filters: PublicCatalogFilters): PublicCatalogFilters {
  const minPrice = safeNumber(filters.minPrice);
  const maxPrice = safeNumber(filters.maxPrice);

  return {
    purpose: parseText(filters.purpose ?? null),
    city: parseText(filters.city ?? null),
    location: parseText(filters.location ?? null),
    launch: typeof filters.launch === 'boolean' ? filters.launch : undefined,
    minPrice,
    maxPrice,
    lifestyleTag: parseText(filters.lifestyleTag ?? null),
  };
}

export function readCatalogFilters(search: string): PublicCatalogFilters {
  const params = new URLSearchParams(search);

  return normalizeCatalogFilters({
    purpose: params.get('finalidade') || undefined,
    city: params.get('cidade') || undefined,
    location: params.get('localizacao') || undefined,
    launch: parseLaunch(params.get('lancamento')),
    minPrice: parseNumber(params.get('precoMin')),
    maxPrice: parseNumber(params.get('precoMax')),
    lifestyleTag: params.get('estilo') || undefined,
  });
}

export function writeCatalogFilters(filters: PublicCatalogFilters) {
  const normalized = normalizeCatalogFilters(filters);
  const params = new URLSearchParams();

  if (normalized.purpose) params.set('finalidade', normalized.purpose);
  if (normalized.city) params.set('cidade', normalized.city);
  if (normalized.location) params.set('localizacao', normalized.location);
  if (normalized.launch !== undefined) params.set('lancamento', normalized.launch ? 'sim' : 'nao');
  if (normalized.minPrice !== undefined) params.set('precoMin', String(normalized.minPrice));
  if (normalized.maxPrice !== undefined) params.set('precoMax', String(normalized.maxPrice));
  if (normalized.lifestyleTag) params.set('estilo', normalized.lifestyleTag);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function hasCatalogFilters(filters: PublicCatalogFilters) {
  const normalized = normalizeCatalogFilters(filters);
  return Object.values(normalized).some((value) => value !== undefined && value !== '');
}
