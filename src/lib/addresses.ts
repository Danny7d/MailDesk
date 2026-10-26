import { z } from 'zod';

// Resend allows up to 50 recipients per message (to + cc + bcc combined).
export const MAX_RECIPIENTS = 50;

const emailSchema = z.string().email();

/** Pulls the bare address out of "Name <addr@example.com>" or returns the trimmed input. */
export function extractAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

/**
 * Parses a comma/semicolon/newline separated list of addresses.
 * Accepts "Name <addr>" entries, drops duplicates (case-insensitive), and reports invalid entries.
 */
export function parseAddressList(input: string | null | undefined): {
  addresses: string[];
  invalid: string[];
} {
  const addresses: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of (input ?? '').split(/[,;\n]/)) {
    const part = raw.trim();
    if (!part) continue;
    const address = extractAddress(part);
    if (!emailSchema.safeParse(address).success) {
      invalid.push(part);
      continue;
    }
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }

  return { addresses, invalid };
}
