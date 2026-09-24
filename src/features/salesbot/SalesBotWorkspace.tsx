import { useEffect, useMemo, useState } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { SALESBOT_BLOCK_CATALOG } from './blockCatalog';
import {
  createSalesBotConfirmed,
  deleteSalesBot,
  duplicateSalesBot,
  duplicateSalesBotBlock,
  insertSalesBotBlockAfter,
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
const fieldOptions = [
  ['message', 'Mensagem do cliente'],
  ['comment', 'Comentário do cliente'],
  ['leadSource', 'Fonte do lead'],
  ['leadTag', 'Tag do lead'],
  ['currentStage', 'Etapa atual'],
  ['customField', 'Campo personalizado'],
] as const;
const operatorOptions = [
  ['=', 'É igual a'],
  ['!=', 'É diferente de'],
  ['contains', 'Contém'],
  ['exists', 'Existe'],
] as const;

function BlockConfigEditor({ botId, block, onChange, onError }: {
  botId: string;
  block: SalesBotBlock;
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const patch = (changes: Record<string, SalesBotBlockConfigValue>) => {
    try {
      updateSalesBotBlock(botId, block.id, { config: { ...block.config, ...changes } });
      onError('');
      onChange();
    } catch (error) {
      onError(errorMessage(error, 'Não foi possível alterar o bloco.'));
    }
  };
  const value = (key: string) => String(block.config[key] ?? '');

  if (block.type === 'trigger') {
    return <div className="sb-inline-note">Este bloco inicia o SalesBot automaticamente. Não precisa de configuração.</div>;
  }
  if (block.type === 'finish') {
    return <div className="sb-inline-note">Este bloco encerra a execução do SalesBot.</div>;
  }
  if (block.type === 'ai_agent') {
    const agents = listAIAgents().filter((agent) => agent.status === 'active');
    return <div className="sb-inline-grid"><label>Agente IA<select value={value('agentId')} onChange={(e) => patch({ agentId: e.target.value })}><option value="">Selecione o agente</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div>;
  }
  if (block.type === 'chain_flow') {
    return <div className="sb-inline-grid"><label>SalesBot<select value={value('botId')} onChange={(e) => patch({ botId: e.target.value })}><option value="">Selecione o SalesBot</option>{listSalesBots().filter((bot) => bot.id !== botId && bot.status === 'active').map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label></div>;
  }
  if (block.type === 'condition') {
    const field = value('conditionField') || 'message';
    const operator = value('conditionOperator') || '=';
    const conditionValue = value('conditionValue');
    const saveCondition = (nextField: string, nextOperator: string, nextValue: string) => {
      const expression = nextOperator === 'exists' ? `exists ${nextField}` : `${nextField} ${nextOperator} ${nextValue}`;
      patch({ conditionField: nextField, conditionOperator: nextOperator, conditionValue: nextValue, expression });
    };
    return <div className="sb-inline-grid sb-inline-grid--3">
      <label>Se<select value={field} onChange={(e) => saveCondition(e.target.value, operator, conditionValue)}>{fieldOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Operador<select value={operator} onChange={(e) => saveCondition(field, e.target.value, conditionValue)}>{operatorOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {operator !== 'exists' ? <label>Valor<input value={conditionValue} onChange={(e) => saveCondition(field, operator, e.target.value)} placeholder="Defina o valor"/></label> : <div className="sb-inline-note">A condição será verdadeira quando esse dado existir.</div>}
    </div>;
  }
  if (block.type === 'delay') {
    return <div className="sb-inline-grid sb-inline-grid--2"><label>Tipo de pausa<select value={value('pauseMode') || 'timer'} onChange={(e) => patch({ pauseMode: e.target.value })}><option value="timer">Cronômetro</option><option value="reply" disabled>Aguardar resposta do cliente</option><option value="audio_open" disabled>Áudio aberto</option><option value="video_open" disabled>Vídeo aberto</option><option value="business_hours" disabled>Horário de expediente</option></select></label><label>Tempo<select value={value('duration') || ''} onChange={(e) => patch({ duration: e.target.value, pauseMode: 'timer' })}><option value="">Selecione</option><option value="30s">30 segundos</option><option value="1m">1 minuto</option><option value="5m">5 minutos</option><option value="15m">15 minutos</option><option value="30m">30 minutos</option><option value="1h">1 hora</option><option value="2h">2 horas</option><option value="1d">1 dia</option></select></label></div>;
  }
  if (block.type === 'message') {
    const buttons = Array.isArray(block.config.buttons) ? block.config.buttons.map(String) : [];
    const updateButton = (index: number, label: string) => patch({ buttons: buttons.map((item, itemIndex) => itemIndex === index ? label : item) });
    return <div className="sb-message-config"><label>Mensagem<textarea value={value('message')} onChange={(e) => patch({ message: e.target.value })} placeholder="Digite a mensagem"/></label><div className="sb-button-editor"><div className="sb-button-editor__head"><strong>Botões da mensagem</strong><button type="button" className="secondary" onClick={() => patch({ buttons: [...buttons, `Botão ${buttons.length + 1}`] })}>+ Botão</button></div>{buttons.map((button, index) => <div className="sb-button-row" key={index}><input value={button} onChange={(e) => updateButton(index, e.target.value)} placeholder={`Botão ${index + 1}`}/><span className="sb-output-dot" title="Saída própria deste botão"/><button type="button" className="icon danger" onClick={() => patch({ buttons: buttons.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>)}</div></div>;
  }
  if (block.type === 'tag') {
    return <div className="sb-inline-grid sb-inline-grid--2"><label>Ação<select value={value('operation') || 'add'} onChange={(e) => patch({ operation: e.target.value })}><option value="add">Adicionar tag</option><option value="remove">Remover tag</option></select></label><label>Tag<input value={value('tagId')} onChange={(e) => patch({ tagId: e.target.value })} placeholder="Selecione ou informe a tag"/></label></div>;
  }
  if (block.type === 'webhook') {
    return <div className="sb-inline-grid sb-inline-grid--2"><label>Método<select value={value('method') || 'POST'} onChange={(e) => patch({ method: e.target.value })}><option>POST</option><option>PUT</option><option>PATCH</option></select></label><label>Endpoint<input value={value('url')} onChange={(e) => patch({ url: e.target.value })} placeholder="https://..."/></label></div>;
  }

  const definitions: Partial<Record<SalesBotBlock['type'], Array<[string, string, string]>>> = {
    move_stage: [['stageId', 'Etapa de destino', 'Selecione a etapa']],
    assign_owner: [['userId', 'Responsável', 'Selecione o responsável']],
    create_task: [['title', 'Tarefa', 'Título da tarefa']],
    update_field: [['fieldId', 'Campo', 'Selecione o campo'], ['fieldValue', 'Valor', 'Novo valor']],
  };
  return <div className="sb-inline-grid sb-inline-grid--2">{(definitions[block.type] ?? []).map(([key, label, placeholder]) => <label key={key}>{label}<input value={value(key)} onChange={(e) => patch({ [key]: e.target.value })} placeholder={placeholder}/></label>)}</div>;
}

function NodeOutputs({ block, hasNext }: { block: SalesBotBlock; hasNext: boolean }) {
  const buttons = block.type === 'message' && Array.isArray(block.config.buttons) ? block.config.buttons.map(String) : [];
  if (block.type === 'finish') return null;
  if (block.type === 'condition') return <div className="sb-node-outputs"><span><i className="sb-output-dot yes"/>Sim</span><span><i className="sb-output-dot no"/>Não</span></div>;
  if (block.type === 'message' && buttons.length) return <div className="sb-node-outputs"><span><i className="sb-output-dot"/>Continuar</span>{buttons.map((label, index) => <span key={index}><i className="sb-output-dot route"/>{label || `Botão ${index + 1}`}</span>)}</div>;
  return <div className="sb-node-outputs"><span><i className="sb-output-dot"/>{hasNext ? 'Próximo bloco' : 'Saída'}</span></div>;
}

export function SalesBotWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [bots, setBots] = useState(() => listSalesBots());
  const [mode, setMode] = useState<'library' | 'builder'>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pickerAfterId, setPickerAfterId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const selected = useMemo(() => bots.find((bot) => bot.id === selectedId) ?? null, [bots, selectedId]);
  const validationIssues = useMemo(() => selected ? validateSalesBotForActivation(selected) : [], [selected, bots]);

  const refresh = (focusId?: string) => {
    const next = listSalesBots();
    setBots(next);
    if (focusId) setSelectedId(focusId);
  };
  useF05StorageListener(() => refresh(selectedId ?? undefined));

  const mutate = (operation: () => void, fallback = 'Não foi possível alterar o SalesBot.') => {
    try { operation(); setError(''); refresh(selectedId ?? undefined); }
    catch (error) { setError(errorMessage(error, fallback)); }
  };

  const openBuilder = (id: string) => {
    const bot = listSalesBots().find((item) => item.id === id);
    setSelectedId(id);
    setSelectedBlockId(bot?.blocks[0]?.id ?? null);
    setPickerAfterId(null);
    setError('');
    setMode('builder');
  };
  const create = async () => {
    const name = newName.trim();
    if (!name || !canManage || creating) return;
    setCreating(true);
    try {
      const bot = await createSalesBotConfirmed({ name });
      setNewName('');
      setError('');
      refresh(bot.id);
      openBuilder(bot.id);
    } catch (error) {
      setError(errorMessage(error, 'Não foi possível criar o SalesBot.'));
    } finally {
      setCreating(false);
    }
  };
  const patchSelected = (patch: Partial<Pick<SalesBotDefinition, 'name' | 'description'>>) => {
    if (!selected || !canManage) return;
    mutate(() => { updateSalesBot(selected.id, patch); });
  };
  const addAfter = (afterBlockId: string, type: SalesBotBlock['type'], label: string) => {
    if (!selected) return;
    try {
      const updated = insertSalesBotBlockAfter(selected.id, afterBlockId, { type, label, config: {} });
      const index = updated.blocks.findIndex((item) => item.id === afterBlockId);
      const created = updated.blocks[index + 1];
      setError('');
      setBots(listSalesBots());
      setSelectedBlockId(created?.id ?? null);
      setPickerAfterId(null);
    } catch (error) { setError(errorMessage(error, 'Não foi possível adicionar o bloco.')); }
  };
  const duplicateBlock = () => {
    if (!selected || !selectedBlockId) return;
    const block = selected.blocks.find((item) => item.id === selectedBlockId);
    if (!block || block.type === 'trigger') return;
    mutate(() => { duplicateSalesBotBlock(selected.id, block.id); }, 'Não foi possível duplicar o bloco.');
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (mode !== 'builder' || !canManage || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'd') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input,textarea,select,[contenteditable="true"]')) return;
      event.preventDefault();
      duplicateBlock();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const toggleFullscreen = async () => {
    const builder = document.getElementById('salesbotBuilder');
    if (!builder) return;
    if (!document.fullscreenElement) await builder.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  if (mode === 'library') {
    return <section className="f05-module sb-library-view">
      <header className="f05-module__header"><div><span className="f05-kicker">SalesBot</span><h2>SalesBots</h2><p>Abra um bot para editar o fluxo ou crie um novo.</p></div><span className="f05-count">{bots.length} bot{bots.length === 1 ? '' : 's'}</span></header>
      {!canManage ? <div className="f05-readonly-note">Modo leitura: sua permissão permite visualizar SalesBots, mas não alterá-los.</div> : null}
      {canManage ? <div className="sb-library-create"><input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} placeholder="Nome do novo SalesBot"/><button type="button" onClick={() => void create()} disabled={!newName.trim() || creating} aria-busy={creating}>{creating ? 'Criando...' : '+ Novo SalesBot'}</button></div> : null}
      {error && <div className="f05-alert">{error}</div>}
      <div className="sb-library-list">{bots.length === 0 ? <div className="f05-empty f05-empty--large">Nenhum SalesBot criado.</div> : bots.map((bot) => <article className="sb-library-card" key={bot.id}><div><strong>{bot.name}</strong><span>{bot.blocks.length} blocos · {bot.status}</span></div><div className="sb-library-actions"><button type="button" onClick={() => openBuilder(bot.id)}>Editar</button>{canManage ? <button type="button" className="secondary" onClick={() => { try { const copy = duplicateSalesBot(bot.id); refresh(copy.id); } catch (error) { setError(errorMessage(error, 'Não foi possível duplicar o SalesBot.')); } }}>Duplicar</button> : null}</div></article>)}</div>
    </section>;
  }

  return <section id="salesbotBuilder" className="f05-module sb-builder-view">
    <header className="sb-builder-top"><div className="sb-builder-title"><button type="button" className="secondary" onClick={() => { setMode('library'); setPickerAfterId(null); }}>← SalesBots</button><div><span className="f05-kicker">Construtor</span><input className="sb-builder-name" disabled={!canManage || !selected} value={selected?.name ?? ''} onChange={(e) => patchSelected({ name: e.target.value })}/></div></div><div className="sb-builder-tools"><button type="button" className="secondary" onClick={toggleFullscreen}>Expandir tela</button>{selected && canManage ? <button type="button" onClick={() => mutate(() => { setSalesBotStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); }, 'Não foi possível alterar o status.')}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button> : null}</div></header>
    {error && <div className="f05-alert">{error}</div>}
    {!selected ? <div className="f05-empty f05-empty--large">SalesBot não encontrado.</div> : <>
      <div className={`f05-validation ${validationIssues.length === 0 ? 'f05-validation--ok' : ''}`}><strong>{validationIssues.length === 0 ? 'Fluxo válido' : `${validationIssues.length} pendência(s)`}</strong>{validationIssues.length > 0 ? <span>{validationIssues[0]}</span> : <span>O SalesBot pode ser ativado.</span>}</div>
      <div className="sb-canvas-area">
        <div className="sb-flow-column">{selected.blocks.map((block, index) => {
          const meta = SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type);
          const isStart = block.type === 'trigger';
          const isSelected = selectedBlockId === block.id;
          const hasNext = index < selected.blocks.length - 1;
          return <div className="sb-flow-step" key={block.id}>
            <article className={`sb-flow-node ${isStart ? 'is-start' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => setSelectedBlockId(block.id)}>
              <div className="sb-flow-node__head"><div><span className="sb-node-index">{isStart ? '▶' : index}</span><div><strong>{isStart ? 'Iniciar SalesBot' : block.label}</strong><small>{isStart ? 'Início automático do fluxo' : meta?.description}</small></div></div>{!isStart && canManage ? <div className="sb-node-actions"><button type="button" className="icon secondary" disabled={index <= 1} onClick={(e) => { e.stopPropagation(); mutate(() => moveSalesBotBlock(selected.id, block.id, -1)); }}>↑</button><button type="button" className="icon secondary" disabled={index === selected.blocks.length - 1} onClick={(e) => { e.stopPropagation(); mutate(() => moveSalesBotBlock(selected.id, block.id, 1)); }}>↓</button><button type="button" className="icon danger" onClick={(e) => { e.stopPropagation(); mutate(() => removeSalesBotBlock(selected.id, block.id), 'Não foi possível remover o bloco.'); }}>×</button></div> : null}</div>
              <div className="sb-flow-node__config"><BlockConfigEditor botId={selected.id} block={block} onChange={() => refresh(selected.id)} onError={setError}/></div>
              <NodeOutputs block={block} hasNext={hasNext}/>
            </article>
            {block.type !== 'finish' ? <div className="sb-next-area"><div className={`sb-cable ${hasNext ? 'is-connected' : ''}`}><i/></div>{canManage ? <button type="button" className="sb-next-button" onClick={() => setPickerAfterId(pickerAfterId === block.id ? null : block.id)}>+ Próximo passo</button> : null}{pickerAfterId === block.id ? <div className="sb-next-picker"><strong>Escolha o próximo bloco</strong><div>{SALESBOT_BLOCK_CATALOG.map((item) => <button type="button" key={item.type} className="secondary" onClick={() => addAfter(block.id, item.type, item.label)}><b>{item.label}</b><small>{item.description}</small></button>)}</div></div> : null}</div> : null}
          </div>;
        })}</div>
        <aside className="sb-minimap"><strong>Mapa</strong>{selected.blocks.map((block, index) => <button type="button" key={block.id} className={selectedBlockId === block.id ? 'active' : ''} onClick={() => { setSelectedBlockId(block.id); document.querySelectorAll('.sb-flow-node')[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>{index === 0 ? '▶' : index}</button>)}</aside>
      </div>
      <div className="sb-builder-hint">Selecione um bloco e use <b>Ctrl + D</b> para duplicá-lo. O bloco Iniciar SalesBot é fixo.</div>
    </>}
  </section>;
}
