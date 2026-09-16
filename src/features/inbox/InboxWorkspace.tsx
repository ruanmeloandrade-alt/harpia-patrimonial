import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  UnavailableInboxAutomationPort,
} from '../crm/contracts';
import type {
  ConversationAutomationStatus,
  InboxAutomationPort,
} from '../crm/contracts';
import { CrmService } from '../crm/service';
import type { AssigneeOption } from '../crm/CrmWorkspace';
import { BrowserInboxRepository } from './repository';
import { InboxService } from './service';
import type { InboxConversation, InboxState, MessageType } from './domain';
import styles from './inbox.module.css';

export interface InboxWorkspaceProps {
  crmService: CrmService;
  inboxService?: InboxService;
  automationPort?: InboxAutomationPort;
  assignees?: AssigneeOption[];
}

export function InboxWorkspace({
  crmService,
  inboxService: injectedInboxService,
  automationPort: injectedAutomationPort,
  assignees = [],
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

  useEffect(() => {
    if (!selectedConversation) {
      setAutomationStatus({ salesBot: 'unavailable', aiAgent: 'unavailable' });
      return;
    }

    let active = true;
    automationPort
      .getStatus({ leadId: selectedConversation.leadId, conversationId: selectedConversation.id })
      .then((status) => {
        if (active) setAutomationStatus(status);
      })
      .catch(() => {
        if (active) setAutomationStatus({ salesBot: 'unavailable', aiAgent: 'unavailable' });
      });

    return () => {
      active = false;
    };
  }, [automationPort, selectedConversation]);

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

  const executeAutomation = async (
    action: 'startSalesBot' | 'pauseSalesBot' | 'startAiAgent' | 'pauseAiAgent',
  ) => {
    if (!selectedConversation) return;
    try {
      await automationPort[action]({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
      });
      const status = await automationPort.getStatus({
        leadId: selectedConversation.leadId,
        conversationId: selectedConversation.id,
      });
      setAutomationStatus(status);
      setFeedback('Comando executado pela integração de automação.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Integração de automação indisponível.');
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

  const activeStages = selectedLead?.pipelineId
    ? crmService.getStages(selectedLead.pipelineId)
    : [];
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
                      : 'Canal não conectado — envio bloqueado'
                  }
                  disabled={selectedConversation.transportStatus !== 'connected'}
                />
                <button type="submit" disabled={selectedConversation.transportStatus !== 'connected'}>
                  Enviar
                </button>
              </form>
              {selectedConversation.transportStatus !== 'connected' && (
                <small>Nenhuma ação nesta tela simula envio real.</small>
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
              </dl>
            </section>

            <section className={styles.contextSection}>
              <h3>Etapa</h3>
              <select value={selectedLead.stageId ?? ''} onChange={(event) => updateStage(event.target.value)}>
                <option value="">Sem etapa</option>
                {activeStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </section>

            <section className={styles.contextSection}>
              <h3>Responsável</h3>
              <select value={selectedLead.assigneeId ?? ''} onChange={(event) => updateAssignee(event.target.value)}>
                <option value="">Sem responsável</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
              {assignees.length === 0 && <small>Aguardando usuários internos da Frente01.</small>}
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
                  <label className={styles.customField} key={field.id}>
                    <span>{field.name}</span>
                    <input
                      value={String(selectedLead.customFields[field.id] ?? '')}
                      onChange={(event) => {
                        try {
                          crmService.setCustomFieldValue(selectedLead.id, field.id, event.target.value || null);
                          refresh();
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : 'Falha ao atualizar campo.');
                        }
                      }}
                    />
                  </label>
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
                  onStart={() => executeAutomation('startSalesBot')}
                  onPause={() => executeAutomation('pauseSalesBot')}
                />
                <AutomationControl
                  label="Agente IA"
                  status={automationStatus.aiAgent}
                  onStart={() => executeAutomation('startAiAgent')}
                  onPause={() => executeAutomation('pauseAiAgent')}
                />
              </div>
              <small>Comandos usam contrato da Frente05; não há motor duplicado nesta frente.</small>
            </section>
          </>
        ) : (
          <EmptyState title="Contexto CRM" description="Selecione uma conversa para operar o lead." />
        )}
      </aside>
    </section>
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
  onStart,
  onPause,
}: {
  label: string;
  status: string;
  onStart: () => void;
  onPause: () => void;
}) {
  const unavailable = status === 'unavailable';
  return (
    <div className={styles.automationControl}>
      <div>
        <strong>{label}</strong>
        <span>{statusLabel(status)}</span>
      </div>
      <div>
        <button type="button" onClick={onStart} disabled={unavailable}>Iniciar</button>
        <button type="button" onClick={onPause} disabled={unavailable}>Pausar</button>
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
    unavailable: 'Aguardando integração',
    idle: 'Disponível',
    running: 'Em execução',
    paused: 'Pausado',
  };
  return labels[status] ?? status;
}
