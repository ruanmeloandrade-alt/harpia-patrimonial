import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { UsersPage } from '../users/UsersPage';
import { IntegrationsWorkspace } from '../integrations/IntegrationsWorkspace';
import { AIProvidersWorkspace } from '../integrations/AIProvidersWorkspace';
import type { AICredentialVaultPort } from '../integrations/aiCredentialPort';
import { CoreSettingsPage } from './core/CoreSettingsPage';
import {
  applyOrganizationPreferences,
  getOrganizationSettings,
  mergeOrganizationPreferences,
  normalizeOrganizationPreferences,
  OrganizationPreferences,
  OrganizationSettings,
  updateOrganizationPreferences,
} from './core/settings-service';
import './settings-workspace.css';

export type SettingsTab =
  | 'general'
  | 'preferences'
  | 'users'
  | 'integrations'
  | 'ai'
  | 'crm'
  | 'automations'
  | 'notifications'
  | 'security'
  | 'privacy'
  | 'marketing'
  | 'system';

type SettingsWorkspaceProps = {
  credentialVault?: AICredentialVaultPort;
  initialTab?: SettingsTab;
};

const tabs: Array<{ id: SettingsTab; label: string; area: 'settings' | 'users' | 'integrations'; phaseTwo?: boolean }> = [
  { id: 'general', label: 'Geral', area: 'settings' },
  { id: 'preferences', label: 'Preferências', area: 'settings' },
  { id: 'users', label: 'Usuários e acessos', area: 'users' },
  { id: 'integrations', label: 'Integrações', area: 'integrations' },
  { id: 'ai', label: 'IA', area: 'integrations' },
  { id: 'crm', label: 'CRM e atendimento', area: 'settings' },
  { id: 'automations', label: 'Automações', area: 'settings' },
  { id: 'notifications', label: 'Notificações', area: 'settings' },
  { id: 'security', label: 'Segurança', area: 'settings' },
  { id: 'privacy', label: 'Dados e privacidade', area: 'settings' },
  { id: 'marketing', label: 'Marketing', area: 'settings', phaseTwo: true },
  { id: 'system', label: 'Sistema', area: 'settings' },
];

function bool(form: FormData, key: string) {
  return form.get(key) === 'on';
}

