import { useState } from 'react';
import { SalesBotWorkspace } from '../salesbot/SalesBotWorkspace';
import { ExecutionLogsPanel } from '../salesbot/ExecutionLogsPanel';
import { AIAgentsWorkspace } from '../ai-agents/AIAgentsWorkspace';
import type { AICredentialVaultPort } from '../integrations/aiCredentialPort';
import { IntegrationsWorkspace } from '../integrations/IntegrationsWorkspace';
import { AutomationsWorkspace } from './AutomationsWorkspace';
import { NO_FRONT05_ACCESS, type Front05Access } from './front05Access';
import './front05.css';
import './front05-rbac.css';

export type Front05Tab = 'salesbot' | 'automations' | 'ai' | 'logs' | 'integrations';

const TABS: Array<{ id: Front05Tab; label: string }> = [
  { id: 'salesbot', label: 'SalesBot' },
  { id: 'automations', label: 'Automatize' },
  { id: 'ai', label: 'Agentes IA' },
  { id: 'logs', label: 'Execuções' },
  { id: 'integrations', label: 'Integrações' },
];

interface Front05WorkspaceProps {
  credentialVault?: AICredentialVaultPort;
  access?: Front05Access;
  initialTab?: Front05Tab;
}

export function Front05Workspace({
  credentialVault,
  access = NO_FRONT05_ACCESS,
  initialTab = 'salesbot',
}: Front05WorkspaceProps) {
  const visibleTabs = TABS.filter((item) => {
    if (item.id === 'logs') return access.salesbot.view || access.ai.view;
    return access[item.id].view;
  });
  const [tab, setTab] = useState<Front05Tab>(() => visibleTabs.some((item) => item.id === initialTab) ? initialTab : visibleTabs[0]?.id ?? 'salesbot');
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : visibleTabs[0]?.id;

  if (!activeTab) {
    return <div className="f05-shell"><section className="f05-module"><div className="f05-empty f05-empty--large">Seu usuário não possui acesso aos módulos de automação inteligente.</div></section></div>;
  }

  return <div className="f05-shell">
    <div className="f05-shell__intro">
      <div><span className="f05-kicker">Hárpia Patrimonial · Frente 05</span><h1>Automação inteligente</h1><p>SalesBot, Automatize, agentes de IA e integrações preparatórias em módulos independentes.</p></div>
      <div className="f05-readiness"><span>WhatsApp Web</span><strong>Status em Integrações</strong><span>Meta Lead Ads</span><strong>Status em Integrações</strong></div>
    </div>
    <nav className="f05-tabs" aria-label="Módulos da Frente 05">
      {visibleTabs.map((item) => <button key={item.id} className={activeTab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>
    {activeTab === 'salesbot' && <SalesBotWorkspace canManage={access.salesbot.manage} />}
    {activeTab === 'automations' && <AutomationsWorkspace canManage={access.automations.manage} />}
    {activeTab === 'ai' && <AIAgentsWorkspace canManage={access.ai.manage} />}
    {activeTab === 'logs' && <ExecutionLogsPanel canManage={access.salesbot.manage || access.ai.manage} />}
    {activeTab === 'integrations' && <IntegrationsWorkspace credentialVault={credentialVault} canManage={access.integrations.manage} />}
  </div>;
}
