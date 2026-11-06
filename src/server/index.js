/**
 * Rumah Kita — HTTP REST API & Web Dashboard Server
 *
 * Zero-dependency Node.js server providing RESTful endpoints for Household Finance,
 * Smart Home IoT Device Control, Inventory Management, Community Tasks, and Privacy Audit,
 * alongside serving the interactive Rumah Kita Web/Desktop UI.
 *
 * @module server/index
 * @license MIT
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HouseholdStore } from '../core/household-store.js';
import { auditStringPrivacy, sanitizeObject } from '../core/privacy-sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

/**
 * Helper to parse JSON request body safely with size limit.
 *
 * @param {http.IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_048_576) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Sends a JSON HTTP response with security headers.
 *
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {any} payload
 */
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(sanitizeObject(payload));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

/**
 * Creates a Rumah Kita HTTP server instance.
 *
 * @param {{ store?: HouseholdStore }} [options]
 */
export function createRumahKitaServer(options = {}) {
  const store = options.store || new HouseholdStore();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method || 'GET';

      // Health & Privacy Status Endpoint
      if (pathname === '/api/health' && method === 'GET') {
        sendJson(res, 200, {
          status: 'ok',
          app: 'Rumah Kita',
          version: '1.2.0',
          privacyGuard: 'ACTIVE',
          zeroTelemetry: true
        });
        return;
      }

      // Full State + Dashboard Summary
      if (pathname === '/api/dashboard' && method === 'GET') {
        sendJson(res, 200, {
          summary: store.getDashboardSummary(),
          state: store.getState()
        });
        return;
      }

      // Add Transaction
      if (pathname === '/api/transactions' && method === 'POST') {
        const body = await parseJsonBody(req);
        const created = store.addTransaction(body);
        sendJson(res, 201, {
          transaction: created,
          summary: store.getDashboardSummary()
        });
        return;
      }

      // Toggle Smart Home Device
      if (pathname.startsWith('/api/devices/') && pathname.endsWith('/toggle') && method === 'POST') {
        const parts = pathname.split('/');
        const deviceId = parts[3];
        const updated = store.toggleDevice(deviceId);
        sendJson(res, 200, {
          device: updated,
          summary: store.getDashboardSummary()
        });
        return;
      }

      // Update Inventory Quantity
      if (pathname.startsWith('/api/inventory/') && pathname.endsWith('/adjust') && method === 'POST') {
        const parts = pathname.split('/');
        const itemId = parts[3];
        const body = await parseJsonBody(req);
        const updated = store.updateInventoryQuantity(itemId, body.delta || 0);
        sendJson(res, 200, {
          item: updated,
          summary: store.getDashboardSummary()
        });
        return;
      }

      // Add Community / Household Task
      if (pathname === '/api/tasks' && method === 'POST') {
        const body = await parseJsonBody(req);
        const created = store.addTask(body);
        sendJson(res, 201, {
          task: created,
          summary: store.getDashboardSummary()
        });
        return;
      }

      // Toggle Task Completion
      if (pathname.startsWith('/api/tasks/') && pathname.endsWith('/toggle') && method === 'POST') {
        const parts = pathname.split('/');
        const taskId = parts[3];
        const updated = store.toggleTask(taskId);
        sendJson(res, 200, {
          task: updated,
          summary: store.getDashboardSummary()
        });
        return;
      }

      // On-Demand Privacy Audit Scan
      if (pathname === '/api/privacy/audit' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = auditStringPrivacy(String(body.text || ''));
        sendJson(res, 200, result);
        return;
      }

      // Serve Static Frontend Assets from /public
      let safeRelative = pathname === '/' ? '/index.html' : pathname;
      safeRelative = path.normalize(safeRelative).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(PUBLIC_DIR, safeRelative);

      if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(content);
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Unexpected request error'
      });
    }
  });

  return { server, store };
}

// Start server if executed directly
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const port = Number(process.env.PORT) || 3080;
  const host = process.env.HOST || '127.0.0.1';
  const dataFile = process.env.DATA_FILE || path.resolve(__dirname, '../../data/rumah-kita-local.json');

  const store = new HouseholdStore({ filePath: dataFile });
  const { server } = createRumahKitaServer({ store });

  server.listen(port, host, () => {
    console.log(`[Rumah Kita] Server running at http://${host}:${port}`);
    console.log(`[Rumah Kita] Privacy Guard: ACTIVE (Zero local device data leakage)`);
  });
}
