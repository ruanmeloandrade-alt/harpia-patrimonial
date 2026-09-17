import { useEffect, useState } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { getCoreMetrics, CoreMetrics } from './core-metrics-service';

export function InternalHome() {
  const auth = useAuth();
  const [metrics, setMetrics] = useState<CoreMetrics>({ internalUsers: 0, customGroups: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCoreMetrics().then(setMetrics).catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar os indicadores.')).finally(() => setLoading(false));
  }, []);

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><p className="eyebrow dark">NÚCLEO OPERACIONAL</p><h1>Base da plataforma</h1><p className="muted">Acompanhe usuários, acessos e configurações estruturais da plataforma.</p></div></header>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <section className="metric-grid"><article className="metric-card"><span>Usuários internos</span><strong>{loading ? '—' : metrics.internalUsers}</strong><small>Dado real do banco</small></article><article className="metric-card"><span>Grupos personalizados</span><strong>{loading ? '—' : metrics.customGroups}</strong><small>Sem funções fictícias</small></article><article className="metric-card"><span>Integrações ativas</span><strong>0</strong><small>Conexões entram na fase final</small></article></section>
      <section className="panel"><div className="section-heading"><div><h2>Sessão atual</h2><p className="muted">Informações reais da conta autenticada.</p></div></div><dl className="definition-list"><div><dt>Usuário</dt><dd>{auth.profile?.full_name || '—'}</dd></div><div><dt>E-mail</dt><dd>{auth.user?.email || '—'}</dd></div><div><dt>Tipo</dt><dd>{auth.profile?.account_type === 'internal' ? 'Equipe interna' : 'Cliente'}</dd></div><div><dt>Permissões efetivas</dt><dd>{auth.permissions.size}</dd></div></dl></section>
    </div>
  );
}
