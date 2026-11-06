# Changelog

All notable changes to **Rumah Kita** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-06

### Added
- **Privacy Guard & Anti-Leak Security Engine** (`src/core/privacy-sanitizer.js` & `scripts/privacy-guard.js`): Automatic detection and redaction of local Windows/Unix device paths, API keys, tokens, and MAC addresses.
- **Smart Home & IoT Energy Dashboard**: Real-time watt load monitoring, monthly kWh estimation, and IDR electricity tariff calculation.
- **Household & Community (RT/RW) Finance Ledger**: Income/expense categorization, savings rate calculation, and sanitized JSON export.
- **Pantry & Logistics Inventory Tracker**: Minimum threshold alerts and instant stock adjustment endpoints.
- **Cross-Platform Desktop & Web Architecture**: Native Electron wrapper (`src/main/electron-main.js`) with seamless fallback to standalone zero-dependency Node.js HTTP server (`src/server/index.js`) and CLI (`bin/rumah-kita.js`).
- **Safe Local Windows Sync Script** (`scripts/sync-from-local-windows.ps1`): PowerShell utility to synchronize local Windows installation directories while stripping binaries and personal device data.
- **Automated CI/CD Pipeline**: GitHub Actions workflow testing on Node.js 18, 20, and 22 with automated Privacy Guard audits.
