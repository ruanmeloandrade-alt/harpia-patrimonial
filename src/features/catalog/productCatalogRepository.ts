import { isSupabaseConfigured, requireSupabase } from '../../core/supabase/client';
import type { ProductCatalog } from './types';

interface ProductCatalogRow {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function fromRow(row: ProductCatalogRow): ProductCatalog {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    tags: row.tags ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

const LOCAL_PRODUCT_CATALOGS_KEY = 'harpia.local.product-catalogs';

function readLocalCatalogs(): ProductCatalog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PRODUCT_CATALOGS_KEY);
    return raw ? JSON.parse(raw) as ProductCatalog[] : [];
  } catch {
    return [];
  }
}

function writeLocalCatalogs(catalogs: ProductCatalog[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_PRODUCT_CATALOGS_KEY, JSON.stringify(catalogs));
}

export async function listProductCatalogs(): Promise<ProductCatalog[]> {
  if (!isSupabaseConfigured) {
    return readLocalCatalogs().filter((catalog) => !catalog.deletedAt).sort((left, right) => (
      left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)
    ));
  }
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('product_catalogs')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message || 'Não foi possível carregar os catálogos.');
  return (data ?? []).map((row: ProductCatalogRow) => fromRow(row));
}

export async function createProductCatalog(input: {
  name: string;
  description?: string;
  tags?: string[];
}): Promise<ProductCatalog> {
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do catálogo.');

  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    const catalogs = readLocalCatalogs();
    const catalog: ProductCatalog = {
      id: `local-catalog-${Date.now()}`,
      name,
      description: input.description?.trim() || undefined,
      tags: input.tags ?? [],
      isActive: true,
      sortOrder: catalogs.length,
      createdAt: now,
      updatedAt: now,
    };
    writeLocalCatalogs([...catalogs, catalog]);
    return catalog;
  }

  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('product_catalogs')
    .insert({
      name,
      description: input.description?.trim() || null,
      tags: input.tags ?? [],
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Não foi possível criar o catálogo.');
  return fromRow(data as ProductCatalogRow);
}

export async function updateProductCatalog(
  id: string,
  input: { name: string; description?: string; tags?: string[]; isActive?: boolean },
): Promise<ProductCatalog> {
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do catálogo.');

  if (!isSupabaseConfigured) {
    const catalogs = readLocalCatalogs();
    const next = catalogs.map((catalog) => catalog.id === id ? {
      ...catalog,
      name,
      description: input.description?.trim() || undefined,
      tags: input.tags ?? catalog.tags,
      isActive: input.isActive ?? catalog.isActive,
      updatedAt: new Date().toISOString(),
    } : catalog);
    writeLocalCatalogs(next);
    const updated = next.find((catalog) => catalog.id === id);
    if (!updated) throw new Error('Catálogo não encontrado.');
    return updated;
  }

  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('product_catalogs')
    .update({
      name,
      description: input.description?.trim() || null,
      tags: input.tags ?? [],
      ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Não foi possível atualizar o catálogo.');
  return fromRow(data as ProductCatalogRow);
}

export async function removeProductCatalog(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    writeLocalCatalogs(readLocalCatalogs().map((catalog) => catalog.id === id ? {
      ...catalog,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : catalog));
    return;
  }
  const supabase = requireSupabase() as any;

  const { count, error: countError } = await supabase
    .from('catalog_items')
    .select('id', { count: 'exact', head: true })
    .eq('catalog_id', id)
    .is('deleted_at', null);

  if (countError) throw new Error(countError.message || 'Não foi possível validar o catálogo.');
  if ((count ?? 0) > 0) throw new Error('Este catálogo possui produtos. Remova ou mova os produtos antes de excluí-lo.');

  const { error } = await supabase
    .from('product_catalogs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(error.message || 'Não foi possível excluir o catálogo.');
}
