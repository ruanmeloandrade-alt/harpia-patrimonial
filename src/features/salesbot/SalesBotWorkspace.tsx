import { useMemo, useState } from 'react';
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
} from './repository';
import type { SalesBotDefinition } from './types';

export function SalesBotWorkspace() {
  const [bots, setBots] = useState(() => listSalesBots());
  const [selectedId, setSelectedId] = useState<string | null>(() => bots[0]?.id ?? null);
  const [newName, setNewName] = useState('');

  const selected = useMemo(() => bots.find((bot) => bot.id === selectedId) ?? null, [bots, selectedId]);
  const refresh = (focusId?: string) => {
    const next = listSalesBots();
    setBots(next);
    if (focusId) setSelectedId(focusId);
    else if (selectedId && !next.some((bot) => bot.id === selectedId)) setSelectedId(next[0]?.id ?? null);
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const bot = createSalesBot({ name });
    setNewName('');
    refresh(bot.id);
  };

  const patchSelected = (patch: Partial<Pick<SalesBotDefinition, 'name' | 'description'>>) => {
    if (!selected) return;
    updateSalesBot(selected.id, patch);
    refresh(selected.id);
  };

  return (
    <section className="f05-module">
      <header className="f05-module__header">
        <div>
          <span className="f05-kicker">SalesBot</span>
          <h2>Construtor visual de fluxos</h2>
          <p>Crie a estrutura do bot por blocos. Nenhum bot operacional é criado automaticamente.</p>
        </div>
        <span className="f05-count">{bots.length} bot{bots.length === 1 ? '' : 's'}</span>
      </header>

      <div className="f05-create-row">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome do novo SalesBot" />
        <button onClick={create} disabled={!newName.trim()}>Criar bot</button>
      </div>

      <div className="f05-split">
        <aside className="f05-list">
          {bots.length === 0 ? (
            <div className="f05-empty">Nenhum SalesBot criado.</div>
          ) : bots.map((bot) => (
            <button key={bot.id} className={`f05-list-item ${selectedId === bot.id ? 'is-active' : ''}`} onClick={() => setSelectedId(bot.id)}>
              <strong>{bot.name}</strong>
              <span>{bot.status} · {bot.blocks.length} blocos</span>
            </button>
          ))}
        </aside>

        <div className="f05-editor">
          {!selected ? <div className="f05-empty f05-empty--large">Crie ou selecione um SalesBot para editar.</div> : <>
            <div className="f05-form-grid">
              <label>Nome<input value={selected.name} onChange={(event) => patchSelected({ name: event.target.value })} /></label>
              <label>Descrição<input value={selected.description} onChange={(event) => patchSelected({ description: event.target.value })} placeholder="Objetivo interno do fluxo" /></label>
            </div>

            <div className="f05-actions">
              <button onClick={() => { setSalesBotStatus(selected.id, selected.status === 'active' ? 'paused' : 'active'); refresh(selected.id); }}>
                {selected.status === 'active' ? 'Pausar' : 'Ativar'}
              </button>
              <button className="secondary" onClick={() => { const copy = duplicateSalesBot(selected.id); refresh(copy.id); }}>Duplicar</button>
              <button className="danger" onClick={() => { if (window.confirm('Excluir este SalesBot?')) { deleteSalesBot(selected.id); refresh(); } }}>Excluir</button>
            </div>

            <div className="f05-palette">
              <h3>Adicionar bloco</h3>
              <div className="f05-palette__grid">
                {SALESBOT_BLOCK_CATALOG.map((item) => (
                  <button key={item.type} className="secondary" onClick={() => {
                    addSalesBotBlock(selected.id, { type: item.type, label: item.label, config: {} });
                    refresh(selected.id);
                  }}>{item.label}</button>
                ))}
              </div>
            </div>

            <div className="f05-flow">
              {selected.blocks.length === 0 ? <div className="f05-empty">Fluxo vazio. Adicione o primeiro bloco.</div> : selected.blocks.map((block, index) => {
                const meta = SALESBOT_BLOCK_CATALOG.find((item) => item.type === block.type);
                return <div className="f05-block" key={block.id}>
                  <div className="f05-block__index">{index + 1}</div>
                  <div className="f05-block__body"><strong>{block.label}</strong><span>{meta?.description}</span></div>
                  <div className="f05-block__actions">
                    <button className="icon" disabled={index === 0} onClick={() => { moveSalesBotBlock(selected.id, block.id, -1); refresh(selected.id); }}>↑</button>
                    <button className="icon" disabled={index === selected.blocks.length - 1} onClick={() => { moveSalesBotBlock(selected.id, block.id, 1); refresh(selected.id); }}>↓</button>
                    <button className="icon danger" onClick={() => { removeSalesBotBlock(selected.id, block.id); refresh(selected.id); }}>×</button>
                  </div>
                </div>;
              })}
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}
