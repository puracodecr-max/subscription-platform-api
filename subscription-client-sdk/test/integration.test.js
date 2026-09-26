const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { SubscriptionClient } = require('../dist');
const { CUSTOMER_ID, entitlement } = require('../test-support/helpers');

test('CommonJS client integrates with an HTTP subscription API', async (context) => {
  let received;
  const server = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      received = {
        method: request.method,
        url: request.url,
        authorization: request.headers.authorization,
        body: JSON.parse(body)
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ success: true, data: entitlement() }));
    });
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const client = new SubscriptionClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    serviceToken: 'sat_integration',
    cacheTtlMs: 0
  });
  const result = await client.validateEntitlement({
    customerId: CUSTOMER_ID,
    applicationCode: 'CRM',
    requestedModule: 'bookings'
  });

  assert.equal(result.allowed, true);
  assert.deepEqual(received, {
    method: 'POST',
    url: '/api/v1/entitlements/validate',
    authorization: 'Bearer sat_integration',
    body: {
      customerId: CUSTOMER_ID,
      applicationCode: 'CRM',
      requestedModule: 'bookings'
    }
  });
});
