const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  HttpError,
  InvalidConfigurationError,
  NetworkError,
  requireEntitlement
} = require('../dist');
const { CUSTOMER_ID, entitlement } = require('../test-support/helpers');

function responseMock() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function execute(middleware, request = {}) {
  const response = responseMock();
  let continued = false;
  await middleware(request, response, () => {
    continued = true;
  });
  return { request, response, continued };
}

describe('requireEntitlement', () => {
  test('requires a context resolver', () => {
    assert.throws(() => requireEntitlement({}, {}), InvalidConfigurationError);
  });

  test('attaches an allowed entitlement and continues', async () => {
    const result = entitlement();
    const middleware = requireEntitlement(
      { validateEntitlement: async () => result },
      { resolveContext: () => ({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }) }
    );

    const outcome = await execute(middleware);
    assert.equal(outcome.continued, true);
    assert.equal(outcome.request.entitlement, result);
  });

  test('returns 403 and never continues for a denied entitlement', async () => {
    const result = entitlement({ allowed: false, reason: 'SUBSCRIPTION_SUSPENDED' });
    const middleware = requireEntitlement(
      { validateEntitlement: async () => result },
      { resolveContext: () => ({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }), failureMode: 'open' }
    );

    const outcome = await execute(middleware);
    assert.equal(outcome.continued, false);
    assert.equal(outcome.response.statusCode, 403);
    assert.equal(outcome.response.body.error.code, 'ACCESS_DENIED');
    assert.equal(outcome.response.body.data, result);
  });

  test('returns 400 when trusted context is incomplete', async () => {
    const middleware = requireEntitlement(
      { validateEntitlement: async () => entitlement() },
      { resolveContext: () => ({ customerId: '', applicationCode: 'CRM' }) }
    );

    const outcome = await execute(middleware);
    assert.equal(outcome.continued, false);
    assert.equal(outcome.response.statusCode, 400);
    assert.equal(outcome.response.body.error.code, 'INVALID_ENTITLEMENT_CONTEXT');
  });

  test('returns 503 for failures in closed mode', async () => {
    const middleware = requireEntitlement(
      { validateEntitlement: async () => { throw new NetworkError('offline'); } },
      { resolveContext: () => ({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }) }
    );

    const outcome = await execute(middleware);
    assert.equal(outcome.continued, false);
    assert.equal(outcome.response.statusCode, 503);
  });

  test('opens only for transient failures', async () => {
    const options = {
      resolveContext: () => ({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      failureMode: 'open'
    };
    const network = await execute(requireEntitlement(
      { validateEntitlement: async () => { throw new NetworkError('offline'); } },
      options
    ));
    const unavailable = await execute(requireEntitlement(
      { validateEntitlement: async () => { throw new HttpError(503, {}); } },
      options
    ));
    const unauthorized = await execute(requireEntitlement(
      { validateEntitlement: async () => { throw new HttpError(401, {}); } },
      options
    ));

    assert.equal(network.continued, true);
    assert(network.request.entitlementValidationError instanceof NetworkError);
    assert.equal(unavailable.continued, true);
    assert.equal(unauthorized.continued, false);
    assert.equal(unauthorized.response.statusCode, 503);
  });
});
