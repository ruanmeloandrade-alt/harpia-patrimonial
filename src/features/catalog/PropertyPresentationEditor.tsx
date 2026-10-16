import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CatalogItem, CatalogMedia } from './types';
import type { CatalogRepository } from './catalogRepository';
import { resolvePropertyVideo } from '../public-site/propertyDetailData';
import './property-presentation-editor.css';

type Props = {
  properties: CatalogItem[];
  repository: CatalogRepository;
  canManage: boolean;
  onSaved: () => Promise<void>;
};

type FormState = {
  area: string; bedrooms: string; suites: string; bathrooms: string; parking: string;
  monthlyIptu: string; monthlyCondominium: string; address: string;
  services: string; outdoors: string; wellness: string;
  primaryVideo: string; otherVideos: string;
};

const metadataPrefixes = [
  '@area_m2:', '@dormitorios:', '@suites:', '@banheiros:', '@vagas:',
  '@iptu_mensal:', '@condominio_mensal:', '@endereco:', '@servico:', '@area_externa:', '@wellness:',
];

function readFeature(item: CatalogItem, key: string): string {
  const prefix = '@' + key + ':';
  return item.features.find(value => value.toLocaleLowerCase('pt-BR').startsWith(prefix))?.slice(prefix.length).trim() ?? '';
}
function lines(values: string[]) { return values.map(v => v.trim()).filter(Boolean).join('\n'); }
function formFromItem(item: CatalogItem): FormState {
  const videos = item.media.filter(media => media.type === 'video');
  const getValue = (token: string, alternate = '') => readFeature(item, token) || alternate;
  return {
    area: getValue('area_m2'),
    bedrooms: getValue('dormitorios'),
    suites: getValue('suites'),
    bathrooms: getValue('banheiros'),
    parking: getValue('vagas'),
    monthlyIptu: getValue('iptu_mensal'),
    monthlyCondominium: getValue('condominio_mensal'),
    address: getValue('endereco', item.location.address || ''),
    services: lines(item.features.filter(v => v.toLocaleLowerCase('pt-BR').startsWith('@servico:')).map(v => v.slice(9))),
    outdoors: lines(item.features.filter(v => v.toLocaleLowerCase('pt-BR').startsWith('@area_externa:')).map(v => v.slice(14))),
    wellness: lines(item.features.filter(v => v.toLocaleLowerCase('pt-BR').startsWith('@wellness:')).map(v => v.slice(10))),
    primaryVideo: videos[0]?.url || '',
    otherVideos: lines(videos.slice(1).map(video => video.url)),
  };
}
const split = (input: string) => input.split('\n').map(line => line.trim()).filter(Boolean);
function buildFeatures(item: CatalogItem, form: FormState) {
  const original = item.features.filter(value => !metadataPrefixes.some(prefix => value.toLocaleLowerCase('pt-BR').startsWith(prefix)));
  const fields: Array<[string, string]> = [
    ['area_m2', form.area], ['dormitorios', form.bedrooms], ['suites', form.suites],
    ['banheiros', form.bathrooms], ['vagas', form.parking], ['iptu_mensal', form.monthlyIptu],
    ['condominio_mensal', form.monthlyCondominium], ['endereco', form.address],
  ];
  const entries = fields.filter(([,value]) => value.trim()).map(([key,value]) => '@' + key + ':' + value.trim());
  return [
    ...original,
    ...entries,
    ...split(form.services).map(value => '@servico:' + value),
    ...split(form.outdoors).map(value => '@area_externa:' + value),
    ...split(form.wellness).map(value => '@wellness:' + value),
  ];
}

