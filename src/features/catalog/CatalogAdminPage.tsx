import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { CATALOG_CHANGED_EVENT, LocalCatalogRepository, type CatalogRepository } from './catalogRepository';
import type { CatalogMediaStorage } from './catalogMediaStorage';
import type { CatalogDiscountType, CatalogItem, CatalogItemDraft, CatalogItemKind, CatalogItemType, CatalogMedia } from './types';
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

interface FormState {
  code: string;
  name: string;
  itemType: CatalogItemType;
  kind: CatalogItemKind;
  parentId: string;
  typology: string;
  purpose: 'sale' | 'rent';
  description: string;
  city: string;
  neighborhood: string;
  condominium: string;
  address: string;
  price: string;
  discountType: '' | CatalogDiscountType;
  discountValue: string;
  tags: string;
  isLaunch: boolean;
  features: string;
  lifestyleTags: string;
  developer: string;
  imageUrls: string;
  videoUrls: string;
  floorplanUrls: string;
  documentUrls: string;
}

type MediaUrlField = 'imageUrls' | 'videoUrls' | 'floorplanUrls' | 'documentUrls';

type PendingUpload = {
  url: string;
  path: string;
};

const emptyForm = (): FormState => ({
  code: '', name: '', itemType: 'property', kind: 'standalone', parentId: '', typology: '', purpose: 'sale', description: '', city: '', neighborhood: '', condominium: '', address: '', price: '', discountType: '', discountValue: '', tags: '', isLaunch: false, features: '', lifestyleTags: '', developer: '', imageUrls: '', videoUrls: '', floorplanUrls: '', documentUrls: '',
});

function splitList(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function mediaFromForm(
  form: FormState,
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
    ...create('floorplan', splitList(form.floorplanUrls)),
    ...create('document', splitList(form.documentUrls)),
  ];
}

function mediaToText(item: CatalogItem, type: CatalogMedia['type']) {
  return item.media.filter((media) => media.type === type).map((media) => media.url).join('\n');
}

function formFromItem(item: CatalogItem): FormState {
  return {
    code: item.code,
    name: item.name,
    itemType: item.itemType,
    kind: item.kind,
    parentId: item.parentId ?? '',
    typology: item.typology ?? '',
    purpose: item.purpose,
    description: item.description,
    city: item.location.city,
    neighborhood: item.location.neighborhood,
    condominium: item.location.condominium ?? '',
    address: item.location.address ?? '',
    price: item.price === null ? '' : String(item.price),
    discountType: item.discountType ?? '',
    discountValue: item.discountValue === undefined ? '' : String(item.discountValue),
    tags: item.tags.join(', '),
    isLaunch: item.isLaunch,
    features: item.features.join(', '),
    lifestyleTags: item.lifestyleTags.join(', '),
    developer: item.developer ?? '',
    imageUrls: mediaToText(item, 'image'),
    videoUrls: mediaToText(item, 'video'),
    floorplanUrls: mediaToText(item, 'floorplan'),
    documentUrls: mediaToText(item, 'document'),
  };
}

function draftFromForm(
  form: FormState,
  existingMedia: CatalogMedia[] = [],
  pendingStoragePaths: Map<string, string> = new Map(),
): CatalogItemDraft {
  return {
    code: form.code,
    name: form.name,
    itemType: form.itemType,
    kind: form.itemType === 'property' ? form.kind : 'standalone',
    parentId: form.itemType === 'property' && form.kind === 'unit' ? form.parentId || undefined : undefined,
    typology: form.itemType === 'property' ? form.typology.trim() || undefined : undefined,
    purpose: form.itemType === 'property' ? form.purpose : 'sale',
    description: form.description.trim(),
    location: form.itemType === 'property' ? {
      city: form.city.trim(),
      neighborhood: form.neighborhood.trim(),
      condominium: form.condominium.trim() || undefined,
      address: form.address.trim() || undefined,
    } : { city: '', neighborhood: '' },
    price: form.price.trim() === '' ? null : Number(form.price),
    discountType: form.discountType || undefined,
    discountValue: form.discountType && form.discountValue.trim() !== '' ? Number(form.discountValue) : undefined,
    tags: splitList(form.tags),
    isLaunch: form.itemType === 'property' ? form.isLaunch : false,
    features: form.itemType === 'property' ? splitList(form.features) : [],
    lifestyleTags: form.itemType === 'property' ? splitList(form.lifestyleTags) : [],
    developer: form.itemType === 'property' ? form.developer.trim() || undefined : undefined,
    media: mediaFromForm(form, existingMedia, pendingStoragePaths),
  };
}

