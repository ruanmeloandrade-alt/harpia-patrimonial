import type {
  CrmId,
  CustomFieldDefinition,
  CustomFieldValue,
  Lead,
} from './domain';
import {
  CrmIntegrityError,
  CrmService as CrmServiceCore,
} from './serviceCore';
import type {
  CreateLeadInput,
  UpdateLeadInput,
} from './serviceCore';

export { CrmIntegrityError };
export type { CreateLeadInput, UpdateLeadInput };

export class CrmService extends CrmServiceCore {
  override createCustomField(
    definition: Pick<CustomFieldDefinition, 'name' | 'type' | 'options'>,
  ): CustomFieldDefinition {
    const options = [...new Set(
      (definition.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean),
    )];

    if (
      (definition.type === 'select' || definition.type === 'multiselect')
      && options.length === 0
    ) {
      throw new CrmIntegrityError('Informe ao menos uma opção para este campo personalizado.');
    }

    return super.createCustomField({
      ...definition,
      options: definition.type === 'select' || definition.type === 'multiselect'
        ? options
        : undefined,
    });
  }

  override setCustomFieldValue(
    leadId: CrmId,
    fieldId: CrmId,
    value: CustomFieldValue,
  ): Lead {
    const field = this.snapshot().customFieldDefinitions.find((item) => item.id === fieldId);
    if (!field) throw new CrmIntegrityError('Campo personalizado não encontrado.');
    if (!field.active) throw new CrmIntegrityError('Campo personalizado está desativado.');

    return super.setCustomFieldValue(
      leadId,
      fieldId,
      normalizeCustomFieldValue(field, value),
    );
  }
}

function normalizeCustomFieldValue(
  field: CustomFieldDefinition,
  value: CustomFieldValue,
): CustomFieldValue {
  if (value === null) return null;

  if (field.type === 'text' || field.type === 'date' || field.type === 'datetime') {
    if (typeof value !== 'string') {
      throw new CrmIntegrityError(`O campo “${field.name}” exige um valor de texto.`);
    }
    return value;
  }

  if (field.type === 'number' || field.type === 'currency') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new CrmIntegrityError(`O campo “${field.name}” exige um número válido.`);
    }
    return value;
  }

  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new CrmIntegrityError(`O campo “${field.name}” exige um valor Sim/Não.`);
    }
    return value;
  }

  const options = field.options ?? [];

  if (field.type === 'select') {
    if (typeof value !== 'string' || !options.includes(value)) {
      throw new CrmIntegrityError(`Valor inválido para o campo “${field.name}”.`);
    }
    return value;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new CrmIntegrityError(`O campo “${field.name}” exige uma lista de opções válidas.`);
  }

  const normalized = [...new Set(value)];
  if (normalized.some((item) => !options.includes(item))) {
    throw new CrmIntegrityError(`Uma ou mais opções são inválidas para o campo “${field.name}”.`);
  }
  return normalized;
}
