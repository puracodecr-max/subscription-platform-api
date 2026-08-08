import type { PoolClient, QueryResultRow } from 'pg';
import { query, withTransaction } from '../../database/pool';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { CreatePaymentInput, PaymentActionInput, RejectPaymentInput } from './payments.dto';
import type { Payment, PaymentAllocation, PaymentDetail } from './payments.types';

interface PaymentRow extends QueryResultRow, Payment {}
interface PaymentAllocationRow extends QueryResultRow, PaymentAllocation {}

function paymentSelect() {
  return `
    SELECT
      p.id,
      p.customer_id AS "customerId",
      c.display_name AS "customerName",
      p.payment_method_id AS "paymentMethodId",
      pm.name AS "paymentMethodName",
      p.currency_id AS "currencyId",
      cur.code AS "currencyCode",
      p.external_reference AS "externalReference",
      p.idempotency_key AS "idempotencyKey",
      p.amount::text,
      p.unapplied_amount::text AS "unappliedAmount",
      p.paid_at::text AS "paidAt",
      p.received_at::text AS "receivedAt",
      p.confirmed_at::text AS "confirmedAt",
      p.rejected_at::text AS "rejectedAt",
      p.reversed_at::text AS "reversedAt",
      p.reversed_payment_id AS "reversedPaymentId",
      p.status::text AS status,
      p.notes,
      p.metadata,
      p.created_at::text AS "createdAt",
      p.updated_at::text AS "updatedAt"
    FROM adm.payments p
    INNER JOIN adm.customers c ON c.id = p.customer_id
    INNER JOIN adm.currencies cur ON cur.id = p.currency_id
    LEFT JOIN adm.payment_methods pm ON pm.id = p.payment_method_id
  `;
}

