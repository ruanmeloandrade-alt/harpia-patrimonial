import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { listAIAgents } from '../ai-agents/repository';
import { useF05StorageListener } from '../automations/useF05StorageListener';
import { SALESBOT_BLOCK_CATALOG } from './blockCatalog';
import {
  createSalesBotConfirmed,
  deleteSalesBot,
  duplicateSalesBot,
  insertSalesBotBlockAfter,
  listSalesBots,
  setSalesBotStatus,
  updateSalesBot,
  updateSalesBotBlock,
  validateSalesBotForActivation,
} from './repository';
import type { SalesBotBlock, SalesBotBlockConfigValue, SalesBotDefinition } from './types';

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1200;
const NODE_WIDTH = 220;
const NODE_PORT_Y = 72;

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

function cloneBlocks(blocks: SalesBotBlock[]) {
  return blocks.map((block) => ({
    ...block,
    config: { ...block.config },
    routes: { ...(block.routes ?? {}) },
  }));
}

function blockPosition(block: SalesBotBlock, index: number) {
  return {
    x: Number.isFinite(block.x) ? Number(block.x) : 80 + (index % 4) * 270,
    y: Number.isFinite(block.y) ? Number(block.y) : 90 + Math.floor(index / 4) * 180,
  };
}

function blockSummary(block: SalesBotBlock) {
  if (block.type === 'trigger') return 'O fluxo começa aqui';
  if (block.type === 'condition') return String(block.config.expression || 'Configure a condição');
  if (block.type === 'delay') return String(block.config.duration || 'Configure a pausa');
  if (block.type === 'message') return String(block.config.message || 'Configure a mensagem');
  if (block.type === 'ai_agent') {
    const agent = listAIAgents().find((item) => item.id === String(block.config.agentId || ''));
    return agent ? `Agente: ${agent.name}` : 'Selecione o agente IA';
  }
  if (block.type === 'finish') return 'Finaliza a execução';
  return SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type)?.description || block.label;
}

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
    return <div className="sb-mini-note">Bloco inicial do SalesBot. Ele não pode ser excluído.</div>;
  }
  if (block.type === 'finish') {
    return <div className="sb-mini-note">Encerra o SalesBot neste ponto.</div>;
  }
  if (block.type === 'ai_agent') {
    const agents = listAIAgents().filter((agent) => agent.status === 'active');
    return <div className="sb-field"><label>Agente IA</label><select value={value('agentId')} onChange={(event) => patch({ agentId: event.target.value })}><option value="">Selecione o agente</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div>;
  }
  if (block.type === 'chain_flow') {
    return <div className="sb-field"><label>SalesBot</label><select value={value('botId')} onChange={(event) => patch({ botId: event.target.value })}><option value="">Selecione o SalesBot</option>{listSalesBots().filter((bot) => bot.id !== botId && bot.status === 'active').map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></div>;
  }
  if (block.type === 'condition') {
    const field = value('conditionField') || 'message';
    const operator = value('conditionOperator') || '=';
    const conditionValue = value('conditionValue');
    const saveCondition = (nextField: string, nextOperator: string, nextValue: string) => {
      const expression = nextOperator === 'exists' ? `exists ${nextField}` : `${nextField} ${nextOperator} ${nextValue}`;
      patch({ conditionField: nextField, conditionOperator: nextOperator, conditionValue: nextValue, expression });
    };
    return <div>
      <div className="sb-field"><label>Campo</label><select value={field} onChange={(event) => saveCondition(event.target.value, operator, conditionValue)}>{fieldOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <div className="sb-field"><label>Operador</label><select value={operator} onChange={(event) => saveCondition(field, event.target.value, conditionValue)}>{operatorOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      {operator !== 'exists' ? <div className="sb-field"><label>Valor</label><input value={conditionValue} onChange={(event) => saveCondition(field, operator, event.target.value)} placeholder="Valor esperado"/></div> : null}
      <div className="sb-mini-note">A saída Sim continua o fluxo quando a regra for satisfeita. A saída Não usa a conexão alternativa.</div>
    </div>;
  }
  if (block.type === 'delay') {
    return <div>
      <div className="sb-field"><label>Tipo de pausa</label><select value={value('pauseMode') || 'timer'} onChange={(event) => patch({ pauseMode: event.target.value })}><option value="timer">Cronômetro</option></select></div>
      <div className="sb-field"><label>Duração</label><select value={value('duration') || ''} onChange={(event) => patch({ duration: event.target.value, pauseMode: 'timer' })}><option value="">Selecione</option><option value="30s">30 segundos</option><option value="1m">1 minuto</option><option value="5m">5 minutos</option><option value="15m">15 minutos</option><option value="30m">30 minutos</option><option value="1h">1 hora</option><option value="2h">2 horas</option><option value="1d">1 dia</option></select></div>
    </div>;
  }
  if (block.type === 'message') {
    const buttons = Array.isArray(block.config.buttons) ? block.config.buttons.map(String) : [];
    return <div>
      <div className="sb-field"><label>Mensagem</label><textarea value={value('message')} onChange={(event) => patch({ message: event.target.value })} placeholder="Mensagem enviada ao cliente"/></div>
      <div className="sb-field"><label>Botões da mensagem</label><div className="sb-choice-list">{buttons.map((button, index) => <div className="sb-choice-row" key={index}><input value={button} onChange={(event) => patch({ buttons: buttons.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })}/><button type="button" onClick={() => patch({ buttons: buttons.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>)}</div><button className="sb-add-small" type="button" onClick={() => patch({ buttons: [...buttons, `Botão ${buttons.length + 1}`] })}>+ Adicionar botão</button></div>
    </div>;
  }
  if (block.type === 'tag') {
    return <div><div className="sb-field"><label>Ação</label><select value={value('operation') || 'add'} onChange={(event) => patch({ operation: event.target.value })}><option value="add">Adicionar tag</option><option value="remove">Remover tag</option></select></div><div className="sb-field"><label>Tag</label><input value={value('tagId')} onChange={(event) => patch({ tagId: event.target.value })}/></div></div>;
  }
  if (block.type === 'webhook') {
    return <div><div className="sb-field"><label>Método</label><select value={value('method') || 'POST'} onChange={(event) => patch({ method: event.target.value })}><option>POST</option><option>PUT</option><option>PATCH</option></select></div><div className="sb-field"><label>Endpoint</label><input value={value('url')} onChange={(event) => patch({ url: event.target.value })} placeholder="https://..."/></div></div>;
  }

  const definitions: Partial<Record<SalesBotBlock['type'], Array<[string, string, string]>>> = {
    move_stage: [['stageId', 'Etapa de destino', 'Selecione a etapa']],
    assign_owner: [['userId', 'Responsável', 'Selecione o responsável']],
    create_task: [['title', 'Tarefa', 'Título da tarefa']],
    update_field: [['fieldId', 'Campo', 'Selecione o campo'], ['fieldValue', 'Valor', 'Novo valor']],
  };
  return <div>{(definitions[block.type] ?? []).map(([key, label, placeholder]) => <div className="sb-field" key={key}><label>{label}</label><input value={value(key)} onChange={(event) => patch({ [key]: event.target.value })} placeholder={placeholder}/></div>)}</div>;
}

function CanvasConnections({
  blocks,
  positions,
}: {
  blocks: SalesBotBlock[];
  positions: Map<string, { x: number; y: number }>;
}) {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const pathFor = (fromId: string, toId: string, offset = 0) => {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    if (!from || !to || !byId.has(fromId) || !byId.has(toId)) return '';
    const x1 = from.x + NODE_WIDTH;
    const y1 = from.y + NODE_PORT_Y + offset;
    const x2 = to.x;
    const y2 = to.y + 48;
    const mid = x1 + Math.max(70, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  };

  const lines: Array<{ key: string; d: string; kind: 'normal' | 'yes' | 'no' }> = [];
  blocks.forEach((block) => {
    if (block.nextBlockId) lines.push({ key: `${block.id}:next`, d: pathFor(block.id, block.nextBlockId, block.type === 'condition' ? -8 : 0), kind: block.type === 'condition' ? 'yes' : 'normal' });
    if (block.falseNextBlockId) lines.push({ key: `${block.id}:false`, d: pathFor(block.id, block.falseNextBlockId, 10), kind: 'no' });
  });

  return <svg className="sb-connections" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-hidden="true">
    <defs>
      <marker id="sbArrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker>
      <marker id="sbArrowYes" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker>
      <marker id="sbArrowNo" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker>
    </defs>
    {lines.map((line) => <path key={line.key} className={`sb-line ${line.kind}`} d={line.d} markerEnd={`url(#${line.kind === 'yes' ? 'sbArrowYes' : line.kind === 'no' ? 'sbArrowNo' : 'sbArrow'})`}/>)}
  </svg>;
}

export function SalesBotWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [bots, setBots] = useState(() => listSalesBots());
  const [mode, setMode] = useState<'library' | 'builder'>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [pendingConnection, setPendingConnection] = useState<{ from: string; branch: 'next' | 'false' } | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>({});
  const historyRef = useRef<SalesBotBlock[][]>([]);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initial: Record<string, { x: number; y: number }>;
    latest: Record<string, { x: number; y: number }>;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => bots.find((bot) => bot.id === selectedId) ?? null, [bots, selectedId]);
  const selectedBlockId = selectedBlockIds.size === 1 ? [...selectedBlockIds][0] : null;
  const selectedBlock = selected?.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const validationIssues = useMemo(() => selected ? validateSalesBotForActivation(selected) : [], [selected]);
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    selected?.blocks.forEach((block, index) => {
      map.set(block.id, draftPositions[block.id] ?? blockPosition(block, index));
    });
    return map;
  }, [selected, draftPositions]);

  const refresh = (focusId?: string) => {
    const next = listSalesBots();
    setBots(next);
    if (focusId) setSelectedId(focusId);
  };

  useF05StorageListener(() => refresh(selectedId ?? undefined));

  const pushHistory = () => {
    if (!selected) return;
    historyRef.current.push(cloneBlocks(selected.blocks));
    if (historyRef.current.length > 60) historyRef.current.shift();
  };

  const undo = () => {
    if (!selected || !canManage) return;
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;
    try {
      updateSalesBot(selected.id, { blocks: cloneBlocks(snapshot) });
      setSelectedBlockIds(new Set());
      setPendingConnection(null);
      setDraftPositions({});
      setNotice('Ação desfeita.');
      setError('');
      refresh(selected.id);
    } catch (undoError) {
      setError(errorMessage(undoError, 'Não foi possível desfazer.'));
    }
  };

  const openBuilder = (id: string) => {
    const bot = listSalesBots().find((item) => item.id === id);
    setSelectedId(id);
    setSelectedBlockIds(new Set(bot?.blocks[0]?.id ? [bot.blocks[0].id] : []));
    setPendingConnection(null);
    setDraftPositions({});
    historyRef.current = [];
    setError('');
    setNotice('');
    setMode('builder');
  };

  const create = async () => {
    const name = newName.trim();
    if (!name || !canManage || creating) return;
    setCreating(true);
    try {
      const bot = await createSalesBotConfirmed({ name });
      setNewName('');
      refresh(bot.id);
      openBuilder(bot.id);
    } catch (createError) {
      setError(errorMessage(createError, 'Não foi possível criar o SalesBot.'));
    } finally {
      setCreating(false);
    }
  };

  const patchSelected = (patch: Partial<Pick<SalesBotDefinition, 'name' | 'description'>>) => {
    if (!selected || !canManage) return;
    try {
      updateSalesBot(selected.id, patch);
      setError('');
      refresh(selected.id);
    } catch (patchError) {
      setError(errorMessage(patchError, 'Não foi possível alterar o SalesBot.'));
    }
  };

  const addBlock = (type: SalesBotBlock['type'], label: string) => {
    if (!selected || !canManage) return;
    const parentId = selectedBlockId || selected.blocks.at(-1)?.id;
    if (!parentId) return;
    pushHistory();
    try {
      const updated = insertSalesBotBlockAfter(selected.id, parentId, { type, label, config: {} });
      const parentIndex = updated.blocks.findIndex((item) => item.id === parentId);
      const created = updated.blocks[parentIndex + 1];
      setSelectedBlockIds(new Set(created?.id ? [created.id] : []));
      setPendingConnection(null);
      setNotice('Bloco adicionado.');
      setError('');
      refresh(selected.id);
    } catch (addError) {
      historyRef.current.pop();
      setError(errorMessage(addError, 'Não foi possível adicionar o bloco.'));
    }
  };

  const deleteSelectedBlocks = () => {
    if (!selected || !canManage) return;
    const kill = new Set([...selectedBlockIds].filter((id) => selected.blocks.find((block) => block.id === id)?.type !== 'trigger'));
    if (!kill.size) return;
    pushHistory();
    try {
      const blocks = selected.blocks
        .filter((block) => !kill.has(block.id))
        .map((block) => ({
          ...block,
          nextBlockId: block.nextBlockId && kill.has(block.nextBlockId) ? null : block.nextBlockId,
          falseNextBlockId: block.falseNextBlockId && kill.has(block.falseNextBlockId) ? null : block.falseNextBlockId,
          routes: Object.fromEntries(Object.entries(block.routes ?? {}).map(([key, target]) => [key, target && kill.has(target) ? null : target])),
        }));
      updateSalesBot(selected.id, { blocks });
      setSelectedBlockIds(new Set([blocks[0]?.id].filter(Boolean) as string[]));
      setPendingConnection(null);
      setNotice(kill.size === 1 ? 'Bloco excluído.' : 'Blocos excluídos.');
      setError('');
      refresh(selected.id);
    } catch (deleteError) {
      historyRef.current.pop();
      setError(errorMessage(deleteError, 'Não foi possível excluir o bloco.'));
    }
  };

  const connectTo = (targetId: string) => {
    if (!selected || !pendingConnection || !canManage || pendingConnection.from === targetId) return false;
    const source = selected.blocks.find((block) => block.id === pendingConnection.from);
    if (!source) return false;
    pushHistory();
    try {
      updateSalesBotBlock(selected.id, source.id, pendingConnection.branch === 'false' ? { falseNextBlockId: targetId } : { nextBlockId: targetId });
      setPendingConnection(null);
      setSelectedBlockIds(new Set([targetId]));
      setNotice('Conexão criada.');
      setError('');
      refresh(selected.id);
      return true;
    } catch (connectError) {
      historyRef.current.pop();
      setError(errorMessage(connectError, 'Não foi possível criar a conexão.'));
      return false;
    }
  };

  const selectBlock = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (pendingConnection && pendingConnection.from !== id) {
      connectTo(id);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedBlockIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedBlockIds(new Set([id]));
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (!selected || !canManage || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const ids = selectedBlockIds.has(id) ? [...selectedBlockIds] : [id];
    if (!selectedBlockIds.has(id)) setSelectedBlockIds(new Set([id]));

    pushHistory();
    const initial: Record<string, { x: number; y: number }> = {};
    ids.forEach((blockId) => {
      const block = selected.blocks.find((item) => item.id === blockId);
      if (!block) return;
      const index = selected.blocks.findIndex((item) => item.id === blockId);
      initial[blockId] = blockPosition(block, index);
    });
    dragRef.current = { startX: event.clientX, startY: event.clientY, initial, latest: initial };

    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;
      const latest: Record<string, { x: number; y: number }> = {};
      Object.entries(drag.initial).forEach(([blockId, position]) => {
        latest[blockId] = {
          x: Math.max(10, Math.min(CANVAS_WIDTH - NODE_WIDTH - 20, position.x + dx)),
          y: Math.max(10, Math.min(CANVAS_HEIGHT - 140, position.y + dy)),
        };
      });
      drag.latest = latest;
      setDraftPositions(latest);
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || !selected) {
        setDraftPositions({});
        return;
      }
      try {
        const blocks = selected.blocks.map((block) => drag.latest[block.id] ? { ...block, ...drag.latest[block.id] } : block);
        updateSalesBot(selected.id, { blocks });
        setDraftPositions({});
        setNotice('Posição salva.');
        setError('');
        refresh(selected.id);
      } catch (dragError) {
        historyRef.current.pop();
        setDraftPositions({});
        setError(errorMessage(dragError, 'Não foi possível mover o bloco.'));
      }
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const disconnect = (block: SalesBotBlock, branch: 'next' | 'false') => {
    if (!selected || !canManage) return;
    pushHistory();
    try {
      updateSalesBotBlock(selected.id, block.id, branch === 'false' ? { falseNextBlockId: null } : { nextBlockId: null });
      setNotice('Conexão removida.');
      setError('');
      refresh(selected.id);
    } catch (disconnectError) {
      historyRef.current.pop();
      setError(errorMessage(disconnectError, 'Não foi possível remover a conexão.'));
    }
  };

  const centerSelected = () => {
    if (!canvasRef.current || !selectedBlockId) return;
    const position = positions.get(selectedBlockId);
    if (!position) return;
    canvasRef.current.scrollTo({ left: Math.max(0, position.x - canvasRef.current.clientWidth / 2 + NODE_WIDTH / 2), top: Math.max(0, position.y - canvasRef.current.clientHeight / 2 + 60), behavior: 'smooth' });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (mode !== 'builder' || !canManage) return;
      const target = event.target as HTMLElement | null;
      const editing = target?.matches('input,textarea,select,[contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !editing) {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !editing && selectedBlockIds.size) {
        event.preventDefault();
        deleteSelectedBlocks();
      }
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
      {canManage ? <div className="sb-library-create"><input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} placeholder="Nome do novo SalesBot"/><button type="button" onClick={() => void create()} disabled={!newName.trim() || creating} aria-busy={creating}>{creating ? 'Criando...' : '+ Novo SalesBot'}</button></div> : null}
      {error ? <div className="f05-alert">{error}</div> : null}
      <div className="sb-library-list">{bots.length === 0 ? <div className="f05-empty f05-empty--large">Nenhum SalesBot criado.</div> : bots.map((bot) => <article className="sb-library-card" key={bot.id}><div><strong>{bot.name}</strong><span>{bot.blocks.length} blocos · {bot.status}</span></div><div className="sb-library-actions"><button type="button" onClick={() => openBuilder(bot.id)}>Editar</button>{canManage ? <button type="button" className="secondary" onClick={() => { try { const copy = duplicateSalesBot(bot.id); refresh(copy.id); } catch (duplicateError) { setError(errorMessage(duplicateError, 'Não foi possível duplicar o SalesBot.')); } }}>Duplicar</button> : null}{canManage ? <button type="button" className="danger" onClick={() => { if (!window.confirm('Excluir este SalesBot?')) return; try { deleteSalesBot(bot.id); refresh(); } catch (deleteError) { setError(errorMessage(deleteError, 'Não foi possível excluir o SalesBot.')); } }}>Excluir</button> : null}</div></article>)}</div>
    </section>;
  }

  return <section id="salesbotBuilder" className="f05-module sb-builder-view">
    <header className="sb-builder-head">
      <div className="sb-builder-left"><button type="button" className="secondary" onClick={() => { setMode('library'); setSelectedBlockIds(new Set()); setPendingConnection(null); }}>← SalesBots</button><div><span className="sb-eyebrow">CONSTRUTOR</span><input className="sb-name-input" disabled={!canManage || !selected} value={selected?.name ?? ''} onChange={(event) => patchSelected({ name: event.target.value })}/><span className="sb-save-state">Persistência compartilhada ativa</span></div></div>
      <div className="sb-builder-actions"><button type="button" className="secondary" onClick={undo} disabled={!canManage || historyRef.current.length === 0}>Desfazer</button><button type="button" className="secondary" onClick={centerSelected}>Centralizar</button><button type="button" className="secondary" onClick={toggleFullscreen}>Expandir tela</button>{selected && canManage ? <button type="button" onClick={() => { try { setSalesBotStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); refresh(selected.id); } catch (statusError) { setError(errorMessage(statusError, 'Não foi possível alterar o status.')); } }}>{selected.status === 'active' ? 'Pausar' : 'Ativar'}</button> : null}</div>
    </header>

    {error ? <div className="f05-alert">{error}</div> : null}
    {notice ? <div className="sb-notice">{notice}</div> : null}
    {!selected ? <div className="f05-empty f05-empty--large">SalesBot não encontrado.</div> : <>
      <div className={`f05-validation ${validationIssues.length === 0 ? 'f05-validation--ok' : ''}`}><strong>{validationIssues.length === 0 ? 'Fluxo válido' : `${validationIssues.length} pendência(s)`}</strong>{validationIssues.length > 0 ? <span>{validationIssues[0]}</span> : <span>O SalesBot pode ser ativado.</span>}</div>
      <div className="sb-builder-body">
        <aside className="sb-palette">
          <div className="sb-palette-title">Blocos</div>
          <div className="sb-palette-list">{SALESBOT_BLOCK_CATALOG.map((item) => <button type="button" key={item.type} disabled={!canManage} onClick={() => addBlock(item.type, item.label)}><b>+</b><span>{item.label}</span></button>)}</div>
        </aside>

        <div className="sb-canvas-wrap">
          <div className="sb-canvas-toolbar"><span>{pendingConnection ? 'Clique no bloco que deve receber esta seta.' : 'Arraste os blocos pelo cabeçalho. Ctrl + clique seleciona vários. Ctrl + Z desfaz.'}</span><button type="button" onClick={() => { setPendingConnection(null); setSelectedBlockIds(new Set()); }}>Limpar seleção</button></div>
          <div className="sb-canvas" ref={canvasRef} onClick={() => { if (!pendingConnection) setSelectedBlockIds(new Set()); }}>
            <div className="sb-canvas-stage" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
              <CanvasConnections blocks={selected.blocks} positions={positions}/>
              <div className="sb-nodes" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                {selected.blocks.map((block, index) => {
                  const position = positions.get(block.id) ?? blockPosition(block, index);
                  const isSelected = selectedBlockIds.has(block.id);
                  const isStart = block.type === 'trigger';
                  const typeLabel = SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type)?.label || block.label;
                  return <article key={block.id} className={`sb-node ${isStart ? 'sb-start-node' : ''} ${isSelected ? 'selected' : ''}`} style={{ left: position.x, top: position.y }} onClick={(event) => selectBlock(event, block.id)}>
                    <div className="sb-node-head" onPointerDown={(event) => startDrag(event, block.id)}>
                      <div className="sb-node-head-left"><span className="sb-node-type">{isStart ? '▶' : index}</span><b>{isStart ? 'Iniciar SalesBot' : block.label}</b></div>
                      {isStart ? <span className="sb-start-lock">PADRÃO</span> : <button type="button" className="sb-node-menu" onClick={(event) => { event.stopPropagation(); setSelectedBlockIds(new Set([block.id])); }}>•••</button>}
                    </div>
                    <div className="sb-node-body">{blockSummary(block)}</div>
                    <div className="sb-node-foot">
                      {block.type === 'finish' ? <span className="sb-end-label">Fim</span> : block.type === 'condition' ? <>
                        <button type="button" className={`sb-port-label ${pendingConnection?.from === block.id && pendingConnection.branch === 'next' ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setPendingConnection({ from: block.id, branch: 'next' }); }}>Sim <i className="sb-port true"/></button>
                        <button type="button" className={`sb-port-label ${pendingConnection?.from === block.id && pendingConnection.branch === 'false' ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setPendingConnection({ from: block.id, branch: 'false' }); }}>Não <i className="sb-port false"/></button>
                      </> : <button type="button" className={`sb-port-label ${pendingConnection?.from === block.id ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setPendingConnection({ from: block.id, branch: 'next' }); }}>Próximo <i className="sb-port"/></button>}
                    </div>
                    <span className="sb-node-kind">{typeLabel}</span>
                  </article>;
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="sb-inspector">
          {selectedBlockIds.size > 1 ? <div className="sb-inspector-bulk"><strong>{selectedBlockIds.size} blocos selecionados</strong><span>Arrastar um bloco selecionado move o grupo inteiro.</span>{canManage ? <button type="button" className="sb-danger-wide" onClick={deleteSelectedBlocks}>Excluir selecionados</button> : null}</div> : selectedBlock ? <>
            <div className="sb-inspector-head"><div><span className="sb-eyebrow">{selectedBlock.type === 'trigger' ? 'INÍCIO' : selectedBlock.label}</span><h3>Configurar bloco</h3></div>{selectedBlock.type !== 'trigger' && canManage ? <button type="button" onClick={deleteSelectedBlocks}>Excluir</button> : null}</div>
            {selectedBlock.type !== 'trigger' && canManage ? <div className="sb-field"><label>Nome do bloco</label><input value={selectedBlock.label} onChange={(event) => { try { updateSalesBotBlock(selected.id, selectedBlock.id, { label: event.target.value }); refresh(selected.id); } catch (labelError) { setError(errorMessage(labelError, 'Não foi possível renomear o bloco.')); } }}/></div> : null}
            <BlockConfigEditor botId={selected.id} block={selectedBlock} onChange={() => refresh(selected.id)} onError={setError}/>
            <div className="sb-connection-list">
              {selectedBlock.nextBlockId ? <div className="sb-connection-row"><span>{selectedBlock.type === 'condition' ? 'Saída Sim conectada' : 'Saída principal conectada'}</span>{canManage ? <button type="button" onClick={() => disconnect(selectedBlock, 'next')}>Desconectar</button> : null}</div> : null}
              {selectedBlock.falseNextBlockId ? <div className="sb-connection-row"><span>Saída Não conectada</span>{canManage ? <button type="button" onClick={() => disconnect(selectedBlock, 'false')}>Desconectar</button> : null}</div> : null}
            </div>
          </> : <div className="sb-inspector-empty"><b>Configuração do bloco</b><span>Selecione um bloco no canvas para editar.</span></div>}
        </aside>
      </div>
    </>}
  </section>;
}
