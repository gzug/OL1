/**
 * The secret / PHI patterns, in one place so both the scanner and its test read the same list.
 *
 * A guard nobody tests drifts permissive without anyone noticing. The false-positive half of
 * tests/sensitive-content.test.ts matters as much as the true-positive half: an unexplained
 * misfire is how a guard gets weakened rather than fixed.
 */

export const FORBIDDEN_FILE_PATTERN =
  /\.(apk|aab|db|jks|keystore|mobileprovision|p8|p12|sqlite|sqlite3)$/i;

export const HIGH_SIGNAL_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[opsu]_[0-9A-Za-z]{30,}\b/,
  /\bsk-[0-9A-Za-z_-]{20,}\b/,
  /\bBearer\s+[0-9A-Za-z._-]{20,}\b/i,
  /\b(?:dateOfBirth|dob|fullName|medicalRecordNumber|mrn|patientName)\s*[:=]\s*['"`][^'"`]+/i,
  /\b(?:email|phone)\s*[:=]\s*['"`][^'"`]+/i,
];

export function findSecret(content: string): RegExp | null {
  return HIGH_SIGNAL_PATTERNS.find((pattern) => pattern.test(content)) ?? null;
}