function money(value: number | null) {
  if (value === null) return 'Sob consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function discountedPrice(item: Pick<CatalogItem, 'price' | 'discountType' | 'discountValue'>) {
  if (item.price === null || !item.discountType || item.discountValue === undefined) return item.price;
  if (item.discountType === 'percentage') return Math.max(0, item.price * (1 - item.discountValue / 100));
  return Math.max(0, item.price - item.discountValue);
}

const itemTypeLabel: Record<CatalogItemType, string> = { property: 'Imóvel', product: 'Produto', service: 'Serviço' };
const kindLabel: Record<CatalogItemKind, string> = { development: 'Empreendimento', unit: 'Unidade', standalone: 'Imóvel avulso' };
const statusLabel = { draft: 'Rascunho', published: 'Publicado', paused: 'Pausado', sold: 'Encerrado' } as const;

export function CatalogAdminPage({ access, repository, mediaStorage }: CatalogAdminPageProps) {
  const catalog = useMemo(() => repository ?? new LocalCatalogRepository(), [repository]);
  const canRead = access.canView || access.canManage || access.canPublish;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState<CatalogMedia['type'] | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await catalog.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (canRead) void reload(); }, [canRead, catalog]);
  useEffect(() => {
    if (!canRead) return undefined;
    const listener = () => void reload();
    window.addEventListener(CATALOG_CHANGED_EVENT, listener);
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, listener);
  }, [canRead, catalog]);

  const editingItem = editingId ? items.find((item) => item.id === editingId) : undefined;
  const developments = items.filter(
    (item) => item.itemType === 'property'
      && item.kind === 'development'
      && (item.status !== 'sold' || (editingItem?.kind === 'unit' && editingItem.parentId === item.id)),
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const visibleItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (itemTypeFilter !== 'all' && item.itemType !== itemTypeFilter) return false;
    if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
    if (!normalizedSearch) return true;
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
      .includes(normalizedSearch);
  });

  if (!canRead) {
    return <section className="f03-shell f03-access-denied"><p className="f03-kicker">Catálogo interno</p><h1>Acesso restrito</h1><p>É necessária uma permissão de catálogo para consultar este módulo.</p></section>;
  }

  const clearForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPendingUploads([]);
    setError('');
  };

  const cleanupUploads = async (uploads: PendingUpload[]) => {
    if (!mediaStorage || uploads.length === 0) return;
    await Promise.allSettled(uploads.map((upload) => mediaStorage.remove(upload.path)));
  };

  const cancelForm = async () => {
    await cleanupUploads(pendingUploads);
    clearForm();
    setNotice('Alterações descartadas.');
  };

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      setBusy(true); setError(''); setNotice(''); await action(); setNotice(success); await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível concluir a ação.');
    } finally { setBusy(false); }
  };

  const appendMediaUrls = (field: MediaUrlField, urls: string[]) => {
    setForm((current) => ({
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
    if (!access.canManage) { setError('Permissão catalog.manage necessária para enviar mídia.'); return; }
    if (!mediaStorage) { setError('Storage de mídia ainda não foi conectado a esta tela.'); return; }

    const uploadedThisBatch: PendingUpload[] = [];
    try {
      setUploadingType(type);
      setError('');
      setNotice('');
      for (const file of files) {
        const uploaded = await mediaStorage.upload(file, type);
        uploadedThisBatch.push({ url: uploaded.url, path: uploaded.path });
      }
      appendMediaUrls(field, uploadedThisBatch.map((uploaded) => uploaded.url));
      setPendingUploads((current) => [...current, ...uploadedThisBatch]);
      setNotice(`${uploadedThisBatch.length} arquivo(s) enviado(s). Salve o cadastro para vincular a mídia ao item.`);
    } catch (uploadError) {
      await cleanupUploads(uploadedThisBatch);
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a mídia.');
    } finally {
      setUploadingType(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!access.canManage) { setError('Permissão catalog.manage necessária.'); return; }
    const current = editingId ? items.find((item) => item.id === editingId) : undefined;
    const pendingStoragePaths = new Map(pendingUploads.map((upload) => [upload.url, upload.path]));
    const draft = draftFromForm(form, current?.media ?? [], pendingStoragePaths);
    const draftUrls = new Set(draft.media.map((media) => media.url));
    const unusedPendingUploads = pendingUploads.filter((upload) => !draftUrls.has(upload.url));
    const removedStoredMedia = (current?.media ?? [])
      .filter((media) => media.storagePath && !draftUrls.has(media.url))
      .map((media) => ({ url: media.url, path: media.storagePath as string }));

    await runAction(async () => {
      if (editingId) await catalog.update(editingId, draft); else await catalog.create(draft);
      await cleanupUploads([...unusedPendingUploads, ...removedStoredMedia]);
      clearForm();
    }, editingId ? 'Cadastro atualizado.' : 'Cadastro criado como rascunho.');
  };

  const startEdit = async (item: CatalogItem) => {
    if (!access.canManage) { setError('Permissão catalog.manage necessária.'); return; }
    await cleanupUploads(pendingUploads);
    setPendingUploads([]);
    setEditingId(item.id); setForm(formFromItem(item)); setError(''); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (item: CatalogItem) => {
    if (!access.canManage) { setError('Permissão catalog.manage necessária.'); return; }
    if (!window.confirm(`Excluir “${item.name}”? O registro será preservado para histórico.`)) return;
    await runAction(() => catalog.remove(item.id), 'Item excluído da operação ativa.');
  };

  const setStatus = async (item: CatalogItem, status: CatalogItem['status'], message: string) => {
    if (!access.canPublish) { setError('Permissão catalog.publish necessária.'); return; }
    await runAction(() => catalog.setStatus(item.id, status), message);
  };

  const developmentHasUnsoldUnits = (developmentId: string) => items.some(
    (item) => item.kind === 'unit'
      && item.parentId === developmentId
      && !item.deletedAt
      && item.status !== 'sold',
  );

  return (
    <section className="f03-shell">
      <header className="f03-header">
        <div><p className="f03-kicker">Catálogo comercial</p><h1>Produtos</h1><p>Cadastre imóveis, produtos e serviços com preço, desconto e tags. Nada é publicado automaticamente.</p></div>
        <div className="f03-header-metric"><strong>{items.length}</strong><span>itens ativos no cadastro</span></div>
      </header>

      <div className="f03-layout">
        {access.canManage ? (
          <form className="f03-card f03-form" onSubmit={submit}>
            <div className="f03-card-heading"><div><p className="f03-kicker">{editingId ? 'Edição' : 'Novo cadastro'}</p><h2>{editingId ? 'Editar item' : 'Adicionar ao catálogo'}</h2></div>{editingId && <button className="f03-button f03-button-ghost" type="button" onClick={() => void cancelForm()}>Cancelar</button>}</div>
            {error && <div className="f03-alert f03-alert-error">{error}</div>}
            {notice && <div className="f03-alert f03-alert-success">{notice}</div>}

            <div className="f03-grid-2">
              <label>Categoria<select value={form.itemType} onChange={(event) => {
                const itemType = event.target.value as CatalogItemType;
                setForm({ ...form, itemType, kind: itemType === 'property' ? form.kind : 'standalone', purpose: itemType === 'property' ? form.purpose : 'sale' });
              }}><option value="property">Imóvel</option><option value="product">Produto</option><option value="service">Serviço</option></select></label>
              {form.itemType === 'property' ? <label>Tipo do imóvel<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as CatalogItemKind })}><option value="standalone">Imóvel avulso</option><option value="development">Empreendimento</option><option value="unit">Unidade</option></select></label> : <div />}
              {form.itemType === 'property' && <label>Finalidade<select value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value as 'sale' | 'rent' })}><option value="sale">Venda</option><option value="rent">Locação</option></select></label>}
            </div>
            {form.itemType === 'property' && form.kind === 'unit' && <div className="f03-grid-2"><label>Empreendimento<select value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })} required><option value="">Selecione</option>{developments.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.code}{item.status === 'sold' ? ' (vendido, histórico)' : ''}</option>)}</select></label><label>Tipologia<input value={form.typology} onChange={(event) => setForm({ ...form, typology: event.target.value })} placeholder="Ex.: 2 quartos, 68 m²" required /></label></div>}

            <div className="f03-grid-2">
              <label>Código<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
              <label>Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            </div>
            <label>Descrição<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="f03-grid-2">
              <label>Preço<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Vazio = sob consulta" /></label>
              <label>Tipo de desconto<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value as '' | CatalogDiscountType, discountValue: event.target.value ? form.discountValue : '' })}><option value="">Sem desconto</option><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select></label>
              <label>Valor do desconto<input type="number" min="0" step="0.01" disabled={!form.discountType} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} placeholder={form.discountType === 'percentage' ? 'Ex.: 10' : 'Ex.: 500'} /></label>
              <label>Tags do produto<textarea rows={2} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="premium, recorrente, lançamento" /></label>
            </div>
            {form.itemType === 'property' && <>
              <div className="f03-grid-2">
                <label>Cidade<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
                <label>Bairro / localização<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} /></label>
                <label>Condomínio<input value={form.condominium} onChange={(event) => setForm({ ...form, condominium: event.target.value })} /></label>
                <label>Endereço<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                <label>Incorporadora / origem<input value={form.developer} onChange={(event) => setForm({ ...form, developer: event.target.value })} /></label>
              </div>
              <label className="f03-check"><input type="checkbox" checked={form.isLaunch} onChange={(event) => setForm({ ...form, isLaunch: event.target.checked })} /><span>Marcar como lançamento</span></label>
              <div className="f03-grid-2">
                <label>Características<textarea rows={3} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} placeholder="3 quartos, varanda, 2 vagas" /></label>
                <label>Estilo de vida<textarea rows={3} value={form.lifestyleTags} onChange={(event) => setForm({ ...form, lifestyleTags: event.target.value })} placeholder="praia, família, investimento" /></label>
              </div>
            </>}
            <div className="f03-media-box">
              <div><strong>Mídia</strong><p>{mediaStorage ? 'Envie arquivos diretamente para o Storage ou informe URLs permanentes. A primeira foto da lista é tratada como capa.' : 'Informe URLs permanentes. O adapter de Storage pode ser injetado para habilitar upload direto. A primeira foto da lista é tratada como capa.'}</p></div>
              {mediaStorage && <label>Enviar fotos<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploadingType !== null} onChange={(event) => void uploadFiles(event, 'image', 'imageUrls')} /></label>}
              <label>Fotos - uma URL por linha<textarea rows={3} value={form.imageUrls} onChange={(event) => setForm({ ...form, imageUrls: event.target.value })} /></label>
              {mediaStorage && <label>Enviar vídeos<input type="file" accept="video/mp4,video/webm" multiple disabled={uploadingType !== null} onChange={(event) => void uploadFiles(event, 'video', 'videoUrls')} /></label>}
              <label>Vídeos - uma URL por linha<textarea rows={3} value={form.videoUrls} onChange={(event) => setForm({ ...form, videoUrls: event.target.value })} /></label>
              {mediaStorage && <label>Enviar plantas<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple disabled={uploadingType !== null} onChange={(event) => void uploadFiles(event, 'floorplan', 'floorplanUrls')} /></label>}
              <label>Plantas - uma URL por linha<textarea rows={3} value={form.floorplanUrls} onChange={(event) => setForm({ ...form, floorplanUrls: event.target.value })} /></label>
              {mediaStorage && <label>Enviar documentos<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple disabled={uploadingType !== null} onChange={(event) => void uploadFiles(event, 'document', 'documentUrls')} /></label>}
              <label>Documentos - uma URL por linha<textarea rows={3} value={form.documentUrls} onChange={(event) => setForm({ ...form, documentUrls: event.target.value })} /></label>
              {uploadingType && <p>Enviando mídia...</p>}
            </div>
            <button className="f03-button f03-button-primary" type="submit" disabled={busy || uploadingType !== null}>{busy ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar rascunho'}</button>
          </form>
        ) : (
          <aside className="f03-card f03-form">
            <p className="f03-kicker">Modo leitura</p>
            <h2>Consulta do catálogo</h2>
            <p>Você pode consultar o catálogo, mas não possui <code>catalog.manage</code> para alterar dados.</p>
            {access.canPublish && <p>Você possui <code>catalog.publish</code> e pode alterar o status de publicação dos itens.</p>}
            {error && <div className="f03-alert f03-alert-error">{error}</div>}
            {notice && <div className="f03-alert f03-alert-success">{notice}</div>}
          </aside>
        )}

        <div className="f03-list-column">
          <div className="f03-card f03-toolbar">
            <input placeholder="Buscar por nome, código, tag ou localização" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option><option value="sold">Encerrado</option></select>
            <select value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value)}><option value="all">Todas as categorias</option><option value="property">Imóveis</option><option value="product">Produtos</option><option value="service">Serviços</option></select>
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">Todos os subtipos</option><option value="development">Empreendimentos</option><option value="unit">Unidades</option><option value="standalone">Avulsos / gerais</option></select>
          </div>

          {loading ? <div className="f03-card f03-empty"><h2>Carregando catálogo...</h2><p>Buscando os dados reais do repositório.</p></div> : visibleItems.length === 0 ? <div className="f03-card f03-empty"><div className="f03-empty-icon">0</div><h2>Nenhum item encontrado</h2><p>O catálogo começa vazio e só exibe dados realmente cadastrados.</p></div> : (
            <div className="f03-item-list">{visibleItems.map((item) => {
              const soldBlockedByUnits = item.itemType === 'property' && item.kind === 'development' && developmentHasUnsoldUnits(item.id);
              return (
              <article className="f03-card f03-item" key={item.id}>
                <div className="f03-item-top"><div><div className="f03-badges"><span className={`f03-badge status-${item.status}`}>{item.itemType === 'property' && item.status === 'sold' ? 'Vendido' : statusLabel[item.status]}</span><span className="f03-badge f03-badge-muted">{itemTypeLabel[item.itemType]}</span>{item.itemType === 'property' && <span className="f03-badge f03-badge-muted">{kindLabel[item.kind]}</span>}{item.typology && <span className="f03-badge f03-badge-muted">{item.typology}</span>}{item.tags.map((tag) => <span key={tag} className="f03-badge f03-badge-muted">{tag}</span>)}</div><h3>{item.name}</h3><p>{item.code}{item.itemType === 'property' && item.location.city ? ` · ${item.location.city}${item.location.neighborhood ? ` / ${item.location.neighborhood}` : ''}` : ''}</p></div><div><strong>{money(discountedPrice(item))}</strong>{item.discountType && item.price !== null && <small style={{ display: 'block', textAlign: 'right' }}>de {money(item.price)}</small>}</div></div>
                <div className="f03-item-meta"><span>{item.itemType === 'property' ? (item.purpose === 'sale' ? 'Venda' : 'Locação') : itemTypeLabel[item.itemType]}</span>{item.itemType === 'property' && <span>{item.isLaunch ? 'Lançamento' : 'Estoque'}</span>}<span>{item.media.filter((media) => media.type === 'image').length} fotos</span><span>{item.media.filter((media) => media.type === 'video').length} vídeos</span><span>{item.media.filter((media) => media.type === 'document' || media.type === 'floorplan').length} arquivos</span></div>
                {(access.canManage || access.canPublish) && <div className="f03-actions">
                  {access.canManage && <button className="f03-button f03-button-ghost" onClick={() => void startEdit(item)}>Editar</button>}
                  {access.canPublish && item.status !== 'published' && item.status !== 'sold' && <button className="f03-button f03-button-primary" onClick={() => void setStatus(item, 'published', 'Item publicado.')}>Publicar</button>}
                  {access.canPublish && item.status === 'published' && <button className="f03-button f03-button-ghost" onClick={() => void setStatus(item, 'paused', 'Item pausado.')}>Pausar</button>}
                  {access.canPublish && item.status !== 'sold' && <button className="f03-button f03-button-ghost" disabled={soldBlockedByUnits} title={soldBlockedByUnits ? 'Venda as unidades ativas antes de vender o empreendimento.' : undefined} onClick={() => void setStatus(item, 'sold', item.itemType === 'property' ? 'Item marcado como vendido.' : 'Item encerrado.')}>{item.itemType === 'property' ? 'Vendido' : 'Encerrar'}</button>}
                  {access.canManage && <button className="f03-button f03-button-ghost" onClick={() => void runAction(() => catalog.duplicate(item.id), 'Cópia criada como rascunho.')}>Duplicar</button>}
                  {access.canManage && <button className="f03-button f03-button-danger" onClick={() => void remove(item)}>Excluir</button>}
                </div>}
              </article>
              );
            })}</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CatalogAdminPage;
