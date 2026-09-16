import { FormEvent, useState } from 'react';
import type { PublicCatalogFilterOptions, PublicCatalogFilters } from '../public-catalog/contracts';
import { writeCatalogFilters } from './catalogQuery';

interface HomeCatalogSearchProps {
  options: PublicCatalogFilterOptions;
  onNavigate: (path: string) => void;
}

export function HomeCatalogSearch({ options, onNavigate }: HomeCatalogSearchProps) {
  const [filters, setFilters] = useState<PublicCatalogFilters>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNavigate(`/imoveis${writeCatalogFilters(filters)}`);
  };

  return (
    <form className="home-catalog-search" aria-label="Busca rápida de imóveis" onSubmit={submit}>
      <p className="section-kicker">Encontre uma oportunidade</p>
      <h2>Busque no catálogo publicado.</h2>

      <div className="home-catalog-search__fields">
        <label>
          <span>Finalidade</span>
          <select
            value={filters.purpose ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, purpose: event.target.value || undefined }))}
          >
            <option value="">Todas</option>
            {options.purposes.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          <span>Cidade</span>
          <select
            value={filters.city ?? ''}
            onChange={(event) => setFilters((current) => ({
              ...current,
              city: event.target.value || undefined,
              location: undefined,
            }))}
          >
            <option value="">Todas</option>
            {options.cities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          <span>Localização</span>
          <select
            value={filters.location ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value || undefined }))}
          >
            <option value="">Todas</option>
            {options.locations.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        {options.lifestyleTags.length > 0 ? (
          <label>
            <span>Estilo de vida</span>
            <select
              value={filters.lifestyleTag ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, lifestyleTag: event.target.value || undefined }))}
            >
              <option value="">Todos</option>
              {options.lifestyleTags.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      <button className="search-launcher" type="submit">
        Buscar imóveis <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
