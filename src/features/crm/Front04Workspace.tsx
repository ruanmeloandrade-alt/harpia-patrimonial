import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CrmEventSink } from './domain';
import { BrowserCrmRepository } from './repository';
import type { CrmRepository } from './repository';
import { CrmService } from './service';
import { CrmWorkspace } from './CrmWorkspace';
import type { AssigneeOption } from './CrmWorkspace';
import { UnassignedLeadsQueue } from './UnassignedLeadsQueue';
import { InboxWorkspace } from '../inbox/InboxWorkspace';
import { BrowserInboxRepository } from '../inbox/repository';
import type { InboxRepository } from '../inbox/repository';
import { InboxService } from '../inbox/service';
import type { InboxAutomationPort } from './contracts';

export interface Front04WorkspaceProps {
  assignees?: AssigneeOption[];
  automationPort?: InboxAutomationPort;
  crmService?: CrmService;
  inboxService?: InboxService;
  crmRepository?: CrmRepository;
  inboxRepository?: InboxRepository;
  crmEventSinks?: CrmEventSink[];
}

export function Front04Workspace({
  assignees = [],
  automationPort,
  crmService: injectedCrmService,
  inboxService: injectedInboxService,
  crmRepository,
  inboxRepository,
  crmEventSinks = [],
}: Front04WorkspaceProps) {
  const [crmService] = useState(
    () => injectedCrmService
      ?? new CrmService(crmRepository ?? new BrowserCrmRepository(), crmEventSinks),
  );
  const [inboxService] = useState(
    () => injectedInboxService
      ?? new InboxService(inboxRepository ?? new BrowserInboxRepository()),
  );
  const [view, setView] = useState<'crm' | 'inbox'>('crm');
  const [crmRevision, setCrmRevision] = useState(0);

  return (
    <div>
      <nav
        aria-label="Frente 4"
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 20px',
          borderBottom: '1px solid #ddd7cd',
          background: '#fbfaf6',
        }}
      >
        <button
          type="button"
          onClick={() => setView('crm')}
          aria-pressed={view === 'crm'}
          style={buttonStyle(view === 'crm')}
        >
          CRM
        </button>
        <button
          type="button"
          onClick={() => setView('inbox')}
          aria-pressed={view === 'inbox'}
          style={buttonStyle(view === 'inbox')}
        >
          Inbox
        </button>
      </nav>

      {view === 'crm' ? (
        <>
          <UnassignedLeadsQueue
            service={crmService}
            onChanged={() => setCrmRevision((value) => value + 1)}
          />
          <CrmWorkspace
            key={crmRevision}
            service={crmService}
            assignees={assignees}
          />
        </>
      ) : (
        <InboxWorkspace
          crmService={crmService}
          inboxService={inboxService}
          automationPort={automationPort}
          assignees={assignees}
        />
      )}
    </div>
  );
}

const buttonStyle = (active: boolean): CSSProperties => ({
  border: active ? '1px solid #233b32' : '1px solid #cbc5ba',
  borderRadius: 10,
  background: active ? '#233b32' : 'white',
  color: active ? 'white' : '#233b32',
  padding: '9px 14px',
  cursor: 'pointer',
});
