import type { CatalogItem, CatalogItemStatus } from './types';

export interface CatalogQaFinding {
  code: string;
  itemId?: string;
  severity: 'error' | 'warning';
  message: string;
}

const allowedTransitions: Record<CatalogItemStatus, CatalogItemStatus[]> = {
  draft: ['published', 'sold'],
  published: ['paused', 'sold'],
  paused: ['published', 'sold'],
  sold: [],
};

export function validateCatalogSnapshot(items: CatalogItem[]): CatalogQaFinding[] {
  const findings: CatalogQaFinding[] = [];
  const active = items.filter((item) => !item.deletedAt);
  const byId = new Map(active.map((item) => [item.id, item]));
  const codes = new Map<string, string>();

  for (const item of active) {
    const normalizedCode = item.code.trim().toLocaleLowerCase('pt-BR');
    const existingId = codes.get(normalizedCode);
    if (existingId && existingId !== item.id) {
      findings.push({
        code: 'duplicate-active-code',
        itemId: item.id,
        severity: 'error',
        message: `Código ativo duplicado: ${item.code}.`,
      });
    } else {
      codes.set(normalizedCode, item.id);
    }

    if (item.kind === 'unit') {
      if (!item.parentId) {
        findings.push({
          code: 'unit-without-parent',
          itemId: item.id,
          severity: 'error',
          message: 'Unidade ativa sem empreendimento pai.',
        });
      } else {
        const parent = byId.get(item.parentId);
        if (!parent || parent.kind !== 'development') {
          findings.push({
            code: 'unit-invalid-parent',
            itemId: item.id,
            severity: 'error',
            message: 'Unidade aponta para empreendimento inexistente ou inválido.',
          });
        }
      }
    }

    if (item.kind !== 'unit' && item.parentId) {
      findings.push({
        code: 'non-unit-with-parent',
        itemId: item.id,
        severity: 'error',
        message: 'Somente unidades podem possuir parentId.',
      });
    }
  }

  for (const item of active) {
    if (item.kind !== 'development' || item.status !== 'sold') continue;
    const unsoldUnits = active.filter(
      (candidate) => candidate.kind === 'unit' && candidate.parentId === item.id && candidate.status !== 'sold',
    );
    if (unsoldUnits.length) {
      findings.push({
        code: 'sold-development-with-unsold-units',
        itemId: item.id,
        severity: 'error',
        message: 'Empreendimento vendido ainda possui unidades ativas não vendidas.',
      });
    }
  }

  return findings;
}

export function isCatalogStatusTransitionAllowed(from: CatalogItemStatus, to: CatalogItemStatus): boolean {
  return allowedTransitions[from].includes(to);
}
