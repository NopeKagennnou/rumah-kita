/**
 * Rumah Kita — Automated Unit & Integration Test Suite
 *
 * Tests:
 *  1. Privacy Guard & Anti-Leak Sanitizer (Windows paths, Unix paths, API keys, tokens)
 *  2. HouseholdStore Core Engine (Finance, Smart Home Energy, Inventory, Tasks)
 *  3. HTTP REST API Server Endpoints & Static UI Delivery
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStringPrivacy, sanitizeString, sanitizeObject } from '../src/core/privacy-sanitizer.js';
import { HouseholdStore } from '../src/core/household-store.js';
import { createRumahKitaServer } from '../src/server/index.js';

test('Privacy Guard detects and redacts Windows AppData device paths and API keys', () => {
  const sampleWinPath = 'Loaded config from C:\\Users\\john_doe\\AppData\\Local\\Programs\\Rumah Kita\\config.json';
  const audit = auditStringPrivacy(sampleWinPath);
  assert.equal(audit.clean, false);
  assert.equal(audit.findings[0].type, 'WINDOWS_USER_PATH');

  const sanitized = sanitizeString(sampleWinPath);
  assert.ok(!sanitized.includes('john_doe'));
  assert.ok(sanitized.includes('<REDACTED_DEVICE_PATH>'));

  const sampleSecrets = {
    userPath: 'C:/Users/admin/AppData/Roaming/secret.db',
    apiKey: 'sk-proj-1234567890abcdefghijklmnop',
    safeTitle: 'Rumah Kita Open Source'
  };
  const cleanObj = sanitizeObject(sampleSecrets);
  assert.equal(cleanObj.apiKey, '<REDACTED_SECRET>');
  assert.equal(cleanObj.userPath, '<REDACTED_DEVICE_PATH>');
  assert.equal(cleanObj.safeTitle, 'Rumah Kita Open Source');
});

test('HouseholdStore accurately computes financial, smart home energy, inventory, and task metrics', () => {
  const store = new HouseholdStore();
  const initialSummary = store.getDashboardSummary();

  assert.equal(initialSummary.meta.appName, 'Rumah Kita');
  assert.ok(initialSummary.finance.totalIncome > 0);
  assert.ok(initialSummary.finance.totalExpense > 0);
  assert.equal(
    initialSummary.finance.balance,
    initialSummary.finance.totalIncome - initialSummary.finance.totalExpense
  );
  assert.equal(initialSummary.privacyStatus.clean, true);

  // Add a new income transaction
  const createdTrx = store.addTransaction({
    title: 'Donasi Komunitas Warga',
    category: 'Income',
    amount: 500000,
    member: 'Warga RT 04'
  });
  assert.ok(createdTrx.id.startsWith('trx-'));
  const updatedSummary = store.getDashboardSummary();
  assert.equal(updatedSummary.finance.balance, initialSummary.finance.balance + 500000);

  // Toggle Smart Home device
  const firstDevice = store.getState().devices[0];
  const toggled = store.toggleDevice(firstDevice.id);
  assert.notEqual(toggled.status, firstDevice.status);

  // Adjust Inventory quantity
  const firstItem = store.getState().inventory[0];
  const adjusted = store.updateInventoryQuantity(firstItem.id, 3);
  assert.equal(adjusted.quantity, firstItem.quantity + 3);

  // Add and toggle task
  const task = store.addTask({
    title: 'Periksa Lampu Jalan RT',
    assignee: 'Seksi Keamanan',
    priority: 'High'
  });
  assert.equal(task.completed, false);
  const toggledTask = store.toggleTask(task.id);
  assert.equal(toggledTask.completed, true);
});

test('HTTP REST API serves health check, dashboard summary, mutations, and HTML frontend', async () => {
  const store = new HouseholdStore();
  const { server } = createRumahKitaServer({ store });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. GET /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'ok');
    assert.equal(healthData.zeroTelemetry, true);

    // 2. GET /api/dashboard
    const dashRes = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.ok(dashData.summary.finance.balance > 0);
    assert.ok(Array.isArray(dashData.state.devices));

    // 3. POST /api/transactions
    const trxRes = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Pembelian Lampu LED Hemat Energi',
        category: 'Maintenance',
        amount: -85000,
        member: 'Teknisi'
      })
    });
    assert.equal(trxRes.status, 201);
    const trxPayload = await trxRes.json();
    assert.equal(trxPayload.transaction.amount, -85000);

    // 4. POST /api/privacy/audit
    const auditRes = await fetch(`${baseUrl}/api/privacy/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Clean public open-source string' })
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.clean, true);

    // 5. GET / (HTML Frontend)
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('Rumah Kita'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
