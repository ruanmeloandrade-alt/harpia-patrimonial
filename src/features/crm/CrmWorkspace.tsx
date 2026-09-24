import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCrmRepository } from './repository';
import { CrmService } from './service';
import {
  CrmWorkspace as CrmWorkspaceCore,
  isCrmIntegrityError,
} from './CrmWorkspaceCore';
import type { AssigneeOption } from './CrmWorkspaceCore';
import { PersistenceErrorNotice } from './PersistenceErrorNotice';
import { createReadOnlyCrmService } from './readOnlyAccess';
import { UnassignedLeadsQueue } from './UnassignedLeadsQueue';
import type { CatalogRepository } from '../catalog/catalogRepository';

export type { AssigneeOption } from './CrmWorkspaceCore';
export { isCrmIntegrityError };

export interface CrmWorkspaceProps {
  service?: CrmService;
  assignees?: AssigneeOption[];
  canManage?: boolean;
  catalogRepository?: CatalogRepository;
}

export function CrmWorkspace({
  service: injectedService,
  assignees = [],
  canManage = true,
  catalogRepository,
}: CrmWorkspaceProps) {
  const baseService = useMemo(
    () => injectedService ?? new CrmService(new BrowserCrmRepository()),
    [injectedService],
  );
  const service = useMemo(
    () => canManage ? baseService : createReadOnlyCrmService(baseService),
    [baseService, canManage],
  );
  const previousServiceRef = useRef(service);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const previousService = previousServiceRef.current;
    if (previousService === service) return;

    const previousSnapshot = JSON.stringify(previousService.snapshot());
    const nextSnapshot = JSON.stringify(service.snapshot());
    previousServiceRef.current = service;

    // O realtime da própria sessão pode recriar o service após um save local.
    // Nesse caso o conteúdo é igual e não devemos resetar seleção/drawer da UI.
    if (previousSnapshot !== nextSnapshot) {
      setRevision((value) => value + 1);
    }
  }, [service]);

  return (
    <>
      {!canManage && (
        <div
          role="status"
          style={{
            maxWidth: 1440,
            margin: '12px auto',
            padding: '10px 14px',
            border: '1px solid #c9c1b4',
            borderRadius: 12,
            background: '#f8f5ef',
            color: '#4f5b56',
          }}
        >
          Modo somente leitura. Alterações no CRM exigem permissão de gestão.
        </div>
      )}
      <PersistenceErrorNotice modules={['crm']} />
      <UnassignedLeadsQueue
        key={`queue-${revision}`}
        service={service}
        canManage={canManage}
        onChanged={() => setRevision((value) => value + 1)}
      />
      <CrmWorkspaceCore
        key={`crm-${revision}`}
        service={service}
        assignees={assignees}
        canManage={canManage}
        catalogRepository={catalogRepository}
      />
    </>
  );
}
