import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { listGroups, listPermissions, Permission, PermissionEffect, PermissionGroup } from '../permissions/permission-service';
import {
  createInternalUser,
  getUserGroupIds,
  getUserPermissionOverrides,
  InternalUserRow,
  listInternalUsers,
  replaceUserGroups,
  setInternalUserActive,
  setUserPermissionOverride,
  updateInternalUser,
} from './user-service';

type OverrideMap = Record<string, PermissionEffect | 'inherit'>;

export function UsersPage({ embedded = false }: { embedded?: boolean }) {
  const auth = useAuth();
  const canManageUsers = auth.hasPermission('users.manage');
  const canManageRoles = auth.hasPermission('roles.manage');
  const canAssignGroups = canManageUsers && canManageRoles;
  const [users, setUsers] = useState<InternalUserRow[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<InternalUserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InternalUserRow | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [createGroups, setCreateGroups] = useState<Set<string>>(new Set());
  const [createOverrides, setCreateOverrides] = useState<OverrideMap>({});
  const [accessLoading, setAccessLoading] = useState(false);
  const selectedUserIsSelf = Boolean(selectedUser && selectedUser.id === auth.user?.id);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [userRows, groupRows, permissionRows] = await Promise.all([listInternalUsers(), listGroups(), listPermissions()]);
      setUsers(userRows);
      setGroups(groupRows);
      setPermissions(permissionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openAccess(user: InternalUserRow) {
    setSelectedUser(user);
    setAccessLoading(true);
    setError(null);
    try {
      const [groupIds, overrideRows] = await Promise.all([getUserGroupIds(user.id), getUserPermissionOverrides(user.id)]);
      setSelectedGroups(groupIds);
      setOverrides(Object.fromEntries(overrideRows.map((row) => [row.permission_id, row.effect])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os acessos deste usuário.');
    } finally {
      setAccessLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      const permissionOverrides = canAssignGroups
        ? Object.entries(createOverrides)
          .filter(([, effect]) => effect !== 'inherit')
          .map(([permissionId, effect]) => ({ permissionId, effect: effect as PermissionEffect }))
        : [];

      const result = await createInternalUser({
        fullName: String(form.get('fullName') || ''),
        email: String(form.get('email') || ''),
        whatsapp: String(form.get('whatsapp') || ''),
        password: String(form.get('password') || ''),
        groupIds: canAssignGroups ? [...createGroups] : [],
        permissionOverrides,
      });

      let accessWarning = '';
      if (canAssignGroups && !result.accessApplied) {
        try {
          await replaceUserGroups(result.userId, [...createGroups]);
          for (const { permissionId, effect } of permissionOverrides) {
            await setUserPermissionOverride(result.userId, permissionId, effect);
          }
        } catch (accessError) {
          accessWarning = accessError instanceof Error
            ? ` Usuário criado, mas os acessos iniciais precisam ser revisados: ${accessError.message}`
            : ' Usuário criado, mas os acessos iniciais precisam ser revisados.';
        }
      }

      event.currentTarget.reset();
      setCreateGroups(new Set());
      setCreateOverrides({});
      setShowForm(false);
      setNotice(`${result.warning || 'Usuário interno criado com sucesso.'}${accessWarning}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function saveUserEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser || !canManageUsers) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get('fullName') || '').trim();
    const whatsapp = String(form.get('whatsapp') || '').trim();
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      await updateInternalUser(editingUser.id, { fullName, whatsapp });
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser({ ...selectedUser, full_name: fullName, whatsapp: whatsapp || null });
      }
      setEditingUser(null);
      setNotice('Dados do usuário atualizados.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível editar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function saveGroups() {
    if (!selectedUser || !canAssignGroups || selectedUser.id === auth.user?.id) return;
    try {
      setSaving(true);
      setError(null);
      await replaceUserGroups(selectedUser.id, [...selectedGroups]);
      setNotice('Grupos do usuário atualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar os grupos.');
    } finally {
      setSaving(false);
    }
  }

  async function changeOverride(permissionId: string, value: PermissionEffect | 'inherit') {
    if (!selectedUser || !canAssignGroups || selectedUser.id === auth.user?.id) return;
    const previous = overrides[permissionId] || 'inherit';
    setOverrides((current) => ({ ...current, [permissionId]: value }));
    try {
      await setUserPermissionOverride(selectedUser.id, permissionId, value === 'inherit' ? null : value);
      setNotice('Exceção individual atualizada.');
    } catch (err) {
      setOverrides((current) => ({ ...current, [permissionId]: previous }));
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a permissão individual.');
    }
  }

  const permissionsByModule = useMemo(() => permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    (acc[permission.module] ||= []).push(permission);
    return acc;
  }, {}), [permissions]);

  return (
    <div className={embedded ? 'workspace-page settings-embedded-page' : 'workspace-page'}>
      <header className="page-heading">
        <div>
          <p className="eyebrow dark">EQUIPE</p>
          <h1>Usuários e acessos</h1>
          <p className="muted">Cadastre a equipe, defina grupos e ajuste permissões individuais no mesmo fluxo.</p>
        </div>
        {canManageUsers ? (
          <button
            className="button button-dark"
            onClick={() => {
              setShowForm((value) => !value);
              setCreateGroups(new Set());
              setCreateOverrides({});
            }}
          >
            {showForm ? 'Cancelar' : 'Adicionar usuário'}
          </button>
        ) : null}
      </header>

      {showForm ? (
        <form className="panel form-panel" onSubmit={submit}>
          <div className="section-heading">
            <div>
              <h2>Novo usuário interno</h2>
              <p className="muted">Cadastre a pessoa e já defina o acesso inicial antes de concluir.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field"><span>Nome completo</span><input name="fullName" required /></label>
            <label className="field"><span>E-mail</span><input name="email" type="email" required /></label>
            <label className="field"><span>WhatsApp</span><input name="whatsapp" type="tel" /></label>
            <label className="field"><span>Senha inicial</span><input name="password" type="password" minLength={8} required /></label>
          </div>

          {canAssignGroups ? (
            <>
              <div className="access-section">
                <h3>Funções e grupos iniciais</h3>
                <p className="muted">O usuário pode participar de mais de um grupo. A base de acesso vem destes grupos.</p>
                <div className="check-grid">
                  {groups.filter((group) => group.is_active).map((group) => (
                    <label className="check-card" key={group.id}>
                      <input
                        type="checkbox"
                        checked={createGroups.has(group.id)}
                        onChange={(event) => setCreateGroups((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(group.id);
                          else next.delete(group.id);
                          return next;
                        })}
                      />
                      <span><strong>{group.name}</strong><small>{group.description || group.slug}</small></span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="access-section">
                <h3>Permissões individuais iniciais</h3>
                <p className="muted">Use herança sempre que o grupo já resolver o acesso. Só crie exceção quando realmente precisar.</p>
                <div className="permission-modules">
                  {Object.entries(permissionsByModule).map(([module, items]) => (
                    <div className="permission-module" key={module}>
                      <strong>{module}</strong>
                      {items.map((permission) => (
                        <div className="permission-override-row" key={permission.id}>
                          <div><span>{permission.label}</span><code>{permission.key}</code></div>
                          <select
                            aria-label={`Permissão inicial ${permission.label}`}
                            value={createOverrides[permission.id] || 'inherit'}
                            onChange={(event) => setCreateOverrides((current) => ({
                              ...current,
                              [permission.id]: event.target.value as PermissionEffect | 'inherit',
                            }))}
                          >
                            <option value="inherit">Herdar do grupo</option>
                            <option value="allow">Permitir</option>
                            <option value="deny">Negar</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="settings-inline-note">Você pode criar usuários, mas precisa da permissão de gestão de funções para definir grupos e exceções de acesso.</div>
          )}

          <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Criando...' : 'Criar usuário e aplicar acessos'}</button></div>
        </form>
      ) : null}

      {editingUser ? (
        <form className="panel form-panel" onSubmit={saveUserEdit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">EDITAR USUÁRIO</p>
              <h2>{editingUser.full_name}</h2>
              <p className="muted">Atualize os dados da pessoa. Grupos e permissões ficam logo abaixo no editor de acessos.</p>
            </div>
            <button type="button" className="text-button" onClick={() => setEditingUser(null)}>Cancelar</button>
          </div>
          <div className="form-grid">
            <label className="field"><span>Nome completo</span><input name="fullName" defaultValue={editingUser.full_name} required /></label>
            <label className="field"><span>WhatsApp</span><input name="whatsapp" type="tel" defaultValue={editingUser.whatsapp || ''} /></label>
          </div>
          <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
        </form>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <section className="panel">
        {loading ? (
          <div className="empty-state"><strong>Carregando equipe...</strong></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><strong>Nenhum funcionário cadastrado.</strong><span>Cadastre a equipe quando os dados reais estiverem disponíveis.</span></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>WhatsApp</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.full_name}</strong></td>
                    <td>{item.whatsapp || 'Não informado'}</td>
                    <td><span className={item.is_active ? 'status success' : 'status neutral'}>{item.is_active ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="align-right">
                      {canManageUsers ? <button className="text-button" onClick={() => setEditingUser(item)}>Editar</button> : null}
                      <button className="text-button" onClick={() => openAccess(item)}>Acessos</button>
                      {canManageUsers && item.id !== auth.user?.id ? (
                        <button
                          className="text-button"
                          onClick={async () => {
                            try {
                              await setInternalUserActive(item.id, !item.is_active);
                              await load();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.');
                            }
                          }}
                        >
                          {item.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      ) : item.id === auth.user?.id ? <span className="status neutral">Sua conta</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedUser ? (
        <section className="panel access-editor">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">ACESSOS DO USUÁRIO</p>
              <h2>{selectedUser.full_name}</h2>
              <p className="muted">Grupos fornecem a base. Exceções individuais prevalecem sobre o grupo.</p>
            </div>
            <button className="text-button" onClick={() => setSelectedUser(null)}>Fechar</button>
          </div>

          {selectedUserIsSelf ? <div className="alert">Por segurança, grupos e exceções da própria conta são somente leitura. Outro administrador deve alterar esses acessos.</div> : null}

          {accessLoading ? (
            <div className="empty-state">Carregando acessos...</div>
          ) : (
            <>
              <div className="access-section">
                <h3>Funções e grupos</h3>
                <div className="check-grid">
                  {groups.map((group) => (
                    <label className="check-card" key={group.id}>
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        disabled={!canAssignGroups || selectedUserIsSelf}
                        onChange={(event) => setSelectedGroups((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(group.id);
                          else next.delete(group.id);
                          return next;
                        })}
                      />
                      <span><strong>{group.name}</strong><small>{group.description || group.slug}</small></span>
                    </label>
                  ))}
                </div>
                {canAssignGroups && !selectedUserIsSelf ? <div className="form-actions"><button className="button button-dark" onClick={saveGroups} disabled={saving}>Salvar grupos</button></div> : null}
              </div>

              <div className="access-section">
                <h3>Exceções individuais</h3>
                <p className="muted">Use “Herdar do grupo” sempre que não houver uma exceção real.</p>
                <div className="permission-modules">
                  {Object.entries(permissionsByModule).map(([module, items]) => (
                    <div className="permission-module" key={module}>
                      <strong>{module}</strong>
                      {items.map((permission) => (
                        <div className="permission-override-row" key={permission.id}>
                          <div><span>{permission.label}</span><code>{permission.key}</code></div>
                          <select
                            aria-label={`Permissão ${permission.label}`}
                            value={overrides[permission.id] || 'inherit'}
                            disabled={!canAssignGroups || selectedUserIsSelf}
                            onChange={(event) => changeOverride(permission.id, event.target.value as PermissionEffect | 'inherit')}
                          >
                            <option value="inherit">Herdar do grupo</option>
                            <option value="allow">Permitir</option>
                            <option value="deny">Negar</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
