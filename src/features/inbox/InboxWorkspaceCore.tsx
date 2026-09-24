import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  UnavailableInboxAutomationPort,
} from '../crm/contracts';
import type {
  ConversationAutomationStatus,
  InboxAutomationPort,
} from '../crm/contracts';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldValue } from '../crm/domain';
import { CrmService } from '../crm/service';
import type { AssigneeOption } from '../crm/CrmWorkspace';
import { BrowserInboxRepository } from './repository';
import { InboxService } from './service';
import type { InboxConversation, InboxState, MessageType } from './domain';
import { formatRuntimeDateTime, formatRuntimeTime } from '../settings/runtime-preferences';
import styles from './inbox.module.css';

export interface AutomationOption {
  id: string;
  name: string;
}

export interface InboxWorkspaceProps {
  crmService: CrmService;
  inboxService?: InboxService;
  automationPort?: InboxAutomationPort;
  assignees?: AssigneeOption[];
  salesBots?: AutomationOption[];
  aiAgents?: AutomationOption[];
}

const botSelectionMemory = new Map<string, string>();
const agentSelectionMemory = new Map<string, string>();

export function InboxWorkspace({
  crmService,
  inboxService: injectedInboxService,
  automationPort: injectedAutomationPort,
  assignees = [],
  salesBots = [],
  aiAgents = [],
}: InboxWorkspaceProps) {
  const inboxService = useMemo(
    () => injectedInboxService ?? new InboxService(new BrowserInboxRepository()),
    [injectedInboxService],
  );
  const automationPort = useMemo(
    () => injectedAutomationPort ?? new UnavailableInboxAutomationPort(),
    [injectedAutomationPort],
  );

  const [inboxState, setInboxState] = useState<InboxState>(() => inboxService.snapshot());
  const [crmState, setCrmState] = useState(() => crmService.snapshot());
  const requestedLeadId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('lead') || undefined
    : undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(() => {
    const snapshot = inboxService.snapshot();
    return snapshot.conversations.find((conversation) => conversation.leadId === requestedLeadId)?.id
      ?? snapshot.conversations[0]?.id;
  });
  const [selectedBotByConversation, setSelectedBotByConversation] = useState<Record<string, string>>(
    () => Object.fromEntries(botSelectionMemory),
  );
  const [selectedAgentByConversation, setSelectedAgentByConversation] = useState<Record<string, string>>(
    () => Object.fromEntries(agentSelectionMemory),
  );
  const [feedback, setFeedback] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [conversationQuery, setConversationQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [automationPicker, setAutomationPicker] = useState<'salesbot' | 'agent' | null>(null);
  const [automationStatus, setAutomationStatus] = useState<ConversationAutomationStatus>({
    salesBot: 'unavailable',
    aiAgent: 'unavailable',
  });

  const refresh = () => {
    setInboxState(inboxService.snapshot());
    setCrmState(crmService.snapshot());
  };

  const selectedConversation = inboxState.conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedLead = crmState.leads.find((lead) => lead.id === selectedConversation?.leadId);
  const messages = selectedConversation ? inboxService.getMessages(selectedConversation.id) : [];
  const selectedBotId = selectedConversationId
    ? selectedBotByConversation[selectedConversationId] ?? ''
    : '';
  const selectedAgentId = selectedConversationId
    ? selectedAgentByConversation[selectedConversationId] ?? ''
    : '';
  const automationLabel = automationStatus.salesBot === 'running'
    ? 'SalesBot ativo'
    : automationStatus.aiAgent === 'running'
      ? 'Agente IA ativo'
      : automationStatus.salesBot === 'paused' || automationStatus.aiAgent === 'paused'
        ? 'Automação pausada'
        : '';

  const setSelectedBotId = (id: string) => {
    if (!selectedConversationId) return;
    if (id) botSelectionMemory.set(selectedConversationId, id);
    else botSelectionMemory.delete(selectedConversationId);
    setSelectedBotByConversation((current) => ({ ...current, [selectedConversationId]: id }));
  };

  const setSelectedAgentId = (id: string) => {
    if (!selectedConversationId) return;
    if (id) agentSelectionMemory.set(selectedConversationId, id);
    else agentSelectionMemory.delete(selectedConversationId);
    setSelectedAgentByConversation((current) => ({ ...current, [selectedConversationId]: id }));
  };

  useEffect(() => {
    if (!requestedLeadId) return;
    const conversation = inboxState.conversations.find((item) => item.leadId === requestedLeadId);
    if (conversation && conversation.id !== selectedConversationId) {
      setSelectedConversationId(conversation.id);
    }
  }, [inboxState.conversations, requestedLeadId, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) {
      setAutomationStatus({ salesBot: 'unavailable', aiAgent: 'unavailable' });
      return;
    }

    let active = true;
    automationPort
      .getStatus({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
        botId: selectedBotId || undefined,
        agentId: selectedAgentId || undefined,
      })
      .then((status) => {
        if (active) setAutomationStatus(status);
      })
      .catch(() => {
        if (active) setAutomationStatus({ salesBot: 'unavailable', aiAgent: 'unavailable' });
      });

    return () => {
      active = false;
    };
  }, [automationPort, selectedAgentId, selectedBotId, selectedConversation]);

  const openInternalSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const leadId = String(form.get('leadId') ?? '');
    if (!leadId) return;
    try {
      const conversation = inboxService.createConversation(leadId);
      setSelectedConversationId(conversation.id);
      refresh();
      setFeedback('Sessão interna aberta. Canal externo continua não conectado.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível abrir a sessão.');
    }
  };

  const refreshAutomationStatus = async () => {
    if (!selectedConversation) return;
    const status = await automationPort.getStatus({
      leadId: selectedConversation.leadId,
      conversationId: selectedConversation.id,
      botId: selectedBotId || undefined,
      agentId: selectedAgentId || undefined,
    });
    setAutomationStatus(status);
  };

  const startSalesBot = async (botId = selectedBotId) => {
    if (!selectedConversation) return;
    if (!botId) {
      setFeedback('Selecione um SalesBot ativo antes de iniciar.');
      return;
    }
    try {
      await automationPort.startSalesBot({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
        botId,
      });
      await refreshAutomationStatus();
      setFeedback('SalesBot selecionado iniciado pela integração da Frente05.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível iniciar o SalesBot.');
    }
  };

  const pauseSalesBot = async () => {
    if (!selectedConversation) return;
    try {
      await automationPort.pauseSalesBot({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
      });
      await refreshAutomationStatus();
      setFeedback('SalesBot pausado.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível pausar o SalesBot.');
    }
  };

  const startAiAgent = async (agentId = selectedAgentId) => {
    if (!selectedConversation) return;
    if (!agentId) {
      setFeedback('Selecione um agente IA ativo antes de iniciar.');
      return;
    }
    try {
      await automationPort.startAiAgent({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
        agentId,
      });
      await refreshAutomationStatus();
      setFeedback('Agente IA selecionado iniciado pela integração da Frente05.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível iniciar o agente IA.');
    }
  };

  const pauseAiAgent = async () => {
    if (!selectedConversation) return;
    try {
      await automationPort.pauseAiAgent({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
      });
      await refreshAutomationStatus();
      setFeedback('Agente IA pausado.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível pausar o agente IA.');
    }
  };

  const openWhatsAppWeb = () => {
    if (!selectedLead?.whatsapp) {
      setFeedback('Este lead não tem número de WhatsApp cadastrado.');
      return;
    }
    const phone = selectedLead.whatsapp.replace(/\D/g, '');
    if (!phone) {
      setFeedback('O número de WhatsApp deste lead é inválido.');
      return;
    }
    window.open(`https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}`, '_blank', 'noopener,noreferrer');
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Mensagem copiada.');
    } catch {
      setFeedback('Não foi possível copiar a mensagem.');
    }
  };

  const submitText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation) return;
    const form = new FormData(event.currentTarget);
    const text = String(form.get('message') ?? '');
    try {
      await inboxService.sendMessage({
        conversationId: selectedConversation.id,
        type: 'text',
        text,
      });
      event.currentTarget.reset();
      refresh();
      setFeedback('Mensagem enviada pelo transporte conectado.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nenhuma mensagem foi enviada.');
    }
  };
  const submitMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !selectedConversation) return;

    const type = mediaTypeFromMime(file.type);
    if (!type) {
      setFeedback('Formato de arquivo não suportado pela Inbox.');
      input.value = '';
      return;
    }

    setMediaBusy(true);
    try {
      setFeedback(`Envio de ${messageTypeLabel(type).toLowerCase()} ainda depende do adaptador de upload do transporte WhatsApp. Nenhum arquivo foi enviado.`);
    } finally {
      setMediaBusy(false);
      input.value = '';
    }
  };


  const explainUnsupportedTransportAction = (action: string) => {
    setFeedback(`${action} está previsto na Inbox, mas o transporte WhatsApp atual ainda não expõe essa operação. Nenhuma ação foi simulada.`);
  };

  const updateStage = (stageId: string) => {
    if (!selectedLead || !stageId) return;
    try {
      crmService.moveLead(selectedLead.id, stageId);
      refresh();
      setFeedback('Etapa atualizada pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível alterar a etapa.');
    }
  };

  const updateAssignee = (assigneeId: string) => {
    if (!selectedLead) return;
    try {
      crmService.assignLead(selectedLead.id, assigneeId || undefined);
      refresh();
      setFeedback('Responsável atualizado pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível alterar o responsável.');
    }
  };

  const updateCustomField = (fieldId: string, value: CustomFieldValue) => {
    if (!selectedLead) return;
    try {
      crmService.setCustomFieldValue(selectedLead.id, fieldId, value);
      refresh();
      setFeedback('Campo personalizado atualizado pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao atualizar campo.');
    }
  };

  const addTag = (tagId: string) => {
    if (!selectedLead || !tagId) return;
    try {
      crmService.addTagToLead(selectedLead.id, tagId);
      refresh();
      setFeedback('Tag adicionada pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível adicionar a tag.');
    }
  };

  const removeTag = (tagId: string) => {
    if (!selectedLead) return;
    try {
      crmService.removeTagFromLead(selectedLead.id, tagId);
      refresh();
      setFeedback('Tag removida pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível remover a tag.');
    }
  };

  const createCustomFieldDefinition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const type = String(form.get('type') ?? 'text') as CustomFieldType;
    const optionsText = String(form.get('options') ?? '');
    const options = type === 'select' || type === 'multiselect'
      ? optionsText.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;

    try {
      crmService.createCustomField({ name, type, options });
      event.currentTarget.reset();
      refresh();
      setFeedback('Campo personalizado criado e disponível no perfil do lead.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar o campo personalizado.');
    }
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLead) return;
    const form = new FormData(event.currentTarget);
    try {
      crmService.createTask({
        leadId: selectedLead.id,
        title: String(form.get('title') ?? ''),
        dueAt: String(form.get('dueAt') ?? '') || undefined,
      });
      event.currentTarget.reset();
      refresh();
      setFeedback('Próxima ação criada pela Inbox.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar a tarefa.');
    }
  };

  const activePipelines = crmState.pipelines.filter((pipeline) => pipeline.active);
  const availableTags = selectedLead
    ? crmState.tags.filter((tag) => !selectedLead.tagIds.includes(tag.id))
    : [];
  const leadTasks = selectedLead ? crmService.getLeadTasks(selectedLead.id) : [];
  const normalizedConversationQuery = conversationQuery.trim().toLowerCase();
  const filteredConversations = inboxState.conversations.filter((conversation) => {
    if (!normalizedConversationQuery) return true;
    const lead = crmState.leads.find((item) => item.id === conversation.leadId);
    const searchable = [lead?.name, lead?.whatsapp, lead?.email, conversation.channel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedConversationQuery);
  });

  return (
    <section className={profileVisible ? styles.workspace : `${styles.workspace} ${styles.profileHidden}`} aria-label="Inbox Hárpia">
      {feedback && (
        <div className={styles.feedback} role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <aside className={styles.conversationList} aria-label="Lista de conversas">
        <header>
          <div>
            <span className={styles.kicker}>INBOX</span>
            <h1>Conversas</h1>
          </div>
          <span className={styles.count}>{inboxState.conversations.length}</span>
        </header>

        <div className={styles.conversationSearch}>
          <input
            value={conversationQuery}
            onChange={(event) => setConversationQuery(event.target.value)}
            placeholder="Buscar cliente ou telefone"
            aria-label="Buscar conversa"
          />
        </div>

        <form className={styles.sessionForm} onSubmit={openInternalSession}>
          <label htmlFor="inbox-lead-select">Nova conversa</label>
          <select id="inbox-lead-select" name="leadId" defaultValue="">
            <option value="">Selecione um lead</option>
            {crmState.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.name}</option>
            ))}
          </select>
          <button type="submit">Abrir conversa</button>
        </form>

        <div className={styles.conversations}>
          {filteredConversations.length === 0 ? (
            <div className={styles.conversationEmpty}>
              <strong>{inboxState.conversations.length === 0 ? 'Nenhuma conversa ainda' : 'Nenhuma conversa encontrada'}</strong>
              <p>{inboxState.conversations.length === 0 ? 'Abra uma conversa com um lead ou aguarde a entrada pelo WhatsApp.' : 'Tente outro termo de busca.'}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const lead = crmState.leads.find((item) => item.id === conversation.leadId);
              const lastMessage = inboxService.getMessages(conversation.id).slice(-1)[0];
              return (
                <ConversationButton
                  key={conversation.id}
                  conversation={conversation}
                  leadName={lead?.name}
                  contact={lead?.whatsapp || lead?.email}
                  preview={lastMessage?.text || (lastMessage ? messageTypeLabel(lastMessage.type) : 'Sem mensagens ainda')}
                  selected={conversation.id === selectedConversationId}
                  onClick={() => setSelectedConversationId(conversation.id)}
                />
              );
            })
          )}
        </div>
      </aside>
      <aside className={profileVisible ? styles.contextPane : styles.contextPaneHidden} aria-label="Perfil do cliente">
        {selectedLead && selectedConversation ? (
          <>
            <header className={styles.profileHeader}>
              <div className={styles.profileAvatar} aria-hidden="true">
                {selectedLead.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.profileIdentity}>
                <span>Perfil do cliente</span>
                <h2>{selectedLead.name}</h2>
                <p>{selectedLead.whatsapp || selectedLead.email || 'Contato não informado'}</p>
              </div>
            </header>

            <section className={styles.contextSection}>
              <div className={styles.sectionHeading}>
                <h3>Funil e responsável</h3>
                <span>CRM</span>
              </div>
              <label className={styles.fieldLabel}>
                <span>Etapa do lead</span>
                <select value={selectedLead.stageId ?? ''} onChange={(event) => updateStage(event.target.value)}>
                  <option value="">Sem etapa</option>
                  {activePipelines.map((pipeline) => (
                    <optgroup key={pipeline.id} label={pipeline.name}>
                      {crmService.getStages(pipeline.id).map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {activePipelines.length === 0 && <small>Nenhum funil ativo configurado.</small>}

              <label className={styles.fieldLabel}>
                <span>Responsável</span>
                <select value={selectedLead.assigneeId ?? ''} onChange={(event) => updateAssignee(event.target.value)}>
                  <option value="">Sem responsável</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                  ))}
                </select>
              </label>
            </section>

            <section className={styles.contextSection}>
              <div className={styles.sectionHeading}>
                <h3>Tags</h3>
                <span>{selectedLead.tagIds.length}</span>
              </div>
              <div className={styles.tags}>
                {selectedLead.tagIds.length === 0 && <small>Nenhuma tag aplicada.</small>}
                {selectedLead.tagIds.map((tagId) => {
                  const tag = crmState.tags.find((item) => item.id === tagId);
                  if (!tag) return null;
                  return (
                    <button type="button" key={tag.id} onClick={() => removeTag(tag.id)} title="Remover tag">
                      {tag.name}<span>×</span>
                    </button>
                  );
                })}
              </div>
              {availableTags.length > 0 && (
                <select value="" onChange={(event) => addTag(event.target.value)}>
                  <option value="">Adicionar tag…</option>
                  {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
              )}
            </section>

            <section className={styles.contextSection}>
              <div className={styles.sectionHeading}>
                <h3>Campos personalizados</h3>
                <span>{crmState.customFieldDefinitions.filter((field) => field.active).length}</span>
              </div>
              <div className={styles.customFieldsList}>
                {crmState.customFieldDefinitions.filter((field) => field.active).length === 0 ? (
                  <small>Nenhum campo criado ainda.</small>
                ) : (
                  crmState.customFieldDefinitions.filter((field) => field.active).map((field) => (
                    <InboxCustomFieldEditor
                      key={field.id}
                      field={field}
                      value={selectedLead.customFields[field.id] ?? null}
                      onChange={(value) => updateCustomField(field.id, value)}
                    />
                  ))
                )}
              </div>

              <details className={styles.fieldCreator}>
                <summary>+ Criar campo personalizado</summary>
                <form onSubmit={createCustomFieldDefinition}>
                  <input name="name" required placeholder="Nome do campo" />
                  <select name="type" defaultValue="text">
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                    <option value="boolean">Sim/Não</option>
                    <option value="select">Lista</option>
                    <option value="multiselect">Múltipla escolha</option>
                  </select>
                  <input name="options" placeholder="Opções separadas por vírgula" />
                  <button type="submit">Criar campo</button>
                </form>
              </details>
            </section>

            <section className={styles.contextSection}>
              <div className={styles.sectionHeading}>
                <h3>Dados do lead</h3>
                <span>Origem</span>
              </div>
              <dl>
                <dt>Origem</dt><dd>{selectedLead.source || 'Não informada'}</dd>
                <dt>Interesse</dt><dd>{selectedLead.interest?.label || 'Não informado'}</dd>
                <dt>Página</dt><dd>{selectedLead.sourcePage || selectedLead.sourceAction || 'Não informada'}</dd>
                <dt>Entrada</dt><dd>{selectedLead.sourceOccurredAt ? formatRuntimeDateTime(selectedLead.sourceOccurredAt) : 'Não informada'}</dd>
              </dl>
            </section>

            <section className={styles.contextSection}>
              <div className={styles.sectionHeading}>
                <h3>Próxima ação</h3>
                <span>{leadTasks.filter((task) => task.status === 'pending').length}</span>
              </div>
              <form className={styles.taskForm} onSubmit={createTask}>
                <input name="title" required placeholder="Ex.: retornar amanhã" />
                <input name="dueAt" type="datetime-local" />
                <button type="submit">Adicionar tarefa</button>
              </form>
              {leadTasks.filter((task) => task.status === 'pending').slice(0, 3).map((task) => (
                <div className={styles.task} key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.dueAt ? formatRuntimeDateTime(task.dueAt) : 'Sem prazo'}</span>
                </div>
              ))}
            </section>

            <section className={styles.contextSection}>
              <details className={styles.automationPanel}>
                <summary>Automação do atendimento</summary>
                <div className={styles.automationGrid}>
                  <AutomationControl
                    label="SalesBot"
                    status={automationStatus.salesBot}
                    options={salesBots}
                    selectedId={selectedBotId}
                    onSelectedIdChange={setSelectedBotId}
                    onStart={() => void startSalesBot()}
                    onPause={() => void pauseSalesBot()}
                  />
                  <AutomationControl
                    label="Agente IA"
                    status={automationStatus.aiAgent}
                    options={aiAgents}
                    selectedId={selectedAgentId}
                    onSelectedIdChange={setSelectedAgentId}
                    onStart={() => void startAiAgent()}
                    onPause={() => void pauseAiAgent()}
                  />
                </div>
              </details>
            </section>
          </>
        ) : (
          <>
            <header className={styles.profileHeader}>
              <div className={styles.profileAvatar}>?</div>
              <div className={styles.profileIdentity}>
                <span>Perfil do cliente</span>
                <h2>Nenhum lead aberto</h2>
                <p>Selecione uma conversa para operar o CRM.</p>
              </div>
            </header>
            <div className={styles.profileEmpty}>
              <strong>Etapa, tags e campos ficam aqui.</strong>
              <p>Quando uma conversa for selecionada, esta lateral vira o painel operacional do lead.</p>
            </div>
          </>
        )}
      </aside>

      <main className={styles.chatPane} aria-label="Chat do atendimento">
        {selectedConversation && selectedLead ? (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.chatContact}>
                <div className={styles.chatAvatar}>{selectedLead.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{selectedLead.name}</strong>
                  <span>{selectedLead.whatsapp || selectedLead.email || 'Contato não informado'}</span>
                </div>
              </div>
              <div className={styles.chatStatusStack}>
                {automationLabel ? <span className={styles.interactionBadge}>{automationLabel}</span> : null}
                <TransportBadge conversation={selectedConversation} />
                <button className={styles.whatsappWebButton} type="button" onClick={openWhatsAppWeb}>
                  Abrir WhatsApp Web
                </button>
              </div>
            </header>

            <div className={styles.messageArea}>
              {messages.length === 0 ? (
                <div className={styles.chatEmpty}>
                  <div className={styles.chatEmptyIcon}>💬</div>
                  <strong>Chat aberto</strong>
                  <p>A conversa está pronta. As mensagens reais de WhatsApp aparecerão aqui em ordem cronológica.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.direction === 'outbound' ? styles.outboundMessage : styles.inboundMessage}
                  >
                    {message.text && (
                      <>
                        <p>{message.text}</p>
                        <button
                          type="button"
                          className={styles.copyMessage}
                          onClick={() => { void copyMessage(message.text ?? ''); }}
                        >
                          Copiar
                        </button>
                      </>
                    )}
                    {message.attachment?.url ? (
                      <a href={message.attachment.url} target="_blank" rel="noreferrer">
                        {message.attachment.name || 'Abrir arquivo'}
                      </a>
                    ) : message.attachment?.name ? (
                      <strong>{message.attachment.name}</strong>
                    ) : null}
                    <footer>
                      <span>{messageTypeLabel(message.type)}</span>
                      <small>{formatRuntimeTime(message.createdAt)}</small>
                    </footer>
                  </article>
                ))
              )}
            </div>

            <div className={styles.composerArea}>
              <div className={styles.composerTools}>
                <label className={styles.attachButton}>
                  <span>{mediaBusy ? 'Enviando…' : 'Anexar'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,video/mp4,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/octet-stream"
                    disabled={mediaBusy}
                    onChange={(event) => { void submitMedia(event); }}
                  />
                </label>
                <button
                  className={styles.composerAction}
                  type="button"
                  onClick={() => {
                    if (automationStatus.salesBot === 'running') {
                      void pauseSalesBot();
                      return;
                    }
                    if (salesBots.length === 0) {
                      setFeedback('Nenhum SalesBot ativo disponível.');
                      return;
                    }
                    if (salesBots.length === 1) {
                      setSelectedBotId(salesBots[0].id);
                      setAutomationPicker(null);
                      void startSalesBot(salesBots[0].id);
                      return;
                    }
                    setAutomationPicker((current) => current === 'salesbot' ? null : 'salesbot');
                  }}
                >
                  {automationStatus.salesBot === 'running' ? 'Pausar SalesBot' : 'Enviar SalesBot'}
                </button>
                <button
                  className={styles.composerAction}
                  type="button"
                  onClick={() => {
                    if (automationStatus.aiAgent === 'running') {
                      void pauseAiAgent();
                      return;
                    }
                    if (aiAgents.length === 0) {
                      setFeedback('Nenhum agente IA ativo disponível.');
                      return;
                    }
                    if (aiAgents.length === 1) {
                      setSelectedAgentId(aiAgents[0].id);
                      setAutomationPicker(null);
                      void startAiAgent(aiAgents[0].id);
                      return;
                    }
                    setAutomationPicker((current) => current === 'agent' ? null : 'agent');
                  }}
                >
                  {automationStatus.aiAgent === 'running' ? 'Pausar Agente IA' : 'Enviar Agente IA'}
                </button>
                <button
                  className={profileVisible ? `${styles.composerAction} ${styles.composerActionActive}` : styles.composerAction}
                  type="button"
                  onClick={() => setProfileVisible((value) => !value)}
                  aria-pressed={profileVisible}
                >
                  Perfil do cliente
                </button>
                <span className={styles.composerHint}>WhatsApp</span>
              </div>
              {automationPicker === 'salesbot' && (
                <div className={styles.automationPicker}>
                  <strong>Escolha o SalesBot</strong>
                  {salesBots.map((bot) => (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => {
                        setSelectedBotId(bot.id);
                        setAutomationPicker(null);
                        void startSalesBot(bot.id);
                      }}
                    >
                      {bot.name}
                    </button>
                  ))}
                </div>
              )}
              {automationPicker === 'agent' && (
                <div className={styles.automationPicker}>
                  <strong>Escolha o Agente IA</strong>
                  {aiAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setAutomationPicker(null);
                        void startAiAgent(agent.id);
                      }}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
              )}

              <form className={styles.composer} onSubmit={submitText}>
                <textarea
                  name="message"
                  rows={2}
                  placeholder="Digite uma mensagem…"
                />
                <button type="submit" disabled={mediaBusy}>Enviar</button>
              </form>

            </div>
          </>
        ) : (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.chatContact}>
                <div className={styles.chatAvatar}>H</div>
                <div>
                  <strong>Chat da Inbox</strong>
                  <span>Selecione uma conversa na lista à esquerda</span>
                </div>
              </div>
              <span className={styles.transportBadge}>Aguardando conversa</span>
            </header>
            <div className={styles.messageArea}>
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>💬</div>
                <strong>Selecione uma conversa</strong>
                <p>O histórico de mensagens ficará no chat e o perfil comercial pode ser aberto ou fechado pelo botão abaixo.</p>
              </div>
            </div>
            <div className={styles.composerArea}>
              <div className={styles.composer}>
                <textarea rows={2} placeholder="Selecione uma conversa para começar" disabled />
                <button type="button" disabled>Enviar</button>
              </div>
            </div>
          </>
        )}
      </main>

    </section>
  );
}

function InboxCustomFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDefinition;
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className={styles.customField}>
        <span>{field.name}</span>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={styles.customField}>
        <span>{field.name}</span>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">Não informado</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'multiselect') {
    const selectedValues = Array.isArray(value) ? value : [];
    return (
      <label className={styles.customField}>
        <span>{field.name}</span>
        <select
          multiple
          value={selectedValues}
          onChange={(event) => onChange(
            Array.from(event.target.selectedOptions, (option) => option.value),
          )}
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={styles.customField}>
      <span>{field.name}</span>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(event) => {
          if (!event.target.value) {
            onChange(null);
            return;
          }
          onChange(field.type === 'number' ? Number(event.target.value) : event.target.value);
        }}
      />
    </label>
  );
}

function ConversationButton({
  conversation,
  leadName,
  contact,
  preview,
  selected,
  onClick,
}: {
  conversation: InboxConversation;
  leadName?: string;
  contact?: string;
  preview?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? `${styles.conversationButton} ${styles.selectedConversation}` : styles.conversationButton}
      onClick={onClick}
    >
      <span className={styles.conversationAvatar} aria-hidden="true">
        {(leadName || '?').slice(0, 1).toUpperCase()}
      </span>
      <span className={styles.conversationCopy}>
        <span className={styles.conversationTopline}>
          <strong>{leadName || 'Lead não encontrado'}</strong>
          <small>{conversation.lastMessageAt ? formatRuntimeTime(conversation.lastMessageAt) : ''}</small>
        </span>
        <span className={styles.conversationPreview}>{preview || contact || conversation.channel}</span>
        <span className={styles.conversationMeta}>
          <span>{conversation.channel}</span>
          <span>{conversation.transportStatus === 'connected' ? 'Conectado' : 'Não conectado'}</span>
        </span>
      </span>
    </button>
  );
}

