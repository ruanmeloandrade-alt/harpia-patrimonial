import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { UsersPage } from '../users/UsersPage';
import { PermissionsPage } from '../permissions/PermissionsPage';
import { IntegrationsWorkspace } from '../integrations/IntegrationsWorkspace';
import { AIProvidersWorkspace } from '../integrations/AIProvidersWorkspace';
import type { AICredentialVaultPort } from '../integrations/aiCredentialPort';
import { CoreSettingsPage } from './core/CoreSettingsPage';
import {
  getOrganizationSettings,
  mergeOrganizationPreferences,
  normalizeOrganizationPreferences,
  type BusinessHoursSchedule,
  type BusinessWeekday,
  type OrganizationPreferences,
  type OrganizationSettings,
  updateOrganizationPreferences,
} from './core/settings-service';
import {
  applyUserAppearance,
  DEFAULT_USER_PREFERENCES,
  getUserPreferences,
  type UserPreferences,
  updateUserPreferences,
} from './user-preferences-service';
import './settings-workspace.css';

export type SettingsTab =
  | 'general'
  | 'preferences'
  | 'users'
  | 'integrations'
  | 'ai'
  | 'crm'
  | 'notifications'
  | 'security'
  | 'privacy'
  | 'marketing'
  | 'system';

type SettingsWorkspaceProps = {
  credentialVault?: AICredentialVaultPort;
  initialTab?: SettingsTab;
};

type TabArea = 'personal' | 'settings' | 'users' | 'integrations';

const tabs: Array<{ id: SettingsTab; label: string; area: TabArea; phaseTwo?: boolean }> = [
  { id: 'general', label: 'Geral', area: 'settings' },
  { id: 'preferences', label: 'Preferências', area: 'personal' },
  { id: 'users', label: 'Usuários e acessos', area: 'users' },
  { id: 'integrations', label: 'Integrações', area: 'integrations' },
  { id: 'ai', label: 'IA', area: 'integrations' },
  { id: 'crm', label: 'CRM e atendimento', area: 'settings' },
  { id: 'notifications', label: 'Notificações', area: 'personal' },
  { id: 'security', label: 'Segurança', area: 'settings' },
  { id: 'privacy', label: 'Dados e privacidade', area: 'settings' },
  { id: 'marketing', label: 'Marketing', area: 'settings', phaseTwo: true },
  { id: 'system', label: 'Sistema', area: 'settings' },
];

