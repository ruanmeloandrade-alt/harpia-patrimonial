import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { createGroup, getGroupPermissionIds, listGroups, listPermissions, Permission, PermissionGroup, replaceGroupPermissions, setGroupActive } from './permission-service';

export function PermissionsPage() {
  const auth = useAuth();
  const canManage = auth.hasPermission('roles.manage');
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [groupRows, permissionRows] = await Promise.all([listGroups(), listPermissions()]);
      setGroups(groupRows);
      setPermissions(permissionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar permissões.');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setError(null);
      setNotice(null);
      await createGroup({ name: String(form.get('name') || '').trim(), slug: String(form.get('slug') || '').trim(), description: String(form.get('description') || '').trim() });
      event.currentTarget.reset();
      setShowForm(false);
      setNotice('Grupo criado. Agora defina as permissões que ele herda.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar o grupo.'); }
  }

  async function openGroup(group: PermissionGroup) {
    setSelectedGroup(group);
    setEditorLoading(true);
    setError(null);
    try { setSelectedPermissions(await getGroupPermissionIds(group.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar as permissões do grupo.'); }
    finally { setEditorLoading(false); }
  }

  async function saveGroupPermissions() {
    if (!selectedGroup || selectedGroup.is_system || !canManage) return;
    try {
      setSaving(true);
      setError(null);
      await replaceGroupPermissions(selectedGroup.id, [...selectedPermissions]);
      setNotice('Permissões do grupo atualizadas.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar as permissões do grupo.'); }
    finally { setSaving(false); }
  }

  const byModule = useMemo(() => permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    (acc[permission.module] ||= []).push(permission);
    return acc;
  }, {}), [permissions]);

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><p className="eyebrow dark">ACESSOS</p><h1>Funções e permissões</h1><p className="muted">Crie grupos de acesso sem limitar a operação a cargos fixos. Depois, ajuste exceções diretamente no usuário.</p></div>{canManage ? <button className="button button-dark" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Cancelar' : 'Novo grupo'}</button> : null}</header>
      {showForm ? <form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label className="field"><span>Nome do grupo</span><input name="name" required /></label><label className="field"><span>Identificador</span><input name="slug" placeholder="ex.: corretores" pattern="[a-z0-9-]+" required /></label><label className="field field-wide"><span>Descrição</span><textarea name="description" rows={3} /></label></div><div className="form-actions"><button className="button button-primary">Criar grupo</button></div></form> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}{notice ? <div className="alert alert-success">{notice}</div> : null}
      <div className="two-column">
        <section className="panel"><div className="section-heading"><div><h2>Grupos</h2><p className="muted">Clique em um grupo para revisar a base de acesso.</p></div></div>{loading ? <div className="empty-state">Carregando...</div> : groups.length === 0 ? <div className="empty-state"><strong>Nenhum grupo cadastrado.</strong></div> : <div className="stack-list">{groups.map((group) => <article className={selectedGroup?.id === group.id ? 'list-card selected' : 'list-card'} key={group.id}><button className="list-card-main" onClick={() => openGroup(group)}><strong>{group.name}</strong><span>{group.description || group.slug}</span></button><div className="list-card-actions"><span className={group.is_active ? 'status success' : 'status neutral'}>{group.is_system ? 'Sistema' : group.is_active ? 'Ativo' : 'Inativo'}</span>{canManage && !group.is_system ? <button className="text-button" onClick={async () => { try { await setGroupActive(group.id, !group.is_active); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível alterar o grupo.'); } }}>{group.is_active ? 'Desativar' : 'Ativar'}</button> : null}</div></article>)}</div>}</section>
        <section className="panel"><div className="section-heading"><div><h2>{selectedGroup ? selectedGroup.name : 'Capacidades'}</h2><p className="muted">{selectedGroup ? (selectedGroup.is_system ? 'Grupo estrutural protegido para evitar perda acidental de acesso.' : 'Marque as capacidades herdadas por todos os membros deste grupo.') : 'Selecione um grupo para configurar suas permissões.'}</p></div></div>{!selectedGroup ? <div className="empty-state"><strong>Nenhum grupo selecionado.</strong></div> : editorLoading ? <div className="empty-state">Carregando...</div> : <><div className="permission-modules">{Object.entries(byModule).map(([module, items]) => <div className="permission-module" key={module}><strong>{module}</strong>{items.map((permission) => <label className="permission-check-row" key={permission.id}><input type="checkbox" checked={selectedPermissions.has(permission.id)} disabled={!canManage || selectedGroup.is_system} onChange={(event) => setSelectedPermissions((current) => { const next = new Set(current); if (event.target.checked) next.add(permission.id); else next.delete(permission.id); return next; })} /><span><b>{permission.label}</b><code>{permission.key}</code></span></label>)}</div>)}</div>{canManage && !selectedGroup.is_system ? <div className="form-actions"><button className="button button-dark" onClick={saveGroupPermissions} disabled={saving}>{saving ? 'Salvando...' : 'Salvar permissões'}</button></div> : null}</>}</section>
      </div>
    </div>
  );
}