function TransportBadge({ conversation }: { conversation: InboxConversation }) {
  const label = conversation.transportStatus === 'connected'
    ? 'Canal conectado'
    : conversation.transportStatus === 'error'
      ? 'Erro no canal'
      : 'Canal não conectado';
  return <span className={styles.transportBadge}>{label}</span>;
}

function AutomationControl({
  label,
  status,
  options,
  selectedId,
  onSelectedIdChange,
  onStart,
  onPause,
}: {
  label: string;
  status: string;
  options: AutomationOption[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
}) {
  const running = status === 'running';
  return (
    <div className={styles.automationControl}>
      <div>
        <strong>{label}</strong>
        <span>{statusLabel(status)}</span>
      </div>
      <select
        value={selectedId}
        onChange={(event) => onSelectedIdChange(event.target.value)}
        disabled={running}
        aria-label={`Selecionar ${label}`}
      >
        <option value="">Selecione…</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      {options.length === 0 && <small>Nenhum recurso ativo configurado.</small>}
      <div>
        <button type="button" onClick={onStart} disabled={!selectedId || running}>Iniciar</button>
        <button type="button" onClick={onPause} disabled={!running}>Pausar</button>
      </div>
    </div>
  );
}

function mediaTypeFromMime(mimeType: string): Exclude<MessageType, 'text' | 'form'> | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'video/mp4') return 'video';
  if (
    mimeType === 'text/plain'
    || mimeType === 'application/pdf'
    || mimeType === 'application/msword'
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || mimeType === 'application/vnd.ms-excel'
    || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || mimeType === 'application/vnd.ms-powerpoint'
    || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    || mimeType === 'application/zip'
    || mimeType === 'application/octet-stream'
  ) return 'document';
  return null;
}

function messageTypeLabel(type: MessageType): string {
  const labels: Record<MessageType, string> = {
    text: 'Texto',
    audio: 'Áudio',
    image: 'Imagem',
    video: 'Vídeo',
    document: 'Documento',
    form: 'Formulário',
  };
  return labels[type];
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    unavailable: 'Selecione um recurso',
    idle: 'Disponível',
    running: 'Em execução',
    paused: 'Pausado',
  };
  return labels[status] ?? status;
}
