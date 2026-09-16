import { CATALOG_CHANGED_EVENT, type CatalogRepository } from './catalogRepository';
import type { CatalogItem, CatalogItemDraft, CatalogMedia, CatalogQuery, CatalogStatus } from './types';

interface SupabaseErrorLike {
  message: string;
}

interface SupabaseResultLike<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

/**
 * A tipagem estrutural evita que a Frente03 importe/crie outro cliente Supabase.
 * Na integração, injete o cliente oficial exportado pela Frente01.
 */
export interface CatalogSupabaseClient {
  from(table: string): any;
}

interface CatalogRow {
  id: string;
  code: string;
  name: string;
  kind: CatalogItem['kind'];
  parent_id: string | null;
  typology: string | null;
  purpose: CatalogItem['purpose'];
  description: string;
  city: string;
  neighborhood: string;
  condominium: string | null;
  address: string | null;
  price: number | null;
  is_launch: boolean;
  features: string[] | null;
  lifestyle_tags: string[] | null;
  developer: string | null;
  media: unknown;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  sold_at: string | null;
  deleted_at: string | null;
}

function fail(error: SupabaseErrorLike | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

function notifyCatalogChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CATALOG_CHANGED_EVENT));
}

function makeId(prefix = 'media') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeMedia(value: unknown): CatalogMedia[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CatalogMedia => {
    if (!item || typeof item !== 'object') return false;
    const media = item as Partial<CatalogMedia>;
    return typeof media.id === 'string'
      && typeof media.url === 'string'
      && ['image', 'video', 'document', 'floorplan'].includes(String(media.type));
  });
}

function fromRow(row: CatalogRow): CatalogItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    parentId: row.parent_id ?? undefined,
    typology: row.typology ?? undefined,
    purpose: row.purpose,
    description: row.description,
    location: {
      city: row.city,
      neighborhood: row.neighborhood,
      condominium: row.condominium ?? undefined,
      address: row.address ?? undefined,
    },
    price: row.price,
    isLaunch: row.is_launch,
    features: row.features ?? [],
    lifestyleTags: row.lifestyle_tags ?? [],
    developer: row.developer ?? undefined,
    media: sanitizeMedia(row.media),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
    soldAt: row.sold_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function draftPayload(input: CatalogItemDraft) {
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    kind: input.kind,
    parent_id: input.kind === 'unit' ? input.parentId ?? null : null,
    typology: input.kind === 'unit' ? input.typology?.trim() || null : null,
    purpose: input.purpose,
    description: input.description,
    city: input.location.city.trim(),
    neighborhood: input.location.neighborhood.trim(),
    condominium: input.location.condominium?.trim() || null,
    address: input.location.address?.trim() || null,
    price: input.price,
    is_launch: input.isLaunch,
    features: input.features,
    lifestyle_tags: input.lifestyleTags,
    developer: input.developer?.trim() || null,
    media: input.media,
  };
}

function validateDraft(input: CatalogItemDraft) {
  if (!input.code.trim()) throw new Error('Informe um código para o item.');
  if (!input.name.trim()) throw new Error('Informe um nome para o item.');
  if (!input.location.city.trim()) throw new Error('Informe a cidade do item.');
  if (input.price !== null && input.price < 0) throw new Error('O preço não pode ser negativo.');
  if (input.kind === 'unit' && !input.parentId) throw new Error('Selecione o empreendimento desta unidade.');
  if (input.kind === 'unit' && !input.typology?.trim()) throw new Error('Informe a tipologia desta unidade.');
}

