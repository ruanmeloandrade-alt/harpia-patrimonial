import { useMemo } from 'react';
import { PersistenceErrorNotice } from '../crm/PersistenceErrorNotice';
import {
  createPermissionedInboxAutomationPort,
  createReadOnlyCrmService,
  createReadOnlyInboxService,
} from '../crm/readOnlyAccess';
import { BrowserInboxRepository } from './repository';
import { InboxService } from './service';
import {
  InboxWorkspace as InboxWorkspaceCore,
} from './InboxWorkspaceCore';
import type {
  AutomationOption,
  InboxWorkspaceProps as InboxWorkspaceCoreProps,
} from './InboxWorkspaceCore';

export type { AutomationOption } from './InboxWorkspaceCore';

export interface InboxWorkspaceProps extends InboxWorkspaceCoreProps {
  /** Atalho legado: quando informado, aplica o mesmo nível de gestão a todos os recursos. */
  canManage?: boolean;
  canManageInbox?: boolean;
  canManageCrm?: boolean;
  canManageSalesBot?: boolean;
  canManageAiAgent?: boolean;
}

export function InboxWorkspace({
  canManage,
  canManageInbox,
  canManageCrm,
  canManageSalesBot,
  canManageAiAgent,
  ...props
}: InboxWorkspaceProps) {
  const legacyManage = canManage ?? true;
  const inboxManage = canManageInbox ?? legacyManage;
  const crmManage = canManageCrm ?? legacyManage;
  const salesBotManage = canManageSalesBot ?? legacyManage;
  const aiAgentManage = canManageAiAgent ?? legacyManage;
  const fullyReadOnly = !inboxManage && !crmManage && !salesBotManage && !aiAgentManage;

  const baseInboxService = useMemo(
    () => props.inboxService ?? new InboxService(new BrowserInboxRepository()),
    [props.inboxService],
  );
  const crmService = useMemo(
    () => crmManage ? props.crmService : createReadOnlyCrmService(props.crmService),
    [crmManage, props.crmService],
  );
  const inboxService = useMemo(
    () => inboxManage ? baseInboxService : createReadOnlyInboxService(baseInboxService),
    [baseInboxService, inboxManage],
  );
  const automationPort = useMemo(
    () => createPermissionedInboxAutomationPort(props.automationPort, {
      canManageSalesBot: salesBotManage,
      canManageAiAgent: aiAgentManage,
    }),
    [aiAgentManage, props.automationPort, salesBotManage],
  );

  return (
    <>
      {(fullyReadOnly || !inboxManage || !crmManage || !salesBotManage || !aiAgentManage) && (
        <div
          role="status"
          style={{
            margin: '12px',
            padding: '10px 14px',
            border: '1px solid #c9c1b4',
            borderRadius: 12,
            background: '#f8f5ef',
            color: '#4f5b56',
          }}
        >
          {fullyReadOnly
            ? 'Modo somente leitura. Nenhuma alteração ou comando operacional está habilitado.'
            : 'Ações da Inbox respeitam separadamente suas permissões de atendimento, CRM, SalesBot e IA.'}
        </div>
      )}
      <PersistenceErrorNotice modules={['crm', 'inbox']} />
      <InboxWorkspaceCore
        {...props}
        crmService={crmService}
        inboxService={inboxService}
        automationPort={automationPort}
      />
    </>
  );
}

export type Front04InboxAutomationOption = AutomationOption;
