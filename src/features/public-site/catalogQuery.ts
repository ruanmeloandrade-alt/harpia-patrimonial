import type { PublicCatalogFilters } from '../public-catalog/contracts';

function parseNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function readCatalogFilters(search: string): PublicCatalogFilters {
  const params = new URLSearchParams(search);
  const launch = params.get('lancamento');

  return {
    purpose: params.get('finalidade') || undefined,
    city: params.get('cidade') || undefined,
    location: params.get('localizacao') || undefined,
    launch: launch === null ? undefined : launch === 'sim',
    minPrice: parseNumber(params.get('precoMin')),
    maxPrice: parseNumber(params.get('precoMax')),
    lifestyleTag: params.get('estilo') || undefined,
  };
}

export function writeCatalogFilters(filters: PublicCatalogFilters) {
  const params = new URLSearchParams();
  if (filters.purpose) params.set('finalidade', filters.purpose);
  if (filters.city) params.set('cidade', filters.city);
  if (filters.location) params.set('localizacao', filters.location);
  if (filters.launch !== undefined) params.set('lancamento', filters.launch ? 'sim' : 'nao');
  if (filters.minPrice !== undefined) params.set('precoMin', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('precoMax', String(filters.maxPrice));
  if (filters.lifestyleTag) params.set('estilo', filters.lifestyleTag);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function hasCatalogFilters(filters: PublicCatalogFilters) {
  return Object.values(filters).some((value) => value !== undefined && value !== '');
}
