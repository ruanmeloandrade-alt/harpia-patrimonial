import { requireSupabase } from '../../core/supabase/client';

export type LeadProductRelationship = 'interest' | 'quoted' | 'purchased';
export type LeadProductDiscountType = 'percentage' | 'fixed';

export interface LeadProductAssociation {
  leadId: string;
  catalogItemId: string;
  relationship: LeadProductRelationship;
  quantity: number;
  unitPrice?: number;
  discountType?: LeadProductDiscountType;
  discountValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveLeadProductAssociationInput {
  leadId: string;
  catalogItemId: string;
  relationship: LeadProductRelationship;
  quantity: number;
  unitPrice?: number;
  discountType?: LeadProductDiscountType;
  discountValue?: number;
  notes?: string;
}

interface LeadProductRow {
  lead_id: string;
  catalog_item_id: string;
  relationship: LeadProductRelationship;
  quantity: number | string;
  unit_price: number | string | null;
  discount_type: LeadProductDiscountType | null;
  discount_value: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function numeric(value: number | string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fromRow(row: LeadProductRow): LeadProductAssociation {
  return {
    leadId: row.lead_id,
    catalogItemId: row.catalog_item_id,
    relationship: row.relationship,
    quantity: Number(row.quantity),
    unitPrice: numeric(row.unit_price),
    discountType: row.discount_type ?? undefined,
    discountValue: numeric(row.discount_value),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validate(input: SaveLeadProductAssociationInput) {
  if (!input.leadId.trim()) throw new Error('Cliente não informado.');
  if (!input.catalogItemId.trim()) throw new Error('Selecione um produto.');
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('A quantidade precisa ser maior que zero.');
  if (input.unitPrice !== undefined && (!Number.isFinite(input.unitPrice) || input.unitPrice < 0)) throw new Error('O preço não pode ser negativo.');
  if (input.discountValue !== undefined && (!Number.isFinite(input.discountValue) || input.discountValue < 0)) throw new Error('O desconto não pode ser negativo.');
  if (input.discountType === 'percentage' && (input.discountValue ?? 0) > 100) throw new Error('O desconto percentual não pode ultrapassar 100%.');
  if ((input.discountType && input.discountValue === undefined) || (!input.discountType && input.discountValue !== undefined)) {
    throw new Error('Informe o tipo e o valor do desconto.');
  }
}

export async function listLeadProductAssociations(leadId: string): Promise<LeadProductAssociation[]> {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('crm_lead_products')
    .select('*')
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Não foi possível carregar os produtos do cliente.');
  return (data ?? []).map((row: LeadProductRow) => fromRow(row));
}

export async function saveLeadProductAssociation(
  input: SaveLeadProductAssociationInput,
): Promise<LeadProductAssociation> {
  validate(input);
  const supabase = requireSupabase() as any;
  const payload = {
    lead_id: input.leadId,
    catalog_item_id: input.catalogItemId,
    relationship: input.relationship,
    quantity: input.quantity,
    unit_price: input.unitPrice ?? null,
    discount_type: input.discountType ?? null,
    discount_value: input.discountValue ?? null,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('crm_lead_products')
    .upsert(payload, { onConflict: 'lead_id,catalog_item_id' })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Não foi possível associar o produto ao cliente.');
  return fromRow(data as LeadProductRow);
}

export async function removeLeadProductAssociation(leadId: string, catalogItemId: string): Promise<void> {
  const supabase = requireSupabase() as any;
  const { error } = await supabase
    .from('crm_lead_products')
    .delete()
    .eq('lead_id', leadId)
    .eq('catalog_item_id', catalogItemId);

  if (error) throw new Error(error.message || 'Não foi possível remover o produto do cliente.');
}