function number(form: FormData, key: string, fallback: number, min: number, max: number) {
  const value = Number(form.get(key));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function PreferenceSaveButton({ saving, canManage }: { saving: boolean; canManage: boolean }) {
  if (!canManage) return null;
  return <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar preferências'}</button></div>;
}

function PhaseTwoBadge() {
  return <span className="settings-phase-badge">2ª fase</span>;
}

export function SettingsWorkspace({ credentialVault, initialTab = 'general' }: SettingsWorkspaceProps) {
  const auth = useAuth();
  const canViewSettings = auth.hasPermission('settings.view') || auth.hasPermission('settings.manage');
  const canManageSettings = auth.hasPermission('settings.manage');
  const canViewUsers = auth.hasPermission('users.view') || auth.hasPermission('users.manage') || auth.hasPermission('roles.view') || auth.hasPermission('roles.manage');
  const canViewIntegrations = auth.hasPermission('integrations.view') || auth.hasPermission('integrations.manage');
  const canManageIntegrations = auth.hasPermission('integrations.manage');

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleTabs = useMemo(() => tabs.filter((tab) => {
    if (tab.area === 'users') return canViewUsers;
    if (tab.area === 'integrations') return canViewIntegrations;
    return canViewSettings;
  }), [canViewIntegrations, canViewSettings, canViewUsers]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'general');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    let cancelled = false;
    getOrganizationSettings()
      .then((value) => {
        if (cancelled) return;
        setSettings(value);
        applyOrganizationPreferences(value.preferences);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const preferences = normalizeOrganizationPreferences(settings?.preferences);

  async function savePatch(patch: OrganizationPreferences, successMessage: string) {
    if (!settings || !canManageSettings) return;
    const next = mergeOrganizationPreferences(settings.preferences, patch);
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      await updateOrganizationPreferences(next);
      setSettings({ ...settings, preferences: next });
      setNotice(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as preferências.');
    } finally {
      setSaving(false);
    }
  }

  function submitPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const theme = String(form.get('theme') || 'light') as 'light' | 'dark' | 'system';
    const next = mergeOrganizationPreferences(settings?.preferences ?? {}, {
      appearance: {
        theme,
        compactMode: bool(form, 'compactMode'),
        primaryColor: String(form.get('primaryColor') || '#b49a63'),
      },
      regional: {
        locale: String(form.get('locale') || 'pt-BR'),
        currency: String(form.get('currency') || 'BRL'),
        timezone: String(form.get('timezone') || 'America/Sao_Paulo'),
        dateFormat: String(form.get('dateFormat') || 'dd/MM/yyyy'),
        timeFormat: String(form.get('timeFormat') || '24h') as '24h' | '12h',
      },
    });
    applyOrganizationPreferences(next);
    void savePatch({
      appearance: next.appearance,
      regional: next.regional,
    }, 'Preferências do sistema atualizadas.');
  }

  function submitCrm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      crm: {
        leadDistribution: String(form.get('leadDistribution') || 'manual') as 'manual' | 'round_robin' | 'lowest_load',
        defaultPipelineBehavior: String(form.get('defaultPipelineBehavior') || 'keep_origin') as 'keep_origin' | 'first_active',
        businessHoursStart: String(form.get('businessHoursStart') || '09:00'),
        businessHoursEnd: String(form.get('businessHoursEnd') || '18:00'),
        outsideBusinessHours: String(form.get('outsideBusinessHours') || 'queue') as 'queue' | 'keep_unassigned',
        requirePhoneForLead: bool(form, 'requirePhoneForLead'),
      },
    }, 'Preferências de CRM e atendimento atualizadas.');
  }

  function submitAutomations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      automations: {
        maxConcurrentRuns: number(form, 'maxConcurrentRuns', preferences.automations.maxConcurrentRuns, 1, 50),
        retryAttempts: number(form, 'retryAttempts', preferences.automations.retryAttempts, 0, 10),
        pauseOnRepeatedFailure: bool(form, 'pauseOnRepeatedFailure'),
        respectBusinessHours: bool(form, 'respectBusinessHours'),
        quietHoursStart: String(form.get('quietHoursStart') || '20:00'),
        quietHoursEnd: String(form.get('quietHoursEnd') || '08:00'),
      },
    }, 'Preferências de automação atualizadas.');
  }

  function submitNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      notifications: {
        inApp: bool(form, 'inApp'),
        email: bool(form, 'email'),
        whatsapp: bool(form, 'whatsapp'),
        newLead: bool(form, 'newLead'),
        newMessage: bool(form, 'newMessage'),
        taskDue: bool(form, 'taskDue'),
        automationFailure: bool(form, 'automationFailure'),
        integrationFailure: bool(form, 'integrationFailure'),
      },
    }, 'Preferências de notificação atualizadas.');
  }

  function submitSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      security: {
        sessionTimeoutMinutes: number(form, 'sessionTimeoutMinutes', preferences.security.sessionTimeoutMinutes, 15, 10080),
        inactivityLockMinutes: number(form, 'inactivityLockMinutes', preferences.security.inactivityLockMinutes, 5, 1440),
        allowMultipleSessions: bool(form, 'allowMultipleSessions'),
        requireStrongPasswords: bool(form, 'requireStrongPasswords'),
        auditSensitiveActions: bool(form, 'auditSensitiveActions'),
      },
    }, 'Políticas de segurança atualizadas.');
  }

  function submitPrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      privacy: {
        retentionDays: number(form, 'retentionDays', preferences.privacy.retentionDays, 30, 36500),
        allowDataExport: bool(form, 'allowDataExport'),
        allowDeletionRequests: bool(form, 'allowDeletionRequests'),
        marketingConsentDefault: bool(form, 'marketingConsentDefault'),
        maskSensitiveDataInLogs: bool(form, 'maskSensitiveDataInLogs'),
      },
    }, 'Preferências de dados e privacidade atualizadas.');
  }

  function submitMarketing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void savePatch({
      marketing: {
        defaultUtmSource: String(form.get('defaultUtmSource') || '').trim(),
        defaultUtmMedium: String(form.get('defaultUtmMedium') || '').trim(),
        trackingEnabled: false,
      },
    }, 'Preferências preparatórias de marketing atualizadas.');
  }

  return (
    <div className="settings-workspace">
      <header className="settings-workspace__header">
        <div>
          <p className="eyebrow dark">CONFIGURAÇÕES</p>
          <h1>Administração da plataforma</h1>
          <p className="muted">Centralize dados da empresa, preferências, usuários, integrações, segurança e comportamento operacional da Hárpia.</p>
        </div>
        <div className="settings-summary">
          <span>Preferências</span>
          <strong>{loading ? 'Carregando' : 'Sincronizadas'}</strong>
          <small>Persistência em organization_settings.</small>
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

      {activeTab === 'general' && <CoreSettingsPage embedded />}

      {activeTab === 'preferences' && (
        <form className="panel settings-section" onSubmit={submitPreferences}>
          <div className="section-heading">
            <div><h2>Aparência e regionalização</h2><p className="muted">Defina como a plataforma deve ser exibida e formatar informações.</p></div>
          </div>
          <div className="form-grid">
            <label className="field"><span>Tema</span><select name="theme" defaultValue={preferences.appearance.theme} disabled={!canManageSettings}><option value="light">Claro</option><option value="dark">Escuro</option><option value="system">Seguir sistema</option></select></label>
            <label className="field"><span>Cor de destaque</span><input name="primaryColor" type="color" defaultValue={preferences.appearance.primaryColor} disabled={!canManageSettings} /></label>
            <label className="field"><span>Idioma</span><select name="locale" defaultValue={preferences.regional.locale} disabled={!canManageSettings}><option value="pt-BR">Português Brasil</option><option value="pt-PT">Português Portugal</option><option value="en-US">English</option></select></label>
            <label className="field"><span>Moeda</span><select name="currency" defaultValue={preferences.regional.currency} disabled={!canManageSettings}><option value="BRL">Real brasileiro (BRL)</option><option value="EUR">Euro (EUR)</option><option value="USD">Dólar americano (USD)</option></select></label>
            <label className="field"><span>Fuso horário</span><select name="timezone" defaultValue={preferences.regional.timezone} disabled={!canManageSettings}><option value="America/Sao_Paulo">Brasília / São Paulo</option><option value="America/Manaus">Manaus</option><option value="America/Rio_Branco">Rio Branco</option><option value="Europe/Lisbon">Lisboa</option><option value="UTC">UTC</option></select></label>
            <label className="field"><span>Formato de data</span><select name="dateFormat" defaultValue={preferences.regional.dateFormat} disabled={!canManageSettings}><option value="dd/MM/yyyy">DD/MM/AAAA</option><option value="MM/dd/yyyy">MM/DD/AAAA</option><option value="yyyy-MM-dd">AAAA-MM-DD</option></select></label>
            <label className="field"><span>Formato de hora</span><select name="timeFormat" defaultValue={preferences.regional.timeFormat} disabled={!canManageSettings}><option value="24h">24 horas</option><option value="12h">12 horas</option></select></label>
            <label className="settings-toggle"><input type="checkbox" name="compactMode" defaultChecked={preferences.appearance.compactMode} disabled={!canManageSettings} /><span><strong>Modo compacto</strong><small>Reduz espaçamentos para exibir mais informação por tela.</small></span></label>
          </div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'users' && <UsersPage embedded />}

      {activeTab === 'integrations' && (
        <div className="settings-integrations-wrap">
          <IntegrationsWorkspace credentialVault={credentialVault} canManage={canManageIntegrations} showAIProviders={false} />
        </div>
      )}

      {activeTab === 'ai' && (
        <section className="panel settings-section">
          <div className="section-heading">
            <div><h2>Inteligência artificial</h2><p className="muted">Provedores, modelos e credenciais usados pelos agentes e automações.</p></div>
          </div>
          <AIProvidersWorkspace credentialVault={credentialVault} canManage={canManageIntegrations} />
        </section>
      )}

      {activeTab === 'crm' && (
        <form className="panel settings-section" onSubmit={submitCrm}>
          <div className="section-heading"><div><h2>CRM e atendimento</h2><p className="muted">Preferências globais para entrada, distribuição e tratamento de oportunidades.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Distribuição de novos leads</span><select name="leadDistribution" defaultValue={preferences.crm.leadDistribution} disabled={!canManageSettings}><option value="manual">Manual</option><option value="round_robin">Rodízio</option><option value="lowest_load">Menor carga</option></select></label>
            <label className="field"><span>Funil padrão</span><select name="defaultPipelineBehavior" defaultValue={preferences.crm.defaultPipelineBehavior} disabled={!canManageSettings}><option value="keep_origin">Preservar origem / contexto</option><option value="first_active">Primeiro funil ativo</option></select></label>
            <label className="field"><span>Início do atendimento</span><input name="businessHoursStart" type="time" defaultValue={preferences.crm.businessHoursStart} disabled={!canManageSettings} /></label>
            <label className="field"><span>Fim do atendimento</span><input name="businessHoursEnd" type="time" defaultValue={preferences.crm.businessHoursEnd} disabled={!canManageSettings} /></label>
            <label className="field"><span>Fora do horário</span><select name="outsideBusinessHours" defaultValue={preferences.crm.outsideBusinessHours} disabled={!canManageSettings}><option value="queue">Manter na fila</option><option value="keep_unassigned">Manter sem responsável</option></select></label>
            <label className="settings-toggle"><input type="checkbox" name="requirePhoneForLead" defaultChecked={preferences.crm.requirePhoneForLead} disabled={!canManageSettings} /><span><strong>Exigir telefone</strong><small>Bloqueia criação manual de lead sem telefone quando o módulo aplicar esta regra.</small></span></label>
          </div>
          <div className="settings-inline-note">Estas preferências ficam centralizadas agora. Cada módulo operacional passa a consumi-las conforme o fluxo correspondente for conectado.</div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'automations' && (
        <form className="panel settings-section" onSubmit={submitAutomations}>
          <div className="section-heading"><div><h2>Automações</h2><p className="muted">Parâmetros globais para SalesBot, Automatize e execuções automáticas.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Execuções simultâneas</span><input name="maxConcurrentRuns" type="number" min="1" max="50" defaultValue={preferences.automations.maxConcurrentRuns} disabled={!canManageSettings} /></label>
            <label className="field"><span>Tentativas após falha</span><input name="retryAttempts" type="number" min="0" max="10" defaultValue={preferences.automations.retryAttempts} disabled={!canManageSettings} /></label>
            <label className="field"><span>Início do período silencioso</span><input name="quietHoursStart" type="time" defaultValue={preferences.automations.quietHoursStart} disabled={!canManageSettings} /></label>
            <label className="field"><span>Fim do período silencioso</span><input name="quietHoursEnd" type="time" defaultValue={preferences.automations.quietHoursEnd} disabled={!canManageSettings} /></label>
            <label className="settings-toggle"><input type="checkbox" name="pauseOnRepeatedFailure" defaultChecked={preferences.automations.pauseOnRepeatedFailure} disabled={!canManageSettings} /><span><strong>Pausar em falhas repetidas</strong><small>Evita repetição contínua de uma automação com erro.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="respectBusinessHours" defaultChecked={preferences.automations.respectBusinessHours} disabled={!canManageSettings} /><span><strong>Respeitar horário de atendimento</strong><small>Aplica a janela configurada no CRM quando o fluxo oferecer suporte.</small></span></label>
          </div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'notifications' && (
        <form className="panel settings-section" onSubmit={submitNotifications}>
          <div className="section-heading"><div><h2>Notificações</h2><p className="muted">Escolha canais e eventos que merecem aviso para a equipe.</p></div></div>
          <div className="settings-subtitle">Canais</div>
          <div className="settings-toggle-grid">
            <label className="settings-toggle"><input type="checkbox" name="inApp" defaultChecked={preferences.notifications.inApp} disabled={!canManageSettings} /><span><strong>Dentro da plataforma</strong><small>Alertas no ambiente interno.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="email" defaultChecked={preferences.notifications.email} disabled={!canManageSettings} /><span><strong>E-mail</strong><small>Disponível quando o provedor estiver conectado.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="whatsapp" defaultChecked={preferences.notifications.whatsapp} disabled={!canManageSettings} /><span><strong>WhatsApp</strong><small>Disponível conforme o conector operacional.</small></span></label>
          </div>
          <div className="settings-subtitle">Eventos</div>
          <div className="settings-toggle-grid">
            <label className="settings-toggle"><input type="checkbox" name="newLead" defaultChecked={preferences.notifications.newLead} disabled={!canManageSettings} /><span><strong>Novo lead</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="newMessage" defaultChecked={preferences.notifications.newMessage} disabled={!canManageSettings} /><span><strong>Nova mensagem</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="taskDue" defaultChecked={preferences.notifications.taskDue} disabled={!canManageSettings} /><span><strong>Tarefa vencendo</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="automationFailure" defaultChecked={preferences.notifications.automationFailure} disabled={!canManageSettings} /><span><strong>Falha em automação</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="integrationFailure" defaultChecked={preferences.notifications.integrationFailure} disabled={!canManageSettings} /><span><strong>Falha em integração</strong></span></label>
          </div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'security' && (
        <form className="panel settings-section" onSubmit={submitSecurity}>
          <div className="section-heading"><div><h2>Segurança</h2><p className="muted">Políticas administrativas para sessão, senha e auditoria.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Tempo máximo de sessão em minutos</span><input name="sessionTimeoutMinutes" type="number" min="15" max="10080" defaultValue={preferences.security.sessionTimeoutMinutes} disabled={!canManageSettings} /></label>
            <label className="field"><span>Bloqueio por inatividade em minutos</span><input name="inactivityLockMinutes" type="number" min="5" max="1440" defaultValue={preferences.security.inactivityLockMinutes} disabled={!canManageSettings} /></label>
            <label className="settings-toggle"><input type="checkbox" name="allowMultipleSessions" defaultChecked={preferences.security.allowMultipleSessions} disabled={!canManageSettings} /><span><strong>Permitir múltiplas sessões</strong><small>Permite o mesmo usuário conectado em mais de um dispositivo.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="requireStrongPasswords" defaultChecked={preferences.security.requireStrongPasswords} disabled={!canManageSettings} /><span><strong>Exigir senhas fortes</strong><small>Política administrativa para novos usuários.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="auditSensitiveActions" defaultChecked={preferences.security.auditSensitiveActions} disabled={!canManageSettings} /><span><strong>Auditar ações sensíveis</strong><small>Registrar alterações críticas quando o módulo de auditoria consumir esta preferência.</small></span></label>
          </div>
          <div className="settings-inline-note">Configuração salva no núcleo. Políticas que dependem de enforcement no Auth ou no banco só entram em vigor depois da respectiva regra de backend.</div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'privacy' && (
        <form className="panel settings-section" onSubmit={submitPrivacy}>
          <div className="section-heading"><div><h2>Dados e privacidade</h2><p className="muted">Regras administrativas de retenção, exportação e proteção de dados.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Retenção padrão em dias</span><input name="retentionDays" type="number" min="30" max="36500" defaultValue={preferences.privacy.retentionDays} disabled={!canManageSettings} /></label>
            <label className="settings-toggle"><input type="checkbox" name="allowDataExport" defaultChecked={preferences.privacy.allowDataExport} disabled={!canManageSettings} /><span><strong>Permitir exportação de dados</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="allowDeletionRequests" defaultChecked={preferences.privacy.allowDeletionRequests} disabled={!canManageSettings} /><span><strong>Permitir solicitações de exclusão</strong></span></label>
            <label className="settings-toggle"><input type="checkbox" name="marketingConsentDefault" defaultChecked={preferences.privacy.marketingConsentDefault} disabled={!canManageSettings} /><span><strong>Consentimento de marketing por padrão</strong><small>Deve permanecer desligado quando não houver consentimento explícito.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" name="maskSensitiveDataInLogs" defaultChecked={preferences.privacy.maskSensitiveDataInLogs} disabled={!canManageSettings} /><span><strong>Mascarar dados sensíveis em logs</strong></span></label>
          </div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'marketing' && (
        <form className="panel settings-section" onSubmit={submitMarketing}>
          <div className="section-heading"><div><div className="settings-heading-with-badge"><h2>Marketing</h2><PhaseTwoBadge /></div><p className="muted">Defaults preparatórios para tracking e campanhas. O módulo operacional permanece reservado para a segunda fase.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>UTM source padrão</span><input name="defaultUtmSource" defaultValue={preferences.marketing.defaultUtmSource} disabled={!canManageSettings} placeholder="Ex.: meta" /></label>
            <label className="field"><span>UTM medium padrão</span><input name="defaultUtmMedium" defaultValue={preferences.marketing.defaultUtmMedium} disabled={!canManageSettings} placeholder="Ex.: paid_social" /></label>
          </div>
          <div className="settings-phase-panel">
            <PhaseTwoBadge />
            <div><strong>Tracking operacional desativado nesta fase.</strong><p>Meta, Analytics, Tag Manager, Gmail, SMS e demais canais continuam visíveis no front, mas só serão ativados na segunda fase.</p></div>
          </div>
          <PreferenceSaveButton saving={saving} canManage={canManageSettings} />
        </form>
      )}

      {activeTab === 'system' && (
        <section className="panel settings-section">
          <div className="section-heading"><div><h2>Sistema</h2><p className="muted">Informações técnicas úteis para manutenção e diagnóstico.</p></div></div>
          <div className="settings-system-grid">
            <div><span>Versão</span><strong>0.2.0</strong><small>package.json</small></div>
            <div><span>Ambiente</span><strong>{import.meta.env.MODE || 'Não informado'}</strong><small>Vite runtime</small></div>
            <div><span>Banco</span><strong>{import.meta.env.VITE_SUPABASE_URL ? 'Supabase configurado' : 'Supabase não configurado'}</strong><small>Conexão definida por ambiente</small></div>
            <div><span>Fonte de verdade</span><strong>GitHub</strong><small>ruanmeloandrade-alt/harpia-patrimonial</small></div>
          </div>
          <div className="settings-inline-note">Saúde de WhatsApp, Meta e demais provedores permanece na aba Integrações, onde existe contexto específico de cada conexão.</div>
        </section>
      )}
    </div>
  );
}
