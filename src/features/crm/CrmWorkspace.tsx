import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCrmRepository } from './repository';
import { CrmService } from './service';
import {
  CrmWorkspace as CrmWorkspaceCore,
  isCrmIntegrityError,
} from './CrmWorkspaceCore';
import type { AssigneeOption } from './CrmWorkspaceCore';
import { UnassignedLeadsQueue } from './UnassignedLeadsQueue';

export type { AssigneeOption } from './CrmWorkspaceCore';
export { isCrmIntegrityError };

export interface CrmWorkspaceProps {
  service?: CrmService;
  assignees?: AssigneeOption[];
}

export function CrmWorkspace({ service: injectedService, assignees = [] }: CrmWorkspaceProps) {
  const service = useMemo(
    () => injectedService ?? new CrmService(new BrowserCrmRepository()),
    [injectedService],
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
      <UnassignedLeadsQueue
        key={`queue-${revision}`}
        service={service}
        onChanged={() => setRevision((value) => value + 1)}
      />
      <CrmWorkspaceCore
        key={`crm-${revision}`}
        service={service}
        assignees={assignees}
      />
    </>
  );
}
