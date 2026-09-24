export type SalesBotPort = {
  id: string;
  label: string;
  kind: 'default' | 'success' | 'failure' | 'choice';
};

export type SalesBotButtonConfig = { id: string; label: string };
export type SalesBotRoundRobinOption = { id: string; label: string };

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export function getSalesBotPorts(type: string, config: Record<string, unknown>): SalesBotPort[] {
  if (type === 'condition') {
    return [
      { id: 'true', label: 'Sim', kind: 'success' },
      { id: 'false', label: 'Não', kind: 'failure' },
    ];
  }

  if (type === 'validation') {
    return [
      { id: 'valid', label: 'Válido', kind: 'success' },
      { id: 'invalid', label: 'Inválido', kind: 'failure' },
    ];
  }

  if (type === 'distribution') {
    const options = asArray<SalesBotRoundRobinOption>(config.options);
    return options.length
      ? options.map((option, index) => ({
          id: option.id || `option_${index + 1}`,
          label: option.label || `Opção ${index + 1}`,
          kind: 'choice' as const,
        }))
      : [{ id: 'option_1', label: 'Opção 1', kind: 'choice' }];
  }

  if (type === 'message') {
    const buttons = asArray<SalesBotButtonConfig>(config.buttons);
    return [
      { id: 'default', label: 'Continuar / sem clique', kind: 'default' },
      ...buttons.map((button, index) => ({
        id: button.id || `button_${index + 1}`,
        label: button.label || `Botão ${index + 1}`,
        kind: 'choice' as const,
      })),
    ];
  }

  if (type === 'finish') return [];

  return [{ id: 'default', label: 'Próximo passo', kind: 'default' }];
}
