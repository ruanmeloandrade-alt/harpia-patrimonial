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

    previousRuntimeRef.current = {
      crmService: props.crmService,
      inboxService: props.inboxService,
      automationPort: props.automationPort,
    };
    setRuntimeRevision((value) => value + 1);
  }, [props.automationPort, props.crmService, props.inboxService]);

  return <InboxWorkspaceCore key={`inbox-runtime-${runtimeRevision}`} {...props} />;
}

export type Front04InboxAutomationOption = AutomationOption;
