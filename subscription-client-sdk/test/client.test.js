const { afterEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  HttpError,
  InvalidConfigurationError,
  InvalidEntitlementInputError,
  NetworkError,
  SubscriptionClient,
  TimeoutError,
  UnexpectedResponseError
} = require('../dist');
const { CUSTOMER_ID, entitlement, jsonResponse } = require('../test-support/helpers');

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('SubscriptionClient configuration', () => {
  test('requires an absolute HTTP API origin and service token', () => {
    assert.throws(() => new SubscriptionClient({ baseUrl: 'localhost', serviceToken: 'token' }), InvalidConfigurationError);
    assert.throws(() => new SubscriptionClient({ baseUrl: 'ftp://localhost', serviceToken: 'token' }), InvalidConfigurationError);
    assert.throws(() => new SubscriptionClient({ baseUrl: 'http://localhost/api', serviceToken: 'token' }), InvalidConfigurationError);
    assert.throws(() => new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: ' ' }), InvalidConfigurationError);
  });

  test('validates timeout and cache configuration', () => {
    assert.throws(() => new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token', timeoutMs: 0 }), InvalidConfigurationError);
    assert.throws(() => new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token', cacheTtlMs: -1 }), InvalidConfigurationError);
    assert.throws(() => new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token', deniedCacheTtlMs: -1 }), InvalidConfigurationError);
  });
});

describe('SubscriptionClient requests', () => {
  test('sends the service token, API path and normalized payload', async () => {
    let request;
    global.fetch = async (url, init) => {
      request = { url: String(url), init };
      return jsonResponse({ success: true, data: entitlement() });
    };

    const client = new SubscriptionClient({
      baseUrl: 'http://localhost:3000',
      serviceToken: ' sat_test ',
      cacheTtlMs: 0,
      deniedCacheTtlMs: 0
    });
    const result = await client.validateEntitlement({
      customerId: ` ${CUSTOMER_ID} `,
      applicationCode: 'CRM',
      requestedModule: ' bookings '
    });

    assert.equal(result.allowed, true);
    assert.equal(request.url, 'http://localhost:3000/api/v1/entitlements/validate');
    assert.equal(request.init.headers.Authorization, 'Bearer sat_test');
    assert.deepEqual(JSON.parse(request.init.body), {
      customerId: CUSTOMER_ID,
      applicationCode: 'CRM',
      requestedModule: 'bookings'
    });
  });

  test('supports a custom API path', async () => {
    let calledUrl;
    global.fetch = async (url) => {
      calledUrl = String(url);
      return jsonResponse({ success: true, data: entitlement() });
    };
    const client = new SubscriptionClient({
      baseUrl: 'https://example.com',
      apiPath: '/subscriptions/v2/',
      serviceToken: 'token',
      cacheTtlMs: 0
    });

    await client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' });
    assert.equal(calledUrl, 'https://example.com/subscriptions/v2/entitlements/validate');
  });

  test('rejects invalid input before making an HTTP request', async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({});
    };
    const client = new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token' });

    await assert.rejects(
      client.validateEntitlement({ customerId: 'not-a-uuid', applicationCode: 'crm' }),
      InvalidEntitlementInputError
    );
    assert.equal(calls, 0);
  });

  test('returns typed HTTP and response errors', async () => {
    const client = new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token', cacheTtlMs: 0 });

    global.fetch = async () => jsonResponse({ success: false, error: { code: 'INVALID_TOKEN' } }, 401);
    await assert.rejects(
      client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      (error) => error instanceof HttpError && error.status === 401
    );

    global.fetch = async () => new Response('not-json', { status: 200 });
    await assert.rejects(
      client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      UnexpectedResponseError
    );

    global.fetch = async () => jsonResponse({ success: true, data: { allowed: true } });
    await assert.rejects(
      client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      UnexpectedResponseError
    );
  });

  test('separates timeout from other network failures', async () => {
    const client = new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token', timeoutMs: 5, cacheTtlMs: 0 });
    global.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
    await assert.rejects(
      client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      TimeoutError
    );

    global.fetch = async () => {
      throw new Error('connection refused');
    };
    await assert.rejects(
      client.validateEntitlement({ customerId: CUSTOMER_ID, applicationCode: 'CRM' }),
      (error) => error instanceof NetworkError && !(error instanceof TimeoutError)
    );
  });
});

describe('SubscriptionClient cache', () => {
  test('caches results and supports targeted and global invalidation', async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ success: true, data: entitlement() });
    };
    const client = new SubscriptionClient({ baseUrl: 'http://localhost', serviceToken: 'token' });
    const input = { customerId: CUSTOMER_ID, applicationCode: 'CRM', requestedModule: 'bookings' };

    await client.validateEntitlement(input);
    await client.validateEntitlement(input);
    assert.equal(calls, 1);

    client.invalidateEntitlement(input);
    await client.validateEntitlement(input);
    assert.equal(calls, 2);

    client.clearCache();
    await client.validateEntitlement(input);
    assert.equal(calls, 3);
  });

  test('uses a shorter independent TTL for denied results', async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ success: true, data: entitlement({ allowed: false, reason: 'SUSPENDED' }) });
    };
    const client = new SubscriptionClient({
      baseUrl: 'http://localhost',
      serviceToken: 'token',
      cacheTtlMs: 1000,
      deniedCacheTtlMs: 10
    });
    const input = { customerId: CUSTOMER_ID, applicationCode: 'CRM' };

    await client.validateEntitlement(input);
    await client.validateEntitlement(input);
    assert.equal(calls, 1);

    await new Promise((resolve) => setTimeout(resolve, 25));
    await client.validateEntitlement(input);
    assert.equal(calls, 2);
  });
});
