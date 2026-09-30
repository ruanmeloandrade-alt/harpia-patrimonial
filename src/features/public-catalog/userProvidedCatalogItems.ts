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
  const existing = new Set(baseItems.flatMap((item) => [item.id, normalize(item.code)]));
  const additions = userProvidedPublishedItems.filter(
    (item) => !existing.has(item.id) && !existing.has(normalize(item.code)),
  );
  return [...baseItems, ...additions];
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
