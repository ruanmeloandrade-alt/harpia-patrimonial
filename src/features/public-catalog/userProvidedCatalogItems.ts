import type { CatalogRepository } from '../catalog/catalogRepository';
import type { CatalogItem, CatalogQuery, CatalogStatus } from '../catalog/types';
import type {
  Front03Filters,
  Front03PublicCatalogServicePort,
  Front03PublishedItem,
} from './front03Adapter';

const botafogoEasyMedia = [
  ['sala-cozinha-01.jpg', 'Sala integrada e cozinha do apartamento Botafogo Easy'],
  ['cozinha-01.jpg', 'Cozinha planejada do apartamento Botafogo Easy'],
  ['cozinha-02.jpg', 'Bancada e armários da cozinha do Botafogo Easy'],
  ['sala-01.jpg', 'Sala com painel em madeira do Botafogo Easy'],
  ['suite-01.jpg', 'Suíte do apartamento Botafogo Easy'],
  ['suite-02.jpg', 'Bancada e armários da suíte Botafogo Easy'],
  ['banheiro-01.jpg', 'Banheiro social do Botafogo Easy'],
  ['quarto-01.jpg', 'Quarto do apartamento Botafogo Easy'],
  ['banheiro-suite-01.jpg', 'Banheiro da suíte Botafogo Easy'],
  ['banheiro-suite-02.jpg', 'Detalhe do banheiro da suíte Botafogo Easy'],
].map(([fileName, label], index) => ({
  id: `botafogo-easy-media-${index + 1}`,
  type: 'image' as const,
  url: `/assets/catalog/botafogo-easy/${fileName}`,
  label,
  isCover: index === 0,
}));

const botafogoEasy147Media = [
  ['sala-01.jpg', 'Sala integrada do apartamento Botafogo Easy 147 m²'],
  ['sala-02.jpg', 'Sala de estar ampla do Botafogo Easy 147 m²'],
  ['varanda-gourmet-01.jpg', 'Varanda gourmet do Botafogo Easy 147 m²'],
  ['varanda-gourmet-02.jpg', 'Área externa integrada do Botafogo Easy 147 m²'],
  ['cozinha-01.jpg', 'Cozinha planejada do Botafogo Easy 147 m²'],
  ['cozinha-02.jpg', 'Cozinha com armários e eletrodomésticos do Botafogo Easy 147 m²'],
  ['escritorio-01.jpg', 'Escritório do Botafogo Easy 147 m²'],
  ['escritorio-02.jpg', 'Ambiente de trabalho do Botafogo Easy 147 m²'],
  ['suite-01.jpg', 'Suíte do Botafogo Easy 147 m²'],
  ['suite-closet-01.jpg', 'Suíte com closet do Botafogo Easy 147 m²'],
  ['banheiro-suite-01.jpg', 'Banheiro da suíte do Botafogo Easy 147 m²'],
  ['quarto-01.jpg', 'Quarto do Botafogo Easy 147 m²'],
  ['quarto-02.jpg', 'Segundo ambiente de quarto do Botafogo Easy 147 m²'],
  ['quarto-03.jpg', 'Quarto com armários do Botafogo Easy 147 m²'],
  ['banheiro-01.jpg', 'Banheiro social do Botafogo Easy 147 m²'],
  ['banheiro-verde-01.jpg', 'Banheiro com revestimento verde do Botafogo Easy 147 m²'],
  ['banheiro-verde-02.jpg', 'Detalhe do banheiro verde do Botafogo Easy 147 m²'],
  ['lavabo-01.jpg', 'Lavabo do Botafogo Easy 147 m²'],
  ['lavabo-02.jpg', 'Detalhe do lavabo do Botafogo Easy 147 m²'],
].map(([fileName, label], index) => ({
  id: `botafogo-easy-147-media-${index + 1}`,
  type: 'image' as const,
  url: `/assets/catalog/botafogo-easy-147/${fileName}`,
  label,
  isCover: index === 0,
}));

