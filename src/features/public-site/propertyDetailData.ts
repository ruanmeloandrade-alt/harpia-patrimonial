import type { PublicCatalogItem, PublicCatalogMedia } from '../public-catalog/contracts';

export type PropertyWellness = { label: string; rating: string };
export type PropertyMedia = PublicCatalogMedia & { key: string };

export type PropertyPresentation = {
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  monthlyIptu: number | null;
  monthlyCondominium: number | null;
  address: string | null;
  services: string[];
  outdoors: string[];
  others: string[];
  wellness: PropertyWellness[];
  media: PropertyMedia[];
};

/** Campos editoriais são codificados em features[], campo existente do catálogo.
 * Não há tabela nova, nem dados fictícios. A tela ignora metadados ausentes.
 * Campos previstos para o formulário administrativo (Parte 2):
 * @area_m2:95  @dormitorios:1  @suites:1  @banheiros:3  @vagas:1
 * @iptu_mensal:513  @condominio_mensal:1204  @endereco:Rua ...
 * @servico:Portaria 24h  @area_externa:Piscina  @wellness:Luz natural|Excelente
 */
const NUMERIC_KEYS = {
  '@area_m2:': 'area',
  '@dormitorios:': 'bedrooms',
  '@suites:': 'suites',
  '@banheiros:': 'bathrooms',
  '@vagas:': 'parkingSpaces',
  '@iptu_mensal:': 'monthlyIptu',
  '@condominio_mensal:': 'monthlyCondominium',
} as const;

type NumericKey = typeof NUMERIC_KEYS[keyof typeof NUMERIC_KEYS];
function parseNumber(input: string): number | null {
  const value = input.trim().replace(/\s/g, '');
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) return null;
  const numeric = Number(value.replace(',', '.'));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}
function positiveNumber(input: unknown): number | null {
  return typeof input === 'number' && Number.isFinite(input) && input > 0 ? input : null;
}
function uniqueNonempty(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export function getPropertyPresentation(item: PublicCatalogItem): PropertyPresentation {
  const numeric: Record<NumericKey, number | null> = {
    area: positiveNumber(item.privateAreaM2),
    bedrooms: positiveNumber(item.bedrooms),
    suites: positiveNumber(item.suites),
    bathrooms: positiveNumber(item.bathrooms),
    parkingSpaces: positiveNumber(item.parkingSpaces),
    monthlyIptu: null,
    monthlyCondominium: null,
  };
  const services: string[] = [];
  const outdoors: string[] = [];
  const others: string[] = [];
  const wellness: PropertyWellness[] = [];
  let address: string | null = null;

  for (const feature of item.features ?? []) {
    const trimmed = feature.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLocaleLowerCase('pt-BR');
    const num = (Object.entries(NUMERIC_KEYS) as [string, NumericKey][])
      .find(([key]) => lower.startsWith(key));
    if (num) {
      const candidate = parseNumber(trimmed.slice(num[0].length));
      if (candidate !== null) numeric[num[1]] = candidate;
      continue;
    }
    if (lower.startsWith('@endereco:')) { address = trimmed.slice(10).trim() || null; continue; }
    if (lower.startsWith('@servico:')) { services.push(trimmed.slice(9)); continue; }
    if (lower.startsWith('@area_externa:')) { outdoors.push(trimmed.slice(14)); continue; }
    if (lower.startsWith('@wellness:')) {
      const [label, ...rest] = trimmed.slice(10).split('|');
      const rating = rest.join('|').trim();
      if (label.trim() && rating) wellness.push({ label: label.trim(), rating });
      continue;
    }
    // Compatibilidade com imóveis já cadastrados em formato editorial legado.
    const standard = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(m²|m2|quarto[s]?|dormit[oó]rio[s]?|su[ií]te[s]?|banheiro[s]?|vaga[s]?)$/i);
    if (standard) {
      const n = parseNumber(standard[1]);
      const suffix = standard[2].toLocaleLowerCase('pt-BR');
      const key: NumericKey =
        /^m/.test(suffix) ? 'area'
        : /^quarto|^dormit/.test(suffix) ? 'bedrooms'
        : /^su/.test(suffix) ? 'suites'
        : /^banh/.test(suffix) ? 'bathrooms' : 'parkingSpaces';
      if (n !== null && numeric[key] === null) numeric[key] = n;
      continue;
    }
    others.push(trimmed);
  }

  return {
    ...numeric,
    address,
    services: uniqueNonempty(services),
    outdoors: uniqueNonempty(outdoors),
    others: uniqueNonempty(others),
    wellness,
    media: item.media
      .filter((media): media is PublicCatalogMedia => Boolean(media.url?.trim()) && (media.type === 'image' || media.type === 'video'))
      .map((media, index) => ({ ...media, key: index + ':' + media.url })),
  };
}

export type PropertyVideoSource = { kind: 'youtube' | 'vimeo' | 'file'; src: string; label: string };

/** Só faz embed de URLs oficiais do YouTube e Vimeo. Links de vídeo de
 * arquivos enviados continuam usando o player HTML5 sem URL inventada. */
export function resolvePropertyVideo(urlString: string): PropertyVideoSource | null {
  let url: URL;
  try { url = new URL(urlString); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const youtubeHost = host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be';
  if (youtubeHost) {
    const id = host === 'youtu.be' ? parts[0] : parts[0] === 'watch' ? url.searchParams.get('v') : (['embed','shorts','live'].includes(parts[0]) ? parts[1] : null);
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return { kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0', label: 'Vídeo do imóvel no YouTube' };
    }
    return null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
    if (id && /^\d+$/.test(id)) return { kind: 'vimeo', src: 'https://player.vimeo.com/video/' + id, label: 'Vídeo do imóvel no Vimeo' };
    return null;
  }
  return { kind: 'file', src: url.href, label: 'Vídeo do imóvel' };
}

export function formatPropertyMoney(value: number, cents = false) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }).format(value);
}
