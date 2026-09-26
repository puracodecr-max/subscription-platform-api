const CUSTOMER_ID = '00000000-0000-4000-8000-000000000001';

function entitlement(overrides = {}) {
  return {
    allowed: true,
    customerId: CUSTOMER_ID,
    applicationCode: 'CRM',
    applicationId: null,
    subscriptionId: null,
    subscriptionStatus: 'ACTIVE',
    validUntil: null,
    reason: null,
    gracePeriodEnd: null,
    outstandingBalance: null,
    daysOverdue: 0,
    warningCode: null,
    allowedModules: ['bookings'],
    blockedModules: [],
    ...overrides
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

module.exports = { CUSTOMER_ID, entitlement, jsonResponse };
