import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { CATALOG_CHANGED_EVENT, LocalCatalogRepository, type CatalogRepository } from './catalogRepository';
import type { CatalogMediaStorage } from './catalogMediaStorage';
import {
  createProductCatalog,
  listProductCatalogs,
  removeProductCatalog,
} from './productCatalogRepository';
import type {
  CatalogDiscountType,
  CatalogItem,
  CatalogItemDraft,
  CatalogMedia,
  ProductCatalog,
} from './types';
import './catalog.css';

export interface CatalogAccess {
  canView: boolean;
  canManage: boolean;
  canPublish: boolean;
}

interface CatalogAdminPageProps {
  access: CatalogAccess;
  repository?: CatalogRepository;
  mediaStorage?: CatalogMediaStorage;
}

interface CatalogFormState {
  name: string;
  description: string;
  tags: string;
}

interface ProductFormState {
  catalogId: string | null;
  code: string;
  name: string;
  description: string;
  visibleOnSite: boolean;
  price: string;
  discountType: '' | CatalogDiscountType;
  discountValue: string;
  tags: string;
  imageUrls: string;
  videoUrls: string;
  documentUrls: string;
}

type WorkspaceMode = 'root' | 'catalog' | 'standalone';
type MediaUrlField = 'imageUrls' | 'videoUrls' | 'documentUrls';

type PendingUpload = {
  url: string;
  path: string;
};

const emptyCatalogForm = (): CatalogFormState => ({
  name: '',
  description: '',
  tags: '',
});

