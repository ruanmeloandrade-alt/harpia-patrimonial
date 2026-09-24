import {
  pipelineActionCatalog,
  pipelineActionCatalogGroups,
  type PipelineActionCatalogItem,
} from '../automations/pipelineActionCatalog';
import styles from './crm.module.css';

export function PipelineTriggerPicker({
  stageName,
  search,
  onSearch,
  onClose,
  onSelect,
}: {
  stageName: string;
  search: string;
  onSearch: (value: string) => void;
  onClose: () => void;
  onSelect: (item: PipelineActionCatalogItem) => void;
}) {
  const normalized = search.trim().toLocaleLowerCase();
  const filtered = normalized
    ? pipelineActionCatalog.filter((item) =>
        [item.label, item.description, item.group].join(' ').toLocaleLowerCase().includes(normalized),
      )
    : pipelineActionCatalog;

  return (
    <div className={styles.triggerPickerBackdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.triggerPickerCard} role="dialog" aria-modal="true" aria-label={`Adicionar gatilho em ${stageName}`}>
        <header className={styles.triggerPickerHead}>
          <strong>Adicionar gatilho · {stageName}</strong>
          <button type="button" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <label className={styles.triggerPickerSearch}>
          <span>⌕</span>
          <input
            autoFocus
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Busca e filtro"
          />
        </label>

        <div className={styles.triggerPickerScroll}>
          {pipelineActionCatalogGroups.map((group) => {
            const items = filtered.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <section className={styles.triggerPickerGroup} key={group}>
                <h3>{group}</h3>
                <div className={styles.triggerPickerGrid}>
                  {items.map((item) => (
                    <button
                      type="button"
                      className={styles.triggerPickerItem}
                      key={item.id}
                      onClick={() => onSelect(item)}
                    >
                      <span className={styles.triggerPickerIcon}>{item.icon}</span>
                      <span className={styles.triggerPickerCopy}>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 ? (
            <div className={styles.triggerPickerNoResults}>Nenhum gatilho encontrado para esta busca.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
