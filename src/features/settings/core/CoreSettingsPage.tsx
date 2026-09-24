import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { requireSupabase } from '../../../core/supabase/client';
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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    getOrganizationSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.'))
      .finally(() => setLoading(false));
  }, []);

  async function uploadLogo(file: File) {
    if (!canManage || !settings) return;
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
    if (!allowed.has(file.type)) {
      setError('Use uma imagem JPG, PNG, WebP ou SVG.');
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setError('A logo precisa ter até 5 MB.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `branding/company-logo-${Date.now()}.${extension}`;
    const client = requireSupabase();

    try {
      setUploadingLogo(true);
      setError(null);
      setNotice(null);

      const { error: uploadError } = await client.storage
        .from('organization-assets')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data } = client.storage.from('organization-assets').getPublicUrl(path);
      const nextPreferences = mergeOrganizationPreferences(settings.preferences, {
        appearance: { logoUrl: data.publicUrl },
      });

      await updateOrganizationPreferences(nextPreferences);
      setSettings({ ...settings, preferences: nextPreferences });
      setNotice('Logo atualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!canManage || !settings) return;
    try {
      setUploadingLogo(true);
      setError(null);
      setNotice(null);
      const nextPreferences = mergeOrganizationPreferences(settings.preferences, {
        appearance: { logoUrl: '' },
      });
      await updateOrganizationPreferences(nextPreferences);
      setSettings({ ...settings, preferences: nextPreferences });
      setNotice('Logo removida.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

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
        logoUrl: normalizeOrganizationPreferences(settings.preferences).appearance.logoUrl,
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
              <div className="field field-wide">
                <span>Logo da empresa</span>
                {preferences.appearance.logoUrl ? (
                  <div className="settings-logo-preview">
                    <img src={preferences.appearance.logoUrl} alt="Logo atual da empresa" />
                  </div>
                ) : (
                  <div className="settings-logo-empty">Nenhuma logo enviada.</div>
                )}
                {canManage ? (
                  <div className="settings-logo-actions">
                    <label className="button button-secondary">
                      {uploadingLogo ? 'Enviando...' : preferences.appearance.logoUrl ? 'Substituir logo' : 'Enviar logo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        hidden
                        disabled={uploadingLogo}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = '';
                          if (file) void uploadLogo(file);
                        }}
                      />
                    </label>
                    {preferences.appearance.logoUrl ? (
                      <button className="button button-ghost" type="button" disabled={uploadingLogo} onClick={() => void removeLogo()}>
                        Remover logo
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <small className="muted">Selecione uma imagem JPG, PNG, WebP ou SVG de até 5 MB.</small>
              </div>
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
