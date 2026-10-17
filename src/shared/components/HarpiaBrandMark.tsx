/** Marca de origem para cabeçalhos, utilizando exclusivamente o brasão aprovado no Brandbook 2026. */
export function HarpiaBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'harpia-heritage-mark harpia-heritage-mark--compact' : 'harpia-heritage-mark'} aria-label="Hárpia Patrimonial, tradição familiar desde 1986">
      <img src="/assets/brand/harpia-crest-dark-green-cropped.png" alt="" width="44" height="60" decoding="async" />
      <span className="harpia-heritage-mark__copy">
        <span className="harpia-heritage-mark__eyebrow">Hárpia Patrimonial &amp; Co.</span>
        <small>Tradição familiar desde 1986</small>
      </span>
    </span>
  );
}
