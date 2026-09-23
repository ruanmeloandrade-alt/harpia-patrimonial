import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  UnavailableInboxAutomationPort,
} from '../crm/contracts';
import type {
  ConversationAutomationStatus,
  InboxAutomationPort,
} from '../crm/contracts';
import type { CustomFieldDefinition, CustomFieldValue } from '../crm/domain';
import { CrmService } from '../crm/service';
import type { AssigneeOption } from '../crm/CrmWorkspace';
import { BrowserInboxRepository } from './repository';
import { InboxService } from './service';
import type { InboxConversation, InboxState, MessageType } from './domain';
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
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(
    () => inboxService.snapshot().conversations[0]?.id,
  );
  const [selectedBotByConversation, setSelectedBotByConversation] = useState<Record<string, string>>(
    () => Object.fromEntries(botSelectionMemory),
  );
  const [selectedAgentByConversation, setSelectedAgentByConversation] = useState<Record<string, string>>(
    () => Object.fromEntries(agentSelectionMemory),
  );
  const [feedback, setFeedback] = useState('');
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

  const startSalesBot = async () => {
    if (!selectedConversation) return;
    if (!selectedBotId) {
      setFeedback('Selecione um SalesBot ativo antes de iniciar.');
      return;
    }
    try {
      await automationPort.startSalesBot({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
        botId: selectedBotId,
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

  const startAiAgent = async () => {
    if (!selectedConversation) return;
    if (!selectedAgentId) {
      setFeedback('Selecione um agente IA ativo antes de iniciar.');
      return;
    }
    try {
      await automationPort.startAiAgent({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
        agentId: selectedAgentId,
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

  const activateWhatsApp = async () => {
    if (!selectedConversation || !selectedLead?.whatsapp) return;
    try {
      await inboxService.connectTransport(selectedConversation.id);
      refresh();
      setFeedback('WhatsApp ativado para esta conversa.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível ativar o WhatsApp nesta conversa.');
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

  return (
    <section className={styles.workspace} aria-label="Inbox Hárpia">
      {feedback && (
        <div className={styles.feedback} role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <aside className={styles.conversationList}>
        <header>
          <div>
            <span className={styles.kicker}>INBOX</span>
            <h1>Atendimento</h1>
          </div>
          <span className={styles.count}>{inboxState.conversations.length}</span>
        </header>

        <form className={styles.sessionForm} onSubmit={openInternalSession}>
          <label htmlFor="inbox-lead-select">Abrir contexto interno</label>
          <select id="inbox-lead-select" name="leadId" defaultValue="">
            <option value="">Selecione um lead</option>
            {crmState.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.name}</option>
            ))}
          </select>
          <button type="submit">Abrir sessão</button>
          <small>Não conecta nem envia WhatsApp.</small>
        </form>

        <div className={styles.conversations}>
          {inboxState.conversations.length === 0 ? (
            <EmptyState
              title="Nenhuma conversa"
              description="A Inbox começa vazia. Abra um contexto interno ou aguarde a integração de transporte real."
            />
          ) : (
            inboxState.conversations.map((conversation) => (
              <ConversationButton
                key={conversation.id}
                conversation={conversation}
                leadName={crmState.leads.find((lead) => lead.id === conversation.leadId)?.name}
                selected={conversation.id === selectedConversationId}
                onClick={() => setSelectedConversationId(conversation.id)}
              />
            ))
          )}
        </div>
      </aside>

      <main className={styles.chatPane}>
        {selectedConversation && selectedLead ? (
          <>
            <header className={styles.chatHeader}>
              <div>
                <strong>{selectedLead.name}</strong>
                <span>{selectedLead.whatsapp || selectedLead.email || 'Contato não informado'}</span>
              </div>
              <TransportBadge conversation={selectedConversation} />
            </header>

            <div className={styles.messageArea}>
              {messages.length === 0 ? (
                <EmptyState
                  title="Sem mensagens"
                  description="Nenhuma mensagem real foi recebida ou enviada nesta conversa."
                />
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.direction === 'outbound' ? styles.outboundMessage : styles.inboundMessage}
                  >
                    <span>{message.type}</span>
                    {message.text && <p>{message.text}</p>}
                    {message.attachment?.name && <strong>{message.attachment.name}</strong>}
                    <small>{new Date(message.createdAt).toLocaleString('pt-BR')}</small>
                  </article>
                ))
              )}
            </div>

            <div className={styles.composerArea}>
              <div className={styles.mediaTypes} aria-label="Tipos de mensagem preparados">
                {(['text', 'audio', 'image', 'video', 'document', 'form'] as MessageType[]).map((type) => (
                  <span key={type}>{messageTypeLabel(type)}</span>
                ))}
              </div>
              <form className={styles.composer} onSubmit={submitText}>
                <textarea
                  name="message"
                  rows={2}
                  placeholder={
                    selectedConversation.transportStatus === 'connected'
                      ? 'Digite uma mensagem'
                      : 'Canal não conectado. Envio bloqueado.'
                  }
                  disabled={selectedConversation.transportStatus !== 'connected'}
                />
                <button type="submit" disabled={selectedConversation.transportStatus !== 'connected'}>
                  Enviar
                </button>
              </form>
              {selectedConversation.transportStatus !== 'connected' && (
                <>
                  {selectedLead.whatsapp ? (
                    <button type="button" onClick={() => { void activateWhatsApp(); }}>
                      Ativar WhatsApp
                    </button>
                  ) : (
                    <small>Este lead não possui WhatsApp válido para iniciar o atendimento.</small>
                  )}
                  <small>Nenhuma ação nesta tela simula envio real.</small>
                </>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            title="Selecione uma conversa"
            description="O contexto comercial aparecerá aqui sem mensagens fictícias."
          />
        )}
      </main>

      <aside className={styles.contextPane}>
        {selectedLead && selectedConversation ? (
          <>
            <header className={styles.contextHeader}>
              <span>Contexto CRM</span>
              <h2>{selectedLead.name}</h2>
            </header>

            <section className={styles.contextSection}>
              <h3>Dados comerciais</h3>
              <dl>
                <dt>Origem</dt><dd>{selectedLead.source || 'Não informada'}</dd>
                <dt>Interesse</dt><dd>{selectedLead.interest?.label || 'Não informado'}</dd>
                <dt>Página/ação</dt><dd>{selectedLead.sourcePage || selectedLead.sourceAction || 'Não informada'}</dd>
                <dt>Conversão</dt><dd>{selectedLead.sourceOccurredAt ? new Date(selectedLead.sourceOccurredAt).toLocaleString('pt-BR') : 'Não informada'}</dd>
              </dl>
            </section>

            <section className={styles.contextSection}>
              <h3>Etapa</h3>
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
              {activePipelines.length === 0 && <small>Nenhum funil ativo configurado.</small>}
            </section>

            <section className={styles.contextSection}>
              <h3>Responsável</h3>
              <select value={selectedLead.assigneeId ?? ''} onChange={(event) => updateAssignee(event.target.value)}>
                <option value="">Sem responsável</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
              {assignees.length === 0 && <small>Nenhum usuário interno disponível para atribuição.</small>}
            </section>

            <section className={styles.contextSection}>
              <h3>Tags</h3>
              <div className={styles.tags}>
                {selectedLead.tagIds.map((tagId) => {
                  const tag = crmState.tags.find((item) => item.id === tagId);
                  if (!tag) return null;
                  return (
                    <button type="button" key={tag.id} onClick={() => removeTag(tag.id)}>
                      {tag.name} ×
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
              <h3>Campos personalizados</h3>
              {crmState.customFieldDefinitions.length === 0 ? (
                <small>Nenhum campo configurado.</small>
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
            </section>

            <section className={styles.contextSection}>
              <h3>Próxima ação</h3>
              <form className={styles.taskForm} onSubmit={createTask}>
                <input name="title" required placeholder="Criar tarefa" />
                <input name="dueAt" type="datetime-local" />
                <button type="submit">Adicionar</button>
              </form>
              {leadTasks.filter((task) => task.status === 'pending').slice(0, 3).map((task) => (
                <div className={styles.task} key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.dueAt ? new Date(task.dueAt).toLocaleString('pt-BR') : 'Sem prazo'}</span>
                </div>
              ))}
            </section>

            <section className={styles.contextSection}>
              <h3>Automação</h3>
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
              <small>A Inbox nunca escolhe um fluxo automaticamente. A Frente05 fornece a lista de recursos ativos; a escolha é explícita por conversa.</small>
            </section>
          </>
        ) : (
          <EmptyState title="Contexto CRM" description="Selecione uma conversa para operar o lead." />
        )}
      </aside>
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
  selected,
  onClick,
}: {
  conversation: InboxConversation;
  leadName?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? `${styles.conversationButton} ${styles.selectedConversation}` : styles.conversationButton}
      onClick={onClick}
    >
      <div>
        <strong>{leadName || 'Lead não encontrado'}</strong>
        <span>{conversation.channel}</span>
      </div>
      <small>{conversation.transportStatus === 'connected' ? 'Conectado' : 'Não conectado'}</small>
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.emptyState}>
      <span>◌</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
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