const weekdays: Array<{ id: BusinessWeekday; label: string }> = [
  { id: 'monday', label: 'Segunda' },
  { id: 'tuesday', label: 'Terça' },
  { id: 'wednesday', label: 'Quarta' },
  { id: 'thursday', label: 'Quinta' },
  { id: 'friday', label: 'Sexta' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

function bool(form: FormData, key: string) {
  return form.get(key) === 'on';
}

function number(form: FormData, key: string, fallback: number, min: number, max: number) {
  const value = Number(form.get(key));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function SaveButton({ saving, canManage, label = 'Salvar configurações' }: { saving: boolean; canManage: boolean; label?: string }) {
  if (!canManage) return null;
  return <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : label}</button></div>;
}

function PhaseTwoBadge() {
  return <span className="settings-phase-badge">2ª fase</span>;
}

export function SettingsWorkspace({ credentialVault, initialTab = 'preferences' }: SettingsWorkspaceProps) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const canViewSettings = auth.hasPermission('settings.view') || auth.hasPermission('settings.manage');
  const canManageSettings = auth.hasPermission('settings.manage');
  const canViewUsers = auth.hasPermission('users.view') || auth.hasPermission('users.manage') || auth.hasPermission('roles.view') || auth.hasPermission('roles.manage');
  const canViewIntegrations = auth.hasPermission('integrations.view') || auth.hasPermission('integrations.manage');
  const canManageIntegrations = auth.hasPermission('integrations.manage');

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ ...DEFAULT_USER_PREFERENCES });
  const [loadingSettings, setLoadingSettings] = useState(canViewSettings);
  const [loadingPersonal, setLoadingPersonal] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleTabs = useMemo(() => tabs.filter((tab) => {
    if (tab.area === 'personal') return true;
    if (tab.area === 'users') return canViewUsers;
    if (tab.area === 'integrations') return canViewIntegrations;
    return canViewSettings;
  }), [canViewIntegrations, canViewSettings, canViewUsers]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'preferences');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!canViewSettings) {
      setLoadingSettings(false);
      return;
    }

    let cancelled = false;
    setLoadingSettings(true);
    void getOrganizationSettings()
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações globais.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });

    return () => { cancelled = true; };
  }, [canViewSettings]);

  useEffect(() => {
    if (!userId) {
      setLoadingPersonal(false);
      return;
    }

    let cancelled = false;
    setLoadingPersonal(true);
    void getUserPreferences(userId)
      .then((value) => {
        if (cancelled) return;
        setUserPreferences(value);
        applyUserAppearance(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar suas preferências.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPersonal(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const preferences = normalizeOrganizationPreferences(settings?.preferences);

  async function saveOrganizationPatch(patch: OrganizationPreferences, successMessage: string) {
    if (!settings || !canManageSettings) return;
    const next = mergeOrganizationPreferences(settings.preferences, patch);
    await updateOrganizationPreferences(next);
    setSettings({ ...settings, preferences: next });
    setNotice(successMessage);
  }

  async function savePersonalPatch(patch: Partial<UserPreferences>, successMessage: string) {
    if (!userId) return;
    const next = await updateUserPreferences(userId, patch);
    setUserPreferences(next);
    setNotice(successMessage);
  }

  async function submitPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      await savePersonalPatch({
        theme: String(form.get('theme') || 'system') as UserPreferences['theme'],
        compact_mode: bool(form, 'compactMode'),
      }, 'Suas preferências foram atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as preferências.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCrm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    const form = new FormData(event.currentTarget);
    const businessHours = Object.fromEntries(weekdays.map(({ id }) => [
      id,
      {
        enabled: bool(form, `${id}_enabled`),
        start: String(form.get(`${id}_start`) || preferences.crm.businessHours[id].start),
        end: String(form.get(`${id}_end`) || preferences.crm.businessHours[id].end),
      },
    ])) as BusinessHoursSchedule;

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      await saveOrganizationPatch({
        crm: {
          leadDistribution: String(form.get('leadDistribution') || 'manual') as 'manual' | 'round_robin' | 'lowest_load',
          defaultPipelineBehavior: String(form.get('defaultPipelineBehavior') || 'keep_origin') as 'keep_origin' | 'first_active',
          businessHours,
          outsideBusinessHours: String(form.get('outsideBusinessHours') || 'queue') as 'queue' | 'keep_unassigned',
          requirePhoneForLead: bool(form, 'requirePhoneForLead'),
        },
      }, 'Horário de atendimento e preferências do CRM atualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o CRM.');
    } finally {
      setSaving(false);
    }
  }

  async function submitNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      let browserNotifications = bool(form, 'browser_notifications');
      if (browserNotifications && typeof Notification === 'undefined') {
        browserNotifications = false;
      } else if (browserNotifications && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        browserNotifications = permission === 'granted';
      }

      await savePersonalPatch({
        popup_notifications: bool(form, 'popup_notifications'),
        sound_notifications: bool(form, 'sound_notifications'),
        browser_notifications: browserNotifications,
        notify_new_lead: bool(form, 'notify_new_lead'),
        notify_new_message: bool(form, 'notify_new_message'),
        notify_automation_failure: bool(form, 'notify_automation_failure'),
        notify_integration_failure: bool(form, 'notify_integration_failure'),
      }, 'Notificações desta conta atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as notificações.');
    } finally {
      setSaving(false);
    }
  }

  async function submitSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      await saveOrganizationPatch({
        security: {
          sessionTimeoutMinutes: number(form, 'sessionTimeoutMinutes', preferences.security.sessionTimeoutMinutes, 15, 10080),
          inactivityLockMinutes: number(form, 'inactivityLockMinutes', preferences.security.inactivityLockMinutes, 5, 1440),
          allowMultipleSessions: bool(form, 'allowMultipleSessions'),
          requireStrongPasswords: bool(form, 'requireStrongPasswords'),
          auditSensitiveActions: bool(form, 'auditSensitiveActions'),
        },
      }, 'Políticas de segurança atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a segurança.');
    } finally {
      setSaving(false);
    }
  }

  async function submitPrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      await saveOrganizationPatch({
        privacy: {
          retentionDays: number(form, 'retentionDays', preferences.privacy.retentionDays, 30, 36500),
          allowDataExport: bool(form, 'allowDataExport'),
          allowDeletionRequests: bool(form, 'allowDeletionRequests'),
          marketingConsentDefault: bool(form, 'marketingConsentDefault'),
          maskSensitiveDataInLogs: bool(form, 'maskSensitiveDataInLogs'),
        },
      }, 'Preferências de dados e privacidade atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar dados e privacidade.');
    } finally {
      setSaving(false);
    }
  }

  async function submitMarketing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      await saveOrganizationPatch({
        marketing: {
          defaultUtmSource: String(form.get('defaultUtmSource') || '').trim(),
          defaultUtmMedium: String(form.get('defaultUtmMedium') || '').trim(),
          trackingEnabled: false,
        },
      }, 'Preferências preparatórias de marketing atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar marketing.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-workspace">
      <header className="settings-workspace__header">
        <div>
          <p className="eyebrow dark">CONFIGURAÇÕES</p>
          <h1>Administração da plataforma</h1>
          <p className="muted">Preferências pessoais ficam na conta de cada funcionário. Regras operacionais e institucionais continuam globais.</p>
        </div>
        <div className="settings-summary">
          <span>Sua conta</span>
          <strong>{loadingPersonal ? 'Carregando' : userPreferences.theme === 'system' ? 'Tema do sistema' : userPreferences.theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</strong>
          <small>Preferência individual, não altera os outros usuários.</small>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Áreas de configuração">
        {visibleTabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => {
              setActiveTab(tab.id);
              setNotice(null);
              setError(null);
            }}
          >
            <span>{tab.label}</span>
            {tab.phaseTwo ? <PhaseTwoBadge /> : null}
          </button>
        ))}
      </nav>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {activeTab === 'general' && canViewSettings && <CoreSettingsPage embedded />}

      {activeTab === 'preferences' && (
        <form className="panel settings-section" onSubmit={submitPreferences}>
          <div className="section-heading">
            <div><h2>Preferências da sua conta</h2><p className="muted">Tema e densidade visual valem somente para o funcionário conectado.</p></div>
          </div>

          {loadingPersonal ? <div className="empty-state">Carregando suas preferências...</div> : (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>Tema desta conta</span>
                  <select name="theme" value={userPreferences.theme} onChange={(event) => {
                    const next = { ...userPreferences, theme: event.target.value as UserPreferences['theme'] };
                    setUserPreferences(next);
                    applyUserAppearance(next);
                  }}>
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="system">Seguir sistema do dispositivo</option>
                  </select>
                </label>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    name="compactMode"
                    checked={userPreferences.compact_mode}
                    onChange={(event) => {
                      const next = { ...userPreferences, compact_mode: event.target.checked };
                      setUserPreferences(next);
                      applyUserAppearance(next);
                    }}
                  />
                  <span><strong>Modo compacto</strong><small>Reduz espaçamentos somente nesta conta.</small></span>
                </label>
              </div>

              <div className="settings-inline-note">Tema e densidade visual são preferências individuais desta conta. Configurações institucionais não podem ser alteradas aqui.</div>
              <SaveButton saving={saving} canManage={Boolean(userId)} label="Salvar minhas preferências" />
            </>
          )}
        </form>
      )}

      {activeTab === 'users' && (
        <div className="settings-user-access-stack">
          <UsersPage embedded />
          <PermissionsPage embedded />
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="settings-integrations-wrap">
          <IntegrationsWorkspace credentialVault={credentialVault} canManage={canManageIntegrations} showAIProviders={false} />
        </div>
      )}

      {activeTab === 'ai' && (
        <section className="panel settings-section">
          <div className="section-heading">
            <div><h2>Inteligência artificial</h2><p className="muted">Cole a chave, deixe a Hárpia identificar o provedor e escolha um modelo disponível.</p></div>
          </div>
          <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManageIntegrations} />
        </section>
      )}

      {activeTab === 'crm' && settings && (
        <form className="panel settings-section" onSubmit={submitCrm}>
          <div className="section-heading"><div><h2>CRM e atendimento</h2><p className="muted">Configure distribuição, dias e horários reais de atendimento.</p></div></div>

          <div className="form-grid">
            <label className="field"><span>Distribuição de novos leads</span><select name="leadDistribution" defaultValue={preferences.crm.leadDistribution} disabled={!canManageSettings}><option value="manual">Manual</option><option value="round_robin">Rodízio</option><option value="lowest_load">Menor carga</option></select></label>
            <label className="field"><span>Funil padrão</span><select name="defaultPipelineBehavior" defaultValue={preferences.crm.defaultPipelineBehavior} disabled={!canManageSettings}><option value="keep_origin">Preservar origem e contexto</option><option value="first_active">Primeiro funil ativo</option></select></label>
            <label className="field"><span>Fora do horário</span><select name="outsideBusinessHours" defaultValue={preferences.crm.outsideBusinessHours} disabled={!canManageSettings}><option value="queue">Manter na fila</option><option value="keep_unassigned">Manter sem responsável</option></select></label>
            <label className="settings-toggle"><input type="checkbox" name="requirePhoneForLead" defaultChecked={preferences.crm.requirePhoneForLead} disabled={!canManageSettings} /><span><strong>Exigir telefone</strong><small>Aplicado quando o fluxo de criação manual consumir esta regra.</small></span></label>
          </div>

          <div className="settings-subtitle">Horário de atendimento</div>
          <div className="business-hours-grid">
            {weekdays.map(({ id, label }) => {
              const day = preferences.crm.businessHours[id];
              return (
                <div className="business-hours-row" key={id}>
                  <label className="business-hours-day">
                    <input type="checkbox" name={`${id}_enabled`} defaultChecked={day.enabled} disabled={!canManageSettings} />
                    <strong>{label}</strong>
                  </label>
                  <label className="field"><span>Abre</span><input type="time" name={`${id}_start`} defaultValue={day.start} disabled={!canManageSettings} /></label>
                  <label className="field"><span>Fecha</span><input type="time" name={`${id}_end`} defaultValue={day.end} disabled={!canManageSettings} /></label>
                </div>
              );
            })}
          </div>

          <div className="settings-inline-note">O fuso usado nesses horários é o fuso global configurado em Preferências.</div>
          <SaveButton saving={saving} canManage={canManageSettings} label="Salvar CRM e horários" />
        </form>
      )}

      {activeTab === 'notifications' && (
        <form className="panel settings-section" onSubmit={submitNotifications}>
          <div className="section-heading">
            <div>
              <h2>Notificações desta conta</h2>
              <p className="muted">Novo lead, nova mensagem, falha de automação e falha de integração já geram notificações reais em tempo real.</p>
            </div>
          </div>

          {loadingPersonal ? <div className="empty-state">Carregando notificações...</div> : (
            <>
              <div className="settings-subtitle">Como avisar</div>
              <div className="settings-toggle-grid">
                <label className="settings-toggle"><input type="checkbox" name="popup_notifications" defaultChecked={userPreferences.popup_notifications} /><span><strong>Popup dentro da Hárpia</strong><small>Mostra aviso no canto da tela assim que o evento chega.</small></span></label>
                <label className="settings-toggle"><input type="checkbox" name="sound_notifications" defaultChecked={userPreferences.sound_notifications} /><span><strong>Som</strong><small>Toca um aviso curto junto com a notificação.</small></span></label>
                <label className="settings-toggle"><input type="checkbox" name="browser_notifications" defaultChecked={userPreferences.browser_notifications} /><span><strong>Notificação do navegador</strong><small>Solicita permissão do navegador ao ativar.</small></span></label>
              </div>

              <div className="settings-subtitle">Eventos conectados</div>
              <div className="settings-toggle-grid">
                <label className="settings-toggle"><input type="checkbox" name="notify_new_lead" defaultChecked={userPreferences.notify_new_lead} /><span><strong>Novo lead</strong><small>Dispara quando um lead entra no CRM.</small></span></label>
                <label className="settings-toggle"><input type="checkbox" name="notify_new_message" defaultChecked={userPreferences.notify_new_message} /><span><strong>Nova mensagem</strong><small>Dispara para mensagem recebida no Inbox.</small></span></label>
                <label className="settings-toggle"><input type="checkbox" name="notify_automation_failure" defaultChecked={userPreferences.notify_automation_failure} /><span><strong>Falha em automação</strong><small>Dispara quando uma ação automática entra em falha.</small></span></label>
                <label className="settings-toggle"><input type="checkbox" name="notify_integration_failure" defaultChecked={userPreferences.notify_integration_failure} /><span><strong>Falha em integração</strong><small>Dispara quando um evento de integração retorna erro.</small></span></label>
              </div>

              <SaveButton saving={saving} canManage={Boolean(userId)} label="Salvar minhas notificações" />
            </>
          )}
        </form>
      )}

      {activeTab === 'security' && settings && (
        <form className="panel settings-section" onSubmit={submitSecurity}>
          <div className="section-heading"><div><h2>Segurança</h2><p className="muted">Políticas administrativas para sessão, senha e auditoria.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Tempo máximo de sessão em minutos</span><input name="sessionTimeoutMinutes" type="number" min="15" max="10080" defaultValue={preferences.security.sessionTimeoutMinutes} disabled={!canManageSettings} /></label>
            <label className="field"><span>Bloqueio por inatividade em minutos</span><input name="inactivityLockMinutes" type="number" min="5" max="1440" defaultValue={preferences.security.inactivityLockMinutes} disabled={!canManageSettings} /></label>
            <label className="settings-toggle"><input type="checkbox" name="allowMultipleSessions" defaultChecked={preferences.security.allowMultipleSessions} disabled={!canManageSettings} /><span><strong>Permitir múltiplas sessões</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="requireStrongPasswords" defaultChecked={preferences.security.requireStrongPasswords} disabled={!canManageSettings} /><span><strong>Exigir senhas fortes</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="auditSensitiveActions" defaultChecked={preferences.security.auditSensitiveActions} disabled={!canManageSettings} /><span><strong>Auditar ações sensíveis</strong></span></label>
          </div>
          <div className="settings-inline-note">Políticas dependentes de enforcement no Auth ou no banco só são apresentadas como ativas quando o backend correspondente estiver ligado.</div>
          <SaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'privacy' && settings && (
        <form className="panel settings-section" onSubmit={submitPrivacy}>
          <div className="section-heading"><div><h2>Dados e privacidade</h2><p className="muted">Retenção, exportação e proteção de dados.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Retenção padrão em dias</span><input name="retentionDays" type="number" min="30" max="36500" defaultValue={preferences.privacy.retentionDays} disabled={!canManageSettings} /></label>
            <label className="settings-toggle"><input type="checkbox" name="allowDataExport" defaultChecked={preferences.privacy.allowDataExport} disabled={!canManageSettings} /><span><strong>Permitir exportação de dados</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="allowDeletionRequests" defaultChecked={preferences.privacy.allowDeletionRequests} disabled={!canManageSettings} /><span><strong>Permitir solicitações de exclusão</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="marketingConsentDefault" defaultChecked={preferences.privacy.marketingConsentDefault} disabled={!canManageSettings} /><span><strong>Consentimento de marketing por padrão</strong><small>Permanece desligado sem consentimento explícito.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="maskSensitiveDataInLogs" defaultChecked={preferences.privacy.maskSensitiveDataInLogs} disabled={!canManageSettings} /><span><strong>Mascarar dados sensíveis em logs</strong></span></label>
          </div>
          <SaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'marketing' && settings && (
        <form className="panel settings-section" onSubmit={submitMarketing}>
          <div className="section-heading"><div><div className="settings-heading-with-badge"><h2>Marketing</h2><PhaseTwoBadge /></div><p className="muted">Defaults preparatórios. O módulo operacional continua reservado para a segunda fase.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>UTM source padrão</span><input name="defaultUtmSource" defaultValue={preferences.marketing.defaultUtmSource} disabled={!canManageSettings} placeholder="Ex.: meta" /></label>
            <label className="field"><span>UTM medium padrão</span><input name="defaultUtmMedium" defaultValue={preferences.marketing.defaultUtmMedium} disabled={!canManageSettings} placeholder="Ex.: paid_social" /></label>
          </div>
          <div className="settings-phase-panel"><PhaseTwoBadge /><div><strong>Tracking operacional desativado nesta fase.</strong><p>Meta, Analytics, Tag Manager, Gmail e SMS permanecem visíveis, mas só serão ativados na segunda fase.</p></div></div>
          <SaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'system' && canViewSettings && (
        <section className="panel settings-section">
          <div className="section-heading"><div><h2>Sistema</h2><p className="muted">Informações técnicas para manutenção e diagnóstico.</p></div></div>
          <div className="settings-system-grid">
            <div><span>Versão</span><strong>0.2.0</strong><small>package.json</small></div>
            <div><span>Ambiente</span><strong>{import.meta.env.MODE || 'Não informado'}</strong><small>Vite runtime</small></div>
            <div><span>Banco</span><strong>{import.meta.env.VITE_SUPABASE_URL ? 'Supabase configurado' : 'Supabase não configurado'}</strong><small>Conexão definida por ambiente</small></div>
            <div><span>Fonte de verdade</span><strong>GitHub</strong><small>harpia-patrimonial</small></div>
          </div>
        </section>
      )}

      {(loadingSettings && ['general', 'crm', 'security', 'privacy', 'marketing', 'system'].includes(activeTab)) ? (
        <section className="panel"><div className="empty-state">Carregando configurações globais...</div></section>
      ) : null}
    </div>
  );
}
