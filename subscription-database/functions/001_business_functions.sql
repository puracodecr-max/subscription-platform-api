-- 001_business_functions.sql
-- Transactional business functions for the adm schema.

BEGIN;

CREATE OR REPLACE FUNCTION adm.is_valid_subscription_status_transition(
  p_from adm.subscription_status,
  p_to adm.subscription_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_to IS NULL THEN false
    WHEN p_from IS NULL THEN p_to IN ('TRIAL', 'ACTIVE')
    WHEN p_from = p_to THEN true
    WHEN p_from = 'TRIAL' THEN p_to IN ('ACTIVE', 'CANCELLED', 'EXPIRED')
    WHEN p_from = 'ACTIVE' THEN p_to IN ('GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED')
    WHEN p_from = 'GRACE_PERIOD' THEN p_to IN ('ACTIVE', 'OVERDUE', 'SUSPENDED', 'CANCELLED')
    WHEN p_from = 'OVERDUE' THEN p_to IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')
    WHEN p_from = 'SUSPENDED' THEN p_to IN ('ACTIVE', 'CANCELLED')
    WHEN p_from IN ('CANCELLED', 'EXPIRED') THEN false
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION adm.record_audit_log(
  p_user_id uuid,
  p_action text,
  p_entity_name text,
  p_entity_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_source text DEFAULT 'API',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_audit_log_id uuid;
BEGIN
  INSERT INTO adm.audit_logs (
    user_id,
    action,
    entity_name,
    entity_id,
    old_values,
    new_values,
    ip_address,
    reason,
    source,
    metadata
  )
  VALUES (
    p_user_id,
    p_action,
    p_entity_name,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_reason,
    COALESCE(NULLIF(p_source, ''), 'API'),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_audit_log_id;

  RETURN v_audit_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.transition_subscription_status(
  p_subscription_id uuid,
  p_to_status adm.subscription_status,
  p_reason text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL,
  p_source text DEFAULT 'API',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription adm.subscriptions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_subscription
  FROM adm.subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_subscription.status = p_to_status THEN
    RETURN p_subscription_id;
  END IF;

  IF NOT adm.is_valid_subscription_status_transition(v_subscription.status, p_to_status) THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: % -> %', v_subscription.status, p_to_status
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE adm.subscriptions
  SET
    status = p_to_status,
    updated_by = p_changed_by,
    cancelled_at = CASE WHEN p_to_status = 'CANCELLED' THEN now() ELSE cancelled_at END,
    cancellation_reason = CASE WHEN p_to_status = 'CANCELLED' THEN p_reason ELSE cancellation_reason END
  WHERE id = p_subscription_id;

  INSERT INTO adm.subscription_status_history (
    subscription_id,
    from_status,
    to_status,
    reason,
    changed_by,
    source,
    metadata
  )
  VALUES (
    p_subscription_id,
    v_subscription.status,
    p_to_status,
    p_reason,
    p_changed_by,
    COALESCE(NULLIF(p_source, ''), 'API'),
    COALESCE(p_metadata, '{}'::jsonb)
  );

  PERFORM adm.record_audit_log(
    p_changed_by,
    'SUBSCRIPTION_STATUS_CHANGED',
    'subscriptions',
    p_subscription_id,
    jsonb_build_object('status', v_subscription.status),
    jsonb_build_object('status', p_to_status),
    NULL,
    p_reason,
    p_source,
    p_metadata
  );

  RETURN p_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.recalculate_invoice_status(p_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice adm.invoices%ROWTYPE;
  v_new_status adm.invoice_status;
BEGIN
  SELECT *
  INTO v_invoice
  FROM adm.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_invoice.status = 'CANCELLED' THEN
    RETURN p_invoice_id;
  END IF;

  IF v_invoice.balance_amount = 0 THEN
    v_new_status := 'PAID';
  ELSIF v_invoice.paid_amount > 0 THEN
    v_new_status := 'PARTIALLY_PAID';
  ELSIF v_invoice.due_date < CURRENT_DATE THEN
    v_new_status := 'OVERDUE';
  ELSE
    v_new_status := 'ISSUED';
  END IF;

  UPDATE adm.invoices
  SET status = v_new_status
  WHERE id = p_invoice_id;

  RETURN p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.create_invoice(
  p_subscription_id uuid,
  p_billing_period_start date,
  p_billing_period_end date,
  p_issue_date date,
  p_due_date date,
  p_idempotency_key text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription record;
  v_invoice_id uuid;
  v_invoice_number text;
  v_base_amount numeric(14,2);
BEGIN
  IF p_billing_period_end <= p_billing_period_start THEN
    RAISE EXCEPTION 'INVALID_BILLING_PERIOD'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_due_date < p_issue_date THEN
    RAISE EXCEPTION 'INVALID_DUE_DATE'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    s.id AS subscription_id,
    s.customer_id,
    s.application_id,
    s.plan_id,
    s.status AS subscription_status,
    p.name AS plan_name,
    p.price AS plan_price,
    p.currency_id
  INTO v_subscription
  FROM adm.subscriptions s
  JOIN adm.plans p ON p.id = s.plan_id
  WHERE s.id = p_subscription_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_subscription.subscription_status IN ('CANCELLED', 'EXPIRED') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_BILLABLE'
      USING ERRCODE = 'P0001';
  END IF;

  v_base_amount := v_subscription.plan_price;
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));

  INSERT INTO adm.invoices (
    subscription_id,
    customer_id,
    application_id,
    plan_id,
    invoice_number,
    billing_period_start,
    billing_period_end,
    issue_date,
    due_date,
    plan_name_snapshot,
    plan_price_snapshot,
    currency_id,
    base_amount,
    total_amount,
    balance_amount,
    status,
    created_by,
    updated_by
  )
  VALUES (
    v_subscription.subscription_id,
    v_subscription.customer_id,
    v_subscription.application_id,
    v_subscription.plan_id,
    v_invoice_number,
    p_billing_period_start,
    p_billing_period_end,
    p_issue_date,
    p_due_date,
    v_subscription.plan_name,
    v_subscription.plan_price,
    v_subscription.currency_id,
    v_base_amount,
    v_base_amount,
    v_base_amount,
    'ISSUED',
    p_created_by,
    p_created_by
  )
  ON CONFLICT ON CONSTRAINT invoices_subscription_period_unique DO NOTHING
  RETURNING id INTO v_invoice_id;

  IF v_invoice_id IS NULL THEN
    SELECT id
    INTO v_invoice_id
    FROM adm.invoices
    WHERE subscription_id = p_subscription_id
      AND billing_period_start = p_billing_period_start
      AND billing_period_end = p_billing_period_end;
  ELSE
    INSERT INTO adm.invoice_items (
      invoice_id,
      item_type,
      description,
      quantity,
      unit_amount,
      total_amount,
      created_by,
      updated_by
    )
    VALUES (
      v_invoice_id,
      'PLAN_FEE',
      'Subscription plan fee: ' || v_subscription.plan_name,
      1,
      v_base_amount,
      v_base_amount,
      p_created_by,
      p_created_by
    );
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO adm.idempotency_keys (
      idempotency_key,
      scope,
      status,
      response_body,
      created_by,
      updated_by
    )
    VALUES (
      p_idempotency_key,
      'create_invoice',
      'COMPLETED',
      jsonb_build_object('invoiceId', v_invoice_id),
      p_created_by,
      p_created_by
    )
    ON CONFLICT (scope, idempotency_key) DO UPDATE
    SET
      status = 'COMPLETED',
      response_body = EXCLUDED.response_body,
      updated_by = EXCLUDED.updated_by;
  END IF;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.confirm_payment(
  p_payment_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment adm.payments%ROWTYPE;
  v_invoice adm.invoices%ROWTYPE;
  v_remaining numeric(14,2);
  v_apply_amount numeric(14,2);
  v_allocated_base numeric(14,2);
  v_allocated_tax numeric(14,2);
  v_allocated_penalty numeric(14,2);
  v_base_due numeric(14,2);
  v_tax_due numeric(14,2);
  v_penalty_due numeric(14,2);
  v_to_base numeric(14,2);
  v_to_tax numeric(14,2);
  v_to_penalty numeric(14,2);
BEGIN
  SELECT *
  INTO v_payment
  FROM adm.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.status = 'CONFIRMED' THEN
    RETURN p_payment_id;
  END IF;

  IF v_payment.status <> 'PENDING' THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_PROCESSED'
      USING ERRCODE = 'P0001';
  END IF;

  v_remaining := v_payment.amount;

  UPDATE adm.payments
  SET
    status = 'CONFIRMED',
    confirmed_at = now(),
    updated_by = p_actor_id
  WHERE id = p_payment_id;

  FOR v_invoice IN
    SELECT *
    FROM adm.invoices
    WHERE customer_id = v_payment.customer_id
      AND currency_id = v_payment.currency_id
      AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
      AND balance_amount > 0
    ORDER BY due_date ASC, issue_date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_apply_amount := LEAST(v_remaining, v_invoice.balance_amount);

    SELECT
      COALESCE(sum(applied_to_base), 0),
      COALESCE(sum(applied_to_tax), 0),
      COALESCE(sum(applied_to_penalty), 0)
    INTO v_allocated_base, v_allocated_tax, v_allocated_penalty
    FROM adm.payment_allocations
    WHERE invoice_id = v_invoice.id
      AND status = 'APPLIED';

    v_base_due := GREATEST(v_invoice.base_amount + v_invoice.adjustment_amount - v_invoice.discount_amount - v_allocated_base, 0);
    v_tax_due := GREATEST(v_invoice.tax_amount - v_allocated_tax, 0);
    v_penalty_due := GREATEST(v_invoice.penalty_amount - v_allocated_penalty, 0);

    v_to_base := LEAST(v_apply_amount, v_base_due);
    v_to_tax := LEAST(v_apply_amount - v_to_base, v_tax_due);
    v_to_penalty := v_apply_amount - v_to_base - v_to_tax;

    IF v_to_penalty > v_penalty_due THEN
      v_to_penalty := v_penalty_due;
    END IF;

    IF v_to_base + v_to_tax + v_to_penalty < v_apply_amount THEN
      v_to_base := v_to_base + (v_apply_amount - v_to_base - v_to_tax - v_to_penalty);
    END IF;

    INSERT INTO adm.payment_allocations (
      payment_id,
      invoice_id,
      amount,
      applied_to_base,
      applied_to_tax,
      applied_to_penalty,
      created_by,
      updated_by,
      metadata
    )
    VALUES (
      p_payment_id,
      v_invoice.id,
      v_apply_amount,
      v_to_base,
      v_to_tax,
      v_to_penalty,
      p_actor_id,
      p_actor_id,
      COALESCE(p_metadata, '{}'::jsonb)
    );

    UPDATE adm.invoices
    SET
      paid_amount = paid_amount + v_apply_amount,
      balance_amount = GREATEST(balance_amount - v_apply_amount, 0),
      updated_by = p_actor_id
    WHERE id = v_invoice.id;

    PERFORM adm.recalculate_invoice_status(v_invoice.id);

    v_remaining := v_remaining - v_apply_amount;
  END LOOP;

  UPDATE adm.payments
  SET unapplied_amount = v_remaining
  WHERE id = p_payment_id;

  PERFORM adm.record_audit_log(
    p_actor_id,
    'PAYMENT_CONFIRMED',
    'payments',
    p_payment_id,
    jsonb_build_object('status', 'PENDING'),
    jsonb_build_object('status', 'CONFIRMED', 'unappliedAmount', v_remaining),
    NULL,
    NULL,
    'DATABASE_FUNCTION',
    p_metadata
  );

  RETURN p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.reverse_payment(
  p_payment_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment adm.payments%ROWTYPE;
  v_invoice_allocation record;
BEGIN
  SELECT *
  INTO v_payment
  FROM adm.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.status = 'REVERSED' THEN
    RETURN p_payment_id;
  END IF;

  IF v_payment.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'PAYMENT_NOT_CONFIRMED'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_invoice_allocation IN
    SELECT invoice_id, sum(amount) AS total_amount
    FROM adm.payment_allocations
    WHERE payment_id = p_payment_id
      AND status = 'APPLIED'
    GROUP BY invoice_id
  LOOP
    UPDATE adm.invoices
    SET
      paid_amount = GREATEST(paid_amount - v_invoice_allocation.total_amount, 0),
      balance_amount = balance_amount + v_invoice_allocation.total_amount,
      updated_by = p_actor_id
    WHERE id = v_invoice_allocation.invoice_id;

    PERFORM adm.recalculate_invoice_status(v_invoice_allocation.invoice_id);
  END LOOP;

  UPDATE adm.payment_allocations
  SET
    status = 'REVERSED',
    reversed_at = now(),
    updated_by = p_actor_id
  WHERE payment_id = p_payment_id
    AND status = 'APPLIED';

  UPDATE adm.payments
  SET
    status = 'REVERSED',
    reversed_at = now(),
    unapplied_amount = 0,
    updated_by = p_actor_id
  WHERE id = p_payment_id;

  PERFORM adm.record_audit_log(
    p_actor_id,
    'PAYMENT_REVERSED',
    'payments',
    p_payment_id,
    jsonb_build_object('status', 'CONFIRMED'),
    jsonb_build_object('status', 'REVERSED'),
    NULL,
    p_reason,
    'DATABASE_FUNCTION',
    p_metadata
  );

  RETURN p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.apply_penalty(
  p_invoice_id uuid,
  p_penalty_rule_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice adm.invoices%ROWTYPE;
  v_rule adm.penalty_rules%ROWTYPE;
  v_penalty_id uuid;
  v_allocated_base numeric(14,2);
  v_base_pending numeric(14,2);
  v_amount numeric(14,2);
BEGIN
  SELECT *
  INTO v_invoice
  FROM adm.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_invoice.status IN ('PAID', 'CANCELLED') THEN
    RAISE EXCEPTION 'INVOICE_NOT_PENALIZABLE'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_rule
  FROM adm.penalty_rules
  WHERE id = p_penalty_rule_id
    AND status = 'ACTIVE'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PENALTY_RULE_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id
  INTO v_penalty_id
  FROM adm.penalties
  WHERE invoice_id = p_invoice_id
    AND penalty_rule_id = p_penalty_rule_id
    AND status <> 'CANCELLED'
  LIMIT 1;

  IF v_penalty_id IS NOT NULL THEN
    RETURN v_penalty_id;
  END IF;

  SELECT COALESCE(sum(applied_to_base), 0)
  INTO v_allocated_base
  FROM adm.payment_allocations
  WHERE invoice_id = p_invoice_id
    AND status = 'APPLIED';

  v_base_pending := GREATEST(v_invoice.base_amount - v_invoice.discount_amount - v_allocated_base, 0);

  IF v_base_pending <= 0 THEN
    RAISE EXCEPTION 'NO_BASE_BALANCE_FOR_PENALTY'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rule.penalty_type = 'PERCENTAGE' THEN
    v_amount := round(v_base_pending * v_rule.penalty_value / 100, 2);
  ELSE
    v_amount := v_rule.penalty_value;
  END IF;

  INSERT INTO adm.penalties (
    invoice_id,
    subscription_id,
    penalty_rule_id,
    base_amount,
    penalty_type,
    penalty_value,
    amount,
    created_by,
    updated_by,
    metadata
  )
  VALUES (
    p_invoice_id,
    v_invoice.subscription_id,
    p_penalty_rule_id,
    v_base_pending,
    v_rule.penalty_type,
    v_rule.penalty_value,
    v_amount,
    p_actor_id,
    p_actor_id,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reason', p_reason)
  )
  RETURNING id INTO v_penalty_id;

  UPDATE adm.invoices
  SET
    penalty_amount = penalty_amount + v_amount,
    total_amount = total_amount + v_amount,
    balance_amount = balance_amount + v_amount,
    updated_by = p_actor_id
  WHERE id = p_invoice_id;

  PERFORM adm.recalculate_invoice_status(p_invoice_id);

  PERFORM adm.record_audit_log(
    p_actor_id,
    'PENALTY_APPLIED',
    'penalties',
    v_penalty_id,
    NULL,
    jsonb_build_object('invoiceId', p_invoice_id, 'amount', v_amount),
    NULL,
    p_reason,
    'DATABASE_FUNCTION',
    p_metadata
  );

  RETURN v_penalty_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.waive_penalty(
  p_penalty_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_penalty adm.penalties%ROWTYPE;
BEGIN
  SELECT *
  INTO v_penalty
  FROM adm.penalties
  WHERE id = p_penalty_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PENALTY_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_penalty.status = 'WAIVED' THEN
    RETURN p_penalty_id;
  END IF;

  IF v_penalty.status <> 'APPLIED' THEN
    RAISE EXCEPTION 'PENALTY_NOT_WAIVABLE'
      USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'PENALTY_WAIVE_REASON_REQUIRED'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE adm.penalties
  SET
    status = 'WAIVED',
    waived_at = now(),
    waived_by = p_actor_id,
    waived_reason = p_reason,
    updated_by = p_actor_id
  WHERE id = p_penalty_id;

  UPDATE adm.invoices
  SET
    penalty_amount = GREATEST(penalty_amount - v_penalty.amount, 0),
    total_amount = GREATEST(total_amount - v_penalty.amount, 0),
    balance_amount = GREATEST(balance_amount - v_penalty.amount, 0),
    updated_by = p_actor_id
  WHERE id = v_penalty.invoice_id;

  PERFORM adm.recalculate_invoice_status(v_penalty.invoice_id);

  PERFORM adm.record_audit_log(
    p_actor_id,
    'PENALTY_WAIVED',
    'penalties',
    p_penalty_id,
    jsonb_build_object('status', 'APPLIED', 'amount', v_penalty.amount),
    jsonb_build_object('status', 'WAIVED'),
    NULL,
    p_reason,
    'DATABASE_FUNCTION',
    p_metadata
  );

  RETURN p_penalty_id;
END;
$$;

CREATE OR REPLACE FUNCTION adm.suspend_subscription(
  p_subscription_id uuid,
  p_suspension_type adm.suspension_type,
  p_reason text,
  p_actor_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_suspension_type = 'ADMINISTRATIVE' AND NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'ADMINISTRATIVE_SUSPENSION_REASON_REQUIRED'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE adm.subscriptions
  SET
    administrative_suspension = CASE WHEN p_suspension_type = 'ADMINISTRATIVE' THEN true ELSE administrative_suspension END,
    administrative_suspension_reason = CASE WHEN p_suspension_type = 'ADMINISTRATIVE' THEN p_reason ELSE administrative_suspension_reason END,
    updated_by = p_actor_id
  WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN adm.transition_subscription_status(
    p_subscription_id,
    'SUSPENDED',
    p_reason,
    p_actor_id,
    'DATABASE_FUNCTION',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('suspensionType', p_suspension_type)
  );
END;
$$;

CREATE OR REPLACE FUNCTION adm.reactivate_subscription(
  p_subscription_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_force_administrative boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription adm.subscriptions%ROWTYPE;
  v_blocking_debt_exists boolean;
BEGIN
  SELECT *
  INTO v_subscription
  FROM adm.subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_subscription.status IN ('CANCELLED', 'EXPIRED') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_REACTIVABLE'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_subscription.administrative_suspension = true AND p_force_administrative = false THEN
    RAISE EXCEPTION 'ADMINISTRATIVE_SUSPENSION'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM adm.invoices i
    WHERE i.subscription_id = p_subscription_id
      AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
      AND i.balance_amount > 0
      AND i.due_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1
        FROM adm.subscription_extensions e
        WHERE e.invoice_id = i.id
          AND e.status = 'ACTIVE'
          AND e.extended_due_date >= CURRENT_DATE
      )
  ) INTO v_blocking_debt_exists;

  IF v_blocking_debt_exists THEN
    RAISE EXCEPTION 'OUTSTANDING_BALANCE'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE adm.subscriptions
  SET
    administrative_suspension = CASE WHEN p_force_administrative THEN false ELSE administrative_suspension END,
    administrative_suspension_reason = CASE WHEN p_force_administrative THEN NULL ELSE administrative_suspension_reason END,
    updated_by = p_actor_id
  WHERE id = p_subscription_id;

  RETURN adm.transition_subscription_status(
    p_subscription_id,
    'ACTIVE',
    p_reason,
    p_actor_id,
    'DATABASE_FUNCTION',
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

COMMIT;