const orygemAcquaHomeVenice151Media = [
  ['sala-01.jpg', 'Sala integrada do apartamento Venice Orygem Acqua Home'],
  ['sala-02.jpg', 'Sala de estar do Venice Orygem Acqua Home'],
  ['varanda-gourmet-01.jpg', 'Varanda gourmet do Venice Orygem Acqua Home'],
  ['varanda-01.jpg', 'Varanda ampla do Venice Orygem Acqua Home'],
  ['jantar-01.jpg', 'Sala de jantar do Venice Orygem Acqua Home'],
  ['cozinha-01.jpg', 'Cozinha planejada do Venice Orygem Acqua Home'],
  ['cozinha-02.jpg', 'Cozinha integrada do Venice Orygem Acqua Home'],
  ['escritorio-01.jpg', 'Escritório do Venice Orygem Acqua Home'],
  ['escritorio-02.jpg', 'Ambiente de trabalho do Venice Orygem Acqua Home'],
  ['suite-01.jpg', 'Suíte do Venice Orygem Acqua Home'],
  ['suite-02.jpg', 'Suíte com marcenaria do Venice Orygem Acqua Home'],
  ['suite-closet-01.jpg', 'Closet da suíte do Venice Orygem Acqua Home'],
  ['suite-banheiro-01.jpg', 'Suíte com banheiro integrado do Venice Orygem Acqua Home'],
  ['suite-03.jpg', 'Segunda suíte do Venice Orygem Acqua Home'],
  ['suite-04.jpg', 'Terceira suíte do Venice Orygem Acqua Home'],
  ['quarto-infantil-01.jpg', 'Quarto infantil do Venice Orygem Acqua Home'],
  ['banheiro-suite-01.jpg', 'Banheiro da suíte do Venice Orygem Acqua Home'],
  ['banheiro-suite-02.jpg', 'Banheiro com bancada dupla do Venice Orygem Acqua Home'],
  ['banheiro-social-01.jpg', 'Banheiro social do Venice Orygem Acqua Home'],
].map(([fileName, label], index) => ({
  id: `orygem-acqua-home-venice-151-media-${index + 1}`,
  type: 'image' as const,
  url: `/assets/catalog/orygem-acqua-home-venice-151/${fileName}`,
  label,
  isCover: index === 0,
}));

