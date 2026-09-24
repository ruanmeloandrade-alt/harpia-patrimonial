import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { AppLink } from '../../../core/router/router';
import { getOrganizationSettings, OrganizationSettings, updateOrganizationSettings } from './settings-service';

export function CoreSettingsPage() {
  const auth = useAuth();
  const canManage = auth.hasPermission('settings.manage');
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getOrganizationSettings().then(setSettings).catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.')).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const input = {
        company_name: String(form.get('company_name') || '').trim(),
        legal_name: String(form.get('legal_name') || '').trim() || null,
        document: String(form.get('document') || '').trim() || null,
        phone: String(form.get('phone') || '').trim() || null,
        email: String(form.get('email') || '').trim() || null,
        website: String(form.get('website') || '').trim(),
        city: String(form.get('city') || '').trim() || null,
        state: String(form.get('state') || '').trim().toUpperCase() || null,
      };
      await updateOrganizationSettings(input);
      setSettings({ id: 1, ...input, preferences: settings?.preferences ?? {} });
      setNotice('Dados estruturais atualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally { setSaving(false); }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><p className="eyebrow dark">CONFIGURAÇÕES</p><h1>Núcleo da plataforma</h1><p className="muted">Dados estruturais da Hárpia. O WhatsApp público usado pelos CTAs vem do telefone abaixo; WhatsApp API, Meta e demais integrações externas pertencem à etapa final.</p></div></header>
      {error ? <div className="alert alert-error">{error}</div> : null}{notice ? <div className="alert alert-success">{notice}</div> : null}
      <section className="panel"><div className="section-heading"><div><h2>Dados da empresa</h2><p className="muted">Uma única configuração para os módulos internos e a experiência pública consumirem.</p></div></div>{loading ? <div className="empty-state">Carregando...</div> : settings ? <form onSubmit={submit}><div className="form-grid"><label className="field"><span>Nome da empresa</span><input name="company_name" defaultValue={settings.company_name} disabled={!canManage} required /></label><label className="field"><span>Razão social</span><input name="legal_name" defaultValue={settings.legal_name || ''} disabled={!canManage} /></label><label className="field"><span>CNPJ / documento</span><input name="document" defaultValue={settings.document || ''} disabled={!canManage} /></label><label className="field"><span>WhatsApp público / telefone</span><input name="phone" type="tel" inputMode="tel" placeholder="Ex.: +5522999999999" defaultValue={settings.phone || ''} disabled={!canManage} /><small className="muted">Usado no redirecionamento dos CTAs públicos. Informe DDI + DDD + número.</small></label><label className="field"><span>E-mail</span><input name="email" type="email" defaultValue={settings.email || ''} disabled={!canManage} /></label><label className="field"><span>Site</span><input name="website" defaultValue={settings.website} disabled={!canManage} required /></label><label className="field"><span>Cidade</span><input name="city" defaultValue={settings.city || ''} disabled={!canManage} /></label><label className="field"><span>Estado</span><input name="state" maxLength={2} defaultValue={settings.state || ''} disabled={!canManage} /></label></div>{canManage ? <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar dados'}</button></div> : null}</form> : <div className="empty-state">Configuração não disponível.</div>}</section>
      <div className="settings-grid">
        <AppLink href="/interno/usuarios" className="panel setting-card"><span className="setting-index">01</span><h2>Usuários</h2><p className="muted">Cadastre funcionários, edite dados e ative ou desative acessos.</p><strong>Abrir usuários →</strong></AppLink>
        <AppLink href="/interno/permissoes" className="panel setting-card"><span className="setting-index">02</span><h2>Permissões</h2><p className="muted">Defina grupos e exatamente o que cada usuário pode visualizar ou gerenciar.</p><strong>Abrir permissões →</strong></AppLink>
        <AppLink href="/interno/integracoes" className="panel setting-card"><span className="setting-index">03</span><h2>Integrações</h2><p className="muted">Gerencie WhatsApps, responsável por conta, IA e demais conexões externas.</p><strong>Abrir integrações →</strong></AppLink>
      </div>
    </div>
  );
}
