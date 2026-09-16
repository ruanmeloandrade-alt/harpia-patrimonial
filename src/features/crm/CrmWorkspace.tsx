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
    if (previousServiceRef.current === service) return;
    previousServiceRef.current = service;
    setRevision((value) => value + 1);
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
