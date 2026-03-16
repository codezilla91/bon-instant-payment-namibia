import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { PAYMENT_MESSAGES } from './modules/payments/payment.messages.js';

function setupApp() {
  const { app } = createApp({ disableRateLimit: true, logLevel: 'silent' });
  return request(app);
}

const validPayload = {
  senderAccountNumber: '1234567890',
  receiverAccountNumber: '0987654321',
  amount: 100.5,
  currency: 'NAD',
  reference: 'Test transfer',
  clientReference: 'CLI-TEST-0001'
};

test('GET /api/health returns UP status', async () => {
  const agent = setupApp();
  const response = await agent.get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'UP');
});

test('POST /api/p2p-payment returns success for valid input', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send(validPayload);

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'SUCCESS');
  assert.equal(response.body.clientReference, validPayload.clientReference);
  assert.ok(typeof response.body.transactionId === 'string');
  assert.match(response.body.transactionId, /^TXN\d{12}$/);
  assert.equal(response.body.message, PAYMENT_MESSAGES.success);
  assert.ok(typeof response.headers['x-correlation-id'] === 'string');
});

test('POST /api/p2p-payment rejects missing required fields (ERR001)', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send({
    amount: 100,
    currency: 'NAD'
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, 'FAILED');
  assert.equal(response.body.errorCode, 'ERR001');
  assert.equal(response.body.message, PAYMENT_MESSAGES.missingRequiredFields);
});

test('POST /api/p2p-payment rejects invalid account format (ERR002)', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-ERR002',
    senderAccountNumber: 'ABC123'
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, 'FAILED');
  assert.equal(response.body.errorCode, 'ERR002');
  assert.equal(response.body.message, PAYMENT_MESSAGES.invalidAccountFormat);
});

test('POST /api/p2p-payment rejects non-NAD currency (ERR003)', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-0002',
    currency: 'USD'
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.errorCode, 'ERR003');
  assert.equal(response.body.message, PAYMENT_MESSAGES.invalidCurrency);
});

test('POST /api/p2p-payment rejects invalid amount (ERR004)', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-ERR004',
    amount: -50
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.errorCode, 'ERR004');
  assert.equal(response.body.message, PAYMENT_MESSAGES.invalidAmount);
});

test('POST /api/p2p-payment returns ERR005 for insufficient funds mock rule', async () => {
  const agent = setupApp();
  const response = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-0003',
    amount: 600000
  });

  assert.equal(response.status, 402);
  assert.equal(response.body.errorCode, 'ERR005');
  assert.equal(response.body.message, PAYMENT_MESSAGES.insufficientFunds);
});

test('POST /api/p2p-payment detects duplicate clientReference', async () => {
  const agent = setupApp();

  const first = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-0004'
  });

  const second = await agent.post('/api/p2p-payment').send({
    ...validPayload,
    clientReference: 'CLI-TEST-0004'
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.equal(second.body.errorCode, 'ERR007');
  assert.equal(second.body.message, PAYMENT_MESSAGES.duplicateClientReference);
});

test('POST /api/p2p-payment can simulate ERR006 with header', async () => {
  const agent = setupApp();
  const response = await agent
    .post('/api/p2p-payment')
    .set('x-simulate-error', 'ERR006')
    .send({
      ...validPayload,
      clientReference: 'CLI-TEST-0005'
    });

  assert.equal(response.status, 500);
  assert.equal(response.body.errorCode, 'ERR006');
  assert.equal(response.body.message, PAYMENT_MESSAGES.internalProcessingError);
});
