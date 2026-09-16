import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { PERMISSIONS } from '../core/auth/permissions';
import { isSupabaseConfigured, supabase } from '../core/supabase/client';
import { LocalCatalogRepository } from '../features/catalog/catalogRepository';
import type { CatalogRepository } from '../features/catalog/catalogRepository';
import { PublicCatalogService } from '../features/catalog/publicCatalog';
import { SupabaseCatalogRepository } from '../features/catalog/supabaseCatalogRepository';
import { CrmService } from '../features/crm/service';
import type { AssigneeOption } from '../features/crm/CrmWorkspace';
import type { InboxAutomationPort } from '../features/crm/contracts';
import {
  createFront05CrmActionPort,
  createFront05InboxAutomationAdapter,
  Front05CrmEventSink,
} from '../features/crm/front05Adapter';
import { InboxService } from '../features/inbox/service';
import {
  aiAgentCommandPort,
  processCrmAutomationEvent,
  salesBotCommandPort,
  unconfiguredAutomationEngineDependencies,
} from '../features/automations';
import { SupabaseAICredentialVault } from './integrations/supabaseAICredentialVault';
import { SupabaseFavoritesStore } from './integrations/supabaseFavoritesStore';
import { loadInternalAssignees } from './integrations/internalAssignees';
import {
  hydrateSharedCrmRepository,
  hydrateSharedInboxRepository,
} from './integrations/sharedStateRepositories';

interface PlatformRuntimeValue {
  catalogRepository: CatalogRepository;
  publicCatalogService: PublicCatalogService;
  favoritesStore: SupabaseFavoritesStore;
  credentialVault: SupabaseAICredentialVault;
  crmService: CrmService | null;
  inboxService: InboxService | null;
  inboxAutomationPort: InboxAutomationPort | null;
  assignees: AssigneeOption[];
  operationalLoading: boolean;
  operationalError: string;
}

const PlatformRuntimeContext = createContext<PlatformRuntimeValue | null>(null);

export function PlatformRuntimeProvider({ children }: PropsWithChildren) {
  const auth = useAuth();

  const catalogRepository = useMemo<CatalogRepository>(() => {
    if (isSupabaseConfigured && supabase) return new SupabaseCatalogRepository(supabase as any);
    return new LocalCatalogRepository();
  }, []);
  const publicCatalogService = useMemo(() => new PublicCatalogService(catalogRepository), [catalogRepository]);
  const favoritesStore = useMemo(() => new SupabaseFavoritesStore(), []);
  const credentialVault = useMemo(() => new SupabaseAICredentialVault(), []);

  const [crmService, setCrmService] = useState<CrmService | null>(null);
  const [inboxService, setInboxService] = useState<InboxService | null>(null);
  const [inboxAutomationPort, setInboxAutomationPort] = useState<InboxAutomationPort | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [operationalLoading, setOperationalLoading] = useState(false);
  const [operationalError, setOperationalError] = useState('');

  const canUseCrm = auth.isInternalUser && (
    auth.hasPermission(PERMISSIONS.CRM_VIEW)
    || auth.hasPermission(PERMISSIONS.CRM_MANAGE)
    || auth.hasPermission(PERMISSIONS.INBOX_VIEW)
    || auth.hasPermission(PERMISSIONS.INBOX_MANAGE)
  );

  useEffect(() => {
    let active = true;
    let unsubscribeEvents: (() => void) | undefined;

    if (!canUseCrm || !isSupabaseConfigured) {
      setCrmService(null);
      setInboxService(null);
      setInboxAutomationPort(null);
      setAssignees([]);
      setOperationalLoading(false);
      setOperationalError('');
      return () => undefined;
    }

    setOperationalLoading(true);
    setOperationalError('');

    Promise.all([
      hydrateSharedCrmRepository(),
      hydrateSharedInboxRepository(),
      loadInternalAssignees(),
    ])
      .then(([crmRepository, inboxRepository, assigneeRows]) => {
        if (!active) return;

        const crm = new CrmService(crmRepository);
        const inbox = new InboxService(inboxRepository);
        const crmActions = createFront05CrmActionPort(crm);
        const automationDependencies = {
          ...unconfiguredAutomationEngineDependencies,
          salesbot: salesBotCommandPort,
          ai: aiAgentCommandPort,
          crm: crmActions,
        };
        const sink = new Front05CrmEventSink((event) => processCrmAutomationEvent(event, automationDependencies));
        unsubscribeEvents = crm.subscribeEvents(sink);

        const automationPort = createFront05InboxAutomationAdapter({
          salesBot: salesBotCommandPort,
          aiAgent: aiAgentCommandPort,
          resolveSalesBotId: () => undefined,
          resolveAiAgentId: () => undefined,
        });

        setCrmService(crm);
        setInboxService(inbox);
        setInboxAutomationPort(automationPort);
        setAssignees(assigneeRows);
      })
      .catch((error) => {
        if (!active) return;
        setOperationalError(error instanceof Error ? error.message : 'Não foi possível carregar CRM/Inbox compartilhados.');
        setCrmService(null);
        setInboxService(null);
        setInboxAutomationPort(null);
        setAssignees([]);
      })
      .finally(() => {
        if (active) setOperationalLoading(false);
      });

    return () => {
      active = false;
      unsubscribeEvents?.();
    };
  }, [canUseCrm]);

  const value = useMemo<PlatformRuntimeValue>(() => ({
    catalogRepository,
    publicCatalogService,
    favoritesStore,
    credentialVault,
    crmService,
    inboxService,
    inboxAutomationPort,
    assignees,
    operationalLoading,
    operationalError,
  }), [
    assignees,
    catalogRepository,
    credentialVault,
    crmService,
    favoritesStore,
    inboxAutomationPort,
    inboxService,
    operationalError,
    operationalLoading,
    publicCatalogService,
  ]);

  return <PlatformRuntimeContext.Provider value={value}>{children}</PlatformRuntimeContext.Provider>;
}

export function usePlatformRuntime() {
  const value = useContext(PlatformRuntimeContext);
  if (!value) throw new Error('usePlatformRuntime deve ser usado dentro de PlatformRuntimeProvider.');
  return value;
}
