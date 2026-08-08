import type { PoolClient, QueryResultRow } from 'pg';
import { query, withTransaction } from '../../database/pool';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { AdjustmentInput, CancelInvoiceInput, GenerateInvoiceInput } from './invoices.dto';
import type { Invoice, InvoiceDetail, InvoiceItem, InvoicePaymentAllocation } from './invoices.types';

interface InvoiceRow extends QueryResultRow, Invoice {}
interface InvoiceItemRow extends QueryResultRow, InvoiceItem {}
interface InvoicePaymentAllocationRow extends QueryResultRow, InvoicePaymentAllocation {}

function invoiceSelect() {
  return `
    SELECT
      i.id,
      i.subscription_id AS "subscriptionId",
      i.customer_id AS "customerId",
      c.display_name AS "customerName",
      i.application_id AS "applicationId",
      a.code AS "applicationCode",
      i.plan_id AS "planId",
      i.invoice_number AS "invoiceNumber",
      i.billing_period_start::text AS "billingPeriodStart",
      i.billing_period_end::text AS "billingPeriodEnd",
      i.issue_date::text AS "issueDate",
      i.due_date::text AS "dueDate",
      i.plan_name_snapshot AS "planNameSnapshot",
      i.plan_price_snapshot::text AS "planPriceSnapshot",
      i.currency_id AS "currencyId",
      cur.code AS "currencyCode",
      i.base_amount::text AS "baseAmount",
      i.discount_amount::text AS "discountAmount",
      i.tax_amount::text AS "taxAmount",
      i.penalty_amount::text AS "penaltyAmount",
      i.adjustment_amount::text AS "adjustmentAmount",
      i.total_amount::text AS "totalAmount",
      i.paid_amount::text AS "paidAmount",
      i.balance_amount::text AS "balanceAmount",
      i.status::text AS status,
      i.metadata,
      i.created_at::text AS "createdAt",
      i.updated_at::text AS "updatedAt"
    FROM adm.invoices i
    INNER JOIN adm.customers c ON c.id = i.customer_id
    INNER JOIN adm.applications a ON a.id = i.application_id
    INNER JOIN adm.currencies cur ON cur.id = i.currency_id
  `;
}

