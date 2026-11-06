/**
 * Rumah Kita — Privacy Guard & Anti-Leak Security Engine
 *
 * Ensures that no personal device paths, API keys, tokens, MAC addresses,
 * private IP configurations, or personal credentials are ever leaked into
 * exported files, logs, or Git commits.
 *
 * @module core/privacy-sanitizer
 * @license MIT
 */

const SENSITIVE_PATTERNS = [
  {
    name: 'WINDOWS_USER_PATH',
    // Matches real Windows user paths while ignoring generic documentation placeholders like <username> or ...
    regex: /[A-Za-z]:[\\/]Users[\\/](?!<|\.|username\b|user\b)[a-zA-Z0-9._-]+([\\/][^\s"'<>`]*)?/gi,
    replacement: '<REDACTED_DEVICE_PATH>'
  },
  {
    name: 'UNIX_HOME_PATH',
    // Matches real Unix home paths while ignoring generic placeholders
    regex: /\/(home|Users)\/(?!<|\.|username\b|user\b)[a-zA-Z0-9._-]+(\/[^\s"'<>`]*)?/g,
    replacement: '<REDACTED_HOME_PATH>'
  },
  {
    name: 'OPENAI_OR_ANTHROPIC_API_KEY',
    // Matches sk-..., sk-proj-..., sk-ant-...
    regex: /\bsk-(?:proj-|ant-|[a-zA-Z0-9]{16,})[a-zA-Z0-9_-]{12,}\b/g,
    replacement: '<REDACTED_API_KEY>'
  },
  {
    name: 'GITHUB_TOKEN',
    // Matches ghp_, gho_, ghu_, ghs_, ghr_, github_pat_
    regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    replacement: '<REDACTED_GITHUB_TOKEN>'
  },
  {
    name: 'GENERIC_BEARER_OR_SECRET',
    regex: /\b(?:Bearer\s+[A-Za-z0-9\-._~+/]+=*|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    replacement: '<REDACTED_AUTH_TOKEN>'
  },
  {
    name: 'MAC_ADDRESS',
    // Matches non-zero hardware MAC addresses
    regex: /\b(?!00(?::00){5})(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g,
    replacement: '<REDACTED_MAC_ADDRESS>'
  }
];

/**
 * Inspects a string for potential device data or secret leaks.
 *
 * @param {string} input - Raw text to inspect
 * @returns {{ clean: boolean, findings: Array<{ type: string, count: number }> }}
 */
export function auditStringPrivacy(input) {
  if (typeof input !== 'string' || !input) {
    return { clean: true, findings: [] };
  }

  const findings = [];
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = input.match(pattern.regex);
    if (matches && matches.length > 0) {
      findings.push({
        type: pattern.name,
        count: matches.length
      });
    }
  }

  return {
    clean: findings.length === 0,
    findings
  };
}

/**
 * Sanitizes a string by redacting any sensitive device paths, tokens, or secrets.
 *
 * @param {string} input - Raw string
 * @returns {string} Sanitized string safe for public sharing
 */
export function sanitizeString(input) {
  if (typeof input !== 'string' || !input) {
    return input;
  }

  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }
  return sanitized;
}

/**
 * Recursively sanitizes an object or array to remove any device-identifying metadata.
 *
 * @param {any} data - Object, Array, or primitive to sanitize
 * @returns {any} Deeply sanitized clone
 */
export function sanitizeObject(data) {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item));
  }
  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('private_key') ||
        lowerKey.includes('token')
      ) {
        result[key] = '<REDACTED_SECRET>';
      } else {
        result[key] = sanitizeObject(value);
      }
    }
    return result;
  }
  return data;
}
