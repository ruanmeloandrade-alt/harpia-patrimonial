import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { PERMISSIONS } from '../core/auth/permissions';
import { isSupabaseConfigured, supabase } from '../core/supabase/client';
import type { CatalogMediaStorage } from '../features/catalog/catalogMediaStorage';
import { createCatalogRuntime } from '../features/catalog/catalogRuntime';
import { LocalCatalogRepository } from '../features/catalog/catalogRepository';
import type { CatalogRepository } from '../features/catalog/catalogRepository';
import { PublicCatalogService } from '../features/catalog/publicCatalog';
import { CrmService } from '../features/crm/service';
import type { AssigneeOption } from '../features/crm/CrmWorkspace';
import type { InboxAutomationPort } from '../features/crm/contracts';
import {
  createFront05CrmActionPort,
  createFront05InboxAutomationAdapter,
  Front05CrmEventSink,
} from '../features/crm/front05Adapter';
import {
  CrmRepositorySnapshotSource,
  CrmSnapshotMetricsProvider,
} from '../features/dashboard/crmMetricsAdapter';
import type { CommercialMetricsProvider } from '../features/dashboard/dashboardService';
import { InboxService } from '../features/inbox/service';
import {
  createAIAgentCommandPort,
  createSalesBotCommandPort,
  processCrmAutomationEvent,
  unconfiguredAutomationEngineDependencies,
  unconfiguredSalesBotRuntimeDependencies,
} from '../features/automations';
import { resetF05SharedStorage } from '../features/automations/f05Storage';
import { SupabaseAICredentialVault } from './integrations/supabaseAICredentialVault';
import { SupabaseAIModelRuntime } from './integrations/supabaseAIModelRuntime';
import { SupabaseAutomationWebhook } from './integrations/supabaseAutomationWebhook';
import { SupabaseWhatsAppTransport } from './integrations/supabaseWhatsAppTransport';
import { SupabaseFavoritesStore } from './integrations/supabaseFavoritesStore';
import { loadInternalAssignees } from './integrations/internalAssignees';
import { salesBotConditionEvaluator } from './integrations/salesBotConditionEvaluator';
import { hydrateSharedF05Storage } from './integrations/sharedF05Storage';
import {
  hydrateSharedCrmRepository,
  hydrateSharedInboxRepository,
} from './integrations/sharedStateRepositories';

interface PlatformRuntimeValue {
  catalogRepository: CatalogRepository;
  publicCatalogService: PublicCatalogService;
  catalogMediaStorage: CatalogMediaStorage | null;
  favoritesStore: SupabaseFavoritesStore;
  credentialVault: SupabaseAICredentialVault;
  crmService: CrmService | null;
  inboxService: InboxService | null;
  inboxAutomationPort: InboxAutomationPort | null;
  commercialMetricsProvider: CommercialMetricsProvider | null;
  assignees: AssigneeOption[];
  operationalLoading: boolean;
  operationalError: string;
  operationalRevision: number;
  f05Ready: boolean;
  f05Loading: boolean;
  f05Error: string;
  f05Revision: number;
}

const PlatformRuntimeContext = createContext<PlatformRuntimeValue | null>(null);