export async function listInvoices(params: {
  limit: number;
  offset: number;
  customerId?: string;
  subscriptionId?: string;
  status?: string;
  dueFrom?: string;
  dueTo?: string;
}): Promise<{ items: Invoice[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.customerId) {
    values.push(params.customerId);
    conditions.push(`i.customer_id = $${values.length}::uuid`);
  }

  if (params.subscriptionId) {
    values.push(params.subscriptionId);
    conditions.push(`i.subscription_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`i.status = $${values.length}::adm.invoice_status`);
  }

  if (params.dueFrom) {
    values.push(params.dueFrom);
    conditions.push(`i.due_date >= $${values.length}::date`);
  }

  if (params.dueTo) {
    values.push(params.dueTo);
    conditions.push(`i.due_date <= $${values.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.invoices i ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<InvoiceRow>(
    `
    ${invoiceSelect()}
    ${whereClause}
    ORDER BY i.issue_date DESC, i.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const result = await query<InvoiceRow>(
    `
    ${invoiceSelect()}
    WHERE i.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function getInvoiceDetailById(id: string): Promise<InvoiceDetail | null> {
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return null;
  }

  const [items, paymentAllocations] = await Promise.all([listInvoiceItems(id), listInvoicePaymentAllocations(id)]);
  return { ...invoice, items, paymentAllocations };
}

export async function listInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const result = await query<InvoiceItemRow>(
    `
    SELECT
      id,
      invoice_id AS "invoiceId",
      item_type::text AS "itemType",
      description,
      quantity::text,
      unit_amount::text AS "unitAmount",
      discount_amount::text AS "discountAmount",
      tax_amount::text AS "taxAmount",
      total_amount::text AS "totalAmount",
      metadata,
      created_at::text AS "createdAt"
    FROM adm.invoice_items
    WHERE invoice_id = $1::uuid
    ORDER BY created_at ASC
    `,
    [invoiceId]
  );

  return result.rows;
}

export async function listInvoicePaymentAllocations(invoiceId: string): Promise<InvoicePaymentAllocation[]> {
  const result = await query<InvoicePaymentAllocationRow>(
    `
    SELECT
      pa.id,
      pa.payment_id AS "paymentId",
      p.status::text AS "paymentStatus",
      pa.amount::text,
      pa.applied_to_base::text AS "appliedToBase",
      pa.applied_to_tax::text AS "appliedToTax",
      pa.applied_to_penalty::text AS "appliedToPenalty",
      pa.status::text AS status,
      pa.allocated_at::text AS "allocatedAt"
    FROM adm.payment_allocations pa
    INNER JOIN adm.payments p ON p.id = pa.payment_id
    WHERE pa.invoice_id = $1::uuid
    ORDER BY pa.allocated_at ASC
    `,
    [invoiceId]
  );

  return result.rows;
}

export async function generateInvoice(input: GenerateInvoiceInput, actorId: string): Promise<Invoice> {
  const result = await query<{ invoiceId: string } & QueryResultRow>(
    `
    SELECT adm.create_invoice(
      $1::uuid,
      $2::date,
      $3::date,
      $4::date,
      $5::date,
      $6,
      $7::uuid
    ) AS "invoiceId"
    `,
    [
      input.subscriptionId,
      input.billingPeriodStart,
      input.billingPeriodEnd,
      input.issueDate,
      input.dueDate,
      input.idempotencyKey ?? null,
      actorId
    ]
  );

  const invoice = await getInvoiceById(result.rows[0].invoiceId);

  if (!invoice) {
    throw new ApiError('Invoice not found after generation', 404, ErrorCodes.INVOICE_NOT_FOUND);
  }

  return invoice;
}

export async function addAdjustment(invoiceId: string, input: AdjustmentInput, actorId: string): Promise<InvoiceDetail> {
  return withTransaction(async (client) => {
    await lockInvoiceForAdjustment(client, invoiceId, input);

    const amount = input.amount;
    const itemType = input.type === 'CHARGE' ? 'ADJUSTMENT' : 'CREDIT';
    const signedAmountExpression = input.type === 'CHARGE' ? '$5::numeric' : '($5::numeric * -1)';

    await client.query(
      `
      INSERT INTO adm.invoice_items (
        invoice_id,
        item_type,
        description,
        quantity,
        unit_amount,
        total_amount,
        metadata,
        created_by,
        updated_by
      )
      VALUES ($1::uuid, $2::adm.invoice_item_type, $3, 1, ${signedAmountExpression}, ${signedAmountExpression}, $4::jsonb, $6::uuid, $6::uuid)
      `,
      [invoiceId, itemType, input.description, JSON.stringify(input.metadata ?? {}), amount, actorId]
    );

    if (input.type === 'CHARGE') {
      await client.query(
        `
        UPDATE adm.invoices
        SET adjustment_amount = adjustment_amount + $2::numeric,
            total_amount = total_amount + $2::numeric,
            balance_amount = balance_amount + $2::numeric,
            updated_by = $3::uuid
        WHERE id = $1::uuid
        `,
        [invoiceId, amount, actorId]
      );
    } else {
      await client.query(
        `
        UPDATE adm.invoices
        SET discount_amount = discount_amount + $2::numeric,
            total_amount = GREATEST(total_amount - $2::numeric, 0),
            balance_amount = GREATEST(balance_amount - $2::numeric, 0),
            updated_by = $3::uuid
        WHERE id = $1::uuid
        `,
        [invoiceId, amount, actorId]
      );
    }

    await client.query('SELECT adm.recalculate_invoice_status($1::uuid)', [invoiceId]);
    await recordInvoiceAudit(client, actorId, 'INVOICE_ADJUSTED', invoiceId, input.description, {
      type: input.type,
      amount
    });

    const detail = await getInvoiceDetailById(invoiceId);

    if (!detail) {
      throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    return detail;
  });
}

export async function cancelInvoice(invoiceId: string, input: CancelInvoiceInput, actorId: string): Promise<Invoice> {
  return withTransaction(async (client) => {
    const invoiceResult = await client.query<InvoiceLockRow>(
      `
      SELECT id, status::text AS status, paid_amount::text AS "paidAmount"
      FROM adm.invoices
      WHERE id = $1::uuid
      FOR UPDATE
      `,
      [invoiceId]
    );
    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (invoice.status === 'PAID' || Number(invoice.paidAmount) > 0) {
      throw new ApiError('Paid invoices cannot be cancelled', 409, ErrorCodes.INVOICE_ALREADY_PAID);
    }

    if (invoice.status === 'CANCELLED') {
      const existing = await getInvoiceById(invoiceId);

      if (!existing) {
        throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
      }

      return existing;
    }

    await client.query(
      `
      UPDATE adm.invoices
      SET status = 'CANCELLED',
          balance_amount = 0,
          metadata = metadata || jsonb_build_object('cancellationReason', $2, 'cancelledAt', now()),
          updated_by = $3::uuid
      WHERE id = $1::uuid
      `,
      [invoiceId, input.reason, actorId]
    );

    await recordInvoiceAudit(client, actorId, 'INVOICE_CANCELLED', invoiceId, input.reason, { status: 'CANCELLED' });

    const cancelled = await getInvoiceById(invoiceId);

    if (!cancelled) {
      throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    return cancelled;
  });
}

interface InvoiceLockRow extends QueryResultRow {
  id: string;
  status: string;
  paidAmount: string;
  balanceAmount?: string;
}

async function lockInvoiceForAdjustment(client: PoolClient, invoiceId: string, input: AdjustmentInput): Promise<void> {
  const result = await client.query<InvoiceLockRow>(
    `
    SELECT
      id,
      status::text AS status,
      paid_amount::text AS "paidAmount",
      balance_amount::text AS "balanceAmount"
    FROM adm.invoices
    WHERE id = $1::uuid
    FOR UPDATE
    `,
    [invoiceId]
  );
  const invoice = result.rows[0];

  if (!invoice) {
    throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
  }

  if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
    throw new ApiError('Invoice cannot be adjusted in its current status', 409, ErrorCodes.INVOICE_NOT_ADJUSTABLE);
  }

  if (input.type === 'CREDIT' && Number(input.amount) > Number(invoice.balanceAmount ?? 0)) {
    throw new ApiError('Credit amount cannot exceed invoice balance', 400, ErrorCodes.PAYMENT_AMOUNT_EXCEEDED);
  }
}

async function recordInvoiceAudit(
  client: PoolClient,
  actorId: string,
  action: string,
  invoiceId: string,
  reason: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
    SELECT adm.record_audit_log(
      $1::uuid,
      $2,
      'invoices',
      $3::uuid,
      NULL,
      $4::jsonb,
      NULL,
      $5,
      'API',
      $4::jsonb
    )
    `,
    [actorId, action, invoiceId, JSON.stringify(metadata), reason]
  );
}
