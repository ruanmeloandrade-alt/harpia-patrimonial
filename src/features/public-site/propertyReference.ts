/** Hárpia property detail. Geometry and palette measured from Página Imóveis (2)(2).pdf.
 * The renderer is shared by the React route and the branch-published static page.
 * No sample listing, metric, media URL or operational data is created here. */
export type PropertyMedia = { type: 'image' | 'video'; url: string; alt: string; main?: boolean };
export type PropertyReferenceData = {
  id: string; code: string; slug: string; title: string; description: string;
  propertyType: string; purpose: string; location: string; city: string; address: string;
  price: number | null; area: number | null; bedrooms: number | null; suites: number | null;
  bathrooms: number | null; parking: number | null; iptu: number | null; condominium: number | null;
  services: string[]; outdoors: string[]; others: string[];
  wellness: { label: string; rating: string }[]; media: PropertyMedia[];
};
export type PropertyLinks = { instagram?: string; email?: string; youtube?: string; whatsapp?: string };
export type PropertyPageOptions = {
  item: PropertyReferenceData; related: PropertyReferenceData[]; links?: PropertyLinks;
  onVisit?: () => void; onService?: () => void; onBack?: () => void;
  onOpenRelated?: (slug: string) => void; onFavorite?: () => void | Promise<void>;
  isFavorite?: boolean;
};
export type VideoSource = { kind: 'youtube' | 'vimeo' | 'file'; url: string; poster?: string };
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const string = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const unique = (v: string[]) => [...new Set(v.filter(Boolean))];
export function safePropertyUrl(value: unknown): string | null {
  const input = string(value);
  if (!input) return null;
  try {
    const url = new URL(input, typeof location !== 'undefined' && /^https?:\/\//.test(location.origin) ? location.origin : 'https://harpiapatrimonial.com');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function number(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const input = typeof v === 'number' ? v : /^\d+(?:[.,]\d+)?$/.test(string(v)) ? Number(string(v).replace(',', '.')) : NaN;
  return Number.isFinite(input) && input >= 0 ? input : null;
}
export function resolveReferenceVideo(input: string): VideoSource | null {
  const href = safePropertyUrl(input);
  if (!href) return null;
  const url = new URL(href), host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    const id = host === 'youtu.be' ? parts[0] : parts[0] === 'watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : '';
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return { kind: 'youtube', url: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`, poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
    if (!id || !/^\d+$/.test(id)) return null;
    const hash = url.searchParams.get('h') || (host === 'vimeo.com' ? parts[1] : '');
    return { kind: 'vimeo', url: `https://player.vimeo.com/video/${id}${hash && /^[a-zA-Z0-9]+$/.test(hash) ? '?h=' + hash : ''}` };
  }
  // Existing uploaded videos remain supported. Arbitrary websites are not embedded.
  return { kind: 'file', url: href };
}
/** Accepts existing Supabase records and the existing PublicCatalogItem contract. */
export function normalizeReferenceProperty(value: unknown, extraImages: string[] = [], videoConfig?: unknown): PropertyReferenceData {
  const item = record(value), loc = record(item.location);
  const features = array(item.features).map(string).filter(Boolean);
  const field = (name: string, fallback: unknown) => {
    const prefix = '@' + name + ':';
    const token = features.find(v => v.toLocaleLowerCase('pt-BR').startsWith(prefix));
    return token ? number(token.slice(prefix.length)) : number(fallback);
  };
  const metric = (words: string, fallback: unknown) => {
    const direct = number(fallback);
    if (direct !== null) return direct;
    const expression = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*(' + words + ')$', 'i');
    const found = features.map(v => v.match(expression)).find(Boolean);
    return found ? number(found[1]) : null;
  };
  const services: string[] = [], outdoors: string[] = [], others: string[] = [];
  const wellness: PropertyReferenceData['wellness'] = [];
  let address = string(loc.address) || string(item.address);
  for (const feature of features) {
    const lower = feature.toLocaleLowerCase('pt-BR');
    if (lower.startsWith('@servico:')) { services.push(feature.slice(9).trim()); continue; }
    if (lower.startsWith('@area_externa:')) { outdoors.push(feature.slice(14).trim()); continue; }
    if (lower.startsWith('@endereco:')) { address = feature.slice(10).trim(); continue; }
    if (lower.startsWith('@wellness:')) {
      const [label, ...rest] = feature.slice(10).split('|'), rating = rest.join('|').trim();
      if (label.trim() && rating) wellness.push({ label: label.trim(), rating });
      continue;
    }
    if (lower.startsWith('@') || /^\d+(?:[.,]\d+)?\s*(m²|m2|quartos?|dormitórios?|suítes?|banheiros?|vagas?)$/i.test(feature)) continue;
    if (/portaria|conci[eé]rge|concierge|lavanderia|encomenda|fast market|pay-per-use/i.test(feature)) services.push(feature);
    else if (/piscina|coworking|parque|jogos|academia|churrasqueira|segurança|sauna|brinquedoteca|festas|recarga/i.test(feature)) outdoors.push(feature);
    else others.push(feature);
  }
  let rawMedia: unknown = item.media;
  if (typeof rawMedia === 'string') { try { rawMedia = JSON.parse(rawMedia); } catch { rawMedia = []; } }
  const media: PropertyMedia[] = [];
  const seen = new Set<string>();
  const add = (kind: 'image' | 'video', input: unknown, alt: string, main = false) => {
    const url = safePropertyUrl(input);
    if (!url || seen.has(url) || (kind === 'video' && !resolveReferenceVideo(url))) return;
    seen.add(url); media.push({ type: kind, url, alt, main });
  };
  const config = record(videoConfig), mainVideo = typeof videoConfig === 'string' ? videoConfig : config.main;
  if (mainVideo) add('video', mainVideo, 'Vídeo principal do imóvel', true);
  for (const value of array(rawMedia)) {
    const m = record(value);
    if (m.type && m.type !== 'image' && m.type !== 'video') continue;
    add(m.type === 'video' ? 'video' : 'image', m.url, string(m.alt) || string(m.label), m.isMain === true || m.main === true);
  }
  for (const url of extraImages) add('image', url, '');
  for (const url of array(config.videos)) add('video', url, 'Vídeo do imóvel');
  return {
    id: string(item.id), code: string(item.code), slug: string(item.slug) || string(item.code) || string(item.id),
    title: string(item.title) || string(item.name) || 'Imóvel Hárpia', description: string(item.description),
    propertyType: string(item.propertyType) || string(item.typology) || 'Imóvel',
    purpose: item.purpose === 'rent' ? 'Locação' : item.purpose === 'sale' ? 'Venda' : string(item.purpose),
    location: string(loc.neighborhood) || string(item.location) || string(item.neighborhood), city: string(loc.city) || string(item.city), address,
    price: number(item.price), area: field('area_m2', metric('m²|m2', item.privateAreaM2 ?? item.private_area_m2)),
    bedrooms: field('dormitorios', metric('quartos?|dormitórios?', item.bedrooms)), suites: field('suites', metric('suítes?', item.suites)),
    bathrooms: field('banheiros', metric('banheiros?', item.bathrooms)), parking: field('vagas', metric('vagas?', item.parkingSpaces ?? item.parking_spaces)),
    iptu: field('iptu_mensal', null), condominium: field('condominio_mensal', null),
    services: unique(services), outdoors: unique(outdoors), others: unique(others), wellness, media,
  };
}
const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function image(url: string, alt: string, lazy = true): HTMLImageElement {
  const img = element('img'); img.src = url; img.alt = alt; img.loading = lazy ? 'lazy' : 'eager'; img.decoding = 'async'; return img;
}
function button(label: string, className: string, visible = ''): HTMLButtonElement {
  const node = element('button', className, visible); node.type = 'button'; node.setAttribute('aria-label', label); return node;
}
function specs(item: PropertyReferenceData): [number, string][] {
  return [[item.area, 'm²'], [item.bedrooms, item.bedrooms === 1 ? 'Dormitório' : 'Dormitórios'], [item.suites, item.suites === 1 ? 'Suíte' : 'Suítes'], [item.bathrooms, item.bathrooms === 1 ? 'Banheiro' : 'Banheiros'], [item.parking, item.parking === 1 ? 'Vaga' : 'Vagas']].filter((v): v is [number, string] => v[0] !== null);
}
function writeSpecs(root: HTMLElement, item: PropertyReferenceData) {
  for (const [n, label] of specs(item)) {
    const span = element('span'); span.append(element('b', '', new Intl.NumberFormat('pt-BR').format(n)), document.createTextNode(' ' + label)); root.append(span);
  }
}
function videoPlayer(media: PropertyMedia, autoplay: boolean): HTMLIFrameElement | HTMLVideoElement | HTMLElement {
  const source = resolveReferenceVideo(media.url);
  if (!source) return element('p', 'hp-ref-empty', 'Vídeo indisponível.');
  if (source.kind === 'file') {
    const video = element('video'); video.src = source.url; video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.autoplay = autoplay; return video;
  }
  const iframe = element('iframe'); const url = new URL(source.url);
  if (autoplay) url.searchParams.set('autoplay', '1');
  iframe.src = url.href; iframe.title = media.alt || 'Vídeo do imóvel'; iframe.allowFullscreen = true;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin'; return iframe;
}
/** Returns a complete cleanup function, including media players and document scroll lock. */
export function renderReferenceProperty(host: HTMLElement, options: PropertyPageOptions): () => void {
  const { item } = options, scope = new AbortController(), signal = scope.signal;
  const root = element('div', 'hp-reference-page'); host.replaceChildren(root);
  const header = element('header', 'hp-ref-header');
  const brand = element('a', 'hp-ref-brand'); brand.href = '/'; brand.setAttribute('aria-label', 'Hárpia Patrimonial, início');
  brand.append(image('/assets/brand/harpia-logo-horizontal-light-green-cropped.png', 'Hárpia Patrimonial & Co.', false)); header.append(brand); root.append(header);
  const main = element('main', 'hp-ref-main'); main.setAttribute('aria-label', item.title);
  const title = element('h1', 'hp-ref-sr', item.title); main.append(title); root.append(main);
  const mediaRegion = element('div', 'hp-ref-media-region'), top = element('section', 'hp-ref-top'); top.setAttribute('aria-label', 'Vídeo principal e características');
  const stage = element('div', 'hp-ref-stage'), features = element('aside', 'hp-ref-features');
  features.append(element('h2', '', 'Caracteristicas'));
  function featureList(heading: string, values: string[]) {
    const section = element('section'); section.append(element('h3', '', heading));
    if (values.length) { const list = element('ul'); values.forEach(value => list.append(element('li', '', value))); section.append(list); }
    else section.append(element('p', 'hp-ref-empty', 'Ainda não informado.'));
    features.append(section);
  }
  featureList('Serviços e Facilidades', item.services); featureList('Área Externa', unique([...item.outdoors, ...item.others]));
  top.append(stage, features); mediaRegion.append(top); main.append(mediaRegion);
  const gallerySection = element('section', 'hp-ref-gallery-section'); gallerySection.setAttribute('aria-label', 'Fotos e vídeos do imóvel');
  const gallery = element('div', 'hp-ref-gallery'); gallerySection.append(gallery); mediaRegion.append(gallerySection);
  // The main video is stable. Gallery navigation never substitutes it.
  const primary = item.media.find(m => m.type === 'video' && m.main) || item.media.find(m => m.type === 'video') || item.media[0];
  const media = [...item.media.filter(m => m.type === 'image'), ...item.media.filter(m => m.type === 'video')];
  const cover = item.media.find(m => m.type === 'image');
  const dialog = element('dialog', 'hp-ref-lightbox'); dialog.setAttribute('aria-label', 'Galeria ampliada do imóvel');
  const toolbar = element('div', 'hp-ref-lightbox-toolbar'), counter = element('span', 'hp-ref-lightbox-counter'); counter.setAttribute('aria-live', 'polite');
  const close = button('Fechar galeria', 'hp-ref-lightbox-close', '×');
  const viewer = element('div', 'hp-ref-lightbox-media'), previous = button('Mídia anterior', 'hp-ref-lightbox-prev', '‹'), next = button('Próxima mídia', 'hp-ref-lightbox-next', '›');
  toolbar.append(counter);
  let favorite = options.isFavorite === true;
  if (options.onFavorite) {
    const save = button('Salvar imóvel', 'hp-ref-lightbox-save', favorite ? 'Imóvel salvo' : 'Salvar imóvel'); save.setAttribute('aria-pressed', String(favorite));
    save.addEventListener('click', async () => { save.disabled = true; try { await options.onFavorite?.(); } catch { counter.textContent = 'Não foi possível salvar o imóvel. Tente novamente.'; } finally { save.disabled = false; } }, { signal }); toolbar.append(save);
  }
  toolbar.append(close); dialog.append(toolbar, viewer, previous, next); root.append(dialog);
  let active = 0, opener: HTMLElement | null = null, priorOverflow = '', scrollLocked = false;
  const pause = (node: HTMLElement) => { node.querySelectorAll('video').forEach(video => video.pause()); node.replaceChildren(); };
  const cleanupDialog = () => {
    pause(viewer);
    if (scrollLocked) { document.body.style.overflow = priorOverflow; scrollLocked = false; }
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
  function show(index: number) {
    if (!media.length) return;
    active = (index + media.length) % media.length; pause(viewer);
    const current = media[active];
    viewer.append(current.type === 'image' ? image(current.url, current.alt || `Foto ${active + 1} de ${item.title}`, false) : videoPlayer(current, true));
    counter.textContent = `${active + 1} / ${media.length}`;
  }
  function resetStage() {
    pause(stage);
    if (!primary) { stage.append(element('p', 'hp-ref-empty', 'Fotos e vídeo ainda não cadastrados.')); return; }
    const play = button(primary.type === 'video' ? 'Reproduzir vídeo principal do imóvel' : 'Ampliar foto principal do imóvel', 'hp-ref-stage-cover');
    const poster = primary.type === 'video' ? resolveReferenceVideo(primary.url)?.poster || cover?.url : primary.url;
    if (poster) play.append(image(poster, primary.alt || item.title, false));
    if (primary.type === 'video') {
      const icon = element('span', 'hp-ref-play', '▶'); icon.setAttribute('aria-hidden', 'true'); play.append(icon);
    }
    play.addEventListener('click', () => {
      if (primary.type === 'video') { pause(stage); stage.append(videoPlayer(primary, true)); }
      else open(media.indexOf(primary), play);
    }, { signal }); stage.append(play);
  }
  function open(index: number, origin: HTMLElement) {
    opener = origin; resetStage();
    if (!dialog.open) { priorOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; scrollLocked = true; dialog.showModal(); }
    show(index); close.focus({ preventScroll: true });
  }
  resetStage();
  media.forEach((m, index) => {
    const thumb = button(`Ampliar ${m.type === 'video' ? 'vídeo' : 'foto'} ${index + 1}`, 'hp-ref-thumb'); thumb.dataset.mediaIndex = String(index); thumb.setAttribute('aria-haspopup', 'dialog');
    const thumbnail = m.type === 'image' ? m.url : resolveReferenceVideo(m.url)?.poster || cover?.url;
    if (thumbnail) thumb.append(image(thumbnail, m.alt || `${m.type === 'video' ? 'Vídeo' : 'Foto'} ${index + 1} do imóvel`));
    if (m.type === 'video') thumb.append(element('span', 'hp-ref-play', '▶'));
    thumb.addEventListener('click', () => open(index, thumb), { signal }); gallery.append(thumb);
  });
  if (!media.length) gallery.append(element('p', 'hp-ref-empty', 'Fotos e vídeos ainda não cadastrados.'));
  if (media.length > 1) {
    const prevGallery = button('Fotos e vídeos anteriores', 'hp-ref-gallery-arrow hp-ref-gallery-prev', '←');
    const nextGallery = button('Próximas fotos e vídeos', 'hp-ref-gallery-arrow hp-ref-gallery-next', '→');
    const scroll = (direction: number) => {
      const end = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
      const target = direction > 0 && gallery.scrollLeft >= end - 2 ? 0 : direction < 0 && gallery.scrollLeft <= 2 ? end : gallery.scrollLeft + direction * gallery.clientWidth;
      gallery.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    prevGallery.addEventListener('click', () => scroll(-1), { signal }); nextGallery.addEventListener('click', () => scroll(1), { signal });
    gallerySection.append(prevGallery, nextGallery);
  }
  const closeDialog = () => { cleanupDialog(); if (dialog.open) dialog.close(); };
  close.addEventListener('click', closeDialog, { signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }, { signal });
  dialog.addEventListener('close', () => { if (!dialog.open) cleanupDialog(); }, { signal });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); }, { signal });
  previous.addEventListener('click', () => show(active - 1), { signal }); next.addEventListener('click', () => show(active + 1), { signal });
  previous.hidden = next.hidden = media.length < 2;
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(active + (event.key === 'ArrowRight' ? 1 : -1)); }
  }, { signal });
  let touchX: number | null = null;
  viewer.addEventListener('pointerdown', event => { if (media[active]?.type === 'image' && event.pointerType === 'touch') touchX = event.clientX; }, { signal });
  viewer.addEventListener('pointerup', event => { if (touchX !== null && Math.abs(event.clientX - touchX) > 55) show(active + (event.clientX < touchX ? 1 : -1)); touchX = null; }, { signal });
  const info = element('section', 'hp-ref-information'); info.setAttribute('aria-label', 'Informações do imóvel');
  const facts = element('p', 'hp-ref-specs'); writeSpecs(facts, item); if (facts.children.length) info.append(facts);
  const fees = element('dl', 'hp-ref-fees');
  const feeData: [string, number | null][] = [['IPTU (Mensal)', item.iptu], ['Condomínio', item.condominium], ['Valor m²', item.price !== null && item.area !== null && item.area > 0 ? item.price / item.area : null]];
  feeData.forEach(([label, value]) => { if (value !== null) { const group = element('div'); group.append(element('dt', '', label), element('dd', '', money(value))); fees.append(group); } });
  if (fees.children.length) info.append(fees);
  const price = element('div', 'hp-ref-price'); price.append(element('small', '', item.code ? 'Código do Imóvel  ' + item.code : 'Imóvel Hárpia'), element('strong', '', item.price === null ? 'Valor sob consulta' : money(item.price)), element('span', '', item.purpose)); info.append(price); main.append(info);
  const wellness = element('section', 'hp-ref-wellness'); wellness.setAttribute('aria-label', 'Índice Wellness'); wellness.append(element('h2', '', 'Índice Wellness'));
  const ratings = element('ul', 'hp-ref-ratings');
  item.wellness.forEach(({ label, rating }) => ratings.append(element('li', '', label.replace(/:$/, '') + ': ' + rating)));
  if (item.wellness.length) wellness.append(ratings); else wellness.append(element('p', 'hp-ref-empty', 'Índice Wellness ainda não informado para este imóvel.'));
  main.append(wellness);
  const description = element('section', 'hp-ref-description'); description.append(element('h2', '', 'Descrição'));
  const paragraphs = element('div', 'hp-ref-description-copy');
  if (item.description) item.description.split(/\n\s*\n/).filter(Boolean).forEach(p => paragraphs.append(element('p', '', p.trim())));
  else paragraphs.append(element('p', 'hp-ref-empty', 'Descrição detalhada ainda não cadastrada.'));
  description.append(paragraphs, element('address', '', item.address || [item.location, item.city].filter(Boolean).join(' · ')));
  const actions = element('div', 'hp-ref-actions');
  function contact(label: string, action: 'visita' | 'atendimento', handler?: () => void) {
    const a = element('a', 'hp-ref-cta', label), url = new URL(options.links?.whatsapp || 'https://wa.me/5521990135757');
    url.searchParams.set('text', `${action === 'visita' ? 'Olá, quero agendar uma visita ao imóvel' : 'Olá, quero receber informações sobre o imóvel'} ${item.code || item.title}. [HP|IMOVEL|${item.code || item.id}|${action.toUpperCase()}]`);
    a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if (handler) a.addEventListener('click', event => { event.preventDefault(); handler(); }, { signal }); return a;
  }
  actions.append(contact('Agendar Visita', 'visita', options.onVisit), contact('Ser Atendido', 'atendimento', options.onService)); description.append(actions); main.append(description);
  const related = element('section', 'hp-ref-related'); related.setAttribute('aria-label', 'Outros imóveis');
  const grid = element('div', 'hp-ref-related-grid');
  const uniqueRelated = options.related.filter((candidate, i, all) => candidate.id !== item.id && (!item.code || candidate.code !== item.code) && all.findIndex(v => v.id === candidate.id) === i).slice(0, 3);
  uniqueRelated.forEach(candidate => {
    const article = element('article', 'hp-ref-related-card'), anchor = element('a', 'hp-ref-related-link');
    anchor.href = '/imoveis/?codigo=' + encodeURIComponent(candidate.code || candidate.id);
    if (options.onOpenRelated) anchor.addEventListener('click', event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); options.onOpenRelated?.(candidate.slug); } }, { signal });
    const photo = element('div', 'hp-ref-card-photo'), cover = candidate.media.find(m => m.type === 'image');
    if (cover) photo.append(image(cover.url, cover.alt || candidate.title)); else photo.append(element('span', 'hp-ref-empty', 'Sem imagem publicada'));
    photo.append(element('span', 'hp-ref-card-type', candidate.propertyType)); anchor.append(photo);
    const body = element('div', 'hp-ref-card-body'); body.append(element('small', 'hp-ref-card-code', candidate.code), element('h3', '', [candidate.address.split(/,\s*\d/)[0].split(' - ')[0], candidate.location].filter(Boolean).join(' - ') || candidate.city || candidate.title));
    const specLine = element('p', 'hp-ref-card-specs'); writeSpecs(specLine, candidate); body.append(specLine);
    const cardPrice = element('div', 'hp-ref-card-price'); cardPrice.append(element('span', '', candidate.price === null ? 'Sob consulta' : money(candidate.price)), element('b', '', 'VER IMÓVEL')); body.append(cardPrice); anchor.append(body); article.append(anchor); grid.append(article);
  });
  if (uniqueRelated.length) { related.append(grid); main.append(related); }
  const footer = element('footer', 'hp-ref-footer');
  const footerBrand = element('a', 'hp-ref-footer-brand'); footerBrand.href = '/'; footerBrand.setAttribute('aria-label', 'Hárpia Patrimonial, início');
  footerBrand.append(image('/assets/brand/harpia-crest-dark-green-cropped.png', '', false), element('strong', '', 'Harpia Patrimonial & Co.'), element('span', '', 'Negócios Imobiliários e Gestão Patrimonial.'));
  footer.append(footerBrand);
  const social = element('nav', 'hp-ref-social'); social.setAttribute('aria-label', 'Canais da Hárpia');
  const icons: [keyof PropertyLinks, string, string][] = [['instagram', 'Instagram', 'instagram'], ['email', 'E-mail', 'email'], ['youtube', 'YouTube', 'youtube'], ['whatsapp', 'WhatsApp', 'whatsapp']];
  const inlineIcons: Record<string, string> = {
    instagram: '<rect x="3" y="3" width="26" height="26" rx="7"/><circle cx="16" cy="16" r="6"/><circle cx="24" cy="8" r="1" fill="currentColor" stroke="none"/>',
    email: '<rect x="2" y="5" width="28" height="22" rx="2"/><path d="m3 6 13 11L29 6"/>',
    youtube: '<rect x="1" y="6" width="30" height="21" rx="6" fill="currentColor" stroke="none"/><path d="m13 11 9 5.5-9 5.5z" fill="var(--hp-light)" stroke="none"/>',
    whatsapp: '<path d="M5 26 2.5 30l6-1.5A13 13 0 1 0 5 26Z"/><path d="M11 8c-3 3-1 8 2 11s8 5 10 2l-4-3-2 2c-3-1-5-3-6-6l2-2z" fill="currentColor" stroke="none"/>',
  };
  icons.forEach(([key, label, name]) => {
    let href = options.links?.[key]; if (key === 'whatsapp' && !href) href = 'https://wa.me/5521990135757';
    const valid = href && (key === 'email' ? /^mailto:[^\s<>]+$/i.test(href) : Boolean(safePropertyUrl(href)));
    const link = valid ? element('a', 'hp-ref-social-link') : element('span', 'hp-ref-social-link');
    if (link instanceof HTMLAnchorElement) { link.href = href!; if (key !== 'email') { link.target = '_blank'; link.rel = 'noopener noreferrer'; } }
    link.setAttribute('aria-label', valid ? label : label + ', canal não configurado');
    if (!valid) link.setAttribute('aria-disabled', 'true');
    // Constant, first-party decorative SVG; listing content is always inserted as text.
    link.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inlineIcons[name]}</svg>`;
    social.append(link);
  }); footer.append(social);
  const legal = element('div', 'hp-ref-legal'), credit = element('span'); credit.append(document.createTextNode('Projeto Desenvolvido por '), element('b', '', 'RB Mídia'));
  const privacy = element('a', '', 'Política de Privacidade'); privacy.href = '/politica-de-privacidade/'; legal.append(credit, privacy); footer.append(legal); root.append(footer);
  if (options.onBack) brand.addEventListener('click', event => { event.preventDefault(); options.onBack?.(); }, { signal });
  return () => { if (dialog.open) dialog.close(); cleanupDialog(); pause(stage); scope.abort(); root.remove(); };
}
