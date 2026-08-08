import type { PoolClient, QueryResultRow } from 'pg';
import { query, withTransaction } from '../../database/pool';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { CancelExtensionInput, CreateExtensionInput } from './extensions.dto';
import type { SubscriptionExtension } from './extensions.types';

interface ExtensionRow extends QueryResultRow, SubscriptionExtension {}

interface InvoiceForExtensionRow extends QueryResultRow {
  id: string;
  subscriptionId: string;
  dueDate: string;
}

interface ExtensionLockRow extends QueryResultRow {
  id: string;
  status: string;
}

function extensionSelect() {
  return `
    SELECT
      e.id,
      e.subscription_id AS "subscriptionId",
      e.invoice_id AS "invoiceId",
      i.invoice_number AS "invoiceNumber",
      s.customer_id AS "customerId",
      c.display_name AS "customerName",
      s.application_id AS "applicationId",
      a.code AS "applicationCode",
      e.original_due_date::text AS "originalDueDate",
      e.extended_due_date::text AS "extendedDueDate",
      e.reason,
      e.authorized_by AS "authorizedBy",
      u.full_name AS "authorizedByName",
      e.authorized_at::text AS "authorizedAt",
      e.status::text AS status,
      e.metadata,
      e.created_at::text AS "createdAt",
      e.updated_at::text AS "updatedAt"
    FROM adm.subscription_extensions e
    INNER JOIN adm.subscriptions s ON s.id = e.subscription_id
    INNER JOIN adm.customers c ON c.id = s.customer_id
    INNER JOIN adm.applications a ON a.id = s.application_id
    INNER JOIN adm.users u ON u.id = e.authorized_by
    LEFT JOIN adm.invoices i ON i.id = e.invoice_id
  `;
}