const emptyProductForm = (catalogId: string | null): ProductFormState => ({
  catalogId,
  code: '',
  name: '',
  description: '',
  visibleOnSite: false,
  price: '',
  discountType: '',
  discountValue: '',
  tags: '',
  imageUrls: '',
  videoUrls: '',
  documentUrls: '',
});

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function money(value: number | null) {
  if (value === null) return 'Sob consulta';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function discountedPrice(item: Pick<CatalogItem, 'price' | 'discountType' | 'discountValue'>) {
  if (item.price === null || !item.discountType || item.discountValue === undefined) return item.price;
  if (item.discountType === 'percentage') return Math.max(0, item.price * (1 - item.discountValue / 100));
  return Math.max(0, item.price - item.discountValue);
}

function mediaToText(item: CatalogItem, type: CatalogMedia['type']) {
  return item.media
    .filter((media) => media.type === type)
    .map((media) => media.url)
    .join('\n');
}

function mediaFromForm(
  form: ProductFormState,
  existing: CatalogMedia[] = [],
  pendingStoragePaths: Map<string, string> = new Map(),
): CatalogMedia[] {
  const create = (type: CatalogMedia['type'], urls: string[]) => urls.map((url, index) => {
    const previous = existing.find((media) => media.type === type && media.url === url);
    const storagePath = previous?.storagePath ?? pendingStoragePaths.get(url);
    return {
      ...previous,
      id: previous?.id ?? `media_${type}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      url,
      ...(storagePath ? { storagePath } : {}),
      isCover: type === 'image' && index === 0,
    };
  });

  return [
    ...create('image', splitList(form.imageUrls)),
    ...create('video', splitList(form.videoUrls)),
    ...create('document', splitList(form.documentUrls)),
  ];
}

function productFormFromItem(item: CatalogItem): ProductFormState {
  return {
    catalogId: item.catalogId,
    code: item.code,
    name: item.name,
    description: item.description,
    visibleOnSite: item.status === 'published',
    price: item.price === null ? '' : String(item.price),
    discountType: item.discountType ?? '',
    discountValue: item.discountValue === undefined ? '' : String(item.discountValue),
    tags: item.tags.join(', '),
    imageUrls: mediaToText(item, 'image'),
    videoUrls: mediaToText(item, 'video'),
    documentUrls: mediaToText(item, 'document'),
  };
}

function draftFromProductForm(
  form: ProductFormState,
  existingMedia: CatalogMedia[] = [],
  pendingStoragePaths: Map<string, string> = new Map(),
): CatalogItemDraft {
  return {
    catalogId: form.catalogId,
    code: form.code,
    name: form.name,
    itemType: 'product',
    kind: 'standalone',
    purpose: 'sale',
    description: form.description.trim(),
    location: { city: '', neighborhood: '' },
    price: form.price.trim() === '' ? null : Number(form.price),
    discountType: form.discountType || undefined,
    discountValue: form.discountType && form.discountValue.trim() !== ''
      ? Number(form.discountValue)
      : undefined,
    tags: splitList(form.tags),
    isLaunch: false,
    features: [],
    lifestyleTags: [],
    developer: undefined,
    media: mediaFromForm(form, existingMedia, pendingStoragePaths),
  };
}

const statusLabel: Record<CatalogItem['status'], string> = {
  draft: 'Não visível',
  published: 'Visível no site',
  paused: 'Não visível',
  sold: 'Encerrado',
};

export function CatalogAdminPage({ access, repository, mediaStorage }: CatalogAdminPageProps) {
  const productRepository = useMemo(
    () => repository ?? new LocalCatalogRepository(),
    [repository],
  );
  const canRead = access.canView || access.canManage || access.canPublish;

  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalogForm);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm(null));
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('root');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState<CatalogMedia['type'] | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCatalog = selectedCatalogId
    ? catalogs.find((catalog) => catalog.id === selectedCatalogId)
    : undefined;

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      const [nextCatalogs, nextItems] = await Promise.all([
        listProductCatalogs(),
        productRepository.list(),
      ]);
      setCatalogs(nextCatalogs);
      setItems(nextItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) void reload();
  }, [canRead, productRepository]);

  useEffect(() => {
    if (!canRead) return undefined;
    const listener = () => void reload();
    window.addEventListener(CATALOG_CHANGED_EVENT, listener);
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, listener);
  }, [canRead, productRepository]);

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const contextItems = items.filter((item) => (
    workspaceMode === 'catalog'
      ? item.catalogId === selectedCatalogId
      : workspaceMode === 'standalone'
        ? item.catalogId === null
        : false
  ));

  const visibleItems = contextItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!normalizedSearch) return true;

    return [item.code, item.name, item.description, ...item.tags]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch);
  });

  if (!canRead) {
    return (
      <section className="f03-shell f03-access-denied">
        <p className="f03-kicker">Produtos</p>
        <h1>Acesso restrito</h1>
        <p>É necessária uma permissão de catálogo para consultar este módulo.</p>
      </section>
    );
  }

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      setBusy(true);
      setError('');
      setNotice('');
      await action();
      setNotice(success);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const cleanupUploads = async (uploads: PendingUpload[]) => {
    if (!mediaStorage || uploads.length === 0) return;
    await Promise.allSettled(uploads.map((upload) => mediaStorage.remove(upload.path)));
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm(workspaceMode === 'catalog' ? selectedCatalogId : null));
    setPendingUploads([]);
    setShowProductForm(false);
  };

  const goRoot = async () => {
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setEditingProductId(null);
    setShowProductForm(false);
    setSelectedCatalogId(null);
    setWorkspaceMode('root');
    setSearch('');
    setStatusFilter('all');
    setError('');
  };

  const openCatalog = async (catalog: ProductCatalog) => {
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setSelectedCatalogId(catalog.id);
    setWorkspaceMode('catalog');
    setShowProductForm(false);
    setEditingProductId(null);
    setSearch('');
    setStatusFilter('all');
    setError('');
    setNotice('');
  };

  const openStandalone = async () => {
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setSelectedCatalogId(null);
    setWorkspaceMode('standalone');
    setEditingProductId(null);
    setProductForm(emptyProductForm(null));
    setShowProductForm(true);
    setSearch('');
    setStatusFilter('all');
    setError('');
    setNotice('');
  };

  const submitCatalog = async (event: FormEvent) => {
    event.preventDefault();
    if (!access.canManage) return;

    await runAction(async () => {
      await createProductCatalog({
        name: catalogForm.name,
        description: catalogForm.description,
        tags: splitList(catalogForm.tags),
      });
      setCatalogForm(emptyCatalogForm());
      setShowCatalogForm(false);
    }, 'Catálogo criado.');
  };

  const deleteCatalog = async (catalog: ProductCatalog) => {
    if (!access.canManage) return;
    if (!window.confirm(`Excluir o catálogo "${catalog.name}"?`)) return;

    await runAction(
      () => removeProductCatalog(catalog.id),
      'Catálogo excluído.',
    );
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!access.canManage) return;

    if (workspaceMode === 'catalog' && !selectedCatalogId) {
      setError('Catálogo não encontrado.');
      return;
    }

    const current = editingProductId
      ? items.find((item) => item.id === editingProductId)
      : undefined;
    const pendingStoragePaths = new Map(
      pendingUploads.map((upload) => [upload.url, upload.path]),
    );
    const draft = draftFromProductForm(
      {
        ...productForm,
        catalogId: workspaceMode === 'catalog' ? selectedCatalogId : null,
      },
      current?.media ?? [],
      pendingStoragePaths,
    );
    const draftUrls = new Set(draft.media.map((media) => media.url));
    const unusedPendingUploads = pendingUploads.filter(
      (upload) => !draftUrls.has(upload.url),
    );
    const removedStoredMedia = (current?.media ?? [])
      .filter((media) => media.storagePath && !draftUrls.has(media.url))
      .map((media) => ({ url: media.url, path: media.storagePath as string }));

    await runAction(async () => {
      if (editingProductId) {
        const updated = await productRepository.update(editingProductId, draft);
        if (current?.status !== 'sold') {
          if (productForm.visibleOnSite && updated.status !== 'published') {
            await productRepository.setStatus(updated.id, 'published');
          } else if (!productForm.visibleOnSite && updated.status === 'published') {
            await productRepository.setStatus(updated.id, 'paused');
          }
        }
      } else {
        const created = await productRepository.create(draft);
        if (productForm.visibleOnSite) {
          await productRepository.setStatus(created.id, 'published');
        }
      }
      await cleanupUploads([...unusedPendingUploads, ...removedStoredMedia]);
      resetProductForm();
    }, editingProductId ? 'Produto atualizado.' : 'Produto criado.');
  };

  const startProductInsideCatalog = () => {
    if (!selectedCatalogId) return;
    setEditingProductId(null);
    setProductForm(emptyProductForm(selectedCatalogId));
    setPendingUploads([]);
    setShowProductForm(true);
    setError('');
    setNotice('');
  };

  const startEdit = async (item: CatalogItem) => {
    if (!access.canManage) return;
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setEditingProductId(item.id);
    setProductForm(productFormFromItem(item));
    setSelectedCatalogId(item.catalogId);
    setWorkspaceMode(item.catalogId ? 'catalog' : 'standalone');
    setShowProductForm(true);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelProduct = async () => {
    await cleanupUploads(pendingUploads);
    resetProductForm();
    setNotice('Alterações descartadas.');
  };

  const removeProduct = async (item: CatalogItem) => {
    if (!access.canManage) return;
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    await runAction(
      () => productRepository.remove(item.id),
      'Produto excluído da operação ativa.',
    );
  };

  const setStatus = async (item: CatalogItem, status: CatalogItem['status']) => {
    if (!access.canPublish) return;
    await runAction(
      () => productRepository.setStatus(item.id, status),
      'Status atualizado.',
    );
  };

  const appendMediaUrls = (field: MediaUrlField, urls: string[]) => {
    setProductForm((current) => ({
      ...current,
      [field]: [...splitList(current[field]), ...urls].join('\n'),
    }));
  };

  const uploadFiles = async (
    event: ChangeEvent<HTMLInputElement>,
    type: CatalogMedia['type'],
    field: MediaUrlField,
  ) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    if (!mediaStorage) {
      setError('Storage de mídia ainda não foi conectado a esta tela.');
      return;
    }

    const uploadedThisBatch: PendingUpload[] = [];
    try {
      setUploadingType(type);
      setError('');
      for (const file of files) {
        const uploaded = await mediaStorage.upload(file, type);
        uploadedThisBatch.push({ url: uploaded.url, path: uploaded.path });
      }
      appendMediaUrls(field, uploadedThisBatch.map((upload) => upload.url));
      setPendingUploads((current) => [...current, ...uploadedThisBatch]);
    } catch (uploadError) {
      await cleanupUploads(uploadedThisBatch);
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a mídia.');
    } finally {
      setUploadingType(null);
    }
  };

  const productFormBlock = showProductForm && access.canManage ? (
    <form className="f03-form" onSubmit={submitProduct}>
      <div className="f03-card-heading">
        <div>
          <p className="f03-kicker">{editingProductId ? 'Edição' : 'Novo produto'}</p>
          <h2>
            {editingProductId
              ? 'Editar produto'
              : workspaceMode === 'standalone'
                ? 'Novo produto avulso'
                : `Novo produto em ${selectedCatalog?.name ?? 'catálogo'}`}
          </h2>
        </div>
      </div>

      <div className="f03-grid-2">
        <label>
          Código
          <input
            value={productForm.code}
            onChange={(event) => setProductForm({ ...productForm, code: event.target.value })}
            required
          />
        </label>
        <label>
          Nome
          <input
            value={productForm.name}
            onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
            required
          />
        </label>
        <label>
          Preço
          <input
            type="number"
            min="0"
            step="0.01"
            value={productForm.price}
            onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
            placeholder="Vazio = sob consulta"
          />
        </label>
        <label>
          Tipo de desconto
          <select
            value={productForm.discountType}
            onChange={(event) => setProductForm({
              ...productForm,
              discountType: event.target.value as '' | CatalogDiscountType,
              discountValue: event.target.value ? productForm.discountValue : '',
            })}
          >
            <option value="">Sem desconto</option>
            <option value="percentage">Percentual</option>
            <option value="fixed">Valor fixo</option>
          </select>
        </label>
        <label>
          Valor do desconto
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={!productForm.discountType}
            value={productForm.discountValue}
            onChange={(event) => setProductForm({ ...productForm, discountValue: event.target.value })}
          />
        </label>
        <label>
          Tags
          <input
            value={productForm.tags}
            onChange={(event) => setProductForm({ ...productForm, tags: event.target.value })}
            placeholder="premium, recorrente, lançamento"
          />
        </label>
      </div>

      <div className="f03-card" style={{ padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={productForm.visibleOnSite}
            disabled={editingProductId ? items.find((item) => item.id === editingProductId)?.status === 'sold' : false}
            onChange={(event) => setProductForm({ ...productForm, visibleOnSite: event.target.checked })}
          />
          <span>
            <strong>Visível no site</strong>
            <small style={{ display: 'block' }}>
              Quando ativado, o produto entra na vitrine pública. Desativado, permanece somente na área interna.
            </small>
          </span>
        </label>
      </div>

      <label>
        Descrição completa
        <textarea
          rows={6}
          value={productForm.description}
          onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
          placeholder="Apresente o produto com todas as informações que o cliente final precisa ver."
        />
      </label>

      <div className="f03-media-box">
        <strong>Fotos e vídeos do produto</strong>

        {mediaStorage ? (
          <>
            <label>
              Adicionar fotos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploadingType !== null}
                onChange={(event) => void uploadFiles(event, 'image', 'imageUrls')}
              />
            </label>

            {splitList(productForm.imageUrls).length > 0 && (
              <div className="f03-item-list">
                {splitList(productForm.imageUrls).map((url) => (
                  <article className="f03-card f03-item" key={url}>
                    <img src={url} alt="Foto do produto" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10 }} />
                    <div className="f03-actions">
                      <button
                        type="button"
                        className="f03-button f03-button-danger"
                        onClick={() => setProductForm((current) => ({
                          ...current,
                          imageUrls: splitList(current.imageUrls).filter((item) => item !== url).join('\n'),
                        }))}
                      >
                        Remover foto
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <label>
              Adicionar vídeos
              <input
                type="file"
                accept="video/mp4,video/webm"
                multiple
                disabled={uploadingType !== null}
                onChange={(event) => void uploadFiles(event, 'video', 'videoUrls')}
              />
            </label>

            {splitList(productForm.videoUrls).length > 0 && (
              <div className="f03-item-list">
                {splitList(productForm.videoUrls).map((url) => (
                  <article className="f03-card f03-item" key={url}>
                    <video controls preload="metadata" src={url} style={{ width: '100%', maxHeight: 260, borderRadius: 10 }} />
                    <div className="f03-actions">
                      <button
                        type="button"
                        className="f03-button f03-button-danger"
                        onClick={() => setProductForm((current) => ({
                          ...current,
                          videoUrls: splitList(current.videoUrls).filter((item) => item !== url).join('\n'),
                        }))}
                      >
                        Remover vídeo
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <label>
              Adicionar documentos
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                disabled={uploadingType !== null}
                onChange={(event) => void uploadFiles(event, 'document', 'documentUrls')}
              />
            </label>
          </>
        ) : (
          <div className="f03-alert f03-alert-error">
            O armazenamento de mídia ainda não está conectado nesta execução.
          </div>
        )}
      </div>

      <div className="f03-actions">
        <button
          className="f03-button f03-button-primary"
          type="submit"
          disabled={busy || uploadingType !== null}
        >
          {editingProductId ? 'Salvar alterações' : 'Salvar produto'}
        </button>
        <button
          className="f03-button f03-button-ghost"
          type="button"
          onClick={() => void cancelProduct()}
        >
          Cancelar
        </button>
      </div>
    </form>
  ) : null;

  const productListBlock = (
    <>
      <div className="f03-toolbar">
        <input
          placeholder="Buscar por produto, código ou tag"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="published">Ativo</option>
          <option value="paused">Pausado</option>
          <option value="sold">Encerrado</option>
        </select>
      </div>

      {loading ? (
        <div className="f03-empty">Carregando produtos...</div>
      ) : visibleItems.length === 0 ? (
        <div className="f03-empty">
          <h3>Nenhum produto encontrado</h3>
          <p>
            {workspaceMode === 'standalone'
              ? 'Crie um produto avulso.'
              : 'Crie o primeiro produto dentro deste catálogo.'}
          </p>
        </div>
      ) : (
        <div className="f03-item-list">
          {visibleItems.map((item) => (
            <article className="f03-card f03-item" key={item.id}>
              <div className="f03-item-top">
                <div>
                  <div className="f03-badges">
                    <span className={`f03-badge status-${item.status}`}>{statusLabel[item.status]}</span>
                    {item.tags.map((tag) => (
                      <span key={tag} className="f03-badge f03-badge-muted">{tag}</span>
                    ))}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.code}</p>
                </div>
                <div>
                  <strong>{money(discountedPrice(item))}</strong>
                  {item.discountType && item.price !== null && (
                    <small style={{ display: 'block', textAlign: 'right' }}>
                      de {money(item.price)}
                    </small>
                  )}
                </div>
              </div>

              {item.description && <p>{item.description}</p>}

              {(access.canManage || access.canPublish) && (
                <div className="f03-actions">
                  {access.canManage && (
                    <button
                      className="f03-button f03-button-ghost"
                      type="button"
                      onClick={() => void startEdit(item)}
                    >
                      Editar
                    </button>
                  )}
                  {access.canPublish && item.status !== 'published' && item.status !== 'sold' && (
                    <button
                      className="f03-button f03-button-primary"
                      type="button"
                      onClick={() => void setStatus(item, 'published')}
                    >
                      Ativar
                    </button>
                  )}
                  {access.canPublish && item.status === 'published' && (
                    <button
                      className="f03-button f03-button-ghost"
                      type="button"
                      onClick={() => void setStatus(item, 'paused')}
                    >
                      Pausar
                    </button>
                  )}
                  {access.canPublish && item.status !== 'sold' && (
                    <button
                      className="f03-button f03-button-ghost"
                      type="button"
                      onClick={() => void setStatus(item, 'sold')}
                    >
                      Encerrar
                    </button>
                  )}
                  {access.canManage && (
                    <button
                      className="f03-button f03-button-danger"
                      type="button"
                      onClick={() => void removeProduct(item)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );

  if (workspaceMode === 'catalog' && selectedCatalog) {
    return (
      <section className="f03-shell">
        <header className="f03-header">
          <div>
            <button className="f03-button f03-button-ghost" type="button" onClick={() => void goRoot()}>
              Voltar para catálogos
            </button>
            <p className="f03-kicker">Catálogo</p>
            <h1>{selectedCatalog.name}</h1>
            <p>{selectedCatalog.description || 'Sem descrição.'}</p>
          </div>
          <div className="f03-header-metric">
            <strong>{contextItems.length}</strong>
            <span>produtos neste catálogo</span>
          </div>
        </header>

        {error && <div className="f03-alert f03-alert-error">{error}</div>}
        {notice && <div className="f03-alert f03-alert-success">{notice}</div>}

        <section className="f03-card">
          <div className="f03-card-heading">
            <div>
              <p className="f03-kicker">Produtos do catálogo</p>
              <h2>{selectedCatalog.name}</h2>
            </div>
            {access.canManage && (
              <button
                type="button"
                className="f03-button f03-button-primary"
                onClick={startProductInsideCatalog}
              >
                Novo produto
              </button>
            )}
          </div>

          {productFormBlock}
          {productListBlock}
        </section>
      </section>
    );
  }

  if (workspaceMode === 'standalone') {
    return (
      <section className="f03-shell">
        <header className="f03-header">
          <div>
            <button className="f03-button f03-button-ghost" type="button" onClick={() => void goRoot()}>
              Voltar para catálogos
            </button>
            <p className="f03-kicker">Produtos</p>
            <h1>Produtos avulsos</h1>
            <p>Produtos que não pertencem a nenhum catálogo.</p>
          </div>
          <div className="f03-header-metric">
            <strong>{contextItems.length}</strong>
            <span>produtos avulsos</span>
          </div>
        </header>

        {error && <div className="f03-alert f03-alert-error">{error}</div>}
        {notice && <div className="f03-alert f03-alert-success">{notice}</div>}

        <section className="f03-card">
          <div className="f03-card-heading">
            <div>
              <p className="f03-kicker">Sem catálogo</p>
              <h2>Produtos avulsos</h2>
            </div>
            {access.canManage && !showProductForm && (
              <button
                type="button"
                className="f03-button f03-button-primary"
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm(emptyProductForm(null));
                  setShowProductForm(true);
                }}
              >
                Novo produto avulso
              </button>
            )}
          </div>

          {productFormBlock}
          {productListBlock}
        </section>
      </section>
    );
  }

  const standaloneCount = items.filter((item) => item.catalogId === null).length;

  return (
    <section className="f03-shell">
      <header className="f03-header">
        <div>
          <p className="f03-kicker">Operação comercial</p>
          <h1>Produtos</h1>
          <p>Abra um catálogo para gerenciar os produtos que pertencem a ele.</p>
        </div>
        <div className="f03-header-metric">
          <strong>{catalogs.length}</strong>
          <span>catálogos ativos</span>
        </div>
      </header>

      {error && <div className="f03-alert f03-alert-error">{error}</div>}
      {notice && <div className="f03-alert f03-alert-success">{notice}</div>}

      <section className="f03-card">
        <div className="f03-card-heading">
          <div>
            <p className="f03-kicker">Catálogos de produtos</p>
            <h2>Catálogos</h2>
            <p>Crie e abra um catálogo para cadastrar os produtos dentro dele.</p>
          </div>
          {access.canManage && (
            <div className="f03-actions">
              <button
                type="button"
                className="f03-button f03-button-primary"
                onClick={() => setShowCatalogForm((open) => !open)}
              >
                Novo catálogo
              </button>
              <button
                type="button"
                className="f03-button f03-button-ghost"
                onClick={() => void openStandalone()}
              >
                Produto avulso
              </button>
            </div>
          )}
        </div>

        {showCatalogForm && access.canManage && (
          <form className="f03-form" onSubmit={submitCatalog}>
            <div className="f03-grid-2">
              <label>
                Nome do catálogo
                <input
                  value={catalogForm.name}
                  onChange={(event) => setCatalogForm({ ...catalogForm, name: event.target.value })}
                  placeholder="Ex.: Planos, Imóveis, Serviços, Linha Premium"
                  required
                />
              </label>
              <label>
                Tags
                <input
                  value={catalogForm.tags}
                  onChange={(event) => setCatalogForm({ ...catalogForm, tags: event.target.value })}
                  placeholder="principal, comercial"
                />
              </label>
            </div>
            <label>
              Descrição
              <textarea
                rows={3}
                value={catalogForm.description}
                onChange={(event) => setCatalogForm({ ...catalogForm, description: event.target.value })}
              />
            </label>
            <div className="f03-actions">
              <button className="f03-button f03-button-primary" type="submit" disabled={busy}>
                Salvar catálogo
              </button>
              <button
                className="f03-button f03-button-ghost"
                type="button"
                onClick={() => {
                  setCatalogForm(emptyCatalogForm());
                  setShowCatalogForm(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="f03-empty">Carregando catálogos...</div>
        ) : catalogs.length === 0 ? (
          <div className="f03-empty">
            <h3>Nenhum catálogo criado</h3>
            <p>Crie o primeiro catálogo ou use Produto avulso.</p>
          </div>
        ) : (
          <div className="f03-item-list">
            {catalogs.map((catalog) => {
              const count = items.filter((item) => item.catalogId === catalog.id).length;
              return (
                <article className="f03-card f03-item" key={catalog.id}>
                  <div className="f03-item-top">
                    <div>
                      <h3>{catalog.name}</h3>
                      <p>{catalog.description || 'Sem descrição'}</p>
                    </div>
                    <strong>{count}</strong>
                  </div>
                  <div className="f03-badges">
                    {catalog.tags.map((tag) => (
                      <span key={tag} className="f03-badge f03-badge-muted">{tag}</span>
                    ))}
                  </div>
                  <div className="f03-actions">
                    <button
                      type="button"
                      className="f03-button f03-button-primary"
                      onClick={() => void openCatalog(catalog)}
                    >
                      Abrir catálogo
                    </button>
                    {access.canManage && (
                      <button
                        type="button"
                        className="f03-button f03-button-danger"
                        onClick={() => void deleteCatalog(catalog)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {standaloneCount > 0 && (
          <article className="f03-card f03-item" style={{ marginTop: 16 }}>
            <div className="f03-item-top">
              <div>
                <h3>Produtos avulsos</h3>
                <p>Itens que não pertencem a nenhum catálogo.</p>
              </div>
              <strong>{standaloneCount}</strong>
            </div>
            <div className="f03-actions">
              <button
                type="button"
                className="f03-button f03-button-ghost"
                onClick={() => void openStandalone()}
              >
                Abrir produtos avulsos
              </button>
            </div>
          </article>
        )}
      </section>
    </section>
  );
}

export default CatalogAdminPage;
