import type { CatalogItem, CatalogItemDraft, CatalogQuery, CatalogStatus } from './types';

const STORAGE_KEY = 'harpia.catalog.v1';
export const CATALOG_CHANGED_EVENT = 'harpia:catalog-changed';

export interface CatalogRepository {
  list(query?: CatalogQuery): Promise<CatalogItem[]>;
  getById(id: string): Promise<CatalogItem | null>;
  create(input: CatalogItemDraft): Promise<CatalogItem>;
  update(id: string, input: Partial<CatalogItemDraft>): Promise<CatalogItem>;
  setStatus(id: string, status: CatalogStatus): Promise<CatalogItem>;
  duplicate(id: string): Promise<CatalogItem>;
  remove(id: string): Promise<void>;
  subscribe?(listener: () => void): () => void;
}

const allowedStatusTransitions: Record<CatalogStatus, CatalogStatus[]> = {
  draft: ['published', 'sold'],
  published: ['paused', 'sold'],
  paused: ['published', 'sold'],
  sold: [],
};

const allowedMediaTypes = new Set(['image', 'video', 'document', 'floorplan']);

export function isCatalogMediaUrlAllowed(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function assertCatalogMedia(media: CatalogItemDraft['media']) {
  if (!Array.isArray(media)) throw new Error('A mídia do catálogo precisa ser uma lista.');

  for (const item of media) {
    if (!item || typeof item !== 'object') throw new Error('Mídia do catálogo inválida.');
    if (!item.id?.trim()) throw new Error('Cada mídia precisa de um identificador.');
    if (!allowedMediaTypes.has(String(item.type))) throw new Error('Tipo de mídia não permitido.');
    if (!item.url?.trim() || !isCatalogMediaUrlAllowed(item.url.trim())) {
      throw new Error('URLs de mídia devem usar http ou https.');
    }
  }
}

export function assertCatalogStatusTransition(current: CatalogStatus, next: CatalogStatus) {
  if (current === next) return;
  if (!allowedStatusTransitions[current].includes(next)) {
    if (current === 'sold') throw new Error('Item vendido é estado final e não pode voltar para outro status.');
    throw new Error(`Transição de status inválida: ${current} → ${next}.`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = 'cat') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? '';
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasActiveUnits(items: CatalogItem[], developmentId: string) {
  return items.some(
    (item) => item.kind === 'unit' && item.parentId === developmentId && !item.deletedAt,
  );
}

function hasUnsoldActiveUnits(items: CatalogItem[], developmentId: string) {
  return items.some(
    (item) => item.kind === 'unit'
      && item.parentId === developmentId
      && !item.deletedAt
      && item.status !== 'sold',
  );
}

export class LocalCatalogRepository implements CatalogRepository {
  private readAll(): CatalogItem[] {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        ...item,
        itemType: item.itemType ?? 'property',
        discountType: item.discountType ?? undefined,
        discountValue: item.discountValue ?? undefined,
        tags: Array.isArray(item.tags) ? item.tags : [],
      })) as CatalogItem[];
    } catch {
      return [];
    }
  }

  private writeAll(items: CatalogItem[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CATALOG_CHANGED_EVENT));
  }

  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => listener();
    window.addEventListener(CATALOG_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, handler);
  }

  private validateDraft(
    input: CatalogItemDraft,
    items: CatalogItem[],
    ignoreId?: string,
    currentParentId?: string,
  ) {
    const code = normalizeText(input.code);
    const name = normalizeText(input.name);
    const city = normalizeText(input.location.city);

    if (!code) throw new Error('Informe um código para o item.');
    if (!name) throw new Error('Informe um nome para o item.');
    if (input.itemType === 'property' && !city) throw new Error('Informe a cidade do imóvel.');
    if (input.price !== null && input.price < 0) throw new Error('O preço não pode ser negativo.');
    if (input.discountValue !== undefined && input.discountValue < 0) throw new Error('O desconto não pode ser negativo.');
    if (input.discountType === 'percentage' && (input.discountValue ?? 0) > 100) throw new Error('O desconto percentual não pode ultrapassar 100%.');
    if ((input.discountType && input.discountValue === undefined) || (!input.discountType && input.discountValue !== undefined)) {
      throw new Error('Informe o tipo e o valor do desconto.');
    }
    assertCatalogMedia(input.media);

    const codeExists = items.some(
      (item) => !item.deletedAt && item.id !== ignoreId && item.code.toLowerCase() === code.toLowerCase(),
    );
    if (codeExists) throw new Error('Já existe um item ativo com este código.');

    if (input.itemType === 'property' && input.kind === 'unit') {
      if (!input.parentId) throw new Error('Selecione o empreendimento desta unidade.');
      if (!normalizeText(input.typology)) throw new Error('Informe a tipologia desta unidade.');
      const parent = items.find(
        (item) => item.id === input.parentId && item.kind === 'development' && !item.deletedAt,
      );
      if (!parent) throw new Error('O empreendimento selecionado não está disponível.');
      if (parent.status === 'sold' && currentParentId !== input.parentId) {
        throw new Error('Não é possível vincular unidade a um empreendimento vendido.');
      }
    }
  }

  async list(query: CatalogQuery = {}) {
    const search = query.search?.trim().toLowerCase();
    return this.readAll()
      .filter((item) => query.includeDeleted || !item.deletedAt)
      .filter((item) => !query.status || item.status === query.status)
      .filter((item) => !query.kind || item.kind === query.kind)
      .filter((item) => !query.itemType || item.itemType === query.itemType)
      .filter((item) => {
        if (!search) return true;
        const haystack = [
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
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  async getById(id: string) {
    const item = this.readAll().find((candidate) => candidate.id === id && !candidate.deletedAt);
    return item ? clone(item) : null;
  }

  async create(input: CatalogItemDraft) {
    const normalized: CatalogItemDraft = {
      ...clone(input),
      itemType: input.itemType ?? 'property',
      tags: Array.isArray(input.tags) ? input.tags : [],
      kind: input.itemType === 'property' ? input.kind : 'standalone',
      purpose: input.itemType === 'property' ? input.purpose : 'sale',
      location: input.itemType === 'property' ? input.location : { city: '', neighborhood: '' },
      parentId: input.itemType === 'property' && input.kind === 'unit' ? input.parentId : undefined,
      typology: input.itemType === 'property' && input.kind === 'unit' ? normalizeText(input.typology) || undefined : undefined,
      isLaunch: input.itemType === 'property' ? input.isLaunch : false,
      features: input.itemType === 'property' ? input.features : [],
      lifestyleTags: input.itemType === 'property' ? input.lifestyleTags : [],
      developer: input.itemType === 'property' ? input.developer : undefined,
    };
    const items = this.readAll();
    this.validateDraft(normalized, items);
    const timestamp = nowIso();
    const item: CatalogItem = {
      ...normalized,
      id: makeId(),
      code: normalizeText(normalized.code),
      name: normalizeText(normalized.name),
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.writeAll([...items, item]);
    return clone(item);
  }

  async update(id: string, input: Partial<CatalogItemDraft>) {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === id && !item.deletedAt);
    if (index < 0) throw new Error('Item não encontrado.');

    const current = items[index];
    const merged: CatalogItemDraft = {
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      itemType: input.itemType ?? current.itemType,
      kind: input.kind ?? current.kind,
      parentId: input.parentId ?? current.parentId,
      typology: input.typology ?? current.typology,
      purpose: input.purpose ?? current.purpose,
      description: input.description ?? current.description,
      location: input.location ?? current.location,
      price: input.price === undefined ? current.price : input.price,
      discountType: input.discountType === undefined ? current.discountType : input.discountType,
      discountValue: input.discountValue === undefined ? current.discountValue : input.discountValue,
      tags: input.tags ?? current.tags,
      isLaunch: input.isLaunch ?? current.isLaunch,
      features: input.features ?? current.features,
      lifestyleTags: input.lifestyleTags ?? current.lifestyleTags,
      developer: input.developer ?? current.developer,
      media: input.media ?? current.media,
    };

    if (current.itemType === 'property' && current.kind === 'development' && (merged.itemType !== 'property' || merged.kind !== 'development') && hasActiveUnits(items, id)) {
      throw new Error('Este empreendimento possui unidades ativas. Remova ou realoque as unidades antes de alterar o tipo.');
    }

    if (merged.itemType !== 'property') {
      merged.kind = 'standalone';
      merged.parentId = undefined;
      merged.typology = undefined;
      merged.purpose = 'sale';
      merged.location = { city: '', neighborhood: '' };
      merged.isLaunch = false;
      merged.features = [];
      merged.lifestyleTags = [];
      merged.developer = undefined;
    } else if (merged.kind !== 'unit') {
      merged.parentId = undefined;
      merged.typology = undefined;
    } else {
      merged.typology = normalizeText(merged.typology) || undefined;
    }
    this.validateDraft(
      merged,
      items,
      id,
      current.kind === 'unit' ? current.parentId : undefined,
    );

    const updated: CatalogItem = {
      ...current,
      ...clone(merged),
      parentId: merged.kind === 'unit' ? merged.parentId : undefined,
      typology: merged.kind === 'unit' ? normalizeText(merged.typology) || undefined : undefined,
      code: normalizeText(merged.code),
      name: normalizeText(merged.name),
      updatedAt: nowIso(),
    };
    items[index] = updated;
    this.writeAll(items);
    return clone(updated);
  }

  async setStatus(id: string, status: CatalogStatus) {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === id && !item.deletedAt);
    if (index < 0) throw new Error('Item não encontrado.');

    const current = items[index];
    if (current.kind === 'development' && status === 'sold' && hasUnsoldActiveUnits(items, id)) {
      throw new Error('Marque todas as unidades ativas como vendidas antes de vender o empreendimento.');
    }
    assertCatalogStatusTransition(current.status, status);
    const timestamp = nowIso();
    const updated: CatalogItem = {
      ...current,
      status,
      updatedAt: timestamp,
      publishedAt: status === 'published' ? current.publishedAt ?? timestamp : current.publishedAt,
      soldAt: status === 'sold' ? current.soldAt ?? timestamp : current.soldAt,
    };
    items[index] = updated;
    this.writeAll(items);
    return clone(updated);
  }

  async duplicate(id: string) {
    const items = this.readAll();
    const source = items.find((item) => item.id === id && !item.deletedAt);
    if (!source) throw new Error('Item não encontrado.');

    if (source.kind === 'unit' && source.parentId) {
      const parent = items.find(
        (item) => item.id === source.parentId && item.kind === 'development' && !item.deletedAt,
      );
      if (!parent || parent.status === 'sold') {
        throw new Error('Não é possível duplicar unidade vinculada a um empreendimento vendido ou indisponível.');
      }
    }

    const baseCode = `${source.code}-COPIA`;
    let code = baseCode;
    let suffix = 2;
    while (items.some((item) => !item.deletedAt && item.code.toLowerCase() === code.toLowerCase())) {
      code = `${baseCode}-${suffix}`;
      suffix += 1;
    }

    const timestamp = nowIso();
    const copy: CatalogItem = {
      ...clone(source),
      id: makeId(),
      code,
      name: `${source.name} - cópia`,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: undefined,
      soldAt: undefined,
      deletedAt: undefined,
      media: source.media.map((media) => ({ ...media, id: makeId('media') })),
    };
    this.writeAll([...items, copy]);
    return clone(copy);
  }

  async remove(id: string) {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === id && !item.deletedAt);
    if (index < 0) throw new Error('Item não encontrado.');

    const current = items[index];
    if (current.kind === 'development' && hasActiveUnits(items, id)) {
      throw new Error('Não é possível excluir um empreendimento com unidades ativas. Remova ou realoque as unidades primeiro.');
    }

    const timestamp = nowIso();
    items[index] = {
      ...current,
      updatedAt: timestamp,
      deletedAt: timestamp,
    };
    this.writeAll(items);
  }
}
