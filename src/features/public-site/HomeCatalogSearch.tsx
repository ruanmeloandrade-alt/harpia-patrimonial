import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { PublicCatalogFilterOptions, PublicCatalogFilters } from '../public-catalog/contracts';
import { writeCatalogFilters } from './catalogQuery';
import './public-polish.css';

interface HomeCatalogSearchProps {
  options: PublicCatalogFilterOptions;
  onNavigate: (path: string) => void;
}

export function HomeCatalogSearch({ options, onNavigate }: HomeCatalogSearchProps) {
  const [filters, setFilters] = useState<PublicCatalogFilters>({});
  const locationOptions = useMemo(() => {
    if (!filters.city) return options.locations;
    if (!options.locationsByCity) return options.locations;
    return options.locationsByCity[filters.city] ?? [];
  }, [filters.city, options.locations, options.locationsByCity]);

  useEffect(() => {
    setFilters((current) => {
      const next = { ...current };
      let changed = false;

      if (current.purpose && !options.purposes.includes(current.purpose)) {
        next.purpose = undefined;
        changed = true;
      }

      if (current.city && !options.cities.includes(current.city)) {
        next.city = undefined;
        next.location = undefined;
        changed = true;
      } else if (current.location) {
        const validLocations = current.city && options.locationsByCity
          ? options.locationsByCity[current.city] ?? []
          : options.locations;
        if (!validLocations.includes(current.location)) {
          next.location = undefined;
          changed = true;
        }
      }

      if (current.lifestyleTag && !options.lifestyleTags.includes(current.lifestyleTag)) {
        next.lifestyleTag = undefined;
        changed = true;
      }

      return changed ? next : current;
    });
  }, [options.cities, options.lifestyleTags, options.locations, options.locationsByCity, options.purposes]);

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
            disabled={Boolean(filters.city) && locationOptions.length === 0}
            onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value || undefined }))}
          >
            <option value="">{filters.city && locationOptions.length === 0 ? 'Sem localizações publicadas' : 'Todas'}</option>
            {locationOptions.map((value) => <option key={value}>{value}</option>)}
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
