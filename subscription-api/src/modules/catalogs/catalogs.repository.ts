import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';

export interface CurrencyCatalogItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  status: string;
}

export interface PaymentMethodCatalogItem {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface CurrencyRow extends QueryResultRow, CurrencyCatalogItem {}
interface PaymentMethodRow extends QueryResultRow, PaymentMethodCatalogItem {}

export async function listCurrencies(): Promise<CurrencyCatalogItem[]> {
  const result = await query<CurrencyRow>(
    `
    SELECT
      id,
      code,
      name,
      symbol,
      status::text AS status
    FROM adm.currencies
    WHERE status = 'ACTIVE'
    ORDER BY code ASC
    `
  );

  return result.rows;
}

export async function listPaymentMethods(): Promise<PaymentMethodCatalogItem[]> {
  const result = await query<PaymentMethodRow>(
    `
    SELECT
      id,
      code,
      name,
      status::text AS status
    FROM adm.payment_methods
    WHERE status = 'ACTIVE'
    ORDER BY name ASC
    `
  );

  return result.rows;
}
