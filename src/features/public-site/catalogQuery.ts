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

function parsePurpose(value: string | null) {
  const normalized = value
    ?.trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'venda' || normalized === 'sale') return 'Venda';
  if (normalized === 'locacao' || normalized === 'rent') return 'Locação';
  return undefined;
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
  let minPrice = safeNumber(filters.minPrice);
  let maxPrice = safeNumber(filters.maxPrice);

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    purpose: parsePurpose(filters.purpose ?? null),
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
