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
  catalogId: string;
  code: string;
  name: string;
  description: string;
  price: string;
  discountType: '' | CatalogDiscountType;
  discountValue: string;
  tags: string;
  imageUrls: string;
  videoUrls: string;
  documentUrls: string;
}

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

const emptyProductForm = (): ProductFormState => ({
  catalogId: '',
  code: '',
  name: '',
  description: '',
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
  draft: 'Rascunho',
  published: 'Ativo',
  paused: 'Pausado',
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
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState<CatalogMedia['type'] | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const catalogById = useMemo(
    () => new Map(catalogs.map((catalog) => [catalog.id, catalog])),
    [catalogs],
  );

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
  const visibleItems = items.filter((item) => {
    if (catalogFilter !== 'all' && item.catalogId !== catalogFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!normalizedSearch) return true;

    return [
      item.code,
      item.name,
      item.description,
      catalogById.get(item.catalogId)?.name,
      ...item.tags,
    ]
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
    setProductForm(emptyProductForm());
    setPendingUploads([]);
    setShowProductForm(false);
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
    if (!productForm.catalogId) {
      setError('Selecione o catálogo do produto.');
      return;
    }

    const current = editingProductId
      ? items.find((item) => item.id === editingProductId)
      : undefined;
    const pendingStoragePaths = new Map(
      pendingUploads.map((upload) => [upload.url, upload.path]),
    );
    const draft = draftFromProductForm(
      productForm,
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
        await productRepository.update(editingProductId, draft);
      } else {
        await productRepository.create(draft);
      }
      await cleanupUploads([...unusedPendingUploads, ...removedStoredMedia]);
      resetProductForm();
    }, editingProductId ? 'Produto atualizado.' : 'Produto criado.');
  };

  const startProduct = () => {
    if (catalogs.length === 0) {
      setError('Crie um catálogo antes de cadastrar produtos.');
      return;
    }
    setEditingProductId(null);
    setProductForm({
      ...emptyProductForm(),
      catalogId: catalogFilter !== 'all' ? catalogFilter : catalogs[0].id,
    });
    setPendingUploads([]);
    setShowProductForm(true);
    setError('');
  };

  const startEdit = async (item: CatalogItem) => {
    if (!access.canManage) return;
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setEditingProductId(item.id);
    setProductForm(productFormFromItem(item));
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

  return (
    <section className="f03-shell">
      <header className="f03-header">
        <div>
          <p className="f03-kicker">Operação comercial</p>
          <h1>Produtos</h1>
          <p>Crie os catálogos da operação e depois cadastre os produtos dentro deles.</p>
        </div>
        <div className="f03-header-metric">
          <strong>{items.length}</strong>
          <span>produtos cadastrados</span>
        </div>
      </header>

      {error && <div className="f03-alert f03-alert-error">{error}</div>}
      {notice && <div className="f03-alert f03-alert-success">{notice}</div>}

      <section className="f03-card" style={{ marginBottom: 16 }}>
        <div className="f03-card-heading">
          <div>
            <p className="f03-kicker">Estrutura</p>
            <h2>Catálogos</h2>
            <p>O cliente define livremente o nome e a finalidade de cada catálogo.</p>
          </div>
          {access.canManage && (
            <button
              type="button"
              className="f03-button f03-button-primary"
              onClick={() => setShowCatalogForm((open) => !open)}
            >
              Novo catálogo
            </button>
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
            <p>Crie o primeiro catálogo para liberar o cadastro de produtos.</p>
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
                  {access.canManage && (
                    <div className="f03-actions">
                      <button
                        type="button"
                        className="f03-button f03-button-danger"
                        onClick={() => void deleteCatalog(catalog)}
                      >
                        Excluir catálogo
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="f03-card">
        <div className="f03-card-heading">
          <div>
            <p className="f03-kicker">Itens</p>
            <h2>Produtos</h2>
            <p>Todo produto precisa estar associado a um catálogo.</p>
          </div>
          {access.canManage && (
            <button
              type="button"
              className="f03-button f03-button-primary"
              disabled={catalogs.length === 0}
              onClick={startProduct}
            >
              Novo produto
            </button>
          )}
        </div>

        {showProductForm && access.canManage && (
          <form className="f03-form" onSubmit={submitProduct}>
            <div className="f03-grid-2">
              <label>
                Catálogo
                <select
                  value={productForm.catalogId}
                  onChange={(event) => setProductForm({ ...productForm, catalogId: event.target.value })}
                  required
                >
                  <option value="">Selecione</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>{catalog.name}</option>
                  ))}
                </select>
              </label>
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
            </div>

            <label>
              Tags
              <input
                value={productForm.tags}
                onChange={(event) => setProductForm({ ...productForm, tags: event.target.value })}
                placeholder="premium, recorrente, lançamento"
              />
            </label>

            <label>
              Descrição
              <textarea
                rows={3}
                value={productForm.description}
                onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
              />
            </label>

            <div className="f03-media-box">
              <strong>Mídia</strong>
              {mediaStorage && (
                <label>
                  Enviar fotos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={uploadingType !== null}
                    onChange={(event) => void uploadFiles(event, 'image', 'imageUrls')}
                  />
                </label>
              )}
              <label>
                Fotos, uma URL por linha
                <textarea
                  rows={3}
                  value={productForm.imageUrls}
                  onChange={(event) => setProductForm({ ...productForm, imageUrls: event.target.value })}
                />
              </label>

              {mediaStorage && (
                <label>
                  Enviar vídeos
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    multiple
                    disabled={uploadingType !== null}
                    onChange={(event) => void uploadFiles(event, 'video', 'videoUrls')}
                  />
                </label>
              )}
              <label>
                Vídeos, uma URL por linha
                <textarea
                  rows={3}
                  value={productForm.videoUrls}
                  onChange={(event) => setProductForm({ ...productForm, videoUrls: event.target.value })}
                />
              </label>

              {mediaStorage && (
                <label>
                  Enviar documentos
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingType !== null}
                    onChange={(event) => void uploadFiles(event, 'document', 'documentUrls')}
                  />
                </label>
              )}
              <label>
                Documentos, uma URL por linha
                <textarea
                  rows={3}
                  value={productForm.documentUrls}
                  onChange={(event) => setProductForm({ ...productForm, documentUrls: event.target.value })}
                />
              </label>
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
        )}

        <div className="f03-toolbar">
          <input
            placeholder="Buscar por produto, código, catálogo ou tag"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={catalogFilter} onChange={(event) => setCatalogFilter(event.target.value)}>
            <option value="all">Todos os catálogos</option>
            {catalogs.map((catalog) => (
              <option key={catalog.id} value={catalog.id}>{catalog.name}</option>
            ))}
          </select>
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
        ) : catalogs.length === 0 ? (
          <div className="f03-empty">
            <h3>Crie um catálogo primeiro</h3>
            <p>O cadastro de produto só é liberado depois que existir ao menos um catálogo.</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="f03-empty">
            <h3>Nenhum produto encontrado</h3>
            <p>Cadastre o primeiro produto dentro de um catálogo.</p>
          </div>
        ) : (
          <div className="f03-item-list">
            {visibleItems.map((item) => (
              <article className="f03-card f03-item" key={item.id}>
                <div className="f03-item-top">
                  <div>
                    <div className="f03-badges">
                      <span className={`f03-badge status-${item.status}`}>{statusLabel[item.status]}</span>
                      <span className="f03-badge f03-badge-muted">
                        {catalogById.get(item.catalogId)?.name || 'Catálogo indisponível'}
                      </span>
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
      </section>
    </section>
  );
}

export default CatalogAdminPage;