function applyLocalQuery(items: CatalogItem[], query: CatalogQuery) {
  const search = query.search?.trim().toLocaleLowerCase('pt-BR');
  return items
    .filter((item) => query.includeDeleted || !item.deletedAt)
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.kind || item.kind === query.kind)
    .filter((item) => {
      if (!search) return true;
      return [
        item.code,
        item.name,
        item.typology,
        item.location.city,
        item.location.neighborhood,
        item.location.condominium,
        item.developer,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(search);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly client: CatalogSupabaseClient) {}

  async list(query: CatalogQuery = {}): Promise<CatalogItem[]> {
    const result = await this.client
      .from('catalog_items')
      .select('*') as SupabaseResultLike<CatalogRow[]>;

    if (result.error) fail(result.error, 'Não foi possível carregar o catálogo.');
    return applyLocalQuery((result.data ?? []).map(fromRow), query);
  }

  async getById(id: string): Promise<CatalogItem | null> {
    const result = await this.client
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle() as SupabaseResultLike<CatalogRow>;

    if (result.error) fail(result.error, 'Não foi possível carregar o item.');
    return result.data ? fromRow(result.data) : null;
  }

  async create(input: CatalogItemDraft): Promise<CatalogItem> {
    validateDraft(input);
    const result = await this.client
      .from('catalog_items')
      .insert({ ...draftPayload(input), status: 'draft' })
      .select('*')
      .single() as SupabaseResultLike<CatalogRow>;

    if (result.error || !result.data) fail(result.error, 'Não foi possível criar o item.');
    notifyCatalogChanged();
    return fromRow(result.data!);
  }

  async update(id: string, input: Partial<CatalogItemDraft>): Promise<CatalogItem> {
    const current = await this.getById(id);
    if (!current) throw new Error('Item não encontrado.');

    const merged: CatalogItemDraft = {
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      kind: input.kind ?? current.kind,
      parentId: input.parentId ?? current.parentId,
      typology: input.typology ?? current.typology,
      purpose: input.purpose ?? current.purpose,
      description: input.description ?? current.description,
      location: input.location ?? current.location,
      price: input.price === undefined ? current.price : input.price,
      isLaunch: input.isLaunch ?? current.isLaunch,
      features: input.features ?? current.features,
      lifestyleTags: input.lifestyleTags ?? current.lifestyleTags,
      developer: input.developer ?? current.developer,
      media: input.media ?? current.media,
    };
    if (merged.kind !== 'unit') {
      merged.parentId = undefined;
      merged.typology = undefined;
    }
    validateDraft(merged);

    const result = await this.client
      .from('catalog_items')
      .update(draftPayload(merged))
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single() as SupabaseResultLike<CatalogRow>;

    if (result.error || !result.data) fail(result.error, 'Não foi possível atualizar o item.');
    notifyCatalogChanged();
    return fromRow(result.data!);
  }

  async setStatus(id: string, status: CatalogStatus): Promise<CatalogItem> {
    const result = await this.client
      .from('catalog_items')
      .update({ status })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single() as SupabaseResultLike<CatalogRow>;

    if (result.error || !result.data) fail(result.error, 'Não foi possível alterar o status.');
    notifyCatalogChanged();
    return fromRow(result.data!);
  }

  async duplicate(id: string): Promise<CatalogItem> {
    const source = await this.getById(id);
    if (!source) throw new Error('Item não encontrado.');

    const activeItems = await this.list();
    const baseCode = `${source.code}-COPIA`;
    let code = baseCode;
    let suffix = 2;
    while (activeItems.some((item) => item.code.toLocaleLowerCase('pt-BR') === code.toLocaleLowerCase('pt-BR'))) {
      code = `${baseCode}-${suffix}`;
      suffix += 1;
    }

    return this.create({
      code,
      name: `${source.name} — cópia`,
      kind: source.kind,
      parentId: source.parentId,
      typology: source.typology,
      purpose: source.purpose,
      description: source.description,
      location: source.location,
      price: source.price,
      isLaunch: source.isLaunch,
      features: [...source.features],
      lifestyleTags: [...source.lifestyleTags],
      developer: source.developer,
      media: source.media.map((media) => ({ ...media, id: makeId() })),
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.client
      .from('catalog_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null) as SupabaseResultLike<unknown>;

    if (result.error) fail(result.error, 'Não foi possível excluir o item.');
    notifyCatalogChanged();
  }
}