export async function listExtensions(params: {
  limit: number;
  offset: number;
  subscriptionId?: string;
  invoiceId?: string;
  customerId?: string;
  status?: string;
}): Promise<{ items: SubscriptionExtension[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.subscriptionId) {
    values.push(params.subscriptionId);
    conditions.push(`e.subscription_id = $${values.length}::uuid`);
  }

  if (params.invoiceId) {
    values.push(params.invoiceId);
    conditions.push(`e.invoice_id = $${values.length}::uuid`);
  }

  if (params.customerId) {
    values.push(params.customerId);
    conditions.push(`s.customer_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`e.status = $${values.length}::adm.extension_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `
    SELECT COUNT(*) AS total
    FROM adm.subscription_extensions e
    INNER JOIN adm.subscriptions s ON s.id = e.subscription_id
    ${whereClause}
    `,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<ExtensionRow>(
    `
    ${extensionSelect()}
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getExtensionById(id: string): Promise<SubscriptionExtension | null> {
  const result = await query<ExtensionRow>(
    `
    ${extensionSelect()}
    WHERE e.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createExtension(input: CreateExtensionInput, actorId: string): Promise<SubscriptionExtension> {
  const extensionId = await withTransaction(async (client) => {
    let originalDueDate = input.originalDueDate ?? null;

    if (input.invoiceId) {
      const invoice = await lockInvoiceForExtension(client, input.invoiceId);

      if (invoice.subscriptionId !== input.subscriptionId) {
        throw new ApiError('Invoice does not belong to the subscription', 400, ErrorCodes.VALIDATION_ERROR);
      }

      if (originalDueDate && originalDueDate !== invoice.dueDate) {
        throw new ApiError('Original due date must match invoice due date', 400, ErrorCodes.VALIDATION_ERROR);
      }

      originalDueDate = invoice.dueDate;
    }

    if (!originalDueDate) {
      throw new ApiError('originalDueDate is required when invoiceId is not provided', 400, ErrorCodes.VALIDATION_ERROR);
    }

    if (input.extendedDueDate <= originalDueDate) {
      throw new ApiError('extendedDueDate must be after originalDueDate', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await client.query<{ id: string } & QueryResultRow>(
      `
      INSERT INTO adm.subscription_extensions (
        subscription_id,
        invoice_id,
        original_due_date,
        extended_due_date,
        reason,
        authorized_by,
        metadata,
        created_by,
        updated_by
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::date,
        $4::date,
        $5,
        $6::uuid,
        $7::jsonb,
        $6::uuid,
        $6::uuid
      )
      RETURNING id
      `,
      [input.subscriptionId, input.invoiceId ?? null, originalDueDate, input.extendedDueDate, input.reason, actorId, JSON.stringify(input.metadata ?? {})]
    );

    await recordExtensionAudit(client, actorId, 'EXTENSION_CREATED', result.rows[0].id, input.reason, {
      subscriptionId: input.subscriptionId,
      invoiceId: input.invoiceId ?? null,
      originalDueDate,
      extendedDueDate: input.extendedDueDate
    });

    if (input.reactivateIfEligible) {
      await client.query('SELECT adm.reactivate_subscription($1::uuid, $2::uuid, $3, false, $4::jsonb)', [
        input.subscriptionId,
        actorId,
        input.reason,
        JSON.stringify({ extensionId: result.rows[0].id })
      ]);
    }

    return result.rows[0].id;
  });

  return getRequiredExtension(extensionId);
}

export async function cancelExtension(id: string, input: CancelExtensionInput, actorId: string): Promise<SubscriptionExtension> {
  await withTransaction(async (client) => {
    const extension = await lockExtension(client, id);

    if (extension.status === 'CANCELLED') {
      return;
    }

    if (extension.status !== 'ACTIVE') {
      throw new ApiError('Only active extensions can be cancelled', 409, ErrorCodes.EXTENSION_NOT_CANCELLABLE);
    }

    await client.query(
      `
      UPDATE adm.subscription_extensions
      SET status = 'CANCELLED',
          metadata = metadata || jsonb_build_object('cancelledAt', now(), 'cancellationReason', $2),
          updated_by = $3::uuid
      WHERE id = $1::uuid
      `,
      [id, input.reason, actorId]
    );

    await recordExtensionAudit(client, actorId, 'EXTENSION_CANCELLED', id, input.reason, { status: 'CANCELLED' });
  });

  return getRequiredExtension(id);
}

async function getRequiredExtension(id: string): Promise<SubscriptionExtension> {
  const extension = await getExtensionById(id);

  if (!extension) {
    throw new ApiError('Extension not found', 404, ErrorCodes.EXTENSION_NOT_FOUND);
  }

  return extension;
}

async function lockInvoiceForExtension(client: PoolClient, invoiceId: string): Promise<InvoiceForExtensionRow> {
  const result = await client.query<InvoiceForExtensionRow>(
    `
    SELECT id, subscription_id AS "subscriptionId", due_date::text AS "dueDate"
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

  return invoice;
}

async function lockExtension(client: PoolClient, id: string): Promise<ExtensionLockRow> {
  const result = await client.query<ExtensionLockRow>(
    `
    SELECT id, status::text AS status
    FROM adm.subscription_extensions
    WHERE id = $1::uuid
    FOR UPDATE
    `,
    [id]
  );
  const extension = result.rows[0];

  if (!extension) {
    throw new ApiError('Extension not found', 404, ErrorCodes.EXTENSION_NOT_FOUND);
  }

  return extension;
}

async function recordExtensionAudit(
  client: PoolClient,
  actorId: string,
  action: string,
  extensionId: string,
  reason: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
    SELECT adm.record_audit_log(
      $1::uuid,
      $2,
      'subscription_extensions',
      $3::uuid,
      NULL,
      $4::jsonb,
      NULL,
      $5,
      'API',
      $4::jsonb
    )
    `,
    [actorId, action, extensionId, JSON.stringify(metadata), reason]
  );
}
