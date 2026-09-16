import { useEffect, useState } from 'react';
import { CRM_UPDATED_EVENT } from './repository';
import { CrmService } from './service';
import type { CrmState } from './domain';
import styles from './crm.module.css';

export interface UnassignedLeadsQueueProps {
  service: CrmService;
  onChanged?: () => void;
}

export function UnassignedLeadsQueue({ service, onChanged }: UnassignedLeadsQueueProps) {
  const [state, setState] = useState<CrmState>(() => service.snapshot());
  const [feedback, setFeedback] = useState('');

  const refresh = () => setState(service.snapshot());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = () => refresh();
    window.addEventListener(CRM_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CRM_UPDATED_EVENT, handleUpdate);
  }, [service]);

  const unassigned = state.leads.filter((lead) => !lead.stageId);
  if (unassigned.length === 0) return null;

  const moveToStage = (leadId: string, stageId: string) => {
    if (!stageId) return;
    try {
      service.moveLead(leadId, stageId);
      refresh();
      onChanged?.();
      setFeedback('Lead encaminhado para a etapa selecionada.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível classificar o lead.');
    }
  };

  return (
    <section className={styles.creationGrid} style={{ marginTop: 18, gridTemplateColumns: '1fr' }} aria-label="Leads sem etapa">
      <div className={styles.cardForm}>
        <div>
          <strong>Leads sem etapa</strong>
          <span>Conversões novas e leads ainda não classificados permanecem visíveis até entrarem em uma etapa real.</span>
        </div>

        {feedback && <div className={styles.feedback} role="status">{feedback}</div>}

        <div className={styles.leadList}>
          {unassigned.map((lead) => (
            <article key={lead.id} className={styles.leadCard}>
              <strong>{lead.name}</strong>
              <span>{lead.interest?.label || lead.source || 'Sem contexto informado'}</span>
              <small>{lead.whatsapp || lead.email || 'Contato não informado'}</small>
              <select
                defaultValue=""
                aria-label={`Definir etapa de ${lead.name}`}
                onChange={(event) => moveToStage(lead.id, event.target.value)}
              >
                <option value="">Encaminhar para etapa…</option>
                {state.pipelines.map((pipeline) => (
                  <optgroup key={pipeline.id} label={pipeline.name}>
                    {state.stages
                      .filter((stage) => stage.pipelineId === pipeline.id)
                      .sort((a, b) => a.position - b.position)
                      .map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </article>
          ))}
        </div>

        {state.stages.length === 0 && (
          <small>Crie ao menos uma etapa em um funil para classificar estes leads.</small>
        )}
      </div>
    </section>
  );
}
