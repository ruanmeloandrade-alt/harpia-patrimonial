import { useState } from 'react';
import { SalesBotWorkspace } from '../salesbot/SalesBotWorkspace';
import { ExecutionLogsPanel } from '../salesbot/ExecutionLogsPanel';
import { AIAgentsWorkspace } from '../ai-agents/AIAgentsWorkspace';
import type { AICredentialVaultPort } from '../integrations/aiCredentialPort';
import { IntegrationsWorkspace } from '../integrations/IntegrationsWorkspace';
import { AutomationsWorkspace } from './AutomationsWorkspace';
import './front05.css';

type Tab = 'salesbot' | 'automations' | 'ai' | 'logs' | 'integrations';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'salesbot', label: 'SalesBot' },
  { id: 'automations', label: 'Automatize' },
  { id: 'ai', label: 'Agentes IA' },
  { id: 'logs', label: 'Execuções' },
  { id: 'integrations', label: 'Integrações' },
];

interface Front05WorkspaceProps {
  credentialVault?: AICredentialVaultPort;
}

export function Front05Workspace({ credentialVault }: Front05WorkspaceProps) {
  const [tab, setTab] = useState<Tab>('salesbot');

  return <div className="f05-shell">
    <div className="f05-shell__intro">
      <div><span className="f05-kicker">Hárpia Patrimonial · Frente 05</span><h1>Automação inteligente</h1><p>SalesBot, Automatize, agentes de IA e integrações preparatórias em módulos independentes.</p></div>
      <div className="f05-readiness"><span>WhatsApp</span><strong>Não conectado</strong><span>Meta</span><strong>Não conectado</strong></div>
    </div>
    <nav className="f05-tabs" aria-label="Módulos da Frente 05">
      {TABS.map((item) => <button key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>
    {tab === 'salesbot' && <SalesBotWorkspace />}
    {tab === 'automations' && <AutomationsWorkspace />}
    {tab === 'ai' && <AIAgentsWorkspace />}
    {tab === 'logs' && <ExecutionLogsPanel />}
    {tab === 'integrations' && <IntegrationsWorkspace credentialVault={credentialVault} />}
  </div>;
}