function VideoPreview({ link }: { link: string }) {
  const source = resolvePropertyVideo(link);
  if (!source) return <p className="hp-property-editor__warning">Insira um link HTTPS válido do YouTube, Vimeo ou arquivo MP4/WebM.</p>;
  return (
    <div className="hp-property-editor__preview">
      {source.kind === 'file' ? <video controls playsInline preload="metadata" src={source.src} /> :
        <iframe title={source.label} src={source.src} referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture" allowFullScreen />}
    </div>
  );
}

export function PropertyPresentationEditor({ properties, repository, canManage, onSaved }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const item = useMemo(() => properties.find(property => property.id === selectedId) ?? null, [properties, selectedId]);
  useEffect(() => {
    if (!properties.some(property => property.id === selectedId)) setSelectedId(properties[0]?.id ?? '');
  }, [properties, selectedId]);
  useEffect(() => { setForm(item ? formFromItem(item) : null); setError(''); setNotice(''); }, [item?.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !form || !item || busy) return;
    setError('');
    setNotice('');

    const numberFields: Array<[string, string]> = [
      ['Área', form.area], ['Dormitórios', form.bedrooms], ['Suítes', form.suites],
      ['Banheiros', form.bathrooms], ['Vagas', form.parking],
      ['IPTU', form.monthlyIptu], ['Condomínio', form.monthlyCondominium],
    ];
    for (const [label, value] of numberFields) {
      if (value && (!/^\\d+(?:[.,]\\d{1,2})?$/.test(value.trim()) || !Number.isFinite(Number(value.replace(',', '.'))))) {
        setError('Informe um valor válido para ' + label + '.');
        return;
      }
    }
    for (const line of split(form.wellness)) {
      const [label, rating] = line.split('|').map(value => value?.trim());
      if (!label || !rating) { setError('Use "Indicador | Avaliação" em cada linha do Índice Wellness.'); return; }
    }

    const videos = [form.primaryVideo.trim(),...split(form.otherVideos)].filter(Boolean);
    if (videos.some(url => !/^https:\/\//i.test(url) || !resolvePropertyVideo(url))) {
      setError('Use links HTTPS válidos do YouTube, Vimeo ou arquivos de vídeo publicados.');
      return;
    }
    const preservedMedia = item.media.filter(media => media.type !== 'video');
    const originals = item.media.filter(media => media.type === 'video');
    const nextVideoMedia: CatalogMedia[] = videos.map((url, index) => {
      const existing = originals.find(video => video.url === url);
      return existing ? existing : {
        id: 'imovel_video_' + item.id + '_' + Date.now() + '_' + index,
        type: 'video',
        url,
      };
    });
    const deletedLinks = originals.filter(old => !videos.includes(old.url));
    if (deletedLinks.length && !window.confirm('Remover ' + deletedLinks.length + ' vídeo(s) da apresentação pública? Os arquivos de armazenamento não serão apagados.')) return;

    setBusy(true);
    try {
      const latest = await repository.getById(item.id);
      if (!latest || latest.deletedAt) throw new Error('Imóvel não encontrado. Atualize o catálogo.');
      if (latest.updatedAt !== item.updatedAt) throw new Error('Este imóvel foi alterado em outra sessão. Atualize os dados antes de salvar.');
      await repository.update(item.id, {
        features: buildFeatures(latest, form),
        media: [...preservedMedia, ...nextVideoMedia],
      });
      await onSaved();
      setNotice('Apresentação do imóvel atualizada no catálogo real.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a apresentação.');
    } finally {
      setBusy(false);
    }
  }

  const input = (label: string, key: keyof FormState, step = '1') => (
    <label key={key}>{label}
      <input type="number" min="0" step={step} disabled={!canManage || busy}
        value={form?.[key] ?? ''}
        onChange={event => setForm(current => current ? { ...current, [key]: event.target.value } : current)} />
    </label>
  );
  const textarea = (label: string, key: keyof FormState, hint: string, rows = 4) => (
    <label>{label}<small>{hint}</small>
      <textarea rows={rows} disabled={!canManage || busy} value={form?.[key] ?? ''}
        onChange={event => setForm(current => current ? { ...current, [key]: event.target.value } : current)} />
    </label>
  );

  return (
    <section className="hp-property-editor f03-card" aria-label="Apresentação dos imóveis">
      <div className="hp-property-editor__heading">
        <div>
          <p className="f03-kicker">Site público · Modelo aprovado</p>
          <h2>Apresentação dos imóveis</h2>
          <p>Configure vídeo principal, características, Índice Wellness e informações que aparecem na página completa do imóvel.</p>
        </div>
        <img src="/assets/brand/harpia-crest-dark-green-cropped.png" alt="" aria-hidden="true" />
      </div>
      {!properties.length ? <p className="hp-property-editor__empty">
        Nenhum imóvel está cadastrado no catálogo operacional. Assim que um imóvel for cadastrado, ele aparecerá aqui para configurar sua página, sem dados de demonstração.
      </p> : (
        <>
          <label className="hp-property-editor__selector">Imóvel
            <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
              {properties.map(property => <option key={property.id} value={property.id}>{property.code || property.name} · {property.name}</option>)}
            </select>
          </label>
          {item && form && (
            <form onSubmit={save}>
              <fieldset disabled={!canManage || busy}>
                <legend>Dados exibidos no detalhe</legend>
                <div className="hp-property-editor__grid">
                  {input('Área (m²)', 'area', '0.01')}
                  {input('Dormitórios', 'bedrooms')}
                  {input('Suítes', 'suites')}
                  {input('Banheiros', 'bathrooms')}
                  {input('Vagas', 'parking')}
                  {input('IPTU mensal (R$)', 'monthlyIptu', '0.01')}
                  {input('Condomínio mensal (R$)', 'monthlyCondominium', '0.01')}
                  <label>Endereço a exibir
                    <input value={form.address} onChange={event => setForm(current => current ? {...current,address:event.target.value}:current)} />
                  </label>
                </div>
                <div className="hp-property-editor__two">
                  {textarea('Serviços e Facilidades', 'services', 'Uma característica por linha. Ex.: Portaria 24h.')}
                  {textarea('Área Externa', 'outdoors', 'Uma característica por linha. Ex.: Piscina.')}
                </div>
                {textarea('Índice Wellness', 'wellness', 'Uma linha por indicador no formato "Luz Natural | Excelente". Insira apenas avaliações reais.', 5)}
                <div className="hp-property-editor__two">
                  <label>Vídeo principal (YouTube ou Vimeo)
                    <small>Cole a URL completa. A página exibirá esse vídeo no topo.</small>
                    <input type="url" value={form.primaryVideo} placeholder="https://www.youtube.com/watch?v=..."
                      onChange={event => setForm(current => current ? {...current,primaryVideo:event.target.value}:current)} />
                  </label>
                  {textarea('Outros vídeos da galeria','otherVideos','Um link por linha, incluindo MP4/WebM publicados.')}
                </div>
                {form.primaryVideo.trim() ? <VideoPreview link={form.primaryVideo.trim()} /> : null}
              </fieldset>
              {error ? <p className="hp-property-editor__error" role="alert">{error}</p> : null}
              {notice ? <p className="hp-property-editor__notice" role="status">{notice}</p> : null}
              <button className="f03-button f03-button-primary" type="submit" disabled={!canManage || busy}>
                {busy ? 'Salvando…' : 'Salvar apresentação do imóvel'}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
