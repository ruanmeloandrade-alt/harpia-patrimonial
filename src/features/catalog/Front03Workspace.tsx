import { useMemo, useState } from 'react';
import { DashboardPage } from '../dashboard/DashboardPage';
import type { CommercialMetricsProvider } from '../dashboard/dashboardService';
import { LocalCatalogRepository, type CatalogRepository } from './catalogRepository';
import type { CatalogMediaStorage } from './catalogMediaStorage';
import { CatalogAdminPage, type CatalogAccess } from './CatalogAdminPage';
import './workspace.css';

interface Front03WorkspaceProps {
  catalogAccess: CatalogAccess;
  catalogRepository?: CatalogRepository;
  mediaStorage?: CatalogMediaStorage;
  commercialProvider?: CommercialMetricsProvider;
  initialView?: 'dashboard' | 'catalog';
}

export function Front03Workspace({
  catalogAccess,
  catalogRepository,
  mediaStorage,
  commercialProvider,
  initialView = 'dashboard',
}: Front03WorkspaceProps) {
  const repository = useMemo(() => catalogRepository ?? new LocalCatalogRepository(), [catalogRepository]);
  const [view, setView] = useState<'dashboard' | 'catalog'>(initialView);

  return (
    <div className="f03-workspace">
      <nav className="f03-workspace-nav" aria-label="Frente 3">
        <button type="button" aria-selected={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</button>
        <button type="button" aria-selected={view === 'catalog'} onClick={() => setView('catalog')}>Catálogo</button>
      </nav>
      {view === 'dashboard' ? (
        <DashboardPage catalogRepository={repository} commercialProvider={commercialProvider} />
      ) : (
        <CatalogAdminPage access={catalogAccess} repository={repository} mediaStorage={mediaStorage} />
      )}
    </div>
  );
}

export default Front03Workspace;
