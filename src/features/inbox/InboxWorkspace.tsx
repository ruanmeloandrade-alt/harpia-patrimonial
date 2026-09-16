import { useEffect, useRef, useState } from 'react';
import {
  InboxWorkspace as InboxWorkspaceCore,
} from './InboxWorkspaceCore';
import type {
  AutomationOption,
  InboxWorkspaceProps,
} from './InboxWorkspaceCore';

export type { AutomationOption, InboxWorkspaceProps } from './InboxWorkspaceCore';

export function InboxWorkspace(props: InboxWorkspaceProps) {
  const previousRuntimeRef = useRef({
    crmService: props.crmService,
    inboxService: props.inboxService,
    automationPort: props.automationPort,
  });
  const [runtimeRevision, setRuntimeRevision] = useState(0);

  useEffect(() => {
    const previous = previousRuntimeRef.current;
    if (
      previous.crmService === props.crmService
      && previous.inboxService === props.inboxService
      && previous.automationPort === props.automationPort
    ) {
      return;
    }

    const crmContentChanged = previous.crmService !== props.crmService
      && JSON.stringify(previous.crmService.snapshot()) !== JSON.stringify(props.crmService.snapshot());
    const previousInboxSnapshot = previous.inboxService?.snapshot() ?? null;
    const nextInboxSnapshot = props.inboxService?.snapshot() ?? null;
    const inboxContentChanged = previous.inboxService !== props.inboxService
      && JSON.stringify(previousInboxSnapshot) !== JSON.stringify(nextInboxSnapshot);

    previousRuntimeRef.current = {
      crmService: props.crmService,
      inboxService: props.inboxService,
      automationPort: props.automationPort,
    };

    // Trocar somente o port de automação ou receber o eco realtime do próprio
    // save não deve fechar a conversa selecionada. Remount só com dado novo.
    if (crmContentChanged || inboxContentChanged) {
      setRuntimeRevision((value) => value + 1);
    }
  }, [props.automationPort, props.crmService, props.inboxService]);

  return <InboxWorkspaceCore key={`inbox-runtime-${runtimeRevision}`} {...props} />;
}

export type Front04InboxAutomationOption = AutomationOption;