export async function listPayments(params: {
  limit: number;
  offset: number;
  customerId?: string;
  status?: string;
  receivedFrom?: string;
  receivedTo?: string;
}): Promise<{ items: Payment[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.customerId) {
    values.push(params.customerId);
    conditions.push(`p.customer_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`p.status = $${values.length}::adm.payment_status`);
  }

  if (params.receivedFrom) {
    values.push(params.receivedFrom);
    conditions.push(`p.received_at >= $${values.length}::date`);
  }

  if (params.receivedTo) {
    values.push(params.receivedTo);
    conditions.push(`p.received_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.payments p ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<PaymentRow>(
    `
    ${paymentSelect()}
    ${whereClause}
    ORDER BY p.received_at DESC, p.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const result = await query<PaymentRow>(
    `
    ${paymentSelect()}
    WHERE p.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function getPaymentDetailById(id: string): Promise<PaymentDetail | null> {
  const payment = await getPaymentById(id);

  if (!payment) {
    return null;
  }

  const allocations = await listPaymentAllocations(id);
  return { ...payment, allocations };
}

export async function listPaymentAllocations(paymentId: string): Promise<PaymentAllocation[]> {
  const result = await query<PaymentAllocationRow>(
    `
    SELECT
      pa.id,
      pa.payment_id AS "paymentId",
      pa.invoice_id AS "invoiceId",
      i.invoice_number AS "invoiceNumber",
      pa.amount::text,
      pa.applied_to_base::text AS "appliedToBase",
      pa.applied_to_tax::text AS "appliedToTax",
      pa.applied_to_penalty::text AS "appliedToPenalty",
      pa.status::text AS status,
      pa.allocated_at::text AS "allocatedAt",
      pa.reversed_at::text AS "reversedAt"
    FROM adm.payment_allocations pa
    INNER JOIN adm.invoices i ON i.id = pa.invoice_id
    WHERE pa.payment_id = $1::uuid
    ORDER BY pa.allocated_at ASC
    `,
    [paymentId]
  );

  return result.rows;
}

export async function createPayment(input: CreatePaymentInput, actorId: string): Promise<PaymentDetail> {
  const paymentId = await withTransaction(async (client) => {
    if (input.idempotencyKey) {
      const existing = await findPaymentByIdempotencyKey(client, input.customerId, input.idempotencyKey);

      if (existing) {
        return existing.id;
      }
    }

    const result = await client.query<{ id: string } & QueryResultRow>(
      `
      INSERT INTO adm.payments (
        customer_id,
        payment_method_id,
        currency_id,
        external_reference,
        idempotency_key,
        amount,
        unapplied_amount,
        paid_at,
        notes,
        metadata,
        created_by,
        updated_by
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        $6::numeric,
        $6::numeric,
        $7::timestamptz,
        $8,
        $9::jsonb,
        $10::uuid,
        $10::uuid
      )
      RETURNING id
      `,
      [
        input.customerId,
        input.paymentMethodId ?? null,
        input.currencyId,
        input.externalReference ?? null,
        input.idempotencyKey ?? null,
        input.amount,
        input.paidAt ?? null,
        input.notes ?? null,
        JSON.stringify(input.metadata ?? {}),
        actorId
      ]
    );

    await recordPaymentAudit(client, actorId, 'PAYMENT_REGISTERED', result.rows[0].id, input.notes ?? null, {
      amount: input.amount,
      status: 'PENDING'
    });

    return result.rows[0].id;
  });

  return getRequiredPaymentDetail(paymentId);
}

export async function confirmPayment(paymentId: string, actorId: string): Promise<PaymentDetail> {
  await query('SELECT adm.confirm_payment($1::uuid, $2::uuid)', [paymentId, actorId]);
  return getRequiredPaymentDetail(paymentId);
}

export async function rejectPayment(paymentId: string, input: RejectPaymentInput, actorId: string): Promise<PaymentDetail> {
  await withTransaction(async (client) => {
    const payment = await lockPayment(client, paymentId);

    if (payment.status === 'REJECTED') {
      return;
    }

    if (payment.status !== 'PENDING') {
      throw new ApiError('Only pending payments can be rejected', 409, ErrorCodes.PAYMENT_ALREADY_PROCESSED);
    }

    await client.query(
      `
      UPDATE adm.payments
      SET status = 'REJECTED',
          rejected_at = now(),
          unapplied_amount = 0,
          notes = COALESCE(notes || E'\n', '') || $2,
          updated_by = $3::uuid
      WHERE id = $1::uuid
      `,
      [paymentId, input.reason, actorId]
    );

    await recordPaymentAudit(client, actorId, 'PAYMENT_REJECTED', paymentId, input.reason, { status: 'REJECTED' });
  });

  return getRequiredPaymentDetail(paymentId);
}

export async function reversePayment(paymentId: string, input: PaymentActionInput, actorId: string): Promise<PaymentDetail> {
  await withTransaction(async (client) => {
    const payment = await lockPayment(client, paymentId);

    if (payment.status === 'REVERSED') {
      return;
    }

    if (payment.status !== 'CONFIRMED') {
      throw new ApiError('Only confirmed payments can be reversed', 409, ErrorCodes.PAYMENT_NOT_CONFIRMED);
    }

    await client.query('SELECT adm.reverse_payment($1::uuid, $2::uuid, $3)', [paymentId, actorId, input.reason ?? null]);
  });

  return getRequiredPaymentDetail(paymentId);
}

async function getRequiredPaymentDetail(paymentId: string): Promise<PaymentDetail> {
  const payment = await getPaymentDetailById(paymentId);

  if (!payment) {
    throw new ApiError('Payment not found', 404, ErrorCodes.PAYMENT_NOT_FOUND);
  }

  return payment;
}

async function findPaymentByIdempotencyKey(client: PoolClient, customerId: string, idempotencyKey: string): Promise<{ id: string } | null> {
  const result = await client.query<{ id: string } & QueryResultRow>(
    `
    SELECT id
    FROM adm.payments
    WHERE customer_id = $1::uuid
      AND idempotency_key = $2
    LIMIT 1
    `,
    [customerId, idempotencyKey]
  );

  return result.rows[0] ?? null;
}

async function lockPayment(client: PoolClient, paymentId: string): Promise<Payment> {
  const result = await client.query<PaymentRow>(
    `
    ${paymentSelect()}
    WHERE p.id = $1::uuid
    FOR UPDATE OF p
    `,
    [paymentId]
  );
  const payment = result.rows[0];

  if (!payment) {
    throw new ApiError('Payment not found', 404, ErrorCodes.PAYMENT_NOT_FOUND);
  }

  return payment;
}

async function recordPaymentAudit(
  client: PoolClient,
  actorId: string,
  action: string,
  paymentId: string,
  reason: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
    SELECT adm.record_audit_log(
      $1::uuid,
      $2,
      'payments',
      $3::uuid,
      NULL,
      $4::jsonb,
      NULL,
      $5,
      'API',
      $4::jsonb
    )
    `,
    [actorId, action, paymentId, JSON.stringify(metadata), reason]
  );
}
