#!/usr/bin/env node
/**
 * Rumah Kita — Command Line Interface (CLI)
 *
 * Allows users and developers to launch the Rumah Kita platform, inspect
 * household metrics, or run the Privacy & Anti-Leak Scanner directly from
 * any terminal.
 *
 * @license MIT
 */

import { HouseholdStore } from '../src/core/household-store.js';
import { createRumahKitaServer } from '../src/server/index.js';

const args = process.argv.slice(2);
const command = args[0] || 'serve';

if (command === '--version' || command === '-v') {
  console.log('rumah-kita v1.2.0 (MIT License)');
  process.exit(0);
}

if (command === '--help' || command === '-h') {
  console.log(`
Rumah Kita v1.2.0 — Open-Source Smart Home & Household Management Platform

Usage:
  rumah-kita [serve] [--port 3080]   Start the local Rumah Kita web/desktop server
  rumah-kita status                  Print real-time household & privacy summary
  rumah-kita --version               Display version information
`);
  process.exit(0);
}

if (command === 'status') {
  const store = new HouseholdStore();
  const summary = store.getDashboardSummary();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const portIdx = args.indexOf('--port');
const port = portIdx !== -1 && args[portIdx + 1] ? Number(args[portIdx + 1]) : Number(process.env.PORT) || 3080;
const host = process.env.HOST || '127.0.0.1';

const store = new HouseholdStore();
const { server } = createRumahKitaServer({ store });

server.listen(port, host, () => {
  console.log(`====================================================================`);
  console.log(`  Rumah Kita v1.2.0 — Smart Home & Household Management Platform`);
  console.log(`  URL           : http://${host}:${port}`);
  console.log(`  License       : MIT (OSI-Approved Open Source)`);
  console.log(`  Privacy Guard : ACTIVE (Zero Telemetry / Local-First)`);
  console.log(`====================================================================`);
});