export const userProvidedPublishedItems: Front03PublishedItem[] = [
  {
    id: 'harpia-botafogo-easy-95m2',
    code: 'BOT-EASY-95',
    name: 'Apartamento Botafogo Easy',
    itemType: 'property',
    catalogId: null,
    kind: 'standalone',
    purpose: 'sale',
    description: 'Apartamento em Botafogo, Rio de Janeiro, com excelente iluminação natural, ótima localização, área externa com piscina, salão de jogos, parque infantil e coworking.',
    location: {
      city: 'Rio de Janeiro',
      neighborhood: 'Botafogo',
      condominium: 'Easy',
    },
    price: 1631000,
    tags: ['Botafogo', 'Easy', 'Imovel avulso'],
    isLaunch: false,
    features: [
      '95 m²',
      '1 suíte',
      '1 quarto',
      'Excelente iluminação natural',
      'Área externa com piscina',
      'Salão de jogos',
      'Parque infantil',
      'Coworking',
    ],
    lifestyleTags: ['Piscina', 'Coworking', 'Parque infantil'],
    bedrooms: 1,
    suites: 1,
    bathrooms: 2,
    privateAreaM2: 95,
    media: botafogoEasyMedia,
    status: 'published',
  },
  {
    id: 'harpia-botafogo-easy-147m2',
    code: 'BOT-EASY-147',
    name: 'Apartamento Botafogo Easy 147 m²',
    itemType: 'property',
    catalogId: null,
    kind: 'standalone',
    purpose: 'sale',
    description: 'Imóvel espetacular em Botafogo, no Easy, com iluminação natural, excelente vista, área externa com piscina, salão de jogos, parque infantil e coworking.',
    location: {
      city: 'Rio de Janeiro',
      neighborhood: 'Botafogo',
      condominium: 'Easy',
    },
    price: 2708000,
    tags: ['Botafogo', 'Easy', 'Imóvel avulso'],
    isLaunch: false,
    features: [
      '147 m²',
      '2 suítes',
      '1 quarto',
      '2 vagas',
      'Iluminação natural',
      'Excelente vista',
      'Área externa com piscina',
      'Salão de jogos',
      'Parque infantil',
      'Coworking',
    ],
    lifestyleTags: ['Piscina', 'Coworking', 'Parque infantil', 'Vista'],
    bedrooms: 1,
    suites: 2,
    bathrooms: 3,
    parkingSpaces: 2,
    privateAreaM2: 147,
    media: botafogoEasy147Media,
    status: 'published',
  },
  {
    id: 'harpia-barra-orygem-acqua-home-venice-151m2',
    code: 'BAR-ORYGEM-151',
    name: 'Apartamento Venice Orygem Acqua Home 151 m²',
    itemType: 'property',
    catalogId: null,
    kind: 'standalone',
    purpose: 'sale',
    description: 'Apartamento na Barra da Tijuca, no Edifício Venice do Orygem Acqua Home, com excelente vista e localização, balsa exclusiva para a praia e área externa de alto padrão com lazer completo.',
    location: {
      city: 'Rio de Janeiro',
      neighborhood: 'Barra da Tijuca',
      condominium: 'Orygem Acqua Home - Edifício Venice',
    },
    price: 2293158,
    tags: ['Barra da Tijuca', 'Orygem Acqua Home', 'Edifício Venice', 'Imóvel avulso'],
    isLaunch: false,
    features: [
      '151 m²',
      '3 suítes',
      '2 vagas',
      'Excelente vista',
      'Balsa exclusiva para a praia',
      'Área externa de alto padrão',
      'Piscina',
      'Salão de jogos',
      'Academia',
      'Quadra poliesportiva',
      'Quadra de tênis',
      'Espaço gourmet',
      'Brinquedoteca',
      'Coworking',
      'Churrasqueira',
      'Spa',
      'Sauna',
      'Salão de festas',
    ],
    lifestyleTags: [
      'Piscina',
      'Academia',
      'Coworking',
      'Vista',
      'Praia',
      'Quadra de tênis',
      'Espaço gourmet',
    ],
    bedrooms: 3,
    suites: 3,
    parkingSpaces: 2,
    privateAreaM2: 151,
    media: orygemAcquaHomeVenice151Media,
    status: 'published',
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function matchesFilter(item: Front03PublishedItem, filters: Front03Filters = {}) {
  if (filters.itemType && item.itemType !== filters.itemType) return false;
  if (filters.purpose && item.purpose !== filters.purpose) return false;
  if (filters.city && item.location.city !== filters.city) return false;
  if (filters.location) {
    const locations = [item.location.neighborhood, item.location.condominium].filter(Boolean);
    if (!locations.includes(filters.location)) return false;
  }
  if (filters.isLaunch !== undefined && item.isLaunch !== filters.isLaunch) return false;
  if (filters.minPrice !== undefined && (item.price === null || item.price < filters.minPrice)) return false;
  if (filters.maxPrice !== undefined && (item.price === null || item.price > filters.maxPrice)) return false;
  if (filters.lifestyleTag && !item.lifestyleTags.includes(filters.lifestyleTag)) return false;
  return true;
}

function mergeItems(baseItems: Front03PublishedItem[]) {
  const uniqueBaseItems = baseItems.filter((item, index, source) => {
    const code = normalize(item.code);
    return source.findIndex((candidate) => candidate.id === item.id || normalize(candidate.code) === code) === index;
  });
  const existing = new Set(uniqueBaseItems.flatMap((item) => [item.id, normalize(item.code)]));
  const additions = userProvidedPublishedItems.filter(
    (item) => !existing.has(item.id) && !existing.has(normalize(item.code)),
  );
  return [...uniqueBaseItems, ...additions];
}

function toCatalogItem(item: Front03PublishedItem): CatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    catalogId: item.catalogId ?? null,
    itemType: item.itemType,
    kind: item.kind,
    parentId: item.parentId,
    typology: item.typology,
    purpose: item.purpose,
    description: item.description,
    location: item.location,
    price: item.price,
    discountType: item.discountType,
    discountValue: item.discountValue,
    tags: item.tags ?? [],
    isLaunch: item.isLaunch,
    features: item.features,
    lifestyleTags: item.lifestyleTags,
    developer: item.developer,
    media: item.media.map((media) => ({
      id: media.id,
      type: media.type,
      url: media.url,
      label: media.label,
      isCover: media.isCover,
    })),
    status: item.status,
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
    publishedAt: '2026-09-30T00:00:00.000Z',
  };
}

