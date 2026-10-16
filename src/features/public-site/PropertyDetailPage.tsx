import { useEffect, useMemo, useRef } from 'react';
import type { PublicCatalogItem } from '../public-catalog/contracts';
import { normalizeReferenceProperty, renderReferenceProperty } from './propertyReference';
import './property-reference-20261016.css';

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

/** The React route and the branch-published page use exactly the same renderer.
 * Existing CRM conversion, authentication and favorites callbacks stay in React. */
export function PropertyDetailPage(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef(props);
  actions.current = props;
  const signature = JSON.stringify({ item: props.item, related: props.related, isFavorite: props.isFavorite });
  const snapshot = useMemo(() => JSON.parse(signature) as Pick<Props, 'item' | 'related' | 'isFavorite'>, [signature]);

  useEffect(() => {
    if (!host.current) return;
    return renderReferenceProperty(host.current, {
      item: normalizeReferenceProperty(snapshot.item),
      related: snapshot.related.map(item => normalizeReferenceProperty(item)),
      isFavorite: snapshot.isFavorite,
      onBack: () => actions.current.onBack(),
      onOpenRelated: slug => actions.current.onOpenRelated(slug),
      onVisit: () => actions.current.onRequestVisit(),
      onService: () => actions.current.onRequestService(),
      onFavorite: () => actions.current.onFavorite(),
    });
  }, [snapshot]);

  return <div ref={host} className="hp-reference-host" />;
}
