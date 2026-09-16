import type { SalesBotConditionPort, SalesBotConditionResult } from '../../features/salesbot/runtime';

function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function parseLiteral(raw: string): string | number | boolean | null {
  const value = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

function comparable(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value ?? '');
}

function compare(actual: unknown, operator: string, expected: unknown): boolean {
  if (operator === 'contains') {
    if (Array.isArray(actual)) return actual.some((item) => String(item) === String(expected));
    return String(actual ?? '').toLocaleLowerCase('pt-BR').includes(String(expected ?? '').toLocaleLowerCase('pt-BR'));
  }

  const left = comparable(actual);
  const right = comparable(expected);
  if (operator === '=' || operator === '==') return String(left ?? '') === String(right ?? '');
  if (operator === '!=') return String(left ?? '') !== String(right ?? '');

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;
  if (operator === '>') return leftNumber > rightNumber;
  if (operator === '>=') return leftNumber >= rightNumber;
  if (operator === '<') return leftNumber < rightNumber;
  if (operator === '<=') return leftNumber <= rightNumber;
  return false;
}

export const salesBotConditionEvaluator: SalesBotConditionPort = {
  async evaluate({ expression, context }): Promise<SalesBotConditionResult> {
    const source = expression.trim();
    if (!source) return { status: 'failed', reason: 'Condição vazia.' };

    const existsPrefix = source.match(/^exists\s+([\p{L}\p{N}_.-]+)$/iu);
    const existsSuffix = source.match(/^([\p{L}\p{N}_.-]+)\s+exists$/iu);
    const existsPath = existsPrefix?.[1] ?? existsSuffix?.[1];
    if (existsPath) {
      const value = getPath(context, existsPath);
      return { status: 'matched', matched: value !== undefined && value !== null && value !== '' };
    }

    const match = source.match(/^([\p{L}\p{N}_.-]+)\s*(contains|==|!=|>=|<=|=|>|<)\s*(.+)$/iu);
    if (!match) {
      return {
        status: 'failed',
        reason: 'Condição inválida. Use campo = valor, !=, >, >=, <, <=, contains ou exists campo.',
      };
    }

    const [, path, operator, rawExpected] = match;
    const actual = getPath(context, path);
    const expected = parseLiteral(rawExpected);
    return { status: 'matched', matched: compare(actual, operator.toLowerCase(), expected) };
  },
};
