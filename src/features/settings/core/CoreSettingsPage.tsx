import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
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
      setSettings({ id: 1, ...input });
      setNotice('Dados estruturais atualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally { setSaving(false); }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><p className="eyebrow dark">CONFIGURAÇÕES</p><h1>Núcleo da plataforma</h1><p className="muted">Dados estruturais da Hárpia. WhatsApp, Meta e demais integrações pertencem à etapa final.</p></div></header>
      {error ? <div className="alert alert-error">{error}</div> : null}{notice ? <div className="alert alert-success">{notice}</div> : null}
      <section className="panel"><div className="section-heading"><div><h2>Dados da empresa</h2><p className="muted">Uma única configuração para os módulos internos consumirem.</p></div></div>{loading ? <div className="empty-state">Carregando...</div> : settings ? <form onSubmit={submit}><div className="form-grid"><label className="field"><span>Nome da empresa</span><input name="company_name" defaultValue={settings.company_name} disabled={!canManage} required /></label><label className="field"><span>Razão social</span><input name="legal_name" defaultValue={settings.legal_name || ''} disabled={!canManage} /></label><label className="field"><span>CNPJ / documento</span><input name="document" defaultValue={settings.document || ''} disabled={!canManage} /></label><label className="field"><span>Telefone</span><input name="phone" type="tel" defaultValue={settings.phone || ''} disabled={!canManage} /></label><label className="field"><span>E-mail</span><input name="email" type="email" defaultValue={settings.email || ''} disabled={!canManage} /></label><label className="field"><span>Site</span><input name="website" defaultValue={settings.website} disabled={!canManage} required /></label><label className="field"><span>Cidade</span><input name="city" defaultValue={settings.city || ''} disabled={!canManage} /></label><label className="field"><span>Estado</span><input name="state" maxLength={2} defaultValue={settings.state || ''} disabled={!canManage} /></label></div>{canManage ? <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar dados'}</button></div> : null}</form> : <div className="empty-state">Configuração não disponível.</div>}</section>
      <div className="settings-grid"><article className="panel setting-card"><span className="setting-index">01</span><h2>Usuários e acessos</h2><p className="muted">Permissões funcionam por grupo e exceção individual.</p></article><article className="panel setting-card"><span className="setting-index">02</span><h2>Segurança</h2><p className="muted">Rotas internas protegidas por sessão e autorização real na camada de dados.</p></article><article className="panel setting-card"><span className="setting-index">03</span><h2>Integrações</h2><p className="muted">A estrutura externa será ligada na fase final, sem bloquear o núcleo.</p></article></div>
    </div>
  );
}
