import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { listAutomations } from '../features/automations/repository';
import { listSalesBotExecutions } from '../features/salesbot/executionRepository';
import { SupabaseAICredentialVault } from './integrations/supabaseAICredentialVault';
import { SupabaseAIModelRuntime } from './integrations/supabaseAIModelRuntime';
import { SupabaseAutomationWebhook } from './integrations/supabaseAutomationWebhook';
import { SupabaseFavoritesStore } from './integrations/supabaseFavoritesStore';
import { SupabaseSalesBotWhatsAppMessagePort, SupabaseWhatsAppTransport } from './integrations/supabaseWhatsAppTransport';
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
  const whatsappSalesBotMessage = useMemo(() => new SupabaseSalesBotWhatsAppMessagePort(), []);

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
  const firedStageTimersRef = useRef(new Set<string>());

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
    let automationTimer: ReturnType<typeof window.setInterval> | undefined;
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
        const baseSalesBotCommandPort = createSalesBotCommandPort({
          ...unconfiguredSalesBotRuntimeDependencies,
          crm: crmActions,
          ai: aiCommandPort,
          message: whatsappSalesBotMessage,
          condition: salesBotConditionEvaluator,
          webhook: automationWebhook,
        });

        let automationDependencies = {
          ...unconfiguredAutomationEngineDependencies,
          salesbot: baseSalesBotCommandPort,
          ai: aiCommandPort,
          crm: crmActions,
          webhook: automationWebhook,
        };

        const publishSalesBotResult = async (input: {
          botId: string;
          leadId?: string;
          conversationId?: string;
          executionId?: string;
          runtimeStatus?: string;
        }) => {
          if (input.runtimeStatus !== 'completed' && input.runtimeStatus !== 'failed') return;
          await processCrmAutomationEvent({
            id: `salesbot-event-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
            type: input.runtimeStatus === 'completed' ? 'salesbot.completed' : 'salesbot.failed',
            occurredAt: new Date().toISOString(),
            leadId: input.leadId,
            conversationId: input.conversationId,
            payload: {
              botId: input.botId,
              executionId: input.executionId ?? null,
              runtimeStatus: input.runtimeStatus,
            },
          }, automationDependencies);
        };

        const salesBotCommandPort = {
          ...baseSalesBotCommandPort,
          async start(input: Parameters<typeof baseSalesBotCommandPort.start>[0]) {
            const result = await baseSalesBotCommandPort.start(input);
            await publishSalesBotResult({
              botId: input.botId,
              leadId: input.leadId,
              conversationId: input.conversationId,
              executionId: result.executionId,
              runtimeStatus: String(result.data?.runtimeStatus ?? ''),
            });
            return result;
          },
          async resume(input: Parameters<typeof baseSalesBotCommandPort.resume>[0]) {
            const before = listSalesBotExecutions().find((item) => item.id === input.executionId);
            const result = await baseSalesBotCommandPort.resume(input);
            if (before) {
              await publishSalesBotResult({
                botId: before.botId,
                leadId: before.leadId,
                conversationId: before.conversationId,
                executionId: result.executionId ?? before.id,
                runtimeStatus: String(result.data?.runtimeStatus ?? ''),
              });
            }
            return result;
          },
        };

        automationDependencies = {
          ...automationDependencies,
          salesbot: salesBotCommandPort,
        };

        const runStageTimeTriggers = async () => {
          const definitions = listAutomations().filter(
            (item) => item.status === 'active' && item.trigger.event === 'lead.stage_elapsed',
          );
          if (definitions.length === 0) return;

          const snapshot = crm.snapshot();
          const nowMs = Date.now();

          for (const definition of definitions) {
            const afterCondition = definition.trigger.conditions.find((item) => item.field === 'afterMinutes');
            const stageCondition = definition.trigger.conditions.find((item) => item.field === 'stageId');
            const afterMinutes = Number(afterCondition?.value ?? '');
            if (!Number.isFinite(afterMinutes) || afterMinutes <= 0) continue;

            for (const lead of snapshot.leads) {
              if (!lead.stageId || !lead.stageEnteredAt) continue;
              if (stageCondition?.value && String(stageCondition.value) !== lead.stageId) continue;

              const enteredMs = Date.parse(lead.stageEnteredAt);
              if (!Number.isFinite(enteredMs)) continue;
              const elapsedMinutes = Math.floor((nowMs - enteredMs) / 60_000);
              if (elapsedMinutes < afterMinutes) continue;

              const dedupeKey = `${definition.id}:${lead.id}:${lead.stageId}:${lead.stageEnteredAt}:${afterMinutes}`;
              if (firedStageTimersRef.current.has(dedupeKey)) continue;
              firedStageTimersRef.current.add(dedupeKey);

              await processCrmAutomationEvent({
                id: `stage-time-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
                type: 'lead.stage_elapsed',
                occurredAt: new Date().toISOString(),
                leadId: lead.id,
                payload: {
                  pipelineId: lead.pipelineId ?? null,
                  stageId: lead.stageId,
                  afterMinutes: String(afterMinutes),
                  elapsedMinutes,
                },
              }, automationDependencies);
            }
          }
        };

        if (automationTimer) window.clearInterval(automationTimer);
        automationTimer = window.setInterval(() => { void runStageTimeTriggers(); }, 30_000);
        void runStageTimeTriggers();

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
        { event: 'UPDATE', schema: 'public', table: 'platform_module_state' },
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
      if (automationTimer) window.clearInterval(automationTimer);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [aiModelRuntime, auth.user?.id, automationWebhook, canUseCrm, canUseInbox, catalogRepository, f05Revision, whatsappSalesBotMessage, whatsappTransport]);

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