function matchesCatalogQuery(item: CatalogItem, query: CatalogQuery = {}) {
  if (!query.includeDeleted && item.deletedAt) return false;
  if (query.status && item.status !== query.status) return false;
  if (query.kind && item.kind !== query.kind) return false;
  if (query.itemType && item.itemType !== query.itemType) return false;
  if (query.catalogId !== undefined && item.catalogId !== query.catalogId) return false;

  const search = query.search?.trim().toLocaleLowerCase('pt-BR');
  if (!search) return true;

  return [
    item.code,
    item.name,
    item.typology,
    item.location.city,
    item.location.neighborhood,
    item.location.condominium,
    item.developer,
    ...item.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR')
    .includes(search);
}

function mergeCatalogItems(baseItems: CatalogItem[]) {
  const uniqueBaseItems = baseItems.filter((item, index, source) => {
    const code = normalize(item.code);
    return source.findIndex((candidate) => candidate.id === item.id || normalize(candidate.code) === code) === index;
  });
  const existing = new Set(uniqueBaseItems.flatMap((item) => [item.id, normalize(item.code)]));
  const additions = userProvidedPublishedItems
    .map(toCatalogItem)
    .filter((item) => !existing.has(item.id) && !existing.has(normalize(item.code)));
  return [...uniqueBaseItems, ...additions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createUserProvidedCatalogRepository(
  baseRepository: CatalogRepository,
): CatalogRepository {
  return {
    async list(query) {
      const baseItems = await baseRepository.list(query);
      const additions = userProvidedPublishedItems
        .map(toCatalogItem)
        .filter((item) => matchesCatalogQuery(item, query));
      return mergeCatalogItems([...baseItems, ...additions]);
    },

    async getById(id) {
      const baseItem = await baseRepository.getById(id);
      if (baseItem) return baseItem;

      const normalized = normalize(id);
      const providedItem = userProvidedPublishedItems.find(
        (item) => item.id === id || normalize(item.code) === normalized,
      );
      return providedItem ? toCatalogItem(providedItem) : null;
    },

    create(input) {
      return baseRepository.create(input);
    },

    update(id, input) {
      return baseRepository.update(id, input);
    },

    setStatus(id, status: CatalogStatus) {
      return baseRepository.setStatus(id, status);
    },

    duplicate(id) {
      return baseRepository.duplicate(id);
    },

    remove(id) {
      return baseRepository.remove(id);
    },

    subscribe(listener) {
      return baseRepository.subscribe?.(listener) ?? (() => undefined);
    },
  };
}

export function createUserProvidedCatalogService(
  baseService: Front03PublicCatalogServicePort,
): Front03PublicCatalogServicePort {
  return {
    async list(filters) {
      const baseItems = await baseService.list(filters);
      const additions = userProvidedPublishedItems.filter((item) => matchesFilter(item, filters));
      return mergeItems([...baseItems, ...additions]);
    },

    async getByIdOrCode(value) {
      const baseItem = await baseService.getByIdOrCode(value);
      if (baseItem) return baseItem;

      const normalized = normalize(value);
      return userProvidedPublishedItems.find(
        (item) => item.id === value || normalize(item.code) === normalized,
      ) ?? null;
    },
  };
}
