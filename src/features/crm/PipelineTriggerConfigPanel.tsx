import {
  CSSProperties,
  FormEvent,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { PipelineTriggerAction, PipelineTriggerEvent } from '../automations/types';
import {
  findPipelineActionCatalogItem,
  isWebhookPipelineAction,
  pipelineActionLabel,
} from '../automations/pipelineActionCatalog';
import styles from './crm.module.css';

type NamedOption = { id: string; name: string; status?: string };
type FieldOption = { id: string; name: string; active: boolean; type?: string };
type StageOption = { id: string; name: string };
type CatalogOption = { id: string; label: string };
type AssigneeOption = { id: string; name: string };

const executeOptions: Array<{ value: PipelineTriggerEvent; label: string }> = [
  { value: 'created_or_moved', label: 'Assim que o lead for criado ou movido para esta etapa' },
  { value: 'created', label: 'Assim que o lead for criado nesta etapa' },
  { value: 'enter', label: 'Assim que o lead for movido para esta etapa' },
  { value: 'time', label: 'Depois de um tempo parado nesta etapa' },
  { value: 'assignee_changed', label: 'Quando o responsável pelo lead mudar' },
  { value: 'tag_added', label: 'Quando uma tag for adicionada ao lead' },
  { value: 'field_changed', label: 'Quando um campo personalizado for atualizado' },
  { value: 'hours_before_datetime', label: 'Horas antes de um campo de data/hora' },
  { value: 'daily_time', label: 'Todo dia em um horário fixo' },
  { value: 'specific_datetime', label: 'Em uma data e hora específicas' },
];

const standardExecuteValues = new Set(executeOptions.map((item) => item.value));

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" />
    </svg>
  );
}