export function PlatformRuntimeProvider({ children }: PropsWithChildren) {
  const auth = useAuth();

  const catalogRuntime = useMemo(() => {
    if (isSupabaseConfigured && supabase) return createCatalogRuntime(supabase as any);
    return null;
  }, []);
  const catalogRepository = useMemo<CatalogRepository>(
    () => catalogRuntime?.repository ?? new LocalCatalogRepository(),
    [catalogRuntime],
  );
  const publicCatalogService = useMemo(
    () => catalogRuntime?.publicCatalogService ?? new PublicCatalogService(catalogRepository),
    [catalogRepository, catalogRuntime],
  );
  const catalogMediaStorage = catalogRuntime?.mediaStorage ?? null;
  const favoritesStore = useMemo(() => new SupabaseFavoritesStore(), []);
  const credentialVault = useMemo(() => new SupabaseAICredentialVault(), []);
  const aiModelRuntime = useMemo(() => new SupabaseAIModelRuntime(), []);
  const automationWebhook = useMemo(() => new SupabaseAutomationWebhook(), []);
  const whatsappTransport = useMemo(() => new SupabaseWhatsAppTransport(), []);

  useEffect(() => () => catalogRuntime?.dispose(), [catalogRuntime]);

  const [crmService, setCrmService] = useState<CrmService | null>(null);
  const [inboxService, setInboxService] = useState<InboxService | null>(null);
  const [inboxAutomationPort, setInboxAutomationPort] = useState<InboxAutomationPort | null>(null);
  const [commercialMetricsProvider, setCommercialMetricsProvider] = useState<CommercialMetricsProvider | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [operationalLoading, setOperationalLoading] = useState(false);
  const [operationalError, setOperationalError] = useState('');
  const [operationalRevision, setOperationalRevision] = useState(0);
  const [f05Ready, setF05Ready] = useState(false);
  const [f05Loading, setF05Loading] = useState(false);
  const [f05Error, setF05Error] = useState('');
  const [f05Revision, setF05Revision] = useState(0);

  const canUseInbox = auth.isInternalUser && (
    auth.hasPermission(PERMISSIONS.INBOX_VIEW)
    || auth.hasPermission(PERMISSIONS.INBOX_MANAGE)
  );

  const canUseCrm = auth.isInternalUser && (
    auth.hasPermission(PERMISSIONS.CRM_VIEW)
    || auth.hasPermission(PERMISSIONS.CRM_MANAGE)
    || canUseInbox
  );

  const canUseF05 = auth.isInternalUser && (
    auth.hasPermission(PERMISSIONS.SALESBOT_VIEW)
    || auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE)
    || auth.hasPermission(PERMISSIONS.AUTOMATIONS_VIEW)
    || auth.hasPermission(PERMISSIONS.AUTOMATIONS_MANAGE)
    || auth.hasPermission(PERMISSIONS.AI_VIEW)
    || auth.hasPermission(PERMISSIONS.AI_MANAGE)
    || auth.hasPermission(PERMISSIONS.INTEGRATIONS_VIEW)
    || auth.hasPermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  );

  useEffect(() => {
    let active = true;
    let reloading = false;
    let pendingReload = false;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const load = async (showLoading: boolean) => {
      if (reloading) {
        pendingReload = true;
        return;
      }
      reloading = true;
      if (showLoading) setF05Loading(true);
      setF05Error('');
      try {
        await hydrateSharedF05Storage();
        if (!active) return;
        setF05Ready(true);
        setF05Revision((value) => value + 1);
      } catch (error) {
        if (!active) return;
        resetF05SharedStorage();
        setF05Ready(false);
        setF05Error(error instanceof Error ? error.message : 'Não foi possível carregar SalesBot, automações e IA.');
      } finally {
        reloading = false;
        if (active && showLoading) setF05Loading(false);
        if (active && pendingReload) {
          pendingReload = false;
          void load(false);
        }
      }
    };

    if (!canUseF05 || !isSupabaseConfigured || !supabase) {
      resetF05SharedStorage();
      setF05Ready(false);
      setF05Loading(false);
      setF05Error('');
      return () => undefined;
    }

    setF05Ready(false);
    void load(true);

    channel = supabase
      .channel(`harpia-f05-shared-${auth.user?.id ?? 'internal'}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'f05_shared_storage' },
        () => { void load(false); },
      )
      .subscribe();

    return () => {
      active = false;
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [auth.user?.id, canUseF05]);

  useEffect(() => {
    let active = true;
    let reloading = false;
    let pendingReload = false;
    let unsubscribeEvents: (() => void) | undefined;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const installOperationalRuntime = async (showLoading: boolean) => {
      if (reloading) {
        pendingReload = true;
        return;
      }
      reloading = true;
      if (showLoading) setOperationalLoading(true);
      setOperationalError('');

      try {
        const [crmRepository, inboxRepository, assigneeRows] = await Promise.all([
          hydrateSharedCrmRepository(),
          canUseInbox ? hydrateSharedInboxRepository() : Promise.resolve(null),
          loadInternalAssignees(),
        ]);
        if (!active) return;

        unsubscribeEvents?.();

        const crm = new CrmService(crmRepository);
        const inbox = inboxRepository ? new InboxService(inboxRepository, whatsappTransport) : null;
        const waitForCrmPersistence = () => crmRepository.waitForLastSave?.() ?? Promise.resolve();
        const crmActions = createFront05CrmActionPort(crm, waitForCrmPersistence);
        const aiCommandPort = createAIAgentCommandPort(aiModelRuntime);
        const salesBotMessagePort = {
          send: async (input: { conversationId?: string; message: string }) => {
            if (!inbox || !input.conversationId) {
              return { status: 'rejected' as const, reason: 'Conversa da Inbox obrigatória para enviar mensagem do SalesBot.' };
            }
            try {
              const sent = await inbox.sendMessage({
                conversationId: input.conversationId,
                type: 'text',
                text: input.message,
              });
              return {
                status: 'accepted' as const,
                data: { externalMessageId: sent.externalMessageId ?? '' },
              };
            } catch (error) {
              return {
                status: 'rejected' as const,
                reason: error instanceof Error ? error.message : 'Não foi possível enviar a mensagem do SalesBot pelo WhatsApp.',
              };
            }
          },
        };
        const salesBotCommandPort = createSalesBotCommandPort({
          ...unconfiguredSalesBotRuntimeDependencies,
          crm: crmActions,
          ai: aiCommandPort,
          message: salesBotMessagePort,
          condition: salesBotConditionEvaluator,
          webhook: automationWebhook,
        });
        const automationDependencies = {
          ...unconfiguredAutomationEngineDependencies,
          salesbot: salesBotCommandPort,
          ai: aiCommandPort,
          crm: crmActions,
          webhook: automationWebhook,
        };
        const sink = new Front05CrmEventSink(
          (event) => processCrmAutomationEvent(event, automationDependencies),
          waitForCrmPersistence,
        );
        unsubscribeEvents = crm.subscribeEvents(sink);

        const automationPort = createFront05InboxAutomationAdapter({
          salesBot: salesBotCommandPort,
          aiAgent: aiCommandPort,
          resolveSalesBotId: () => undefined,
          resolveAiAgentId: () => undefined,
        });

        setCrmService(crm);
        setInboxService(inbox);
        setInboxAutomationPort(canUseInbox ? automationPort : null);
        setCommercialMetricsProvider(
          new CrmSnapshotMetricsProvider(new CrmRepositorySnapshotSource(crmRepository), catalogRepository),
        );
        setAssignees(assigneeRows);
        setOperationalRevision((value) => value + 1);
      } catch (error) {
        if (!active) return;
        setOperationalError(error instanceof Error ? error.message : 'Não foi possível carregar CRM/Inbox compartilhados.');
        setCrmService(null);
        setInboxService(null);
        setInboxAutomationPort(null);
        setCommercialMetricsProvider(null);
        setAssignees([]);
      } finally {
        reloading = false;
        if (active && showLoading) setOperationalLoading(false);
        if (active && pendingReload) {
          pendingReload = false;
          void installOperationalRuntime(false);
        }
      }
    };

    if (!canUseCrm || !isSupabaseConfigured || !supabase) {
      setCrmService(null);
      setInboxService(null);
      setInboxAutomationPort(null);
      setCommercialMetricsProvider(null);
      setAssignees([]);
      setOperationalLoading(false);
      setOperationalError('');
      return () => undefined;
    }

    void installOperationalRuntime(true);

    channel = supabase
      .channel(`harpia-operational-state-${auth.user?.id ?? 'internal'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_pipelines' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_pipeline_stages' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_leads' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_tags' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_lead_tags' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_custom_fields' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_lead_custom_field_values' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_tasks' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_history' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_conversations' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_messages' },
        () => { void installOperationalRuntime(false); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_message_attachments' },
        () => { void installOperationalRuntime(false); },
      )
      .subscribe();

    return () => {
      active = false;
      unsubscribeEvents?.();
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [aiModelRuntime, auth.user?.id, automationWebhook, canUseCrm, canUseInbox, catalogRepository, f05Revision, whatsappTransport]);

  const value = useMemo<PlatformRuntimeValue>(() => ({
    catalogRepository,
    publicCatalogService,
    catalogMediaStorage,
    favoritesStore,
    credentialVault,
    crmService,
    inboxService,
    inboxAutomationPort,
    commercialMetricsProvider,
    assignees,
    operationalLoading,
    operationalError,
    operationalRevision,
    f05Ready,
    f05Loading,
    f05Error,
    f05Revision,
  }), [
    assignees,
    catalogMediaStorage,
    catalogRepository,
    commercialMetricsProvider,
    credentialVault,
    crmService,
    favoritesStore,
    f05Error,
    f05Loading,
    f05Ready,
    f05Revision,
    inboxAutomationPort,
    inboxService,
    operationalError,
    operationalLoading,
    operationalRevision,
    publicCatalogService,
  ]);

  return <PlatformRuntimeContext.Provider value={value}>{children}</PlatformRuntimeContext.Provider>;
}

export function usePlatformRuntime() {
  const value = useContext(PlatformRuntimeContext);
  if (!value) throw new Error('usePlatformRuntime deve ser usado dentro de PlatformRuntimeProvider.');
  return value;
}
