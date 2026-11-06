# Security & Privacy Policy (Zero-Leak Architecture)

## Supported Versions

| Version | Supported          | Privacy Guard |
| ------- | ------------------ | ------------- |
| 1.2.x   | :white_check_mark: | Active        |
| 1.1.x   | :white_check_mark: | Active        |
| < 1.0   | :x:                | N/A           |

## Privacy-First & Anti-Leak Guarantee

**Rumah Kita** is architected from the ground up with a **Strict Local-First, Zero-Telemetry** security model:

1. **Zero Device Path Leakage**: Built-in `privacy-sanitizer.js` and CI/CD `privacy-guard.js` automatically detect and redact any local operating system paths (such as Windows `AppData\Local\Programs` paths or Unix `$HOME` paths) before data export or repository commits.
2. **Zero Credential Exposure**: API keys (`sk-...`, `sk-ant-...`), GitHub Personal Access Tokens (`ghp_...`), JWTs, and MAC addresses are automatically stripped from exported state snapshots and blocked by `.gitignore` and GitHub Actions CI.
3. **Isolated Local Storage**: When running as a desktop or web application, user databases are stored strictly inside isolated local directories excluded from version control.

## Reporting a Vulnerability

If you discover a security or privacy issue in **Rumah Kita**, please report it responsibly:

- Open a **Private Security Advisory** on the [GitHub Security tab](https://github.com/NopeKagennnou/rumah-kita/security/advisories), or
- Submit an issue with the `security` label if it does not expose sensitive exploit details.

We review all security reports within 48 hours and release patched versions promptly.