export function PipelineTriggerConfigPanel({
  stageId,
  stageName,
  editing,
  triggerCatalogSelection,
  triggerEvent,
  triggerValue,
  triggerDurationAmount,
  triggerDurationUnit,
  triggerAction,
  triggerResourceId,
  triggerTargetStageId,
  triggerActionConfig,
  stages,
  salesBots,
  aiAgents,
  tags,
  fields,
  assignees,
  catalogChoices,
  onEventChange,
  onValueChange,
  onDurationAmountChange,
  onDurationUnitChange,
  onResourceChange,
  onTargetStageChange,
  onConfigChange,
  onSubmit,
  onCancel,
  onDelete,
  onEditSalesBot,
  onCreateSalesBot,
}: {
  stageId: string;
  stageName: string;
  editing: boolean;
  triggerCatalogSelection: string;
  triggerEvent: PipelineTriggerEvent;
  triggerValue: string;
  triggerDurationAmount: string;
  triggerDurationUnit: 'm' | 'h' | 'd';
  triggerAction: PipelineTriggerAction;
  triggerResourceId: string;
  triggerTargetStageId: string;
  triggerActionConfig: Record<string, string>;
  stages: StageOption[];
  salesBots: NamedOption[];
  aiAgents: NamedOption[];
  tags: NamedOption[];
  fields: FieldOption[];
  assignees: AssigneeOption[];
  catalogChoices: CatalogOption[];
  onEventChange: (value: PipelineTriggerEvent) => void;
  onValueChange: (value: string) => void;
  onDurationAmountChange: (value: string) => void;
  onDurationUnitChange: (value: 'm' | 'h' | 'd') => void;
  onResourceChange: (value: string) => void;
  onTargetStageChange: (value: string) => void;
  onConfigChange: (key: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditSalesBot: () => void;
  onCreateSalesBot: () => void;
}) {
  const [position, setPosition] = useState<CSSProperties>({ top: 48, left: 180 });
  const [conditionOpen, setConditionOpen] = useState(
    Boolean(triggerActionConfig.conditionField || triggerActionConfig.conditionValue),
  );

  useLayoutEffect(() => {
    const update = () => {
      const column = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-id]'))
        .find((item) => item.dataset.stageId === stageId);
      const width = 320;
      const gap = 8;
      if (!column) {
        setPosition({
          top: 48,
          left: Math.max(gap, Math.min(180, window.innerWidth - width - gap)),
        });
        return;
      }

      const rect = column.getBoundingClientRect();
      const preferredLeft = rect.left + Math.min(180, Math.max(110, rect.width * .55));
      const left = Math.max(gap, Math.min(preferredLeft, window.innerWidth - width - gap));
      const top = Math.max(42, Math.min(rect.top + 8, window.innerHeight - 160));
      setPosition({ top, left });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [stageId]);

  const selectedCatalog = findPipelineActionCatalogItem(triggerCatalogSelection);
  const selectedBot = salesBots.find((bot) => bot.id === triggerResourceId);
  const selectedAgent = aiAgents.find((agent) => agent.id === triggerResourceId);
  const dateFields = useMemo(
    () => fields.filter((field) => field.active && (field.type === 'date' || field.type === 'datetime')),
    [fields],
  );
  const isInboundWebhook = triggerEvent === 'inbound_webhook';
  const isMessagingAction = triggerAction === 'salesbot';

  const setEvent = (value: PipelineTriggerEvent) => {
    onEventChange(value);
    if (value !== 'time') onValueChange('');
  };

  const renderTimingDetail = () => {
    if (triggerEvent === 'time') {
      return (
        <div className={styles.triggerConfigInlinePair}>
          <label>
            Tempo
            <input
              type="number"
              min="1"
              value={triggerDurationAmount}
              onChange={(event) => onDurationAmountChange(event.target.value)}
            />
          </label>
          <label>
            Unidade
            <select value={triggerDurationUnit} onChange={(event) => onDurationUnitChange(event.target.value as 'm' | 'h' | 'd')}>
              <option value="m">Minutos</option>
              <option value="h">Horas</option>
              <option value="d">Dias</option>
            </select>
          </label>
        </div>
      );
    }

    if (triggerEvent === 'tag_added') {
      return (
        <label className={styles.triggerConfigDetailField}>
          Tag
          <select value={triggerValue} onChange={(event) => onValueChange(event.target.value)}>
            <option value="">Qualquer tag</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
      );
    }

    if (triggerEvent === 'field_changed') {
      return (
        <label className={styles.triggerConfigDetailField}>
          Campo personalizado
          <select value={triggerValue} onChange={(event) => onValueChange(event.target.value)}>
            <option value="">Qualquer campo</option>
            {fields.filter((field) => field.active).map((field) => (
              <option key={field.id} value={field.id}>{field.name}</option>
            ))}
          </select>
        </label>
      );
    }

    if (triggerEvent === 'hours_before_datetime') {
      return (
        <div className={styles.triggerConfigInlinePair}>
          <label>
            Campo de data/hora
            <select
              value={triggerActionConfig.scheduleFieldId ?? ''}
              onChange={(event) => onConfigChange('scheduleFieldId', event.target.value)}
            >
              <option value="">Selecione o campo</option>
              {dateFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
          <label>
            Horas antes
            <input
              type="number"
              min="1"
              value={triggerActionConfig.scheduleHours ?? '1'}
              onChange={(event) => onConfigChange('scheduleHours', event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (triggerEvent === 'daily_time') {
      return (
        <label className={styles.triggerConfigDetailField}>
          Horário
          <input
            type="time"
            value={triggerActionConfig.scheduleTime ?? '09:00'}
            onChange={(event) => onConfigChange('scheduleTime', event.target.value)}
          />
        </label>
      );
    }

    if (triggerEvent === 'specific_datetime') {
      return (
        <label className={styles.triggerConfigDetailField}>
          Data e hora
          <input
            type="datetime-local"
            value={triggerActionConfig.scheduleDateTime ?? ''}
            onChange={(event) => onConfigChange('scheduleDateTime', event.target.value)}
          />
        </label>
      );
    }

    return null;
  };

  const renderActionConfiguration = () => {
    if (isInboundWebhook) {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Webhook de entrada</strong>
          <code>{String(import.meta.env.VITE_SUPABASE_URL ?? '') + '/functions/v1/automation-inbound-webhook'}</code>
          <label>
            Token
            <input value={triggerValue} readOnly />
          </label>
        </div>
      );
    }

    if (triggerAction === 'salesbot') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <div className={styles.triggerConfigActionHead}>
            <strong>Escolher SalesBot</strong>
            <div>
              <button type="button" onClick={onEditSalesBot}>✎ <span>Editar</span></button>
              <button type="button" onClick={onCreateSalesBot}>＋ <span>Criar</span></button>
            </div>
          </div>
          <select
            className={styles.triggerConfigResourceSelect}
            value={triggerResourceId}
            onChange={(event) => onResourceChange(event.target.value)}
            required
          >
            <option value="">Selecione o SalesBot</option>
            {salesBots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}{bot.status === 'active' ? '' : ' · inativo'}</option>
            ))}
          </select>
          {selectedBot ? <small className={styles.triggerConfigSelectedHint}>{selectedBot.name}</small> : null}
        </div>
      );
    }

    if (triggerAction === 'ai' || triggerAction === 'pause_ai') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>{triggerAction === 'ai' ? 'Escolher Agente IA' : 'Pausar Agente IA'}</strong>
          <select value={triggerResourceId} onChange={(event) => onResourceChange(event.target.value)} required={triggerAction === 'ai'}>
            <option value="">{triggerAction === 'ai' ? 'Selecione o agente' : 'Qualquer agente IA ativo no lead'}</option>
            {aiAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          {selectedAgent ? <small className={styles.triggerConfigSelectedHint}>{selectedAgent.name}</small> : null}
        </div>
      );
    }

    if (triggerAction === 'move_stage') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Mudar etapa do lead</strong>
          <select value={triggerTargetStageId} onChange={(event) => onTargetStageChange(event.target.value)} required>
            <option value="">Selecione a etapa destino</option>
            {stages.filter((stage) => stage.id !== stageId).map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>
        </div>
      );
    }

    if (isWebhookPipelineAction(triggerAction)) {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>{selectedCatalog?.label ?? 'Enviar webhook'}</strong>
          <label>
            URL HTTPS
            <input
              type="url"
              value={triggerActionConfig.url ?? ''}
              onChange={(event) => onConfigChange('url', event.target.value)}
              placeholder="https://..."
              required
            />
          </label>
          <label>
            Método
            <select value={triggerActionConfig.method ?? 'POST'} onChange={(event) => onConfigChange('method', event.target.value)}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>
        </div>
      );
    }

    if (triggerAction === 'internal_message') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Enviar mensagem interna</strong>
          <textarea
            value={triggerActionConfig.message ?? ''}
            onChange={(event) => onConfigChange('message', event.target.value)}
            placeholder="Mensagem para o time"
            required
          />
        </div>
      );
    }

    if (triggerAction === 'duplicate_lead') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Duplicar lead</strong>
          <select value={triggerActionConfig.stageId ?? ''} onChange={(event) => onConfigChange('stageId', event.target.value)}>
            <option value="">Mesma etapa do lead</option>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
          </select>
        </div>
      );
    }

    if (triggerAction === 'create_task') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Adicionar tarefa</strong>
          <input
            value={triggerActionConfig.title ?? ''}
            onChange={(event) => onConfigChange('title', event.target.value)}
            placeholder="Título da tarefa"
            required
          />
          <input
            type="datetime-local"
            value={triggerActionConfig.dueAt ?? ''}
            onChange={(event) => onConfigChange('dueAt', event.target.value)}
          />
        </div>
      );
    }

    if (triggerAction === 'complete_tasks' || triggerAction === 'delete_tasks') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>{triggerAction === 'complete_tasks' ? 'Concluir tarefas' : 'Excluir tarefas'}</strong>
          <input
            value={triggerActionConfig.title ?? ''}
            onChange={(event) => onConfigChange('title', event.target.value)}
            placeholder="Vazio para aplicar a todas"
          />
        </div>
      );
    }

    if (triggerAction === 'tags') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Tags</strong>
          <select value={triggerActionConfig.operation ?? 'add'} onChange={(event) => onConfigChange('operation', event.target.value)}>
            <option value="add">Adicionar</option>
            <option value="remove">Remover</option>
            <option value="replace">Substituir todas por esta tag</option>
          </select>
          <select value={triggerActionConfig.tagId ?? ''} onChange={(event) => onConfigChange('tagId', event.target.value)} required>
            <option value="">Selecione a tag</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </div>
      );
    }

    if (triggerAction === 'assign_owner') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Alterar usuário do lead</strong>
          <select value={triggerActionConfig.userId ?? ''} onChange={(event) => onConfigChange('userId', event.target.value)} required>
            <option value="">Selecione o usuário</option>
            {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
          </select>
        </div>
      );
    }

    if (triggerAction === 'update_field') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Alterar campo</strong>
          <select value={triggerActionConfig.fieldId ?? ''} onChange={(event) => onConfigChange('fieldId', event.target.value)} required>
            <option value="">Selecione o campo</option>
            <optgroup label="Campos padrão">
              <option value="lead.name">Nome</option>
              <option value="lead.email">E-mail</option>
              <option value="lead.whatsapp">WhatsApp</option>
              <option value="lead.source">Origem</option>
              <option value="lead.notes">Observações</option>
            </optgroup>
            <optgroup label="Campos personalizados">
              {fields.filter((field) => field.active).map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </optgroup>
          </select>
          <input
            value={triggerActionConfig.value ?? ''}
            onChange={(event) => onConfigChange('value', event.target.value)}
            placeholder="Novo valor"
          />
        </div>
      );
    }

    if (triggerAction === 'delete_lead') {
      return (
        <div className={[styles.triggerConfigActionBox, styles.triggerConfigDanger].join(' ')}>
          <strong>Excluir lead</strong>
          <small>O lead será removido permanentemente quando o gatilho for executado.</small>
        </div>
      );
    }

    if (triggerAction === 'generate_form') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Gerar formulário</strong>
          <input value={triggerActionConfig.title ?? ''} onChange={(event) => onConfigChange('title', event.target.value)} placeholder="Nome do formulário" required />
          <input value={triggerActionConfig.fields ?? ''} onChange={(event) => onConfigChange('fields', event.target.value)} placeholder="nome, telefone, orçamento" />
        </div>
      );
    }

    if (triggerAction === 'delete_files') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Deletar arquivos</strong>
          <input
            value={triggerActionConfig.classification ?? ''}
            onChange={(event) => onConfigChange('classification', event.target.value)}
            placeholder="Classificação, vazio para todos"
          />
        </div>
      );
    }

    if (triggerAction === 'link_product') {
      return (
        <div className={styles.triggerConfigActionBox}>
          <strong>Vincular produto</strong>
          {catalogChoices.length ? (
            <select value={triggerActionConfig.catalogItemId ?? ''} onChange={(event) => onConfigChange('catalogItemId', event.target.value)} required>
              <option value="">Selecione o produto</option>
              {catalogChoices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          ) : (
            <input value={triggerActionConfig.catalogItemId ?? ''} onChange={(event) => onConfigChange('catalogItemId', event.target.value)} placeholder="ID do produto" required />
          )}
          <select value={triggerActionConfig.relationship ?? 'interest'} onChange={(event) => onConfigChange('relationship', event.target.value)}>
            <option value="interest">Interesse</option>
            <option value="quoted">Cotado</option>
            <option value="purchased">Comprado</option>
          </select>
        </div>
      );
    }

    return (
      <div className={styles.triggerConfigActionBox}>
        <strong>{pipelineActionLabel(triggerAction)}</strong>
      </div>
    );
  };

  const legacyEvent = !isInboundWebhook && !standardExecuteValues.has(triggerEvent);

  return (
    <form
      className={styles.triggerConfigPanel}
      style={position}
      onSubmit={onSubmit}
      aria-label={'Configurar gatilho em ' + stageName}
    >
      <div className={styles.triggerConfigScroll}>
        <label className={styles.triggerConfigField}>
          <span>Fonte</span>
          <select
            value={triggerActionConfig.sourceId ?? ''}
            onChange={(event) => onConfigChange('sourceId', event.target.value)}
          >
            <option value="">Qualquer fonte conectada</option>
          </select>
        </label>

        <button
          type="button"
          className={styles.triggerConditionAdd}
          onClick={() => setConditionOpen((value) => !value)}
        >
          ＋ {conditionOpen ? 'Ocultar condição' : 'Adicionar uma condição'}
        </button>

        {conditionOpen ? (
          <div className={styles.triggerConditionEditor}>
            <select
              value={triggerActionConfig.conditionField ?? ''}
              onChange={(event) => onConfigChange('conditionField', event.target.value)}
            >
              <option value="">Escolha um campo</option>
              <option value="lead.source">Fonte do lead</option>
              <option value="lead.assigneeId">Responsável</option>
              <option value="lead.email">E-mail</option>
              <option value="lead.whatsapp">WhatsApp</option>
            </select>
            <select
              value={triggerActionConfig.conditionOperator ?? 'equals'}
              onChange={(event) => onConfigChange('conditionOperator', event.target.value)}
            >
              <option value="equals">é igual a</option>
              <option value="not_equals">é diferente de</option>
              <option value="contains">contém</option>
            </select>
            <input
              value={triggerActionConfig.conditionValue ?? ''}
              onChange={(event) => onConfigChange('conditionValue', event.target.value)}
              placeholder="Valor"
            />
          </div>
        ) : (
          <em className={styles.triggerConfigHint}>Sem condições, dispara sempre que o lead cair nesta etapa.</em>
        )}

        {!isInboundWebhook ? (
          <>
            <span className={styles.triggerConfigSectionLabel}>EXECUTAR</span>
            <div className={styles.triggerExecuteList}>
              {legacyEvent ? (
                <label className={[styles.triggerExecuteOption, styles.triggerExecuteOptionSelected].join(' ')}>
                  <input type="radio" checked readOnly />
                  <span>Gatilho existente: {triggerEvent}</span>
                </label>
              ) : null}

              {executeOptions.map((option) => {
                const selected = triggerEvent === option.value;
                return (
                  <label
                    key={option.value}
                    className={selected
                      ? [styles.triggerExecuteOption, styles.triggerExecuteOptionSelected].join(' ')
                      : styles.triggerExecuteOption}
                  >
                    <input
                      type="radio"
                      name="pipeline-execute-event"
                      value={option.value}
                      checked={selected}
                      onChange={() => setEvent(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            {renderTimingDetail()}

            {isMessagingAction ? (
              <p className={styles.triggerMessageHint}>
                A mensagem será enviada aos contatos que se comunicaram com você nos aplicativos de mensagens que você integrou.
              </p>
            ) : null}

            <label className={styles.triggerActiveSelect}>
              <select
                value={triggerActionConfig.activeMode ?? 'always'}
                onChange={(event) => onConfigChange('activeMode', event.target.value)}
              >
                <option value="always">Ativo: sempre</option>
                <option value="business_hours">Ativo: apenas em horário comercial</option>
                <option value="custom">Ativo: personalizado</option>
              </select>
            </label>

            {isMessagingAction ? (
              <div className={styles.triggerToggleRow}>
                <div>
                  <strong>Deixar mensagem sem resposta</strong>
                  <small>As mensagens às quais o bot responde serão marcadas como não respondidas.</small>
                </div>
                <label className={styles.triggerSwitch}>
                  <input
                    type="checkbox"
                    checked={triggerActionConfig.leaveUnanswered === '1'}
                    onChange={(event) => onConfigChange('leaveUnanswered', event.target.checked ? '1' : '0')}
                  />
                  <span />
                </label>
              </div>
            ) : null}
          </>
        ) : null}

        {renderActionConfiguration()}

        {!isInboundWebhook ? (
          <label className={styles.triggerApplyExisting}>
            <input
              type="checkbox"
              checked={triggerActionConfig.applyExisting === '1'}
              onChange={(event) => onConfigChange('applyExisting', event.target.checked ? '1' : '0')}
            />
            <span>Aplicar o gatilho a todos os leads já nesta etapa</span>
          </label>
        ) : null}
      </div>

      <footer className={styles.triggerConfigFooter}>
        <button className={styles.triggerConfigReady} type="submit">Pronto</button>
        <button className={styles.triggerConfigCancel} type="button" onClick={onCancel}>Cancelar</button>
        <button className={styles.triggerConfigDelete} type="button" onClick={onDelete} aria-label={editing ? 'Excluir gatilho' : 'Descartar gatilho'}>
          <TrashIcon />
        </button>
      </footer>
    </form>
  );
}
