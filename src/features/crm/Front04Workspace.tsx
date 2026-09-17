import { useEffect, useRef, useState } from 'react';
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
  canManageCrm?: boolean;
}

interface InboxCompositionProps extends CrmCompositionProps {
  automationPort?: InboxAutomationPort;
  inboxService?: InboxService;
  inboxRepository?: InboxRepository;
  salesBots?: AutomationOption[];
  aiAgents?: AutomationOption[];
  canManageInbox?: boolean;
  canManageSalesBot?: boolean;
  canManageAiAgent?: boolean;
}

export interface Front04WorkspaceProps extends InboxCompositionProps {
  initialView?: 'crm' | 'inbox';
}

function useCrmService({
  crmService: injectedCrmService,
  crmRepository,
  crmEventSinks = [],
}: CrmCompositionProps): CrmService {
  const [fallbackService] = useState(
    () => new CrmService(crmRepository ?? new BrowserCrmRepository(), crmEventSinks),
  );
  return injectedCrmService ?? fallbackService;
}

function useInboxService({
  inboxService: injectedInboxService,
  inboxRepository,
}: InboxCompositionProps): InboxService {
  const [fallbackService] = useState(
    () => new InboxService(inboxRepository ?? new BrowserInboxRepository()),
  );
  return injectedInboxService ?? fallbackService;
}

export function Front04CrmScreen({
  assignees = [],
  crmService: injectedCrmService,
  crmRepository,
  crmEventSinks = [],
  canManageCrm = true,
}: CrmCompositionProps) {
  const crmService = useCrmService({
    crmService: injectedCrmService,
    crmRepository,
    crmEventSinks,
  });

  return <CrmWorkspace service={crmService} assignees={assignees} canManage={canManageCrm} />;
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
  canManageCrm = true,
  canManageInbox = true,
  canManageSalesBot = true,
  canManageAiAgent = true,
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
  const previousRuntimeRef = useRef({ crmService, inboxService });
  const [runtimeRevision, setRuntimeRevision] = useState(0);

  useEffect(() => {
    const previous = previousRuntimeRef.current;
    if (previous.crmService === crmService && previous.inboxService === inboxService) return;

    const crmContentChanged = previous.crmService !== crmService
      && JSON.stringify(previous.crmService.snapshot()) !== JSON.stringify(crmService.snapshot());
    const inboxContentChanged = previous.inboxService !== inboxService
      && JSON.stringify(previous.inboxService.snapshot()) !== JSON.stringify(inboxService.snapshot());

    previousRuntimeRef.current = { crmService, inboxService };
    if (crmContentChanged || inboxContentChanged) {
      setRuntimeRevision((value) => value + 1);
    }
  }, [crmService, inboxService]);

  return (
    <InboxWorkspace
      key={`inbox-${runtimeRevision}`}
      crmService={crmService}
      inboxService={inboxService}
      automationPort={automationPort}
      assignees={assignees}
      salesBots={salesBots}
      aiAgents={aiAgents}
      canManageInbox={canManageInbox}
      canManageCrm={canManageCrm}
      canManageSalesBot={canManageSalesBot}
      canManageAiAgent={canManageAiAgent}
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
  canManageCrm = true,
  canManageInbox = true,
  canManageSalesBot = true,
  canManageAiAgent = true,
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
          canManageCrm={canManageCrm}
        />
      ) : (
        <Front04InboxScreen
          crmService={crmService}
          inboxService={inboxService}
          automationPort={automationPort}
          assignees={assignees}
          salesBots={salesBots}
          aiAgents={aiAgents}
          canManageCrm={canManageCrm}
          canManageInbox={canManageInbox}
          canManageSalesBot={canManageSalesBot}
          canManageAiAgent={canManageAiAgent}
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
