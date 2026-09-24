import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  addBrainTextSource,
  loadAIBrain,
  removeBrainSource,
  saveCompanyContext,
  uploadBrainFile,
  type AIBrainSource,
} from './brainRepository';

export function AIBrainWorkspace({ canManage = false }: { canManage?: boolean }) {
  const [companyContext, setCompanyContext] = useState('');
  const [sources, setSources] = useState<AIBrainSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const refresh = async () => {
    const brain = await loadAIBrain();
    setCompanyContext(brain.companyContext);
    setSources(brain.sources);
  };

  useEffect(() => { void refresh().catch((error) => setFeedback(error instanceof Error ? error.message : 'Falha ao carregar o cérebro.')); }, []);

  const save = async () => {
    setBusy(true);
    try {
      await saveCompanyContext(companyContext);
      setFeedback('Cérebro salvo. Todos os agentes passam a receber este contexto.');
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao salvar o cérebro.');
    } finally {
      setBusy(false);
    }
  };

  const addText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await addBrainTextSource({
        title: String(form.get('title') || ''),
        text: String(form.get('text') || ''),
      });
      event.currentTarget.reset();
      setFeedback('Contexto em texto adicionado.');
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao adicionar contexto.');
    } finally {
      setBusy(false);
    }
  };

  const addFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await uploadBrainFile(file);
      setFeedback('Arquivo enviado para o cérebro.');
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao adicionar arquivo.');
      await refresh();
    } finally {
      setBusy(false);
      input.value = '';
    }
  };

  return <div className="f05-editor">
    <div className="f05-validation f05-validation--ok">
      <strong>Acesso automático ao sistema</strong>
      <span>Dashboard, catálogos, produtos, CRM, funis, Inbox, SalesBot e automações entram no contexto de cada agente.</span>
    </div>

    {feedback && <div className="f05-inline-message">{feedback}</div>}

    <label className="f05-field">
      Contexto geral da empresa
      <textarea
        rows={10}
        value={companyContext}
        disabled={!canManage || busy}
        onChange={(event) => setCompanyContext(event.target.value)}
        placeholder="Empresa, serviços, regras, diferenciais, público, processos e tom de voz."
      />
    </label>

    <div className="f05-actions">
      <button disabled={!canManage || busy} onClick={() => { void save(); }}>{busy ? 'Salvando...' : 'Salvar cérebro'}</button>
      <label className="secondary">
        Adicionar PDF ou imagem
        <input
          hidden
          type="file"
          accept="application/pdf,text/plain,image/jpeg,image/png,image/webp"
          disabled={!canManage || busy}
          onChange={(event) => { void addFile(event); }}
        />
      </label>
    </div>

    <form className="f05-palette" onSubmit={addText}>
      <h3>Adicionar contexto em texto</h3>
      <div className="f05-form-grid">
        <label>Título<input name="title" required disabled={!canManage || busy}/></label>
        <label>Contexto<textarea name="text" rows={4} required disabled={!canManage || busy}/></label>
      </div>
      <button disabled={!canManage || busy}>Adicionar ao cérebro</button>
    </form>

    <div className="f05-palette">
      <h3>Fontes do cérebro</h3>
      {sources.length === 0 ? <div className="f05-empty">Nenhuma fonte adicional.</div> : (
        <div className="f05-flow">
          {sources.map((source) => <div className="f05-block" key={source.id}>
            <div className="f05-block__body">
              <strong>{source.title}</strong>
              <span>{source.sourceType.toUpperCase()} · {source.status}</span>
              {source.errorMessage && <small>{source.errorMessage}</small>}
            </div>
            {canManage && <button className="icon danger" onClick={() => { void removeBrainSource(source).then(refresh); }}>×</button>}
          </div>)}
        </div>
      )}
    </div>
  </div>;
}
