import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function namedKey(envName: string) {
  const raw = Deno.env.get(envName);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

function array(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
}
function text(value: unknown) { return typeof value === 'string' ? value : ''; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const publicKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const authorization = req.headers.get('Authorization');

  if (!url || !publicKey || !serverKey || !authorization) {
    return response({ ok: false, message: 'Servidor indisponível.' }, 503);
  }

  const caller = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return response({ ok: false, message: 'Sessão inválida.' }, 401);

  const { data: profile, error: profileError } = await caller
    .from('user_profiles')
    .select('id,full_name,whatsapp,account_type,is_active')
    .eq('id', identity.user.id)
    .maybeSingle();

  if (profileError || profile?.account_type !== 'client' || profile?.is_active !== true) {
    return response({ ok: false, message: 'Conta de cliente inválida.' }, 403);
  }

  const admin = createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientId = identity.user.id;

  const [
    preferencesResult,
    documentsResult,
    normalizedLeadsResult,
    legacyStateResult,
    notificationsResult,
  ] = await Promise.all([
    admin.from('client_portal_preferences').select('*').eq('client_id', clientId).maybeSingle(),
    admin.from('client_documents').select('*').eq('client_id', clientId).order('updated_at', { ascending: false }),
    admin.from('crm_leads').select('*').contains('source_metadata', { clientId }).order('updated_at', { ascending: false }),
    admin.from('platform_module_state').select('state').eq('module', 'crm').maybeSingle(),
    admin.from('user_notifications').select('id,title,body,href,created_at,read_at').eq('user_id', clientId).order('created_at', { ascending: false }).limit(20),
  ]);

  if (preferencesResult.error) console.error('client preferences', preferencesResult.error);
  if (documentsResult.error) console.error('client documents', documentsResult.error);
  if (normalizedLeadsResult.error) console.error('client normalized leads', normalizedLeadsResult.error);

  const normalizedLeads = (normalizedLeadsResult.data ?? []) as Array<Record<string, unknown>>;
  const legacyState = legacyStateResult.data?.state && typeof legacyStateResult.data.state === 'object'
    ? legacyStateResult.data.state as Record<string, unknown>
    : {};
  const legacyLeads = array(legacyState.leads).filter((lead) => {
    const metadata = lead.sourceMetadata && typeof lead.sourceMetadata === 'object'
      ? lead.sourceMetadata as Record<string, unknown>
      : {};
    return String(metadata.clientId || '') === clientId;
  });

  const useNormalized = normalizedLeads.length > 0;
  const ownLeads: Array<Record<string, unknown>> = useNormalized
    ? normalizedLeads
    : legacyLeads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        whatsapp: lead.whatsapp,
        source: lead.source,
        source_action: lead.sourceAction,
        source_page: lead.sourcePage,
        source_occurred_at: lead.sourceOccurredAt,
        source_metadata: lead.sourceMetadata,
        interest_type: (lead.interest as Record<string, unknown> | undefined)?.type,
        interest_reference_id: (lead.interest as Record<string, unknown> | undefined)?.referenceId,
        interest_label: (lead.interest as Record<string, unknown> | undefined)?.label,
        assignee_id: lead.assigneeId,
        pipeline_id: lead.pipelineId,
        stage_id: lead.stageId,
        notes: lead.notes,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
        last_interaction_at: lead.lastInteractionAt,
      }));

  const leadIds = ownLeads.map((lead) => text(lead.id)).filter(Boolean);
  let pipelines: Array<Record<string, unknown>> = [];
  let stages: Array<Record<string, unknown>> = [];
  let tasks: Array<Record<string, unknown>> = [];
  let history: Array<Record<string, unknown>> = [];
  let leadProducts: Array<Record<string, unknown>> = [];

  if (useNormalized) {
    const pipelineIds = [...new Set(ownLeads.map((lead) => text(lead.pipeline_id)).filter(Boolean))];
    const [pipelinesResult, stagesResult, tasksResult, historyResult, productsResult] = await Promise.all([
      pipelineIds.length ? admin.from('crm_pipelines').select('id,name,active,created_at,updated_at').in('id', pipelineIds) : Promise.resolve({ data: [], error: null }),
      pipelineIds.length ? admin.from('crm_pipeline_stages').select('id,pipeline_id,name,position,created_at,updated_at').in('pipeline_id', pipelineIds).order('position') : Promise.resolve({ data: [], error: null }),
      leadIds.length ? admin.from('crm_tasks').select('*').in('lead_id', leadIds).order('due_at', { ascending: true, nullsFirst: false }) : Promise.resolve({ data: [], error: null }),
      leadIds.length ? admin.from('crm_history').select('*').in('lead_id', leadIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      leadIds.length ? admin.from('crm_lead_products').select('lead_id,catalog_item_id,relationship,created_at,updated_at').in('lead_id', leadIds) : Promise.resolve({ data: [], error: null }),
    ]);
    pipelines = (pipelinesResult.data ?? []) as Array<Record<string, unknown>>;
    stages = (stagesResult.data ?? []) as Array<Record<string, unknown>>;
    tasks = (tasksResult.data ?? []) as Array<Record<string, unknown>>;
    history = (historyResult.data ?? []) as Array<Record<string, unknown>>;
    leadProducts = (productsResult.data ?? []) as Array<Record<string, unknown>>;
  } else {
    pipelines = array(legacyState.pipelines).map((item) => ({
      id: item.id, name: item.name, active: item.active, created_at: item.createdAt, updated_at: item.updatedAt,
    }));
    stages = array(legacyState.stages).map((item) => ({
      id: item.id, pipeline_id: item.pipelineId, name: item.name, position: item.position, created_at: item.createdAt, updated_at: item.updatedAt,
    }));
    tasks = array(legacyState.tasks)
      .filter((item) => leadIds.includes(text(item.leadId)))
      .map((item) => ({
        id: item.id, lead_id: item.leadId, title: item.title, assignee_id: item.assigneeId,
        due_at: item.dueAt, status: item.status, notes: item.notes, created_at: item.createdAt, updated_at: item.updatedAt,
      }));
    history = array(legacyState.history)
      .filter((item) => leadIds.includes(text(item.leadId)))
      .map((item) => ({
        id: item.id, lead_id: item.leadId, type: item.type, description: item.description,
        metadata: item.metadata, created_at: item.createdAt,
      }));
  }

  const pipelineMap = new Map(pipelines.map((pipeline) => [text(pipeline.id), pipeline]));
  const stageMap = new Map(stages.map((stage) => [text(stage.id), stage]));
  const stagesByPipeline = new Map<string, Array<Record<string, unknown>>>();
  for (const stage of stages) {
    const pipelineId = text(stage.pipeline_id);
    const list = stagesByPipeline.get(pipelineId) ?? [];
    list.push(stage);
    stagesByPipeline.set(pipelineId, list);
  }
  for (const list of stagesByPipeline.values()) {
    list.sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }

  const documents = (documentsResult.data ?? []) as Array<Record<string, unknown>>;
  const processes = ownLeads.map((lead) => {
    const leadId = text(lead.id);
    const pipelineId = text(lead.pipeline_id);
    const stageId = text(lead.stage_id);
    const pipeline = pipelineMap.get(pipelineId);
    const currentStage = stageMap.get(stageId);
    const processStages = stagesByPipeline.get(pipelineId) ?? [];
    const currentPosition = currentStage ? Number(currentStage.position ?? -1) : -1;
    const processTasks = tasks
      .filter((task) => text(task.lead_id) === leadId)
      .sort((a, b) => text(a.due_at || a.created_at).localeCompare(text(b.due_at || b.created_at)));
    const pendingTasks = processTasks.filter((task) => text(task.status) === 'pending');
    const processHistory = history
      .filter((entry) => text(entry.lead_id) === leadId)
      .sort((a, b) => text(b.created_at).localeCompare(text(a.created_at)));
    const processDocuments = documents.filter((document) => !document.lead_id || text(document.lead_id) === leadId);

    return {
      id: leadId,
      title: text(lead.interest_label) || text(pipeline?.name) || 'Atendimento Hárpia',
      detail: text(lead.notes) || text(lead.source_page),
      status: text(currentStage?.name) || 'Em acompanhamento',
      pipelineName: text(pipeline?.name),
      stageName: text(currentStage?.name),
      updatedAt: text(lead.updated_at),
      createdAt: text(lead.created_at),
      interest: lead.interest_type ? {
        type: text(lead.interest_type),
        referenceId: text(lead.interest_reference_id) || undefined,
        label: text(lead.interest_label) || undefined,
      } : null,
      stages: processStages.map((stage) => {
        const position = Number(stage.position ?? 0);
        return {
          id: text(stage.id),
          name: text(stage.name),
          position,
          state: currentPosition < 0 ? 'upcoming' : position < currentPosition ? 'done' : position === currentPosition ? 'current' : 'upcoming',
        };
      }),
      tasks: processTasks.map((task) => ({
        id: text(task.id),
        title: text(task.title),
        status: text(task.status),
        dueAt: text(task.due_at) || null,
        notes: text(task.notes) || null,
      })),
      nextAction: pendingTasks[0] ? {
        id: text(pendingTasks[0].id),
        title: text(pendingTasks[0].title),
        dueAt: text(pendingTasks[0].due_at) || null,
        notes: text(pendingTasks[0].notes) || null,
      } : null,
      history: processHistory.map((entry) => ({
        id: text(entry.id),
        type: text(entry.type),
        description: text(entry.description),
        occurredAt: text(entry.created_at),
      })),
      documents: processDocuments.map((document) => ({
        id: text(document.id),
        label: text(document.request_label),
        description: text(document.description) || null,
        status: text(document.status),
        storagePath: text(document.storage_path) || null,
        fileName: text(document.file_name) || null,
        mimeType: text(document.mime_type) || null,
        sizeBytes: document.size_bytes ?? null,
        leadId: text(document.lead_id) || null,
        updatedAt: text(document.updated_at),
      })),
    };
  });

  const interests = ownLeads.flatMap((lead) => {
    const label = text(lead.interest_label);
    if (!label) return [];
    return [{
      id: `${text(lead.id)}:${text(lead.interest_reference_id) || text(lead.interest_type) || 'interest'}`,
      label,
      type: text(lead.interest_type),
      detail: text(lead.source_page) || text(lead.source_action),
      referenceId: text(lead.interest_reference_id) || null,
    }];
  });

  const historyView = history
    .map((entry) => {
      const lead = ownLeads.find((candidate) => text(candidate.id) === text(entry.lead_id));
      return {
        id: text(entry.id),
        title: text(entry.description) || 'Atualização de atendimento',
        detail: text(lead?.interest_label) || undefined,
        occurredAt: text(entry.created_at),
        propertySlug: text(lead?.interest_type) === 'property' && text(lead?.interest_reference_id)
          ? text(lead?.interest_reference_id)
          : undefined,
      };
    })
    .filter((entry) => entry.id)
    .sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));

  const curatedItemIds = [...new Set([
    ...leadProducts.map((row) => text(row.catalog_item_id)).filter(Boolean),
    ...ownLeads.filter((lead) => text(lead.interest_type) === 'property').map((lead) => text(lead.interest_reference_id)).filter(Boolean),
  ])];

  return response({
    ok: true,
    data: {
      profile: {
        id: clientId,
        fullName: profile.full_name || '',
        whatsapp: profile.whatsapp || '',
        email: identity.user.email || '',
      },
      preferences: preferencesResult.data ?? null,
      onboardingRequired: !preferencesResult.data?.onboarding_completed_at,
      interests,
      history: historyView,
      processes,
      documents: documents.map((document) => ({
        id: text(document.id),
        label: text(document.request_label),
        description: text(document.description) || null,
        status: text(document.status),
        storagePath: text(document.storage_path) || null,
        fileName: text(document.file_name) || null,
        mimeType: text(document.mime_type) || null,
        sizeBytes: document.size_bytes ?? null,
        leadId: text(document.lead_id) || null,
        updatedAt: text(document.updated_at),
      })),
      curatedItemIds,
      notifications: (notificationsResult.data ?? []).map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        createdAt: notification.created_at,
        readAt: notification.read_at,
      })),
    },
  });
});