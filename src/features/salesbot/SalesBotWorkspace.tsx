import { useMemo, useState } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { SALESBOT_BLOCK_CATALOG } from './blockCatalog';
import {
  addSalesBotBlock,
  createSalesBot,
  deleteSalesBot,
  duplicateSalesBot,
  listSalesBots,
  moveSalesBotBlock,
  removeSalesBotBlock,
  setSalesBotStatus,
  updateSalesBot,
  updateSalesBotBlock,
  validateSalesBotForActivation,
} from './repository';
import type { SalesBotBlock, SalesBotBlockConfigValue, SalesBotDefinition } from './types';

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function BlockConfigEditor({
  botId,
  block,
  onChange,
  onError,
}: {
  botId: string;
  block: SalesBotBlock;
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const set = (key: string, value: SalesBotBlockConfigValue) => {
    try {
      updateSalesBotBlock(botId, block.id, { config: { ...block.config, [key]: value } });
      onError('');
      onChange();
    } catch (error) {
      onError(errorMessage(error, 'Não foi possível alterar o bloco.'));
    }
  };
  const value = (key: string) => String(block.config[key] ?? '');

  if (block.type === 'finish') return <span className="f05-config-note">Finaliza o fluxo neste ponto.</span>;
  if (block.type === 'ai_agent') {
    const agents = listAIAgents();
    return <label className="f05-inline-field">Agente<select value={value('agentId')} onChange={(e) => set('agentId', e.target.value)}><option value="">Selecione</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>;
  }
  if (block.type === 'chain_flow') {
    return <label className="f05-inline-field">Fluxo<select value={value('botId')} onChange={(e) => set('botId', e.target.value)}><option value="">Selecione</option>{listSalesBots().filter((bot) => bot.id !== botId).map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>;
  }

  const definitions: Partial<Record<SalesBotBlock['type'], Array<[string, string, string]>>> = {
    trigger: [['event', 'Evento', 'Ex.: lead.created']],
    condition: [['expression', 'Condição', 'Ex.: interesse = investimento']],
    delay: [['duration', 'Espera', 'Ex.: 30m, 2h, 1d']],
    message: [['message', 'Mensagem', 'Conteúdo a enviar quando houver canal conectado']],
    move_stage: [['stageId', 'Etapa', 'ID da etapa do CRM']],
    assign_owner: [['userId', 'Responsável', 'ID do usuário']],
    create_task: [['title', 'Tarefa', 'Título da próxima ação']],
    update_field: [['fieldId', 'Campo', 'ID do campo'], ['fieldValue', 'Valor', 'Novo valor']],
    tag: [['operation', 'Operação', 'add ou remove'], ['tagId', 'Tag', 'ID da tag']],
    webhook: [['url', 'Endpoint', 'https://...'], ['method', 'Método', 'POST']],
  };
  return <div className="f05-block-config">{(definitions[block.type] ?? []).map(([key, label, placeholder]) => <label className="f05-inline-field" key={key}>{label}<input value={value(key)} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}/></label>)}</div>;
}

export function SalesBotWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [bots, setBots] = useState(() => listSalesBots());
  const [selectedId, setSelectedId] = useState<string | null>(() => bots[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const selected = useMemo(() => bots.find((bot) => bot.id === selectedId) ?? null, [bots, selectedId]);
  const validationIssues = useMemo(() => selected ? validateSalesBotForActivation(selected) : [], [selected, bots]);

  const refresh = (focusId?: string) => {
    const next = listSalesBots(); setBots(next);
    if (focusId) setSelectedId(focusId);
    else setSelectedId((current) => current && next.some((bot) => bot.id === current) ? current : next[0]?.id ?? null);
  };
  useF05StorageListener(() => refresh());

  const mutate = (operation: () => void, focusId?: string, fallback = 'Não foi possível alterar o SalesBot.') => {
    try {
      operation();
      setError('');
      refresh(focusId);
    } catch (error) {
      setError(errorMessage(error, fallback));
    }
  };

  const create = () => {
    const name = newName.trim(); if (!name || !canManage) return;
    const bot = createSalesBot({ name }); setNewName(''); setError(''); refresh(bot.id);
  };
  const patchSelected = (patch: Partial<Pick<SalesBotDefinition, 'name' | 'description'>>) => {
    if (!selected || !canManage) return;
    mutate(() => { updateSalesBot(selected.id, patch); }, selected.id);
  };

  return <section className="f05-module">
    <header className="f05-module__header"><div><span className="f05-kicker">SalesBot</span><h2>Construtor visual de fluxos</h2><p>Crie bots do zero, organize blocos e configure cada ação sem pré-cadastrar operação real.</p></div><span className="f05-count">{bots.length} bot{bots.length === 1 ? '' : 's'}</span></header>
    {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar SalesBots, mas não alterá-los.</div> : null}
    <fieldset className="f05-readonly-fieldset" disabled={!canManage}><div className="f05-create-row"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do novo SalesBot"/><button onClick={create} disabled={!newName.trim()}>Criar bot</button></div></fieldset>
    {error && <div className="f05-alert">{error}</div>}
    <div className="f05-split">
      <aside className="f05-list">{bots.length === 0 ? <div className="f05-empty">Nenhum SalesBot criado.</div> : bots.map((bot) => <button key={bot.id} className={`f05-list-item ${selectedId === bot.id ? 'is-active' : ''}`} onClick={() => { setSelectedId(bot.id); setError(''); }}><strong>{bot.name}</strong><span>{bot.status} · {bot.blocks.length} blocos</span></button>)}</aside>
      <fieldset className="f05-editor f05-readonly-fieldset" disabled={!canManage}>{!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um SalesBot para editar.</div> : <>
        <div className="f05-form-grid"><label>Nome<input value={selected.name} onChange={(e) => patchSelected({ name: e.target.value })}/></label><label>Descrição<input value={selected.description} onChange={(e) => patchSelected({ description: e.target.value })} placeholder="Objetivo interno do fluxo"/></label></div>
        <div className={`f05-validation ${validationIssues.length === 0 ? 'f05-validation--ok' : ''}`}><strong>{validationIssues.length === 0 ? 'Configuração válida para ativação' : `${validationIssues.length} pendência(s) de configuração`}</strong>{validationIssues.length > 0 && <span>{validationIssues[0]}</span>}</div>
        <div className="f05-actions"><button onClick={() => mutate(() => { setSalesBotStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); }, selected.id, 'Não foi possível alterar o status.')}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button><button className="secondary" onClick={() => { try { const copy = duplicateSalesBot(selected.id); setError(''); refresh(copy.id); } catch (error) { setError(errorMessage(error, 'Não foi possível duplicar o SalesBot.')); } }}>Duplicar</button><button className="danger" onClick={() => { if (window.confirm('Excluir este SalesBot?')) mutate(() => { deleteSalesBot(selected.id); }, undefined, 'Não foi possível excluir o SalesBot.'); }}>Excluir</button></div>
        <div className="f05-palette"><h3>Adicionar bloco</h3><div className="f05-palette__grid">{SALESBOT_BLOCK_CATALOG.map((item) => <button key={item.type} className="secondary" onClick={() => mutate(() => { addSalesBotBlock(selected.id, { type: item.type, label: item.label, config: {} }); }, selected.id, 'Não foi possível adicionar o bloco.')}>{item.label}</button>)}</div></div>
        <div className="f05-flow">{selected.blocks.length === 0 ? <div className="f05-empty">Fluxo vazio. Adicione o primeiro bloco.</div> : selected.blocks.map((block, index) => {
          const meta = SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type);
          return <div className="f05-block f05-block--stacked" key={block.id}><div className="f05-block__row"><div className="f05-block__index">{index + 1}</div><div className="f05-block__body"><strong>{block.label}</strong><span>{meta?.description}</span></div><div className="f05-block__actions"><button className="icon" disabled={index === 0} onClick={() => mutate(() => { moveSalesBotBlock(selected.id, block.id, -1); }, selected.id)}>↑</button><button className="icon" disabled={index === selected.blocks.length - 1} onClick={() => mutate(() => { moveSalesBotBlock(selected.id, block.id, 1); }, selected.id)}>↓</button><button className="icon danger" onClick={() => mutate(() => { removeSalesBotBlock(selected.id, block.id); }, selected.id, 'Não foi possível remover o bloco.')}>×</button></div></div><BlockConfigEditor botId={selected.id} block={block} onChange={() => refresh(selected.id)} onError={setError}/></div>;
        })}</div>
      </>}</fieldset>
    </div>
  </section>;
}
