/* Existing public catalog transport. No write, account, permission or schema change. */
import { mountLandingChrome } from './landing-chrome-20261016.js?v=20261016.2';
import { normalizeReferenceProperty, renderReferenceProperty } from './propertyReference.js?v=20261016.1';
const endpoint = 'https://desxomqvtjaymwwxivwq.supabase.co';
const publicKey = 'sb_publishable_wWUVxjkMDMXLOrzE0y3Y_w_k9jXf88B';
const key = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
let cleanup = null;
async function loadRecords() {
  const legacy = Array.isArray(window.HARPIA_EXISTING_PROPERTIES) ? window.HARPIA_EXISTING_PROPERTIES : [];
  try {
    const response = await fetch(endpoint + '/rest/v1/catalog_items?select=*&status=eq.published&deleted_at=is.null&item_type=eq.property&order=updated_at.desc', {
      headers: { apikey: publicKey, Authorization: 'Bearer ' + publicKey }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Catálogo HTTP ' + response.status);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error('Resposta inválida do catálogo');
    const known = new Set(result.flatMap(item => [key(item.code), key(item.id)]).filter(Boolean));
    return [...result.map(item => ({ record: item, legacy: false })), ...legacy.filter(item => !known.has(key(item.code)) && !known.has(key(item.id))).map(item => ({ record: item, legacy: true }))];
  } catch (error) {
    console.warn('Catálogo online indisponível; mantendo os imóveis anteriormente publicados.', error);
    if (!legacy.length) throw error;
    return legacy.map(item => ({ record: item, legacy: true }));
  }
}
async function loadCompanyLinks() {
  // Reuse existing destinations from the homepage; never invent social handles.
  try {
    const response = await fetch('/', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return {};
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const links = [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
    const get = re => links.find(href => re.test(href || ''));
    return {
      instagram: get(/^https:\/\/(www\.)?instagram\.com\//i),
      email: get(/^mailto:/i), youtube: get(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i),
      whatsapp: get(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i),
    };
  } catch { return {}; }
}
function showMessage(message) {
  const status = document.getElementById('property-loading'); status.hidden = false;
  const p = document.createElement('p'); p.textContent = message;
  const a = document.createElement('a'); a.href = '/#imoveis'; a.textContent = 'Voltar aos imóveis';
  status.replaceChildren(p, a);
}
async function start() {
  const query = new URLSearchParams(location.search), tail = location.pathname.split('/').filter(Boolean).slice(1).join('/');
  let code = query.get('codigo') || '';
  if (!code && tail) { try { code = decodeURIComponent(tail); } catch { showMessage('Endereço de imóvel inválido.'); return; } }
  if (!code.trim()) { showMessage('Selecione um imóvel no catálogo para visualizar seus detalhes.'); return; }
  const [rows, links] = await Promise.all([loadRecords(), loadCompanyLinks()]);
  const manifest = window.HARPIA_EXISTING_MEDIA || {}, videos = window.HARPIA_PROPERTY_VIDEO_URLS || {};
  const items = rows.map(({ record, legacy }) => normalizeReferenceProperty(record, legacy ? manifest[record.code] || [] : [], legacy ? videos[record.code] : undefined));
  const item = items.find(v => [v.id, v.code, v.slug].some(value => key(value) === key(code)));
  if (!item) { showMessage('Imóvel não encontrado ou não publicado.'); return; }
  const related = items.filter(v => v.id !== item.id).sort((a, b) => Number(b.location === item.location) - Number(a.location === item.location));
  cleanup?.();
  const host = document.getElementById('property-reference');
  const releaseProperty = renderReferenceProperty(host, { item, related, links });
  const releaseChrome = mountLandingChrome(host);
  cleanup = () => { releaseChrome(); releaseProperty(); };
  document.title = item.title + ' | Hárpia Patrimonial & Co.';
  document.getElementById('property-loading').hidden = true;
}
const run = () => void start().catch(error => { console.error('Falha ao apresentar imóvel.', error); showMessage('Não foi possível carregar o imóvel. Atualize a página ou retorne ao catálogo.'); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
window.addEventListener('pagehide', event => { if (!event.persisted) cleanup?.(); });
