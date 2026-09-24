import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { AssigneeOption } from '../crm/CrmWorkspace';
import {
  CalendarItem,
  CalendarItemKind,
  createCalendarItem,
  deleteCalendarItem,
  GoogleCalendarConnection,
  listCalendarItems,
  loadGoogleCalendarConnection,
  requestGoogleCalendarSync,
  setCalendarItemStatus,
  subscribeCalendarItems,
} from './repository';
import './calendar.css';

interface CalendarWorkspaceProps {
  assignees: AssigneeOption[];
  canManage: boolean;
}

type CalendarView = 'month' | 'week' | 'day';

interface Draft {
  kind: CalendarItemKind;
  title: string;
  date: string;
  time: string;
  duration: string;
  assigneeId: string;
  description: string;
  guestEmails: string;
  location: string;
  syncToGoogle: boolean;
}

const durations = [15, 30, 45, 60, 90, 120, 180];
const hours = Array.from({ length: 15 }, (_, index) => index + 7);

function localDateInput(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function weekStart(value: Date) {
  const start = dayStart(value);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthGridStart(value: Date) {
  const start = monthStart(value);
  start.setDate(1 - start.getDay());
  return start;
}

function viewBounds(view: CalendarView, cursor: Date) {
  if (view === 'day') {
    const start = dayStart(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (view === 'week') {
    const start = weekStart(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = monthGridStart(cursor);
  const end = new Date(start);
  end.setDate(end.getDate() + 42);
  return { start, end };
}

function initialDraft(kind: CalendarItemKind = 'task', date = new Date(), time = '09:00'): Draft {
  return {
    kind,
    title: '',
    date: localDateInput(date),
    time,
    duration: kind === 'meeting' ? '60' : '30',
    assigneeId: '',
    description: '',
    guestEmails: '',
    location: '',
    syncToGoogle: kind === 'meeting',
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPeriodTitle(view: CalendarView, cursor: Date) {
  if (view === 'day') {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(cursor);
  }

  if (view === 'week') {
    const start = weekStart(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      const tail = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(end);
      return `${start.getDate()} a ${end.getDate()} de ${tail}`;
    }

    const left = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start);
    const right = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(end);
    return `${left} a ${right}`;
  }

  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthStart(cursor));
}

function durationLabel(item: CalendarItem) {
  const minutes = Math.max(1, Math.round((new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

function parseGuestEmails(value: string) {
  return [...new Set(value
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean))];
}

function connectionLabel(connection: GoogleCalendarConnection | null) {
  if (!connection || connection.status !== 'connected' || !connection.oauthReady) return 'Google Calendar não conectado';
  return connection.accountLabel ? `Google: ${connection.accountLabel}` : 'Google Calendar conectado';
}

export function CalendarWorkspace({ assignees, canManage }: CalendarWorkspaceProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => initialDraft());

  const assigneeNames = useMemo(
    () => new Map(assignees.map((assignee) => [assignee.id, assignee.name])),
    [assignees],
  );

  const bounds = useMemo(() => viewBounds(view, cursor), [view, cursor]);

  const refresh = useCallback(async () => {
    try {
      const [calendarItems, google] = await Promise.all([
        listCalendarItems(bounds.start.toISOString(), bounds.end.toISOString()),
        loadGoogleCalendarConnection(),
      ]);
      setItems(calendarItems);
      setConnection(google);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, [bounds]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    return subscribeCalendarItems(() => { void refresh(); });
  }, [refresh]);

  const monthDays = useMemo(() => {
    const start = monthGridStart(cursor);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const visibleDays = useMemo(() => {
    if (view === 'day') return [dayStart(cursor)];
    if (view === 'week') {
      const start = weekStart(cursor);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
      });
    }
    return monthDays;
  }, [view, cursor, monthDays]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = localDateInput(new Date(item.startAt));
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }
    return map;
  }, [items]);

  const periodItems = useMemo(
    () => [...items].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [items],
  );

  const agendaItems = useMemo(
    () => periodItems.filter((item) => item.status !== 'cancelled').slice(0, 10),
    [periodItems],
  );

  function openCreate(kind: CalendarItemKind, date = new Date(), time = '09:00') {
    setDraft(initialDraft(kind, date, time));
    setNotice('');
    setError('');
    setFormOpen(true);
  }

  function shiftPeriod(direction: number) {
    setCursor((current) => {
      if (view === 'month') return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      const next = new Date(current);
      next.setDate(next.getDate() + direction * (view === 'week' ? 7 : 1));
      return next;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || busy) return;

    const minutes = Number(draft.duration);
    const start = new Date(`${draft.date}T${draft.time}:00`);
    if (!draft.title.trim() || Number.isNaN(start.getTime()) || !Number.isFinite(minutes) || minutes <= 0) {
      setError('Preencha título, data, hora e duração.');
      return;
    }

    const end = new Date(start.getTime() + minutes * 60_000);
    const guestEmails = parseGuestEmails(draft.guestEmails);
    const wantsGoogle = draft.syncToGoogle;
    const googleReady = connection?.status === 'connected' && connection.oauthReady;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const item = await createCalendarItem({
        kind: draft.kind,
        title: draft.title,
        description: draft.description,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        assigneeId: draft.assigneeId || undefined,
        assigneeLabel: draft.assigneeId ? assigneeNames.get(draft.assigneeId) : undefined,
        guestEmails,
        location: draft.location,
        syncToGoogle: wantsGoogle,
        googleSyncStatus: wantsGoogle ? (googleReady ? 'pending' : 'not_connected') : 'not_requested',
      });

      if (wantsGoogle && googleReady) {
        try {
          await requestGoogleCalendarSync(item.id);
          setNotice('Compromisso salvo. Sincronização com Google Calendar solicitada.');
        } catch {
          setNotice('Compromisso salvo na Hárpia. A sincronização com Google ainda precisa ser concluída.');
        }
      } else if (wantsGoogle) {
        setNotice('Compromisso salvo na Hárpia. Ele ficará aguardando a conexão do Google Calendar.');
      } else {
        setNotice('Compromisso salvo no calendário da Hárpia.');
      }

      setFormOpen(false);
      setDraft(initialDraft());
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o compromisso.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(item: CalendarItem) {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      await setCalendarItemStatus(item.id, item.status === 'completed' ? 'open' : 'completed');
      await refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o compromisso.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CalendarItem) {
    if (!canManage || busy) return;
    if (!window.confirm(`Excluir “${item.title}” do calendário?`)) return;
    setBusy(true);
    try {
      await deleteCalendarItem(item.id);
      setNotice('Compromisso removido.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o compromisso.');
    } finally {
      setBusy(false);
    }
  }

  function ownerLabel(item: CalendarItem) {
    return item.assigneeId
      ? assigneeNames.get(item.assigneeId) ?? item.assigneeLabel ?? 'Responsável não encontrado'
      : item.assigneeLabel ?? 'Sem responsável';
  }

  function renderTimeEvent(item: CalendarItem) {
    return (
      <div
        key={item.id}
        className={`calendar-time-event calendar-time-event--${item.kind}${item.status === 'completed' ? ' calendar-time-event--done' : ''}`}
      >
        <strong>{item.title}</strong>
        <span>{formatTime(item.startAt)} até {formatTime(item.endAt)} · {durationLabel(item)}</span>
        <small>{ownerLabel(item)}</small>
      </div>
    );
  }

  return (
    <section className="calendar-workspace">
      <header className="calendar-header">
        <div>
          <span className="calendar-kicker">Agenda operacional</span>
          <h1>Calendário</h1>
          <p>Tarefas internas, reuniões, responsáveis, duração e preparação para Google Calendar e Google Meet.</p>
        </div>
        <div className="calendar-header-actions">
          <a className={connection?.status === 'connected' && connection.oauthReady ? 'calendar-google calendar-google--ready' : 'calendar-google'} href="/interno/integracoes">
            <span className="calendar-google-dot" />
            {connectionLabel(connection)}
          </a>
          {canManage ? <button className="button button-ghost-dark" type="button" onClick={() => openCreate('meeting')}>+ Nova reunião</button> : null}
          {canManage ? <button className="button button-primary" type="button" onClick={() => openCreate('task')}>+ Nova tarefa</button> : null}
        </div>
      </header>

      {!canManage ? <div className="calendar-readonly">Modo somente leitura. Para criar ou alterar compromissos, é necessária permissão de gestão do calendário.</div> : null}
      {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
      {notice ? <div className="alert alert-success" role="status">{notice}</div> : null}

      <div className="calendar-viewbar">
        <div className="calendar-view-switch" role="group" aria-label="Visualização do calendário">
          {([
            ['month', 'Mês'],
            ['week', 'Semana'],
            ['day', 'Dia'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={view === value ? 'active' : ''}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span>{view === 'month' ? 'Visão mensal' : view === 'week' ? 'Visão semanal com horários' : 'Visão diária com horários'}</span>
      </div>

      <div className="calendar-layout">
        <div className="calendar-board">
          <div className="calendar-toolbar">
            <div className="calendar-toolbar-nav">
              <button type="button" aria-label="Período anterior" onClick={() => shiftPeriod(-1)}>‹</button>
              <button type="button" onClick={() => setCursor(new Date())}>Hoje</button>
              <button type="button" aria-label="Próximo período" onClick={() => shiftPeriod(1)}>›</button>
            </div>
            <strong>{formatPeriodTitle(view, cursor)}</strong>
            <span>{loading ? 'Carregando...' : `${items.length} compromisso${items.length === 1 ? '' : 's'}`}</span>
          </div>

          {view === 'month' ? (
            <>
              <div className="calendar-weekdays" aria-hidden="true">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid calendar-grid--month">
                {monthDays.map((day) => {
                  const key = localDateInput(day);
                  const dayItems = byDay.get(key) ?? [];
                  const currentMonth = day.getMonth() === cursor.getMonth();
                  const today = key === localDateInput();

                  return (
                    <div
                      key={key}
                      className={`calendar-day${currentMonth ? '' : ' calendar-day--muted'}${today ? ' calendar-day--today' : ''}`}
                      onDoubleClick={() => canManage && openCreate('task', day)}
                    >
                      <button className="calendar-day-number" type="button" onClick={() => canManage && openCreate('task', day)} aria-label={`Criar tarefa em ${key}`}>
                        {day.getDate()}
                      </button>
                      <div className="calendar-day-items">
                        {dayItems.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className={`calendar-chip calendar-chip--${item.kind}${item.status === 'completed' ? ' calendar-chip--done' : ''}`}
                            title={`${item.title} · ${formatTime(item.startAt)} · ${durationLabel(item)}`}
                          >
                            <span>{formatTime(item.startAt)}</span>
                            <b>{item.title}</b>
                            {item.kind === 'meeting' ? <em>Meet</em> : null}
                          </div>
                        ))}
                        {dayItems.length > 4 ? <span className="calendar-more">+{dayItems.length - 4} compromissos</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={`calendar-time-view calendar-time-view--${view}`}>
              <div className={`calendar-time-head calendar-time-head--${view}`}>
                <div className="calendar-time-blank" />
                {visibleDays.map((day) => {
                  const key = localDateInput(day);
                  return (
                    <div key={key} className={`calendar-time-day${key === localDateInput() ? ' calendar-time-day--today' : ''}`}>
                      <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day).replace('.', '')}</span>
                      <strong>{day.getDate()}</strong>
                    </div>
                  );
                })}
              </div>

              <div className={`calendar-time-body calendar-time-body--${view}`}>
                {hours.map((hour) => (
                  <div key={hour} className={`calendar-hour-row calendar-hour-row--${view}`}>
                    <div className="calendar-hour-label">{String(hour).padStart(2, '0')}:00</div>
                    {visibleDays.map((day) => {
                      const key = localDateInput(day);
                      const cellItems = (byDay.get(key) ?? []).filter((item) => new Date(item.startAt).getHours() === hour);
                      return (
                        <div
                          key={key}
                          className={`calendar-hour-cell${key === localDateInput() ? ' calendar-hour-cell--today' : ''}`}
                          onDoubleClick={() => canManage && openCreate('task', day, `${String(hour).padStart(2, '0')}:00`)}
                        >
                          {cellItems.map(renderTimeEvent)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="calendar-agenda">
          <div className="calendar-agenda-head">
            <div>
              <span>Período atual</span>
              <h2>Agenda</h2>
            </div>
            <span>{agendaItems.length}</span>
          </div>

          <div className="calendar-agenda-list">
            {agendaItems.length ? agendaItems.map((item) => (
              <article key={item.id} className={item.status === 'completed' ? 'calendar-agenda-item calendar-agenda-item--done' : 'calendar-agenda-item'}>
                <div className="calendar-agenda-date">
                  <strong>{new Date(item.startAt).getDate()}</strong>
                  <span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(item.startAt)).replace('.', '')}</span>
                </div>
                <div className="calendar-agenda-copy">
                  <div className="calendar-agenda-tags">
                    <span>{item.kind === 'meeting' ? 'Reunião' : 'Tarefa'}</span>
                    {item.syncToGoogle ? <span className={item.googleSyncStatus === 'synced' ? 'is-ready' : ''}>Google</span> : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{formatDateTime(item.startAt)} · {durationLabel(item)}</p>
                  <small>{ownerLabel(item)}</small>
                  {item.googleMeetUrl ? <a href={item.googleMeetUrl} target="_blank" rel="noreferrer">Entrar no Google Meet</a> : null}
                </div>
                {canManage ? <div className="calendar-agenda-actions">
                  <button type="button" onClick={() => void toggleDone(item)}>{item.status === 'completed' ? 'Reabrir' : 'Concluir'}</button>
                  <button type="button" className="danger" onClick={() => void remove(item)}>Excluir</button>
                </div> : null}
              </article>
            )) : <div className="calendar-empty">Nenhum compromisso neste período.</div>}
          </div>

          <div className="calendar-google-note">
            <strong>Google Calendar + Meet</strong>
            <p>O calendário já guarda convidados, IDs do evento, link do Meet e status de sincronização. Quando o OAuth do Google for concluído, os compromissos marcados para sincronizar usarão essa mesma estrutura.</p>
          </div>
        </aside>
      </div>

      {formOpen ? (
        <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setFormOpen(false);
        }}>
          <form className="calendar-modal" onSubmit={save}>
            <div className="calendar-modal-head">
              <div>
                <span>{draft.kind === 'meeting' ? 'Reunião' : 'Tarefa'}</span>
                <h2>{draft.kind === 'meeting' ? 'Nova reunião' : 'Nova tarefa'}</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setFormOpen(false)} disabled={busy}>×</button>
            </div>

            <div className="calendar-form-grid">
              <label className="calendar-field calendar-field--wide">
                <span>Nome</span>
                <input required autoFocus value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder={draft.kind === 'meeting' ? 'Ex.: Reunião com cliente' : 'Ex.: Preparar proposta comercial'} />
              </label>

              <label className="calendar-field">
                <span>Tipo</span>
                <select value={draft.kind} onChange={(event) => {
                  const kind = event.target.value as CalendarItemKind;
                  setDraft((value) => ({
                    ...value,
                    kind,
                    duration: kind === 'meeting' && value.duration === '30' ? '60' : value.duration,
                    syncToGoogle: kind === 'meeting' ? true : value.syncToGoogle,
                  }));
                }}>
                  <option value="task">Tarefa</option>
                  <option value="meeting">Reunião</option>
                </select>
              </label>

              <label className="calendar-field">
                <span>Responsável</span>
                <select value={draft.assigneeId} onChange={(event) => setDraft((value) => ({ ...value, assigneeId: event.target.value }))}>
                  <option value="">Sem responsável</option>
                  {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
                </select>
              </label>

              <label className="calendar-field">
                <span>Dia</span>
                <input required type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} />
              </label>

              <label className="calendar-field">
                <span>Hora</span>
                <input required type="time" value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} />
              </label>

              <label className="calendar-field">
                <span>Tempo para fazer</span>
                <select value={draft.duration} onChange={(event) => setDraft((value) => ({ ...value, duration: event.target.value }))}>
                  {durations.map((duration) => <option key={duration} value={duration}>{duration < 60 ? `${duration} minutos` : duration % 60 === 0 ? `${duration / 60} hora${duration > 60 ? 's' : ''}` : `${Math.floor(duration / 60)}h ${duration % 60}min`}</option>)}
                </select>
              </label>

              <label className="calendar-field">
                <span>Local</span>
                <input value={draft.location} onChange={(event) => setDraft((value) => ({ ...value, location: event.target.value }))} placeholder="Opcional" />
              </label>

              <label className="calendar-field calendar-field--wide">
                <span>Descrição</span>
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} placeholder="Informações, pauta ou observações" />
              </label>

              <label className="calendar-google-toggle calendar-field--wide">
                <input type="checkbox" checked={draft.syncToGoogle} onChange={(event) => setDraft((value) => ({ ...value, syncToGoogle: event.target.checked }))} />
                <span>
                  <strong>Adicionar também ao Google Calendar</strong>
                  <small>{connection?.status === 'connected' && connection.oauthReady ? 'A sincronização será solicitada após salvar.' : 'Vai ficar salvo na Hárpia e aguardando a conexão do Google.'}</small>
                </span>
              </label>

              {draft.syncToGoogle ? <label className="calendar-field calendar-field--wide">
                <span>E-mails dos convidados</span>
                <textarea rows={2} value={draft.guestEmails} onChange={(event) => setDraft((value) => ({ ...value, guestEmails: event.target.value }))} placeholder="cliente@email.com, outro@email.com" />
                <small>Quando o Google estiver conectado, esses e-mails serão enviados como convidados do evento.</small>
              </label> : null}

              {draft.kind === 'meeting' && draft.syncToGoogle ? <div className="calendar-meet-ready calendar-field--wide">
                <strong>Google Meet preparado</strong>
                <span>A reunião solicitará videoconferência automaticamente no evento do Google, sem precisar cadastrar outro link manualmente.</span>
              </div> : null}
            </div>

            <div className="calendar-modal-actions">
              <button className="button button-ghost-dark" type="button" onClick={() => setFormOpen(false)} disabled={busy}>Cancelar</button>
              <button className="button button-primary" type="submit" aria-busy={busy}>{busy ? 'Salvando...' : draft.kind === 'meeting' ? 'Salvar reunião' : 'Salvar tarefa'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
