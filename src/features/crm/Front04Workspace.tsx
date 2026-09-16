import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CrmEventSink } from './domain';
import { BrowserCrmRepository } from './repository';
import type { CrmRepository } from './repository';
import { CrmService } from './service';
import { CrmWorkspace } from './CrmWorkspace';
import type { AssigneeOption } from './CrmWorkspace';
import { InboxWorkspace } from '../inbox/InboxWorkspace';
import type { AutomationOption } from '../inbox/InboxWorkspace';
import { BrowserInboxRepository } from '../inbox/repository';
import type { InboxRepository } from '../inbox/repository';
import { InboxService } from '../inbox/service';
import type { InboxAutomationPort } from './contracts';

interface CrmCompositionProps {
  assignees?: AssigneeOption[];
  crmService?: CrmService;
  crmRepository?: CrmRepository;
  crmEventSinks?: CrmEventSink[];
}

interface InboxCompositionProps extends CrmCompositionProps {
  automationPort?: InboxAutomationPort;
  inboxService?: InboxService;
  inboxRepository?: InboxRepository;
  salesBots?: AutomationOption[];
  aiAgents?: AutomationOption[];
}

export interface Front04WorkspaceProps extends InboxCompositionProps {
  initialView?: 'crm' | 'inbox';
}

function useCrmService({
  crmService: injectedCrmService,
  crmRepository,
  crmEventSinks = [],
}: CrmCompositionProps): CrmService {
  const [crmService] = useState(
    () => injectedCrmService
      ?? new CrmService(crmRepository ?? new BrowserCrmRepository(), crmEventSinks),
  );
  return crmService;
}

function useInboxService({
  inboxService: injectedInboxService,
  inboxRepository,
}: InboxCompositionProps): InboxService {
  const [inboxService] = useState(
    () => injectedInboxService
      ?? new InboxService(inboxRepository ?? new BrowserInboxRepository()),
  );
  return inboxService;
}

export function Front04CrmScreen({
  assignees = [],
  crmService: injectedCrmService,
  crmRepository,
  crmEventSinks = [],
}: CrmCompositionProps) {
  const crmService = useCrmService({
    crmService: injectedCrmService,
    crmRepository,
    crmEventSinks,
  });

  return <CrmWorkspace service={crmService} assignees={assignees} />;
}

export function Front04InboxScreen({
  assignees = [],
  automationPort,
  salesBots = [],
  aiAgents = [],
  crmService: injectedCrmService,
  crmRepository,
  crmEventSinks = [],
  inboxService: injectedInboxService,
  inboxRepository,
}: InboxCompositionProps) {
  const crmService = useCrmService({
    crmService: injectedCrmService,
    crmRepository,
    crmEventSinks,
  });
  const inboxService = useInboxService({
    inboxService: injectedInboxService,
    inboxRepository,
  });

  return (
    <InboxWorkspace
      crmService={crmService}
      inboxService={inboxService}
      automationPort={automationPort}
      assignees={assignees}
      salesBots={salesBots}
      aiAgents={aiAgents}
    />
  );
}

export function Front04Workspace({
  assignees = [],
  automationPort,
  salesBots = [],
  aiAgents = [],
  crmService: injectedCrmService,
  inboxService: injectedInboxService,
  crmRepository,
  inboxRepository,
  crmEventSinks = [],
  initialView = 'crm',
}: Front04WorkspaceProps) {
  const crmService = useCrmService({
    crmService: injectedCrmService,
    crmRepository,
    crmEventSinks,
  });
  const inboxService = useInboxService({
    inboxService: injectedInboxService,
    inboxRepository,
  });
  const [view, setView] = useState<'crm' | 'inbox'>(initialView);

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
        <Front04CrmScreen
          crmService={crmService}
          assignees={assignees}
        />
      ) : (
        <Front04InboxScreen
          crmService={crmService}
          inboxService={inboxService}
          automationPort={automationPort}
          assignees={assignees}
          salesBots={salesBots}
          aiAgents={aiAgents}
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
