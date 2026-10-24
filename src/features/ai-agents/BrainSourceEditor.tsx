import { useState } from 'react';
import { editAIBrainSource, type AIBrainSource } from './brainRepository';

export function BrainSourceEditor({ source, onSaved, onError }: {
  source: AIBrainSource;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(source.title);
  const [content, setContent] = useState(source.text_content ?? '');
  const [saving, setSaving] = useState(false);
  if (!editing) return <button type="button" disabled={source.status === 'processing'} onClick={() => {
    setTitle(source.title);
    setContent(source.text_content ?? '');
    setEditing(true);
    onError('');
  }}>Editar</button>;
  return <form className="f05-card" aria-label="Editar fonte do Cérebro" onSubmit={async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await editAIBrainSource(source, title, content);
      onError('');
      setEditing(false);
      await onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível editar a fonte.');
    } finally {
      setSaving(false);
    }
  }}>
    <fieldset className="f05-readonly-fieldset" disabled={saving}>
      <label className="f05-field">Título da fonte
        <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="f05-field">Conteúdo da fonte
        <textarea required rows={8} maxLength={120000} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
      <button type="submit" disabled={saving} aria-busy={saving}>{saving ? 'Salvando...' : 'Salvar fonte'}</button>
      <button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancelar edição</button>
    </fieldset>
  </form>;
}
