import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicCatalogItem } from '../public-catalog/contracts';
import { formatPropertyMoney, getPropertyPresentation, resolvePropertyVideo } from './propertyDetailData';
import './property-detail-2026.css';

type Props = {
  item: PublicCatalogItem;
  related: PublicCatalogItem[];
  onBack: () => void;
  onOpenRelated: (slug: string) => void;
  onRequestVisit: () => void;
  onRequestService: () => void;
  onFavorite: () => void | Promise<void>;
  isFavorite: boolean;
};

function presentNumber(value: number | null, singular: string, plural: string) {
  return value !== null ? `${new Intl.NumberFormat('pt-BR').format(value)} ${value === 1 ? singular : plural}` : null;
}

export function PropertyDetailPage({
  item, related, onBack, onOpenRelated, onRequestVisit, onRequestService, onFavorite, isFavorite,
}: Props) {
  const details = useMemo(() => getPropertyPresentation(item), [item]);
  const initialVideo = details.media.findIndex(media => media.type === 'video');
  const [selectedIndex, setSelectedIndex] = useState(initialVideo < 0 ? 0 : initialVideo);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const videoIndex = details.media.findIndex(media => media.type === 'video');
    setSelectedIndex(videoIndex < 0 ? 0 : videoIndex);
  }, [item.id, details.media.length]);

  const activeMedia = details.media[selectedIndex] ?? details.media[0];
  const embed = activeMedia?.type === 'video' ? resolvePropertyVideo(activeMedia.url) : null;
  const homePrice = item.price;
  const pricePerM2 = homePrice !== null && details.area !== null && details.area > 0 ? homePrice / details.area : null;
  const specs = [
    presentNumber(details.area, 'm²', 'm²'),
    presentNumber(details.bedrooms, 'Dormitório', 'Dormitórios'),
    presentNumber(details.suites, 'Suíte', 'Suítes'),
    presentNumber(details.bathrooms, 'Banheiro', 'Banheiros'),
    presentNumber(details.parkingSpaces, 'Vaga', 'Vagas'),
  ].filter((value): value is string => Boolean(value));
  const fees = [
    details.monthlyIptu !== null ? { label: 'IPTU (mensal)', value: formatPropertyMoney(details.monthlyIptu, true) } : null,
    details.monthlyCondominium !== null ? { label: 'Condomínio', value: formatPropertyMoney(details.monthlyCondominium, true) } : null,
    pricePerM2 !== null ? { label: 'Valor por m²', value: formatPropertyMoney(pricePerM2, true) } : null,
  ].filter((fee): fee is { label: string; value: string } => fee !== null);

  function changeMedia(nextIndex: number) {
    const length = details.media.length;
    if (length === 0) return;
    const index = (nextIndex + length) % length;
    setSelectedIndex(index);
    thumbnailsRef.current?.querySelector<HTMLElement>(`[data-media-index="${index}"]`)?.scrollIntoView({
      block: 'nearest', inline: 'nearest', behavior: 'smooth',
    });
  }

  return (
    <main className="hp-property" aria-labelledby="hp-property-title">
      <div className="hp-property__container">
        <div className="hp-property__breadcrumb">
          <button type="button" onClick={onBack}>← Voltar aos imóveis</button>
          <span>Imóveis / {item.propertyType} / {item.location || item.city}</span>
        </div>

        <section className="hp-property__top" aria-label="Vídeo e características do imóvel">
          <div className="hp-property__stage" aria-live="polite">
            {activeMedia?.type === 'video' && embed?.kind !== 'file' && embed ? (
              <iframe
                key={embed.src}
                title={embed.label}
                src={embed.src}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : activeMedia?.type === 'video' && embed?.kind === 'file' ? (
              <video key={activeMedia.key} controls playsInline preload="metadata" src={embed.src}>
                O navegador não suporta a reprodução deste vídeo.
              </video>
            ) : activeMedia?.type === 'image' ? (
              <img key={activeMedia.key} src={activeMedia.url} alt={activeMedia.alt || `Imagem de ${item.title}`} loading="eager" />
            ) : (
              <div className="hp-property__no-media" role="status">
                <img src="/assets/brand/harpia-crest-dark-green-cropped.png" alt="" aria-hidden="true" />
                <span>{activeMedia ? 'Vídeo indisponível. A equipe pode fornecer mais informações.' : 'Imagens e vídeo ainda não cadastrados para este imóvel.'}</span>
              </div>
            )}
            {details.media.length > 1 ? (
              <div className="hp-property__stage-nav" aria-label="Navegação da galeria">
                <button type="button" onClick={() => changeMedia(selectedIndex - 1)} aria-label="Mídia anterior">‹</button>
                <span>{selectedIndex + 1} / {details.media.length}</span>
                <button type="button" onClick={() => changeMedia(selectedIndex + 1)} aria-label="Próxima mídia">›</button>
              </div>
            ) : null}
          </div>

          <aside className="hp-property__features" aria-label="Características">
            <h2>Características</h2>
            <section>
              <h3>Serviços e Facilidades</h3>
              {details.services.length ? <ul>{details.services.map(value => <li key={value}>{value}</li>)}</ul> : <p>Consulte a equipe sobre os serviços deste imóvel.</p>}
            </section>
            <section>
              <h3>Área Externa</h3>
              {details.outdoors.length ? <ul>{details.outdoors.map(value => <li key={value}>{value}</li>)}</ul> : <p>Características da área externa ainda não informadas.</p>}
            </section>
            {details.others.length ? (
              <section>
                <h3>Outras características</h3>
                <ul>{details.others.map(value => <li key={value}>{value}</li>)}</ul>
              </section>
            ) : null}
          </aside>
        </section>

        <section className="hp-property__gallery-section" aria-label="Galeria de fotos e vídeos">
          <div className="hp-property__gallery" ref={thumbnailsRef}>
            {details.media.length ? details.media.map((media, index) => (
              <button
                key={media.key}
                data-media-index={index}
                className={index === selectedIndex ? 'hp-property__thumb hp-property__thumb--active' : 'hp-property__thumb'}
                type="button"
                aria-label={media.type === 'video' ? `Exibir vídeo ${index + 1}` : `Exibir foto ${index + 1}`}
                aria-pressed={index === selectedIndex}
                onClick={() => changeMedia(index)}
              >
                {media.type === 'image' ? (
                  <img loading="lazy" src={media.url} alt={media.alt || `Foto ${index + 1} de ${item.title}`} />
                ) : (
                  <span className="hp-property__thumb-video">
                    <span aria-hidden="true">▶</span>
                    <span>Vídeo {index + 1}</span>
                  </span>
                )}
              </button>
            )) : <p className="hp-property__gallery-empty">A galeria será apresentada quando fotos ou vídeos forem cadastrados.</p>}
          </div>
          {details.media.length > 3 ? <p className="hp-property__gallery-hint">Deslize para visualizar todas as fotos e vídeos.</p> : null}
        </section>

        <section className="hp-property__information" aria-label="Informações do imóvel">
          <p className="hp-property__eyebrow">Hárpia Patrimonial &amp; Co.</p>
          <h1 id="hp-property-title">{item.title}</h1>
          <p className="hp-property__location">{[item.location, item.city].filter(Boolean).join(' · ')}</p>
          {specs.length ? <p className="hp-property__specs">{specs.map((spec, index) => <span key={index}>{spec}</span>)}</p> : null}
          {fees.length ? <dl className="hp-property__fees">{fees.map(fee => <div key={fee.label}><dt>{fee.label}</dt><dd>{fee.value}</dd></div>)}</dl> : null}
          <div className="hp-property__price-panel">
            {item.code ? <small>Código do Imóvel {item.code}</small> : null}
            <strong>{homePrice === null ? 'Valor sob consulta' : formatPropertyMoney(homePrice, true)}</strong>
            <span>{item.purpose || 'Imóvel'}</span>
            <button type="button" onClick={() => void onFavorite()} aria-pressed={isFavorite}>
              <img src="/assets/brand/icons/black/02-favorito.svg" alt="" width="17" height="17" />
              {isFavorite ? 'Salvo nos favoritos' : 'Salvar imóvel'}
            </button>
          </div>
        </section>

        <section className="hp-property__wellness" aria-label="Índice Wellness">
          <h2>Índice Wellness</h2>
          {details.wellness.length ? (
            <dl>{details.wellness.map(({ label, rating }) => <div key={label}><dt>{label}</dt><dd>{rating}</dd></div>)}</dl>
          ) : <p>Índice Wellness ainda não informado para este imóvel.</p>}
        </section>

        <section className="hp-property__description">
          <h2>Descrição</h2>
          {item.description ? item.description.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph.trim()}</p>)
            : <p>Descrição detalhada ainda não cadastrada. Nossa equipe pode orientar sua avaliação.</p>}
          <address>{details.address || [item.location, item.city].filter(Boolean).join(' · ')}</address>
          <div className="hp-property__actions">
            <button className="hp-property__cta" type="button" onClick={onRequestVisit}>Agendar Visita</button>
            <button className="hp-property__cta" type="button" onClick={onRequestService}>Ser Atendido</button>
          </div>
        </section>

        <section className="hp-property__related" aria-label="Imóveis relacionados">
          <h2>Outras oportunidades da Hárpia</h2>
          {related.length ? (
            <div className="hp-property__related-grid">
              {related.slice(0, 3).map(candidate => {
                const preview = candidate.media.find(media => media.type === 'image');
                const info = getPropertyPresentation(candidate);
                return (
                  <article className="hp-property__related-card" key={candidate.id}>
                    <button type="button" onClick={() => onOpenRelated(candidate.slug)} aria-label={`Ver imóvel ${candidate.title}`}>
                      {preview ? <img src={preview.url} loading="lazy" alt={preview.alt || candidate.title} /> : <span className="hp-property__related-no-photo">Sem imagem publicada</span>}
                      <div className="hp-property__related-text">
                        <span>{candidate.propertyType}</span>
                        <strong>{candidate.title}</strong>
                        <small>{candidate.code || [candidate.location, candidate.city].filter(Boolean).join(' · ')}</small>
                        <p>{[presentNumber(info.area, 'm²', 'm²'), presentNumber(info.suites, 'suíte', 'suítes'), presentNumber(info.parkingSpaces, 'vaga', 'vagas')].filter(Boolean).join(' · ')}</p>
                        <div><b>{candidate.price === null ? 'Sob consulta' : formatPropertyMoney(candidate.price)}</b><span>VER IMÓVEL →</span></div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : <p className="hp-property__related-empty">No momento, não há outros imóveis publicados para apresentar.</p>}
        </section>
      </div>
    </main>
  );
}
