import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  getOrganizationSettings,
  mergeOrganizationPreferences,
  normalizeOrganizationPreferences,
  OrganizationSettings,
  updateOrganizationPreferences,
  updateOrganizationSettings,
} from './settings-service';

export function CoreSettingsPage({ embedded = false }: { embedded?: boolean }) {
  const auth = useAuth();
  const canManage = auth.hasPermission('settings.manage');
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getOrganizationSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !settings) return;
    const form = new FormData(event.currentTarget);

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

    const nextPreferences = mergeOrganizationPreferences(settings.preferences, {
      organization: {
        addressLine: String(form.get('addressLine') || '').trim(),
        postalCode: String(form.get('postalCode') || '').trim(),
        country: String(form.get('country') || '').trim() || 'Brasil',
      },
      appearance: {
        logoUrl: String(form.get('logoUrl') || '').trim(),
      },
    });

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      await updateOrganizationSettings(input);
      await updateOrganizationPreferences(nextPreferences);
      setSettings({ id: 1, ...input, preferences: nextPreferences });
      setNotice('Configurações gerais atualizadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  const preferences = normalizeOrganizationPreferences(settings?.preferences);

  return (
    <div className={embedded ? 'workspace-page settings-embedded-page' : 'workspace-page'}>
      {!embedded ? (
        <header className="page-heading">
          <div>
            <p className="eyebrow dark">CONFIGURAÇÕES</p>
            <h1>Geral</h1>
            <p className="muted">Dados institucionais e identidade usados pelos módulos internos e pela experiência pública.</p>
          </div>
        </header>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {loading ? (
        <section className="panel"><div className="empty-state">Carregando configurações...</div></section>
      ) : settings ? (
        <form onSubmit={submit}>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Dados da empresa</h2>
                <p className="muted">Informações principais da operação Hárpia.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field"><span>Nome da empresa</span><input name="company_name" defaultValue={settings.company_name} disabled={!canManage} required /></label>
              <label className="field"><span>Razão social</span><input name="legal_name" defaultValue={settings.legal_name || ''} disabled={!canManage} /></label>
              <label className="field"><span>CNPJ / documento</span><input name="document" defaultValue={settings.document || ''} disabled={!canManage} /></label>
              <label className="field"><span>WhatsApp público / telefone</span><input name="phone" type="tel" inputMode="tel" placeholder="Ex.: +5522999999999" defaultValue={settings.phone || ''} disabled={!canManage} /><small className="muted">Usado nos CTAs públicos quando o fluxo exigir contato direto.</small></label>
              <label className="field"><span>E-mail principal</span><input name="email" type="email" defaultValue={settings.email || ''} disabled={!canManage} /></label>
              <label className="field"><span>Site</span><input name="website" defaultValue={settings.website} disabled={!canManage} required /></label>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Endereço e identificação visual</h2>
                <p className="muted">Dados institucionais complementares usados em páginas, documentos e comunicações.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field field-wide"><span>Endereço</span><input name="addressLine" defaultValue={preferences.organization.addressLine} disabled={!canManage} placeholder="Rua, número e complemento" /></label>
              <label className="field"><span>Cidade</span><input name="city" defaultValue={settings.city || ''} disabled={!canManage} /></label>
              <label className="field"><span>Estado</span><input name="state" maxLength={2} defaultValue={settings.state || ''} disabled={!canManage} /></label>
              <label className="field"><span>CEP</span><input name="postalCode" defaultValue={preferences.organization.postalCode} disabled={!canManage} /></label>
              <label className="field"><span>País</span><input name="country" defaultValue={preferences.organization.country} disabled={!canManage} /></label>
              <label className="field field-wide"><span>URL da logo</span><input name="logoUrl" type="url" defaultValue={preferences.appearance.logoUrl} disabled={!canManage} placeholder="https://..." /><small className="muted">A logo pode ser substituída por upload de mídia quando o storage institucional for ativado.</small></label>
            </div>
          </section>

          {canManage ? <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações gerais'}</button></div> : null}
        </form>
      ) : (
        <section className="panel"><div className="empty-state">Configuração não disponível.</div></section>
      )}
    </div>
  );
}
