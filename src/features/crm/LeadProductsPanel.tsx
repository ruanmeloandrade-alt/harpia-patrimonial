import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CatalogRepository } from '../catalog/catalogRepository';
import type { CatalogItem } from '../catalog/types';
import {
  listLeadProductAssociations,
  removeLeadProductAssociation,
  saveLeadProductAssociation,
  type LeadProductAssociation,
  type LeadProductDiscountType,
  type LeadProductRelationship,
} from './leadProductRepository';
import styles from './crm.module.css';

interface LeadProductsPanelProps {
  leadId: string;
  catalogRepository: CatalogRepository;
  canManage: boolean;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
  waitForCrmPersistence?: () => Promise<void>;
}

const relationshipLabel: Record<LeadProductRelationship, string> = {
  interest: 'Interesse',
  quoted: 'Orçamento',
  purchased: 'Comprado',
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Sob consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function finalPrice(
  price: number | null | undefined,
  discountType?: LeadProductDiscountType,
  discountValue?: number,
) {
  if (price === null || price === undefined || !discountType || discountValue === undefined) return price;
  if (discountType === 'percentage') return Math.max(0, price * (1 - discountValue / 100));
  return Math.max(0, price - discountValue);
}

function itemTypeLabel(item: CatalogItem) {
  if (item.itemType === 'service') return 'Serviço';
  if (item.itemType === 'product') return 'Produto';
  return 'Imóvel';
}

export function LeadProductsPanel({
  leadId,
  catalogRepository,
  canManage,
  onChanged,
  onError,
  waitForCrmPersistence,
}: LeadProductsPanelProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [associations, setAssociations] = useState<LeadProductAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [catalog, linked] = await Promise.all([
        catalogRepository.list(),
        listLeadProductAssociations(leadId),
      ]);
      setItems(catalog);
      setAssociations(linked);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível carregar os produtos do cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [leadId, catalogRepository]);

  const associationMap = useMemo(
    () => new Map(associations.map((association) => [association.catalogItemId, association])),
    [associations],
  );

  const availableItems = items.filter((item) => !associationMap.has(item.id));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    const form = new FormData(event.currentTarget);
    const catalogItemId = String(form.get('catalogItemId') ?? '');
    const item = items.find((candidate) => candidate.id === catalogItemId);
    if (!item) {
      onError('Selecione um produto válido.');
      return;
    }

    const quantity = Number(form.get('quantity') ?? 1);
    const negotiatedPriceRaw = String(form.get('unitPrice') ?? '').trim();
    const discountTypeRaw = String(form.get('discountType') ?? '').trim() as '' | LeadProductDiscountType;
    const discountValueRaw = String(form.get('discountValue') ?? '').trim();

    const unitPrice = negotiatedPriceRaw === '' ? item.price ?? undefined : Number(negotiatedPriceRaw);
    const discountType = discountTypeRaw || item.discountType;
    const discountValue = discountTypeRaw
      ? (discountValueRaw === '' ? undefined : Number(discountValueRaw))
      : item.discountValue;

    try {
      setBusy(true);
      await waitForCrmPersistence?.();
      await saveLeadProductAssociation({
        leadId,
        catalogItemId,
        relationship: String(form.get('relationship') ?? 'interest') as LeadProductRelationship,
        quantity,
        unitPrice,
        discountType,
        discountValue,
        notes: String(form.get('notes') ?? ''),
      });
      event.currentTarget.reset();
      await load();
      onChanged('Produto associado ao cliente.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível associar o produto.');
    } finally {
      setBusy(false);
    }
  };

  const updateRelationship = async (
    association: LeadProductAssociation,
    relationship: LeadProductRelationship,
  ) => {
    if (!canManage) return;
    try {
      setBusy(true);
      await saveLeadProductAssociation({
        leadId: association.leadId,
        catalogItemId: association.catalogItemId,
        relationship,
        quantity: association.quantity,
        unitPrice: association.unitPrice,
        discountType: association.discountType,
        discountValue: association.discountValue,
        notes: association.notes,
      });
      await load();
      onChanged('Status do produto atualizado.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível atualizar o produto.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (association: LeadProductAssociation) => {
    if (!canManage) return;
    try {
      setBusy(true);
      await removeLeadProductAssociation(leadId, association.catalogItemId);
      await load();
      onChanged('Produto removido do cliente.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível remover o produto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.detailSection}>
      <h3>Produtos do cliente</h3>
      <p style={{ marginTop: 0 }}>
        Associe imóveis, produtos ou serviços do catálogo e preserve as condições comerciais usadas com este cliente.
      </p>

      {loading ? (
        <small>Carregando produtos...</small>
      ) : (
        <>
          {associations.length === 0 ? (
            <small>Nenhum produto associado a este cliente.</small>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {associations.map((association) => {
                const item = items.find((candidate) => candidate.id === association.catalogItemId);
                const basePrice = association.unitPrice ?? item?.price;
                const priceWithDiscount = finalPrice(basePrice, association.discountType, association.discountValue);
                return (
                  <div
                    key={association.catalogItemId}
                    style={{
                      border: '1px solid #d9d2c8',
                      borderRadius: 10,
                      padding: 10,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <strong>{item?.name ?? association.catalogItemId}</strong>
                        <div><small>{item ? itemTypeLabel(item) : 'Item do catálogo'} · Qtd. {association.quantity}</small></div>
                        {item?.tags?.length ? <div className={styles.tagManager}>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong>{money(priceWithDiscount)}</strong>
                        {association.discountType && basePrice !== undefined && basePrice !== null && (
                          <div><small>Base {money(basePrice)}</small></div>
                        )}
                      </div>
                    </div>

                    {association.notes && <small>{association.notes}</small>}

                    {canManage && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          value={association.relationship}
                          disabled={busy}
                          onChange={(event) => void updateRelationship(
                            association,
                            event.target.value as LeadProductRelationship,
                          )}
                        >
                          {Object.entries(relationshipLabel).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <button type="button" disabled={busy} onClick={() => void remove(association)}>
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canManage && (
            <form className={styles.taskForm} onSubmit={submit}>
              <select name="catalogItemId" required defaultValue="">
                <option value="">Selecionar produto</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} | {itemTypeLabel(item)} | {money(finalPrice(item.price, item.discountType, item.discountValue))}
                  </option>
                ))}
              </select>
              <select name="relationship" defaultValue="interest">
                <option value="interest">Interesse</option>
                <option value="quoted">Orçamento</option>
                <option value="purchased">Comprado</option>
              </select>
              <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" placeholder="Quantidade" />
              <input name="unitPrice" type="number" min="0" step="0.01" placeholder="Preço negociado, opcional" />
              <select name="discountType" defaultValue="">
                <option value="">Usar desconto do catálogo</option>
                <option value="percentage">Desconto percentual</option>
                <option value="fixed">Desconto em valor</option>
              </select>
              <input name="discountValue" type="number" min="0" step="0.01" placeholder="Valor do desconto" />
              <input name="notes" placeholder="Observação comercial" style={{ gridColumn: '1 / -1' }} />
              <button type="submit" disabled={busy || availableItems.length === 0}>
                {busy ? 'Salvando...' : 'Associar produto'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
